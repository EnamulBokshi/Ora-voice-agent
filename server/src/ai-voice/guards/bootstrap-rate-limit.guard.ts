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
import { RedisService } from '../../common/redis/redis.service';
import { DomainException } from '../../common/exceptions/domain.exception';

@Injectable()
export class BootstrapRateLimitGuard implements CanActivate {
  private readonly logger = new Logger(BootstrapRateLimitGuard.name);

  // Dedicated limits for storefront bootstrap calls (Section 11.5)
  private readonly MAX_TENANT_BOOTSTRAP_PER_MINUTE = 2000;
  private readonly MAX_IP_BOOTSTRAP_PER_MINUTE = 60;

  constructor(
    @InjectModel(Business.name)
    private readonly businessModel: Model<BusinessDocument>,
    private readonly redisService: RedisService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    const publishableKey =
      request.headers['x-publishable-key'] ||
      request.query?.publishableKey ||
      request.body?.publishableKey;

    if (!publishableKey) {
      throw new DomainException(
        'MISSING_PUBLISHABLE_KEY',
        'Publishable key is required for widget bootstrap verification.',
        HttpStatus.UNAUTHORIZED,
      );
    }

    // 1. IP-Level Burst Protection (Anti-Spam / DDoS)
    const clientIp =
      (request.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      request.socket?.remoteAddress ||
      'unknown_ip';

    const currentMinute = new Date().toISOString().substring(0, 16);
    const redis = this.redisService.getClient();

    const ipRateLimitKey = `ratelimit:bootstrap:ip:${clientIp}:${currentMinute}`;
    const ipCount = await redis.incr(ipRateLimitKey);
    if (ipCount === 1) {
      await redis.expire(ipRateLimitKey, 60);
    }

    if (ipCount > this.MAX_IP_BOOTSTRAP_PER_MINUTE) {
      this.logger.warn(
        `[BootstrapRateLimitGuard] IP rate limit exceeded for ${clientIp} (${ipCount} req/min).`,
      );
      throw new DomainException(
        'IP_RATE_LIMIT_EXCEEDED',
        'Too many bootstrap requests from this client. Please slow down.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // 2. Validate Business Key
    let business = await this.businessModel
      .findOne({ publishableKey, status: 'active' })
      .exec();

    // Dev environment fallback for test keys
    if (
      !business &&
      publishableKey === 'biz_live_mock_key_12345' &&
      process.env.NODE_ENV !== 'production'
    ) {
      business = await this.businessModel
        .findOneAndUpdate(
          { publishableKey: 'biz_live_mock_key_12345' },
          {
            name: 'Dev Playground Store',
            publishableKey: 'biz_live_mock_key_12345',
            status: 'active',
          },
          { upsert: true, returnDocument: 'after' },
        )
        .exec();
    }

    if (!business) {
      throw new DomainException(
        'INVALID_PUBLISHABLE_KEY',
        `Invalid or inactive publishable key: '${publishableKey}'.`,
        HttpStatus.UNAUTHORIZED,
      );
    }

    if (business.keyStatus === 'suspended') {
      throw new DomainException(
        'KEY_SUSPENDED',
        'This publishable key has been suspended by administration.',
        HttpStatus.FORBIDDEN,
      );
    }

    if (business.isWidgetActive === false) {
      throw new DomainException(
        'WIDGET_DISABLED',
        'Storefront widget has been disabled by the merchant.',
        HttpStatus.FORBIDDEN,
      );
    }

    // 3. Domain Allowlist Check
    const origin =
      (request.headers['origin'] as string) ||
      (request.headers['referer'] as string) ||
      '';
    if (business.domain && origin) {
      const cleanOrigin = origin.replace(/^https?:\/\//, '').split('/')[0];
      const cleanBusinessDomain = business.domain
        .replace(/^https?:\/\//, '')
        .split('/')[0];

      if (
        cleanOrigin !== cleanBusinessDomain &&
        !cleanOrigin.endsWith('.' + cleanBusinessDomain)
      ) {
        this.logger.warn(
          `[BootstrapRateLimitGuard] Origin mismatch: '${cleanOrigin}' vs store domain '${cleanBusinessDomain}'.`,
        );
      }
    }

    // 4. Dedicated Tenant High-Throughput Bucket (2,000 req/min)
    const tenantRateLimitKey = `ratelimit:bootstrap:tenant:${business._id}:${currentMinute}`;
    const tenantCount = await redis.incr(tenantRateLimitKey);
    if (tenantCount === 1) {
      await redis.expire(tenantRateLimitKey, 60);
    }

    if (tenantCount > this.MAX_TENANT_BOOTSTRAP_PER_MINUTE) {
      this.logger.warn(
        `[BootstrapRateLimitGuard] Storefront bootstrap rate limit exceeded for business ${business.name} (${tenantCount} req/min).`,
      );
      throw new DomainException(
        'STOREFRONT_RATE_LIMIT_EXCEEDED',
        'Storefront traffic limit exceeded. Please wait a moment.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Attach verified business context to request
    request.business = business;
    request.businessId = business._id.toString();

    return true;
  }
}
