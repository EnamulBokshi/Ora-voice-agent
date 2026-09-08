import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as crypto from 'crypto';
import {
  Conversation,
  ConversationChannel,
  ConversationDocument,
  ConversationStatus,
} from '../conversations/schemas/conversation.schema';
import { ConversationsService } from '../conversations/conversations.service';
import { MessageRole } from '../conversations/schemas/message.schema';
import { KnowledgeService } from '../knowledge/knowledge.service';
import { RedisService } from '../common/redis/redis.service';
import { PiiRedactor } from '../common/utils/pii-redactor.util';
import { DomainException } from '../common/exceptions/domain.exception';
import { SubmitPromptDto } from './dto/submit-prompt.dto';
import { SubmitDocumentDto } from './dto/submit-document.dto';

/** Uploads are parsed as PDF or decoded as UTF-8 text by KnowledgeService. */
const ALLOWED_UPLOAD_EXTENSIONS = ['pdf', 'txt', 'md', 'csv', 'json'];
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

@Injectable()
export class UserInputService {
  private readonly logger = new Logger(UserInputService.name);

  constructor(
    @InjectModel(Conversation.name)
    private readonly conversationModel: Model<ConversationDocument>,
    private readonly conversationsService: ConversationsService,
    private readonly knowledgeService: KnowledgeService,
    private readonly redisService: RedisService,
  ) {}

  /**
   * Records one end-user prompt against the calling client's tenant.
   *
   * Every write here derives its tenant from `businessId`, which the guard
   * took from the access token -- never from the request payload.
   */
  async submitPrompt(
    businessId: string,
    clientId: string,
    dto: SubmitPromptDto,
  ) {
    const cached = await this.readIdempotentResult(
      businessId,
      dto.idempotencyKey,
    );
    if (cached) {
      return { ...cached, idempotentReplay: true };
    }

    // Conversation.sessionId is globally unique, and findOrCreateSession looks
    // it up without a tenant filter, so a raw caller-supplied value could
    // collide with another tenant's session. Namespacing by businessId makes
    // cross-tenant collision impossible.
    const callerSessionId = dto.sessionId?.trim() || crypto.randomUUID();
    const scopedSessionId = `api:${businessId}:${callerSessionId}`;

    const conversation = await this.conversationsService.findOrCreateSession(
      businessId,
      scopedSessionId,
      ConversationChannel.API,
      {
        source: 'machine_api',
        apiClientId: clientId,
        externalUserId: dto.externalUserId,
        ...(dto.metadata || {}),
      },
    );

    // Defence in depth: assert the resolved conversation really belongs to the
    // caller's tenant before writing into it.
    if (conversation.businessId.toString() !== businessId) {
      this.logger.error(
        `[UserInputService] Refused cross-tenant write: session ${scopedSessionId} belongs to ${conversation.businessId}, caller is ${businessId}.`,
      );
      throw new DomainException(
        'SESSION_TENANT_MISMATCH',
        'Session does not belong to the authenticated client.',
        HttpStatus.FORBIDDEN,
      );
    }

    // Free-text end-user input is redacted before it is persisted.
    const storedPrompt = PiiRedactor.redactFull(dto.prompt);

    const message = await this.conversationsService.appendMessage(
      conversation._id.toString(),
      MessageRole.USER,
      storedPrompt,
    );

    const result = {
      id: message._id.toString(),
      conversationId: conversation._id.toString(),
      sessionId: callerSessionId,
      channel: conversation.channel,
      receivedAt: message.timestamp,
      redacted: storedPrompt !== dto.prompt,
    };

    await this.writeIdempotentResult(businessId, dto.idempotencyKey, result);

    return result;
  }

  /** Text document input -- the API equivalent of the dashboard's create form. */
  async submitDocument(businessId: string, dto: SubmitDocumentDto) {
    return this.knowledgeService.create(businessId, dto);
  }

  /** File input -- the API equivalent of the dashboard's upload form. */
  async submitUpload(
    businessId: string,
    file: Express.Multer.File,
    docType?: string,
    title?: string,
  ) {
    if (!file || !file.buffer) {
      throw new DomainException(
        'INVALID_FILE',
        'A multipart/form-data field named "file" is required.',
        HttpStatus.BAD_REQUEST,
      );
    }

    if ((file.size ?? 0) > MAX_UPLOAD_BYTES) {
      throw new DomainException(
        'FILE_TOO_LARGE',
        `Uploads are limited to ${MAX_UPLOAD_BYTES / (1024 * 1024)}MB.`,
        HttpStatus.PAYLOAD_TOO_LARGE,
      );
    }

    const ext = (file.originalname || '').toLowerCase().split('.').pop() || '';
    if (!ALLOWED_UPLOAD_EXTENSIONS.includes(ext)) {
      throw new DomainException(
        'UNSUPPORTED_FILE_TYPE',
        `Unsupported file type '.${ext}'. Allowed: ${ALLOWED_UPLOAD_EXTENSIONS.join(', ')}.`,
        HttpStatus.UNSUPPORTED_MEDIA_TYPE,
      );
    }

    return this.knowledgeService.uploadDocument(
      businessId,
      file,
      docType,
      title,
    );
  }

  /** Lists prompts captured for this tenant. Requires the inputs:read scope. */
  async listPromptSessions(businessId: string, page = 1, limit = 20) {
    const safePage = Math.max(page, 1);
    const safeLimit = Math.min(Math.max(limit, 1), 100);

    const filter = {
      businessId: businessId as any,
      channel: ConversationChannel.API,
      status: { $ne: ConversationStatus.CLOSED },
    };

    const [items, total] = await Promise.all([
      this.conversationModel
        .find(filter)
        .sort({ lastActivityAt: -1 })
        .skip((safePage - 1) * safeLimit)
        .limit(safeLimit)
        .exec(),
      this.conversationModel.countDocuments(filter).exec(),
    ]);

    return {
      items: items.map((c) => ({
        conversationId: c._id.toString(),
        // Strip the internal tenant namespace back off for the caller.
        sessionId: c.sessionId.replace(`api:${businessId}:`, ''),
        lastActivityAt: c.lastActivityAt,
        externalUserId: c.metadata?.externalUserId,
      })),
      total,
      page: safePage,
      limit: safeLimit,
    };
  }

  /**
   * Idempotency records are namespaced per tenant so one caller's key can
   * never return another caller's stored result.
   */
  private idempotencyCacheKey(businessId: string, key: string) {
    return `idem:machineapi:${businessId}:${crypto
      .createHash('sha256')
      .update(key)
      .digest('hex')}`;
  }

  private async readIdempotentResult(businessId: string, key?: string) {
    if (!key) return null;
    const raw = await this.redisService
      .getClient()
      .get(this.idempotencyCacheKey(businessId, key));
    return raw ? JSON.parse(raw) : null;
  }

  private async writeIdempotentResult(
    businessId: string,
    key: string | undefined,
    result: Record<string, any>,
  ) {
    if (!key) return;
    await this.redisService
      .getClient()
      .set(
        this.idempotencyCacheKey(businessId, key),
        JSON.stringify(result),
        'EX',
        24 * 60 * 60,
      );
  }
}
