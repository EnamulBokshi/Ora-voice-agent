"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var AuthService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
const bcrypt = __importStar(require("bcryptjs"));
const crypto = __importStar(require("crypto"));
const users_service_1 = require("../users/users.service");
const redis_service_1 = require("../common/redis/redis.service");
const mail_service_1 = require("../mail/mail.service");
const domain_exception_1 = require("../common/exceptions/domain.exception");
const admin_role_enum_1 = require("../users/enums/admin-role.enum");
let AuthService = AuthService_1 = class AuthService {
    usersService;
    jwtService;
    redisService;
    mailService;
    configService;
    logger = new common_1.Logger(AuthService_1.name);
    constructor(usersService, jwtService, redisService, mailService, configService) {
        this.usersService = usersService;
        this.jwtService = jwtService;
        this.redisService = redisService;
        this.mailService = mailService;
        this.configService = configService;
    }
    async register(dto, reqInfo) {
        const existingUser = await this.usersService.findByEmail(dto.email);
        if (existingUser) {
            throw new domain_exception_1.DomainException('EMAIL_ALREADY_EXISTS', 'Email address is already registered.', common_1.HttpStatus.CONFLICT);
        }
        const passwordHash = await bcrypt.hash(dto.password, 10);
        const business = await this.usersService.createBusiness(dto.businessName, dto.domain);
        const user = await this.usersService.createAdminUser({
            businessId: business._id.toString(),
            email: dto.email,
            passwordHash,
            name: dto.name,
            role: admin_role_enum_1.AdminRole.OWNER,
        });
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        const pendingOtpHash = await bcrypt.hash(otpCode, 10);
        const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
        await this.usersService.updateAdminUser(user._id.toString(), {
            pendingOtpHash,
            otpExpiresAt,
            otpAttemptCount: 0,
        });
        await this.mailService.sendVerificationEmail(user.email, {
            recipientName: user.name,
            verifyUrl: `${this.configService.get('FRONTEND_URL', 'http://localhost:3000')}/verify-otp`,
            code: otpCode,
            expireMinutes: 10,
        });
        const sessionId = crypto.randomUUID();
        const tokens = await this.generateTokens(user._id.toString(), business._id.toString(), user.email, user.role, sessionId);
        const refreshTokenHash = await bcrypt.hash(tokens.refreshToken, 10);
        await this.redisService.setSession(sessionId, {
            adminUserId: user._id.toString(),
            businessId: business._id.toString(),
            email: user.email,
            role: user.role,
            refreshTokenHash,
            userAgent: reqInfo.userAgent,
            ip: reqInfo.ip,
            createdAt: new Date().toISOString(),
        });
        return {
            tokens,
            sessionId,
            user: {
                id: user._id.toString(),
                name: user.name,
                email: user.email,
                role: user.role,
                emailVerified: false,
            },
            business: {
                id: business._id.toString(),
                name: business.name,
                domain: business.domain,
                publishableKey: business.publishableKey,
            },
        };
    }
    async login(dto, reqInfo) {
        const user = await this.usersService.findByEmail(dto.email);
        if (!user) {
            throw new domain_exception_1.DomainException('INVALID_CREDENTIALS', 'Invalid email or password.', common_1.HttpStatus.UNAUTHORIZED);
        }
        const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
        if (!isPasswordValid) {
            throw new domain_exception_1.DomainException('INVALID_CREDENTIALS', 'Invalid email or password.', common_1.HttpStatus.UNAUTHORIZED);
        }
        const business = await this.usersService.findBusinessById(user.businessId.toString());
        if (!business) {
            throw new domain_exception_1.DomainException('BUSINESS_NOT_FOUND', 'Associated business tenant not found.', common_1.HttpStatus.NOT_FOUND);
        }
        const sessionId = crypto.randomUUID();
        const tokens = await this.generateTokens(user._id.toString(), business._id.toString(), user.email, user.role, sessionId);
        const refreshTokenHash = await bcrypt.hash(tokens.refreshToken, 10);
        await this.redisService.setSession(sessionId, {
            adminUserId: user._id.toString(),
            businessId: business._id.toString(),
            email: user.email,
            role: user.role,
            refreshTokenHash,
            userAgent: reqInfo.userAgent,
            ip: reqInfo.ip,
            createdAt: new Date().toISOString(),
        });
        return {
            tokens,
            sessionId,
            user: {
                id: user._id.toString(),
                name: user.name,
                email: user.email,
                role: user.role,
                emailVerified: user.emailVerified,
            },
            business: {
                id: business._id.toString(),
                name: business.name,
                domain: business.domain,
                publishableKey: business.publishableKey,
            },
        };
    }
    async refresh(refreshToken, sessionId, reqInfo) {
        if (!refreshToken || !sessionId) {
            throw new domain_exception_1.DomainException('INVALID_SESSION', 'Session ID and refresh token are required.', common_1.HttpStatus.UNAUTHORIZED);
        }
        const session = await this.redisService.getSession(sessionId);
        if (!session) {
            throw new domain_exception_1.DomainException('SESSION_EXPIRED', 'Session has expired or was revoked. Please log in again.', common_1.HttpStatus.UNAUTHORIZED);
        }
        const isMatch = await bcrypt.compare(refreshToken, session.refreshTokenHash);
        if (!isMatch) {
            this.logger.error(`[Token Theft Detected] Mismatch on sessionId ${sessionId} for user ${session.adminUserId}. Revoking session.`);
            await this.redisService.revokeSession(sessionId);
            throw new domain_exception_1.DomainException('TOKEN_THEFT_DETECTED', 'Security alert: Invalid refresh token presented. Session revoked.', common_1.HttpStatus.UNAUTHORIZED);
        }
        const newTokens = await this.generateTokens(session.adminUserId, session.businessId, session.email, session.role, sessionId);
        const newRefreshTokenHash = await bcrypt.hash(newTokens.refreshToken, 10);
        await this.redisService.setSession(sessionId, {
            ...session,
            refreshTokenHash: newRefreshTokenHash,
            userAgent: reqInfo.userAgent || session.userAgent,
            ip: reqInfo.ip || session.ip,
        });
        return newTokens;
    }
    async logout(sessionId) {
        if (sessionId) {
            await this.redisService.revokeSession(sessionId);
        }
        return { message: 'Successfully logged out.' };
    }
    async verifyOtp(adminUserId, code) {
        const user = await this.usersService.findById(adminUserId);
        if (!user) {
            throw new domain_exception_1.DomainException('USER_NOT_FOUND', 'Admin user profile not found.', common_1.HttpStatus.NOT_FOUND);
        }
        if (user.emailVerified) {
            return { message: 'Email address is already verified.', emailVerified: true };
        }
        if (!user.pendingOtpHash || !user.otpExpiresAt) {
            throw new domain_exception_1.DomainException('OTP_NOT_REQUESTED', 'No active verification OTP found. Please request a new code.', common_1.HttpStatus.BAD_REQUEST);
        }
        if (new Date() > new Date(user.otpExpiresAt)) {
            throw new domain_exception_1.DomainException('OTP_EXPIRED', 'Verification code has expired. Please request a new code.', common_1.HttpStatus.BAD_REQUEST);
        }
        if (user.otpAttemptCount >= 5) {
            throw new domain_exception_1.DomainException('OTP_MAX_ATTEMPTS', 'Maximum verification attempts reached. Please request a new code.', common_1.HttpStatus.TOO_MANY_REQUESTS);
        }
        const isValid = await bcrypt.compare(code, user.pendingOtpHash);
        if (!isValid) {
            await this.usersService.updateAdminUser(user._id.toString(), {
                otpAttemptCount: user.otpAttemptCount + 1,
            });
            throw new domain_exception_1.DomainException('INVALID_OTP', `Invalid verification code. ${4 - user.otpAttemptCount} attempts remaining.`, common_1.HttpStatus.BAD_REQUEST);
        }
        await this.usersService.updateAdminUser(user._id.toString(), {
            emailVerified: true,
            pendingOtpHash: undefined,
            otpExpiresAt: undefined,
            otpAttemptCount: 0,
        });
        return {
            message: 'Email address successfully verified.',
            emailVerified: true,
        };
    }
    async resendOtp(adminUserId) {
        const user = await this.usersService.findById(adminUserId);
        if (!user) {
            throw new domain_exception_1.DomainException('USER_NOT_FOUND', 'Admin user profile not found.', common_1.HttpStatus.NOT_FOUND);
        }
        if (user.emailVerified) {
            return { message: 'Email address is already verified.' };
        }
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        const pendingOtpHash = await bcrypt.hash(otpCode, 10);
        const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
        await this.usersService.updateAdminUser(user._id.toString(), {
            pendingOtpHash,
            otpExpiresAt,
            otpAttemptCount: 0,
        });
        await this.mailService.sendVerificationEmail(user.email, {
            recipientName: user.name,
            verifyUrl: `${this.configService.get('FRONTEND_URL', 'http://localhost:3000')}/verify-otp`,
            code: otpCode,
            expireMinutes: 10,
        });
        return { message: 'New verification OTP sent to your email.' };
    }
    async getProfile(adminUserId) {
        const user = await this.usersService.findById(adminUserId);
        if (!user) {
            throw new domain_exception_1.DomainException('USER_NOT_FOUND', 'User profile not found.', common_1.HttpStatus.NOT_FOUND);
        }
        const business = await this.usersService.findBusinessById(user.businessId.toString());
        return {
            user: {
                id: user._id.toString(),
                name: user.name,
                email: user.email,
                role: user.role,
                emailVerified: user.emailVerified,
            },
            business: business
                ? {
                    id: business._id.toString(),
                    name: business.name,
                    domain: business.domain,
                    publishableKey: business.publishableKey,
                    status: business.status,
                }
                : null,
        };
    }
    async generateTokens(adminUserId, businessId, email, role, sessionId) {
        const payload = {
            sub: adminUserId,
            businessId,
            email,
            role,
            sessionId,
        };
        const accessToken = await this.jwtService.signAsync(payload, {
            expiresIn: '15m',
        });
        const refreshToken = crypto.randomBytes(32).toString('hex');
        return { accessToken, refreshToken };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = AuthService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [users_service_1.UsersService,
        jwt_1.JwtService,
        redis_service_1.RedisService,
        mail_service_1.MailService,
        config_1.ConfigService])
], AuthService);
//# sourceMappingURL=auth.service.js.map