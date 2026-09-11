import { Injectable, HttpStatus, Logger, Inject, forwardRef, Optional } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { KnowledgeBase, KnowledgeBaseDocument, DocType } from './schemas/knowledge-base.schema';
import { KnowledgeChunk, KnowledgeChunkDocument } from './schemas/knowledge-chunk.schema';
import { CreateKnowledgeDocDto } from './dto/create-knowledge-doc.dto';
import { UpdateKnowledgeDocDto } from './dto/update-knowledge-doc.dto';
import { DomainException } from '../common/exceptions/domain.exception';
import { VectorStoreService } from '../vector/vector-store.service';
import { EntityType } from '../vector/interfaces/vector-entry.interface';
import { RedisService } from '../common/redis/redis.service';
import { IngestVoiceTranscriptDto } from './dto/ingest-voice-transcript.dto';
import {
  StructuredKnowledgeEntry,
  VoiceTranscriptStructurerService,
} from './voice-transcript-structurer.service';

@Injectable()
export class KnowledgeService {
  private readonly logger = new Logger(KnowledgeService.name);

  constructor(
    @InjectModel(KnowledgeBase.name)
    private readonly knowledgeBaseModel: Model<KnowledgeBaseDocument>,
    @InjectModel(KnowledgeChunk.name)
    private readonly knowledgeChunkModel: Model<KnowledgeChunkDocument>,
    @Optional()
    @Inject(forwardRef(() => VectorStoreService))
    private readonly vectorStoreService?: VectorStoreService,
    @Optional()
    private readonly redisService?: RedisService,
    @Optional()
    private readonly voiceStructurer?: VoiceTranscriptStructurerService,
  ) {}

  private invalidateRagCache(businessId: string): void {
    if (this.redisService) {
      this.redisService
        .getClient()
        .incr(`rag:version:${businessId}`)
        .catch(() => {});
    }
  }

  async create(
    businessId: string,
    dto: CreateKnowledgeDocDto,
  ): Promise<{ document: KnowledgeBaseDocument; chunksCount: number }> {
    const bId = new Types.ObjectId(businessId);

    const doc = new this.knowledgeBaseModel({
      ...dto,
      businessId: bId,
    });

    const savedDoc = await doc.save();
    this.invalidateRagCache(businessId);

    // Perform text chunking
    const chunks = this.chunkText(savedDoc.content);
    const chunkDocs = chunks.map((chunkText, index) => ({
      businessId: bId,
      knowledgeBaseId: savedDoc._id,
      text: chunkText,
      chunkIndex: index,
      metadata: {
        docTitle: savedDoc.title,
        docType: savedDoc.docType,
      },
    }));

    if (chunkDocs.length > 0) {
      const createdChunks = await this.knowledgeChunkModel.insertMany(chunkDocs as any[]);

      // Auto-embed knowledge chunks into VectorIndex with bulk batch embedding
      if (this.vectorStoreService) {
        const batchEntries = createdChunks.map((chunk) => ({
          entityType: EntityType.KNOWLEDGE_CHUNK,
          entityId: chunk._id.toString(),
          text: chunk.text,
          metadata: {
            knowledgeBaseId: savedDoc._id.toString(),
            docTitle: savedDoc.title,
            docType: savedDoc.docType,
          },
        }));

        try {
          await this.vectorStoreService.upsertBatchVectors(businessId, batchEntries);
          await Promise.all([
            this.knowledgeBaseModel.findByIdAndUpdate(savedDoc._id, { $set: { isEmbedded: true } }).exec(),
            this.knowledgeChunkModel.updateMany(
              { _id: { $in: createdChunks.map((c) => c._id) } },
              { $set: { isEmbedded: true } },
            ).exec(),
          ]);
        } catch (err: any) {
          this.logger.error(
            `[KnowledgeService] Auto-embedding failed for knowledge base ${savedDoc._id}: ${err.message}`,
          );
        }
      }
    }

    return {
      document: savedDoc,
      chunksCount: chunkDocs.length,
    };
  }

