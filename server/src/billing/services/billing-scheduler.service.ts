import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { BillingService } from '../billing.service';
import { RedisService } from '../../common/redis/redis.service';

@Injectable()
export class BillingSchedulerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BillingSchedulerService.name);
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private readonly billingService: BillingService,
    private readonly redisService: RedisService,
  ) {}

  onModuleInit() {
    this.logger.log(
      '[BillingSchedulerService] Initializing automated bKash renewal scheduler (every 6h)...',
    );
    // Run initial check after 10s warmup, then every 6 hours
    setTimeout(() => this.runScheduledRenewals(), 10000);
    this.timer = setInterval(() => this.runScheduledRenewals(), 6 * 60 * 60 * 1000);
  }

  onModuleDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  async runScheduledRenewals() {
    const lockKey = `lock:bkash-renewal:${new Date().toISOString().substring(0, 13)}`;
    const redis = this.redisService.getClient();

    // Idempotency lock for multi-instance clusters (1 hour TTL)
    const acquired = await redis.set(lockKey, 'LOCKED', 'EX', 3600, 'NX');
    if (!acquired) {
      this.logger.log(
        '[BillingSchedulerService] Renewal job skipped: lock already held by another node.',
      );
      return;
    }

    try {
      this.logger.log(
        '[BillingSchedulerService] Starting scheduled bKash renewal execution run...',
      );
      const res = await this.billingService.processBkashRenewals();
      this.logger.log(
        `[BillingSchedulerService] Scheduled bKash renewals complete. Processed: ${res.processed}`,
      );
    } catch (err: any) {
      this.logger.error(
        `[BillingSchedulerService] Error executing scheduled bKash renewals: ${err.message}`,
      );
    }
  }
}
