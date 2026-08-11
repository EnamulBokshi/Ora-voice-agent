import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import type { JwtPayloadUser } from '../common/decorators/current-user.decorator';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    register(dto: RegisterDto, req: Request, res: Response): Promise<{
        accessToken: string;
        user: {
            id: string;
            name: string;
            email: string;
            role: import("../users/enums/admin-role.enum").AdminRole;
            emailVerified: boolean;
        };
        business: {
            id: string;
            name: string;
            domain: string | undefined;
            publishableKey: string;
        };
    }>;
    login(dto: LoginDto, req: Request, res: Response): Promise<{
        accessToken: string;
        user: {
            id: string;
            name: string;
            email: string;
            role: import("../users/enums/admin-role.enum").AdminRole;
            emailVerified: boolean;
        };
        business: {
            id: string;
            name: string;
            domain: string | undefined;
            publishableKey: string;
        };
    }>;
    refresh(req: Request, res: Response): Promise<{
        accessToken: string;
    }>;
    logout(req: Request, res: Response): Promise<{
        message: string;
    }>;
    getProfile(user: JwtPayloadUser): Promise<{
        user: {
            id: string;
            name: string;
            email: string;
            role: import("../users/enums/admin-role.enum").AdminRole;
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
    verifyOtp(user: JwtPayloadUser, dto: VerifyOtpDto): Promise<{
        message: string;
        emailVerified: boolean;
    }>;
    resendOtp(user: JwtPayloadUser): Promise<{
        message: string;
    }>;
    private setAuthCookies;
    private clearAuthCookies;
}
