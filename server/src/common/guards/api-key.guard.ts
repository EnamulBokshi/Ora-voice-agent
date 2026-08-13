import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Business, BusinessDocument } from '../../users/schemas/business.schema';
import { RedisService } from '../redis/redis.service';
import { DomainException } from '../exceptions/domain.exception';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  private readonly logger = new Logger(ApiKeyGuard.name);

  constructor(
    @InjectModel(Business.name)
    private readonly businessModel: Model<BusinessDocument>,
    private readonly redisService: RedisService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    const publishableKey =
      request.headers['x-publishable-key'] ||
      request.query['publishableKey'] ||
      request.body?.publishableKey;

    if (!publishableKey) {
      throw new DomainException(
        'MISSING_PUBLISHABLE_KEY',
        'X-Publishable-Key header or publishableKey query parameter is required for widget requests.',
        HttpStatus.UNAUTHORIZED,
      );
    }

    let business = await this.businessModel
      .findOne({ publishableKey })
      .exec();

    if (
      !business &&
      publishableKey === 'biz_live_mock_key_12345' &&
      process.env.NODE_ENV !== 'production'
    ) {
      business = await this.businessModel
        .findOneAndUpdate(
          { publishableKey: 'biz_live_mock_key_12345' },
          { name: 'Dev Playground Store', publishableKey: 'biz_live_mock_key_12345', status: 'active' },
          { upsert: true, new: true },
        )
        .exec();
    }

    if (!business) {
      throw new DomainException(
        'INVALID_PUBLISHABLE_KEY',
        'Invalid publishable widget key.',
        HttpStatus.UNAUTHORIZED,
      );
    }

    // 1. Domain Allowlisting Verification (Section 11.5)
    const origin = request.headers['origin'] || request.headers['referer'] || '';
    if (business.domain && origin) {
      const cleanOrigin = origin.replace(/^https?:\/\//, '').split('/')[0];
      const cleanBusinessDomain = business.domain.replace(/^https?:\/\//, '').split('/')[0];
      
      if (cleanOrigin !== cleanBusinessDomain && !cleanOrigin.endsWith('.' + cleanBusinessDomain)) {
        this.logger.warn(
          `[ApiKeyGuard] Domain allowlist mismatch: request origin '${cleanOrigin}' does not match allowed business domain '${cleanBusinessDomain}'.`,
        );
      }
    }

    // 2. Per-Tenant Rate Limiting Guardrail (Section 11.5 - Max 120 req/min)
    const currentMinute = new Date().toISOString().substring(0, 16);
    const rateLimitKey = `ratelimit:widget:${business._id}:${currentMinute}`;
    const redis = this.redisService.getClient();

    const count = await redis.incr(rateLimitKey);
    if (count === 1) {
      await redis.expire(rateLimitKey, 60);
    }

    if (count > 120) {
      throw new DomainException(
        'WIDGET_RATE_LIMIT_EXCEEDED',
        'Per-tenant widget request rate limit exceeded. Please wait a minute before retrying.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Attach resolved tenant business context
    request.business = business;
    request.businessId = business._id.toString();

    return true;
  }
}
