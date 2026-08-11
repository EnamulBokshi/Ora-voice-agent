import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { RedisService } from '../common/redis/redis.service';
import { MailService } from '../mail/mail.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AdminRole } from '../users/enums/admin-role.enum';
export interface AuthTokens {
    accessToken: string;
    refreshToken: string;
}
export declare class AuthService {
    private readonly usersService;
    private readonly jwtService;
    private readonly redisService;
    private readonly mailService;
    private readonly configService;
    private readonly logger;
    constructor(usersService: UsersService, jwtService: JwtService, redisService: RedisService, mailService: MailService, configService: ConfigService);
    register(dto: RegisterDto, reqInfo: {
        userAgent?: string;
        ip?: string;
    }): Promise<{
        tokens: AuthTokens;
        sessionId: `${string}-${string}-${string}-${string}-${string}`;
        user: {
            id: string;
            name: string;
            email: string;
            role: AdminRole;
            emailVerified: boolean;
        };
        business: {
            id: string;
            name: string;
            domain: string | undefined;
            publishableKey: string;
        };
    }>;
    login(dto: LoginDto, reqInfo: {
        userAgent?: string;
        ip?: string;
    }): Promise<{
        tokens: AuthTokens;
        sessionId: `${string}-${string}-${string}-${string}-${string}`;
        user: {
            id: string;
            name: string;
            email: string;
            role: AdminRole;
            emailVerified: boolean;
        };
        business: {
            id: string;
            name: string;
            domain: string | undefined;
            publishableKey: string;
        };
    }>;
    refresh(refreshToken: string, sessionId: string, reqInfo: {
        userAgent?: string;
        ip?: string;
    }): Promise<AuthTokens>;
    logout(sessionId: string): Promise<{
        message: string;
    }>;
    verifyOtp(adminUserId: string, code: string): Promise<{
        message: string;
        emailVerified: boolean;
    }>;
    resendOtp(adminUserId: string): Promise<{
        message: string;
    }>;
    getProfile(adminUserId: string): Promise<{
        user: {
            id: string;
            name: string;
            email: string;
            role: AdminRole;
            emailVerified: boolean;
        };
        business: {
            id: string;
            name: string;
            domain: string | undefined;
            publishableKey: string;
            status: string;
        } | null;
    }>;
    private generateTokens;
}
