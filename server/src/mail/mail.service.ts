import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import {
  renderVerifyEmailTemplate,
  renderOtpTemplate,
  VerifyEmailData,
  OtpEmailData,
} from './email-templates';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private resend: Resend | null = null;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    if (apiKey) {
      this.resend = new Resend(apiKey);
      this.logger.log(`[MailService] Configured Resend email provider.`);
    } else {
      this.logger.warn(
        `[MailService] RESEND_API_KEY not set. Falling back to dev console OTP logging.`,
      );
    }
  }

  async sendVerificationEmail(
    to: string,
    data: VerifyEmailData,
  ): Promise<void> {
    const html = renderVerifyEmailTemplate(data);
    const from =
      this.configService.get<string>('RESEND_FROM_EMAIL') ||
      this.configService.get<string>('SMTP_FROM') ||
      'ORA Onboarding <onboarding@resend.dev>';

    if (this.resend) {
      try {
        const response = await this.resend.emails.send({
          from,
          to,
          subject: 'Verify your ORA merchant email address',
          html,
        });
        this.logger.log(
          `[MailService] Verification email sent to ${to} via Resend (ID: ${response.data?.id})`,
        );
      } catch (err: any) {
        this.logger.error(
          `[MailService] Failed to send email via Resend: ${err.message}`,
        );
      }
    } else {
      this.logger.log(
        `==================================================\n` +
          `[DEV OTP LOG] Verification Email to: ${to}\n` +
          `[DEV OTP LOG] OTP Code: ${data.code}\n` +
          `[DEV OTP LOG] Link: ${data.verifyUrl}\n` +
          `==================================================`,
      );
    }
  }

  async sendOtpEmail(to: string, data: OtpEmailData): Promise<void> {
    const html = renderOtpTemplate(data);
    const from =
      this.configService.get<string>('RESEND_FROM_EMAIL') ||
      this.configService.get<string>('SMTP_FROM') ||
      'ORA Security <security@resend.dev>';

    if (this.resend) {
      try {
        const response = await this.resend.emails.send({
          from,
          to,
          subject: 'Your ORA Verification Code',
          html,
        });
        this.logger.log(
          `[MailService] OTP email sent to ${to} via Resend (ID: ${response.data?.id})`,
        );
      } catch (err: any) {
        this.logger.error(
          `[MailService] Failed to send OTP email via Resend: ${err.message}`,
        );
      }
    } else {
      this.logger.log(
        `==================================================\n` +
          `[DEV OTP LOG] OTP Email to: ${to}\n` +
          `[DEV OTP LOG] OTP Code: ${data.code}\n` +
          `==================================================`,
      );
    }
  }
}
