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

  /**
   * Points a user at their current session id so a repeat login can reuse it.
   *
   * The Shopify embedded app re-exchanges its App Bridge token on every page
   * load (those tokens live about a minute), and each exchange would otherwise
   * write a fresh 7-day session. This pointer keeps that at one session per
   * user instead of one per page load, without the `keys('session:*')` scan
   * `revokeUserSessions` needs.
   */
  async setUserSessionPointer(
    adminUserId: string,
    sessionId: string,
    ttlSeconds: number = 7 * 24 * 60 * 60,
  ): Promise<void> {
    await this.redisClient.set(
      `user-session:${adminUserId}`,
      sessionId,
      'EX',
      ttlSeconds,
    );
  }

  async getUserSessionPointer(adminUserId: string): Promise<string | null> {
    return this.redisClient.get(`user-session:${adminUserId}`);
  }

  async deleteUserSessionPointer(adminUserId: string): Promise<void> {
    await this.redisClient.del(`user-session:${adminUserId}`);
  }

  /**
   * Single-holder lock. Returns false when someone else holds it, so a caller
   * can decline rather than duplicating non-idempotent work.
   */
  async acquireLock(key: string, ttlSeconds: number): Promise<boolean> {
    const result = await this.redisClient.set(key, '1', 'EX', ttlSeconds, 'NX');
    return result === 'OK';
  }

  async releaseLock(key: string): Promise<void> {
    await this.redisClient.del(key);
  }

  /** Stores a single-use value, such as an OAuth nonce. */
  async setSingleUseValue(
    key: string,
    value: string,
    ttlSeconds: number,
  ): Promise<void> {
    await this.redisClient.set(key, value, 'EX', ttlSeconds);
  }

  /**
   * Reads a value and deletes it in the same round trip, so a replay of the
   * same nonce finds nothing.
   */
  async consumeSingleUseValue(key: string): Promise<string | null> {
    const value = await this.redisClient.get(key);
    if (value !== null) {
      await this.redisClient.del(key);
    }
    return value;
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