  /**
   * Uploads and parses a physical document file (PDF, TXT, MD, CSV, etc.) into clean text,
   * stores it in MongoDB KnowledgeBase, creates chunks, and embeds them into the Vector Index.
   */
  async uploadDocument(
    businessId: string,
    file: Express.Multer.File,
    docType?: string,
    title?: string,
  ): Promise<{ document: KnowledgeBaseDocument; chunksCount: number; extractedLength: number }> {
    if (!file || !file.buffer) {
      throw new DomainException(
        'INVALID_FILE',
        'A valid document file buffer is required for upload.',
        HttpStatus.BAD_REQUEST,
      );
    }

    const cleanText = await this.parseDocumentFile(file);
    if (!cleanText || cleanText.trim().length === 0) {
      throw new DomainException(
        'EMPTY_DOCUMENT',
        `No readable text could be extracted from '${file.originalname}'. Please ensure the file is not empty or corrupted.`,
        HttpStatus.BAD_REQUEST,
      );
    }

    const finalTitle =
      title?.trim() || file.originalname.replace(/\.[^/.]+$/, '').trim() || 'Store Document';

    const finalDocType = docType || 'uploaded_doc';

    const result = await this.create(businessId, {
      title: finalTitle,
      docType: finalDocType as any,
      content: cleanText.trim(),
      metadata: {
        source: 'file_upload',
        originalFileName: file.originalname,
        mimeType: file.mimetype,
        fileSizeBytes: file.size,
      },
    });

    this.logger.log(
      `[KnowledgeService] Successfully ingested document '${finalTitle}' (${cleanText.length} chars, ${result.chunksCount} chunks) for business ${businessId}`,
    );

    return {
      document: result.document,
      chunksCount: result.chunksCount,
      extractedLength: cleanText.length,
    };
  }

