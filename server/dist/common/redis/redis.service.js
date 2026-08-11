"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var RedisService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const ioredis_1 = __importDefault(require("ioredis"));
let RedisService = RedisService_1 = class RedisService {
    configService;
    redisClient;
    logger = new common_1.Logger(RedisService_1.name);
    constructor(configService) {
        this.configService = configService;
        const host = this.configService.get('REDIS_HOST') || 'localhost';
        const port = Number(this.configService.get('REDIS_PORT')) || 6379;
        const password = this.configService.get('REDIS_PASSWORD') || undefined;
        this.redisClient = new ioredis_1.default({
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
    getClient() {
        return this.redisClient;
    }
    async setSession(sessionId, sessionData, ttlSeconds = 7 * 24 * 60 * 60) {
        const key = `session:${sessionId}`;
        await this.redisClient.set(key, JSON.stringify(sessionData), 'EX', ttlSeconds);
    }
    async getSession(sessionId) {
        const key = `session:${sessionId}`;
        const data = await this.redisClient.get(key);
        if (!data)
            return null;
        try {
            return JSON.parse(data);
        }
        catch {
            return null;
        }
    }
    async revokeSession(sessionId) {
        const key = `session:${sessionId}`;
        await this.redisClient.del(key);
    }
    onModuleDestroy() {
        this.redisClient.disconnect();
    }
};
exports.RedisService = RedisService;
exports.RedisService = RedisService = RedisService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], RedisService);
//# sourceMappingURL=redis.service.js.map