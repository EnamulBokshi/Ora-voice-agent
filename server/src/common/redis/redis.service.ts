import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export interface SessionData {
  adminUserId: string;
  businessId: string;
  email: string;
  role: string;
  refreshTokenHash: string;
  userAgent?: string;
  ip?: string;
  createdAt: string;
}

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly redisClient: Redis;
  private readonly logger = new Logger(RedisService.name);

  constructor(private readonly configService: ConfigService) {
    const host = (this.configService.get('REDIS_HOST') as string) || 'localhost';
    const port = Number(this.configService.get('REDIS_PORT')) || 6379;
    const password = (this.configService.get('REDIS_PASSWORD') as string) || undefined;

    this.redisClient = new Redis({
      host,
      port,
      ...(password ? { password } : {}),
      lazyConnect: true,
      retryStrategy: (times) => Math.min(times * 100, 3000),
    });

    this.redisClient.connect().catch((err) => {
      this.logger.error(`Redis connection failed: ${err.message}`);
    });
  }

  getClient(): Redis {
    return this.redisClient;
  }

  async setSession(
    sessionId: string,
    sessionData: SessionData,
    ttlSeconds: number = 7 * 24 * 60 * 60, // 7 days
  ): Promise<void> {
    const key = `session:${sessionId}`;
    await this.redisClient.set(
      key,
      JSON.stringify(sessionData),
      'EX',
      ttlSeconds,
    );
  }

  async getSession(sessionId: string): Promise<SessionData | null> {
    const key = `session:${sessionId}`;
    const data = await this.redisClient.get(key);
    if (!data) return null;
    try {
      return JSON.parse(data) as SessionData;
    } catch {
      return null;
    }
  }

  async revokeSession(sessionId: string): Promise<void> {
    const key = `session:${sessionId}`;
    await this.redisClient.del(key);
  }

  async revokeUserSessions(adminUserId: string): Promise<number> {
    try {
      const keys = await this.redisClient.keys('session:*');
      let count = 0;
      for (const key of keys) {
        const raw = await this.redisClient.get(key);
        if (raw) {
          try {
            const data = JSON.parse(raw);
            if (data.adminUserId === adminUserId) {
              await this.redisClient.del(key);
              count++;
            }
          } catch {
            // ignore JSON parse error
          }
        }
      }
      return count;
    } catch (err: any) {
      this.logger.warn(`Failed to scan/revoke user sessions: ${err.message}`);
      return 0;
    }
  }

  onModuleDestroy() {
    this.redisClient.disconnect();
  }
}
