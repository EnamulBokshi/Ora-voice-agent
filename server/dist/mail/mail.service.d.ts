import { ConfigService } from '@nestjs/config';
import { VerifyEmailData, OtpEmailData } from './email-templates';
export declare class MailService {
    private readonly configService;
    private readonly logger;
    constructor(configService: ConfigService);
    sendVerificationEmail(to: string, data: VerifyEmailData): Promise<void>;
    sendOtpEmail(to: string, data: OtpEmailData): Promise<void>;
}
