import { OnModuleDestroy } from '@nestjs/common';
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
export declare class RedisService implements OnModuleDestroy {
    private readonly configService;
    private readonly redisClient;
    private readonly logger;
    constructor(configService: ConfigService);
    getClient(): Redis;
    setSession(sessionId: string, sessionData: SessionData, ttlSeconds?: number): Promise<void>;
    getSession(sessionId: string): Promise<SessionData | null>;
    revokeSession(sessionId: string): Promise<void>;
    onModuleDestroy(): void;
}
