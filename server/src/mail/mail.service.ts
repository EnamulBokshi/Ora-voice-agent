import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import {
  renderVerifyEmailTemplate,
  renderOtpTemplate,
  renderCongratulationsTemplate,
  renderForgotPasswordTemplate,
  VerifyEmailData,
  OtpEmailData,
  CongratulationsEmailData,
  ForgotPasswordData,
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
    try {
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
    } catch (err: any) {
      this.logger.error(
        `[MailService] Verification email rendering/delivery error: ${err.message}`,
      );
    }
  }

  async sendOtpEmail(to: string, data: OtpEmailData): Promise<void> {
    try {
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
    } catch (err: any) {
      this.logger.error(
        `[MailService] OTP email rendering/delivery error: ${err.message}`,
      );
    }
  }

  async sendForgotPasswordEmail(
    to: string,
    data: ForgotPasswordData,
  ): Promise<void> {
    try {
      const html = renderForgotPasswordTemplate(data);
      const from =
        this.configService.get<string>('RESEND_FROM_EMAIL') ||
        this.configService.get<string>('SMTP_FROM') ||
        'ORA Security <security@resend.dev>';

      if (this.resend) {
        try {
          const response = await this.resend.emails.send({
            from,
            to,
            subject: 'Reset your ORA password',
            html,
          });
          this.logger.log(
            `[MailService] Forgot password email sent to ${to} via Resend (ID: ${response.data?.id})`,
          );
        } catch (err: any) {
          this.logger.error(
            `[MailService] Failed to send forgot password email via Resend: ${err.message}`,
          );
        }
      } else {
        this.logger.log(
          `==================================================\n` +
            `[DEV EMAIL LOG] Forgot Password Email to: ${to}\n` +
            `[DEV EMAIL LOG] Reset URL: ${data.resetUrl}\n` +
            `[DEV EMAIL LOG] Expire: ${data.expireMinutes || 30} mins\n` +
            `==================================================`,
        );
      }
    } catch (err: any) {
      this.logger.error(
        `[MailService] Forgot password email rendering/delivery error: ${err.message}`,
      );
    }
  }

  async sendCongratulationsEmail(to: string, data: CongratulationsEmailData): Promise<void> {
    const html = renderCongratulationsTemplate(data);
    const from =
      this.configService.get<string>('RESEND_FROM_EMAIL') ||
      this.configService.get<string>('SMTP_FROM') ||
      'ORA Subscriptions <billing@resend.dev>';

    if (this.resend) {
      try {
        const response = await this.resend.emails.send({
          from,
          to,
          subject: `🎉 Subscription Confirmed — Welcome to ORA, ${data.recipientName}!`,
          html,
        });
        this.logger.log(
          `[MailService] Congratulations email sent to ${to} via Resend (ID: ${response.data?.id})`,
        );
      } catch (err: any) {
        this.logger.error(
          `[MailService] Failed to send congratulations email via Resend: ${err.message}`,
        );
      }
    } else {
      this.logger.log(
        `==================================================\n` +
          `[DEV EMAIL LOG] Congratulations Email to: ${to}\n` +
          `[DEV EMAIL LOG] Plan: ${data.planName}\n` +
          `[DEV EMAIL LOG] Store: ${data.storeName}\n` +
          `[DEV EMAIL LOG] Dashboard: ${data.dashboardUrl}\n` +
          `==================================================`,
      );
    }
  }
}
