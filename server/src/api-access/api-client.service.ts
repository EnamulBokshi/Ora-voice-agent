import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as crypto from 'crypto';
import * as bcrypt from 'bcryptjs';
import {
  ApiClient,
  ApiClientDocument,
  ApiClientStatus,
  ApiScope,
} from './schemas/api-client.schema';
import { CreateApiClientDto } from './dto/create-api-client.dto';
import { DomainException } from '../common/exceptions/domain.exception';

@Injectable()
export class ApiClientService {
  private readonly logger = new Logger(ApiClientService.name);

  constructor(
    @InjectModel(ApiClient.name)
    private readonly apiClientModel: Model<ApiClientDocument>,
  ) {}

  /**
   * Issues a new client_id / client_secret pair for a tenant.
   * The plaintext secret is returned here and never again -- only its bcrypt
   * hash is persisted, so a database dump does not yield usable credentials.
   */
  async createClient(
    businessId: string,
    dto: CreateApiClientDto,
    createdBy?: string,
  ) {
    const clientId = `ora_client_${crypto.randomBytes(12).toString('hex')}`;
    const clientSecret = `ora_secret_${crypto.randomBytes(32).toString('base64url')}`;

    const client = await this.apiClientModel.create({
      businessId: businessId as any,
      name: dto.name,
      clientId,
      clientSecretHash: await bcrypt.hash(clientSecret, 10),
      secretHint: clientSecret.slice(-4),
      scopes: dto.scopes?.length ? dto.scopes : [ApiScope.INPUTS_WRITE],
      allowedIps: dto.allowedIps || [],
      status: ApiClientStatus.ACTIVE,
      createdBy,
    });

    return {
      id: client._id.toString(),
      name: client.name,
      client_id: clientId,
      // Shown exactly once. There is no endpoint that can retrieve it again.
      client_secret: clientSecret,
      scopes: client.scopes,
      allowedIps: client.allowedIps,
      tokenUrl: '/api/v1/oauth/token',
      warning:
        'Store client_secret now -- it cannot be retrieved later. Keep it server-side only; never embed it in browser or storefront code.',
    };
  }

  async listClients(businessId: string) {
    const clients = await this.apiClientModel
      .find({ businessId: businessId as any })
      .select('-clientSecretHash')
      .sort({ createdAt: -1 })
      .exec();

    return clients.map((c) => ({
      id: c._id.toString(),
      name: c.name,
      client_id: c.clientId,
      secretHint: c.secretHint ? `****${c.secretHint}` : undefined,
      scopes: c.scopes,
      status: c.status,
      allowedIps: c.allowedIps,
      lastUsedAt: c.lastUsedAt,
      revokedAt: c.revokedAt,
    }));
  }

  /**
   * Revocation is scoped by businessId so one tenant cannot revoke another's
   * client by guessing an id.
   */
  async revokeClient(businessId: string, id: string, revokedBy?: string) {
    const client = await this.apiClientModel
      .findOneAndUpdate(
        { _id: id, businessId: businessId as any },
        {
          $set: {
            status: ApiClientStatus.REVOKED,
            revokedAt: new Date(),
            revokedBy,
          },
        },
        { returnDocument: 'after' },
      )
      .exec();

    if (!client) {
      throw new DomainException(
        'API_CLIENT_NOT_FOUND',
        'No API client with that id exists for this business.',
        HttpStatus.NOT_FOUND,
      );
    }

    this.logger.warn(
      `[ApiClientService] Client ${client.clientId} revoked for business ${businessId}.`,
    );

    return { id: client._id.toString(), status: client.status };
  }

  /**
   * Verifies a client_id/client_secret pair for the token endpoint.
   *
   * Returns null for every failure mode -- unknown client, wrong secret,
   * revoked client, disallowed IP -- so the caller cannot distinguish them and
   * use the endpoint to enumerate valid client ids.
   */
  async verifyCredentials(
    clientId: string,
    clientSecret: string,
    callerIp?: string,
  ): Promise<ApiClientDocument | null> {
    const client = await this.apiClientModel.findOne({ clientId }).exec();

    if (!client) {
      // Burn comparable CPU time on a dummy hash so response latency does not
      // reveal whether the client id exists.
      await bcrypt
        .compare(clientSecret, `$2a$10$${'a'.repeat(53)}`)
        .catch(() => false);
      return null;
    }

    if (client.status !== ApiClientStatus.ACTIVE) {
      return null;
    }

    if (client.allowedIps.length > 0) {
      if (!callerIp || !client.allowedIps.includes(callerIp)) {
        this.logger.warn(
          `[ApiClientService] Token request for ${clientId} refused from non-allowlisted IP '${callerIp}'.`,
        );
        return null;
      }
    }

    const matches = await bcrypt.compare(clientSecret, client.clientSecretHash);
    if (!matches) {
      return null;
    }

    return client;
  }

  /**
   * Re-checks a client on every authenticated request, so revoking a client
   * takes effect immediately rather than when its access token expires.
   */
  async findActiveByClientId(
    clientId: string,
  ): Promise<ApiClientDocument | null> {
    const client = await this.apiClientModel.findOne({ clientId }).exec();
    if (!client || client.status !== ApiClientStatus.ACTIVE) {
      return null;
    }
    return client;
  }

  async touchLastUsed(clientId: string): Promise<void> {
    await this.apiClientModel
      .updateOne({ clientId }, { $set: { lastUsedAt: new Date() } })
      .exec();
  }
}