  /**
   * Extracts clean plain text from PDF, TXT, MD, CSV, or other document formats
   */
  private async parseDocumentFile(file: Express.Multer.File): Promise<string> {
    const ext = file.originalname.toLowerCase().split('.').pop() || '';
    const mimeType = file.mimetype || '';

    // 1. PDF File extraction
    if (ext === 'pdf' || mimeType === 'application/pdf') {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const pdfModule = require('pdf-parse');
        if (typeof pdfModule === 'function') {
          const data = await pdfModule(file.buffer);
          return data?.text || '';
        } else if (pdfModule?.PDFParse) {
          const parser = new pdfModule.PDFParse({ data: file.buffer });
          const data = await parser.getText();
          if (typeof parser.destroy === 'function') {
            await parser.destroy();
          }
          return data?.text || '';
        } else if (typeof pdfModule?.default === 'function') {
          const data = await pdfModule.default(file.buffer);
          return data?.text || '';
        }
      } catch (err: any) {
        this.logger.error(`[KnowledgeService] PDF parsing failed: ${err.message}`);
        throw new DomainException(
          'PDF_PARSE_FAILED',
          `Could not extract text from PDF file '${file.originalname}': ${err.message}`,
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    // 2. Plain text / Markdown / CSV / JSON
    try {
      const text = file.buffer.toString('utf-8');
      return text;
    } catch (err: any) {
      throw new DomainException(
        'FILE_READ_FAILED',
        `Failed to decode text from '${file.originalname}': ${err.message}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async findAll(
    businessId: string,
    docType?: string,
    search?: string,
    options: { page?: number; limit?: number } = {},
  ) {
    const filter: Record<string, any> = {
      businessId: businessId as any,
      isActive: true,
    };

    if (docType) {
      filter.docType = docType;
    }

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } },
      ];
    }

    const page = Math.max(options.page || 1, 1);
    const limit = Math.max(options.limit || 20, 1);
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.knowledgeBaseModel
        .find(filter)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.knowledgeBaseModel.countDocuments(filter).exec(),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(businessId: string, id: string): Promise<KnowledgeBaseDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new DomainException(
        'KNOWLEDGE_DOC_NOT_FOUND',
        `Knowledge document with ID '${id}' not found.`,
        HttpStatus.NOT_FOUND,
      );
    }

    const doc = await this.knowledgeBaseModel
      .findOne({
        _id: id as any,
        businessId: businessId as any,
      })
      .exec();

    if (!doc) {
      throw new DomainException(
        'KNOWLEDGE_DOC_NOT_FOUND',
        `Knowledge document with ID '${id}' not found.`,
        HttpStatus.NOT_FOUND,
      );
    }

    return doc;
  }

  async findChunksForDoc(
    businessId: string,
    knowledgeBaseId: string,
  ): Promise<KnowledgeChunkDocument[]> {
    if (!Types.ObjectId.isValid(knowledgeBaseId)) {
      return [];
    }

    return this.knowledgeChunkModel
      .find({
        businessId: businessId as any,
        knowledgeBaseId: knowledgeBaseId as any,
      })
      .sort({ chunkIndex: 1 })
      .exec();
  }

  async update(
    businessId: string,
    id: string,
    dto: UpdateKnowledgeDocDto,
  ): Promise<{ document: KnowledgeBaseDocument; chunksCount?: number }> {
    const doc = await this.findOne(businessId, id);

    const isContentUpdated = dto.content && dto.content !== doc.content;

    Object.assign(doc, dto);
    const updatedDoc = await doc.save();

    let chunksCount: number | undefined;

    if (isContentUpdated) {
      // Find old chunks to clean up vector store index
      const oldChunks = await this.findChunksForDoc(businessId, updatedDoc._id.toString());
      if (this.vectorStoreService) {
        for (const oldChunk of oldChunks) {
          await this.vectorStoreService
            .deleteVectorByEntityId(businessId, oldChunk._id.toString())
            .catch(() => {});
        }
      }

      // Delete existing chunks and re-chunk
      await this.knowledgeChunkModel.deleteMany({
        knowledgeBaseId: updatedDoc._id as any,
      });

      const chunks = this.chunkText(updatedDoc.content);
      const chunkDocs = chunks.map((chunkText, index) => ({
        businessId: new Types.ObjectId(businessId),
        knowledgeBaseId: updatedDoc._id,
        text: chunkText,
        chunkIndex: index,
        metadata: {
          docTitle: updatedDoc.title,
          docType: updatedDoc.docType,
        },
      }));

      if (chunkDocs.length > 0) {
        const createdChunks = await this.knowledgeChunkModel.insertMany(chunkDocs as any[]);
        chunksCount = createdChunks.length;

        // Auto-embed updated knowledge chunks in bulk
        if (this.vectorStoreService) {
          const batchEntries = createdChunks.map((chunk) => ({
            entityType: EntityType.KNOWLEDGE_CHUNK,
            entityId: chunk._id.toString(),
            text: chunk.text,
            metadata: {
              knowledgeBaseId: updatedDoc._id.toString(),
              docTitle: updatedDoc.title,
              docType: updatedDoc.docType,
            },
          }));

          try {
            await this.vectorStoreService.upsertBatchVectors(businessId, batchEntries);
            await Promise.all([
              this.knowledgeBaseModel.findByIdAndUpdate(updatedDoc._id, { $set: { isEmbedded: true } }).exec(),
              this.knowledgeChunkModel.updateMany(
                { _id: { $in: createdChunks.map((c) => c._id) } },
                { $set: { isEmbedded: true } },
              ).exec(),
            ]);
          } catch (err: any) {
            this.logger.error(
              `[KnowledgeService] Bulk vector embedding failed for updated knowledge base ${updatedDoc._id}: ${err.message}`,
            );
          }
        }
      }
    }

    this.invalidateRagCache(businessId);

    return {
      document: updatedDoc,
      chunksCount,
    };
  }

  async remove(businessId: string, id: string): Promise<{ message: string }> {
    const doc = await this.findOne(businessId, id);

    // Delete associated vector embeddings
    const chunks = await this.findChunksForDoc(businessId, doc._id.toString());
    if (this.vectorStoreService) {
      for (const chunk of chunks) {
        await this.vectorStoreService
          .deleteVectorByEntityId(businessId, chunk._id.toString())
          .catch(() => {});
      }
    }

    const result = await this.knowledgeBaseModel
      .deleteOne({ _id: id as any, businessId: businessId as any })
      .exec();

    if (result.deletedCount === 0) {
      throw new DomainException(
        'KNOWLEDGE_DOC_NOT_FOUND',
        `Knowledge document with ID '${id}' not found.`,
        HttpStatus.NOT_FOUND,
      );
    }

    // Cascade delete chunks
    await this.knowledgeChunkModel.deleteMany({ knowledgeBaseId: id as any });
    this.invalidateRagCache(businessId);

    return { message: 'Knowledge base document and its chunks deleted successfully.' };
  }

  /**
   * Idempotently upserts an extracted knowledge document (policy, FAQ, service description)
   * avoiding duplicate documents, unnecessary writes, and redundant vector re-embeddings.
   */
  async upsertExtractedDoc(
    businessId: string,
    doc: {
      title: string;
      category: 'policy' | 'faq' | 'general' | 'services' | 'pricing';
      markdown: string;
      sourceUrl?: string;
      contentHash?: string;
    },
  ): Promise<{ document: KnowledgeBaseDocument; updated: boolean; chunksCount: number }> {
    const docType = this.mapCategoryToDocType(doc.category);

    // Look for existing document by sourceUrl or (businessId + exact title + docType)
    const existing = await this.knowledgeBaseModel
      .findOne({
        businessId: businessId as any,
        $or: [
          ...(doc.sourceUrl ? [{ sourceUrl: doc.sourceUrl }] : []),
          { title: doc.title, docType },
        ],
      })
      .exec();

    if (existing) {
      // Content hash check to prevent redundant writes and re-embeddings
      if (
        existing.metadata?.contentHash === doc.contentHash ||
        existing.content.trim() === doc.markdown.trim()
      ) {
        this.logger.debug(
          `[KnowledgeService] Skipping unchanged knowledge doc '${doc.title}' (${existing._id})`,
        );
        return { document: existing, updated: false, chunksCount: 0 };
      }

      // Content changed - update and re-embed chunks
      const result = await this.update(businessId, existing._id.toString(), {
        title: doc.title,
        content: doc.markdown,
        metadata: { ...existing.metadata, contentHash: doc.contentHash },
      });

      return { document: result.document, updated: true, chunksCount: result.chunksCount || 0 };
    }

    // New document
    const created = await this.create(businessId, {
      title: doc.title,
      docType,
      content: doc.markdown,
      sourceUrl: doc.sourceUrl,
      metadata: { contentHash: doc.contentHash },
    });

    return { document: created.document, updated: true, chunksCount: created.chunksCount };
  }

  private mapCategoryToDocType(category: string): DocType {
    switch (category) {
      case 'policy':
        return DocType.POLICY;
      case 'faq':
        return DocType.FAQ;
      case 'services':
      case 'pricing':
        return DocType.SALES_PLAYBOOK;
      default:
        return DocType.BRAND_RULE;
    }
  }

  /**
   * Chunks text into ~1000 character snippets with 100 character overlap for optimal semantic context.
   */
  private chunkText(text: string, chunkSize = 1000, overlap = 100): string[] {
    if (!text || text.trim().length === 0) return [];
    const normalized = text.replace(/\r\n/g, '\n').trim();
    if (normalized.length <= chunkSize) return [normalized];

    const chunks: string[] = [];
    let start = 0;

    while (start < normalized.length) {
      let end = start + chunkSize;
      if (end >= normalized.length) {
        chunks.push(normalized.substring(start));
        break;
      }

      // Try to break at a newline or period or space to avoid cutting words
      const lastNewline = normalized.lastIndexOf('\n', end);
      const lastPeriod = normalized.lastIndexOf('. ', end);
      const lastSpace = normalized.lastIndexOf(' ', end);

      if (lastNewline > start + chunkSize / 2) {
        end = lastNewline + 1;
      } else if (lastPeriod > start + chunkSize / 2) {
        end = lastPeriod + 1;
      } else if (lastSpace > start + chunkSize / 2) {
        end = lastSpace + 1;
      }

      chunks.push(normalized.substring(start, end).trim());
      start = Math.max(start + 1, end - overlap);
    }

    return chunks;
  }

  /**
   * Turn a merchant's spoken voice-feed session into categorised knowledge.
   *
   * The transcript is segmented by topic and each topic is filed under its own
   * DocType, rather than the whole session being stored as one note. A note
   * spanning returns, sizing and pricing produces chunks that match every
   * query weakly and none of them well, which is the failure mode this avoids.
   *
   * Re-teaching the same topic updates the existing document instead of
   * creating a near-duplicate, so a merchant can correct themselves by simply
   * saying it again.
   */
  async ingestVoiceTranscript(
    businessId: string,
    dto: IngestVoiceTranscriptDto,
  ): Promise<{
    method: 'model' | 'heuristic';
    saved: {
      id: string;
      title: string;
      docType: DocType;
      confidence: number;
      action: 'created' | 'updated' | 'unchanged';
    }[];
    skippedTurns: number;
  }> {
    if (!this.voiceStructurer) {
      throw new DomainException(
        'VOICE_STRUCTURING_UNAVAILABLE',
        'Voice transcript structuring is not available on this deployment.',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    const { entries, method } = await this.voiceStructurer.structure(
      dto.turns,
      dto.targetCategory,
    );

    if (entries.length === 0) {
      return { method, saved: [], skippedTurns: dto.turns.length };
    }

    const saved: {
      id: string;
      title: string;
      docType: DocType;
      confidence: number;
      action: 'created' | 'updated' | 'unchanged';
    }[] = [];

    for (const entry of entries) {
      try {
        saved.push(await this.persistVoiceEntry(businessId, entry, dto.sessionId));
      } catch (err: any) {
        this.logger.warn(
          `[KnowledgeService] Could not save voice entry '${entry.title}': ${err.message}`,
        );
      }
    }

    this.logger.log(
      `[KnowledgeService] Voice feed for business ${businessId}: ${saved.length} entries via ${method}.`,
    );

    return { method, saved, skippedTurns: 0 };
  }

  /** Create or update the one document that owns this topic for the tenant. */
  private async persistVoiceEntry(
    businessId: string,
    entry: StructuredKnowledgeEntry,
    sessionId?: string,
  ): Promise<{
    id: string;
    title: string;
    docType: DocType;
    confidence: number;
    action: 'created' | 'updated' | 'unchanged';
  }> {
    const existing = await this.knowledgeBaseModel
      .findOne({
        businessId: businessId as any,
        docType: entry.docType,
        title: entry.title,
      })
      .exec();

    const metadata = {
      source: 'voice_feed',
      extraction: entry.tags.includes('uncategorised-review') ? 'heuristic' : 'model',
      confidence: entry.confidence,
      tags: entry.tags,
      ...(sessionId ? { sessionId } : {}),
      lastFedAt: new Date().toISOString(),
    };

    if (existing) {
      if (existing.content.trim() === entry.content.trim()) {
        return {
          id: existing._id.toString(),
          title: existing.title,
          docType: entry.docType,
          confidence: entry.confidence,
          action: 'unchanged',
        };
      }

      const updated = await this.update(businessId, existing._id.toString(), {
        content: entry.content,
        metadata: { ...existing.metadata, ...metadata },
      });

      return {
        id: updated.document._id.toString(),
        title: updated.document.title,
        docType: entry.docType,
        confidence: entry.confidence,
        action: 'updated',
      };
    }

    const created = await this.create(businessId, {
      docType: entry.docType,
      title: entry.title,
      content: entry.content,
      metadata,
    });

    return {
      id: created.document._id.toString(),
      title: created.document.title,
      docType: entry.docType,
      confidence: entry.confidence,
      action: 'created',
    };
  }
}
