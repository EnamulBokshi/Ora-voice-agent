import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  renderVerifyEmailTemplate,
  renderOtpTemplate,
  VerifyEmailData,
  OtpEmailData,
} from './email-templates';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly configService: ConfigService) {}

  async sendVerificationEmail(
    to: string,
    data: VerifyEmailData,
  ): Promise<void> {
    const html = renderVerifyEmailTemplate(data);
    this.logger.log(
      `[MailService] Sending verification email to ${to} (OTP Code: ${data.code})`,
    );
    // In production, integrate with nodemailer / Resend / SendGrid provider.
    // For local dev / testing, we log the OTP code and render HTML successfully.
  }

  async sendOtpEmail(to: string, data: OtpEmailData): Promise<void> {
    const html = renderOtpTemplate(data);
    this.logger.log(
      `[MailService] Sending OTP email to ${to} (OTP Code: ${data.code})`,
    );
  }
}
