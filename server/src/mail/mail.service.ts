import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import {
  renderVerifyEmailTemplate,
  renderOtpTemplate,
  renderCongratulationsTemplate,
  renderForgotPasswordTemplate,
  renderAdminOutreachTemplate,
  renderPromotionalTemplate,
  VerifyEmailData,
  OtpEmailData,
  CongratulationsEmailData,
  ForgotPasswordData,
  AdminOutreachData,
  PromotionalEmailData,
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

  private getFromAddress(displayName: string): string {
    const rawFrom =
      this.configService.get<string>('RESEND_FROM_EMAIL') ||
      this.configService.get<string>('SMTP_FROM') ||
      'onboarding@noreply.magicfunnel.io';

    const match =
      rawFrom.match(/<([^>]+)>/) ||
      rawFrom.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
    const emailAddress = match ? match[1] || match[0] : rawFrom.trim();

    return `"${displayName}" <${emailAddress}>`;
  }

  async sendVerificationEmail(
    to: string,
    data: VerifyEmailData,
  ): Promise<void> {
    try {
      const html = renderVerifyEmailTemplate(data);
      const from = this.getFromAddress('ORA Verification');

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
      const from = this.getFromAddress('ORA Security');

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
      const from = this.getFromAddress('ORA Security');

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
    const from = this.getFromAddress('ORA Subscriptions');

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

  /**
   * Sends a message a platform admin composed for one merchant.
   *
   * Unlike the transactional senders, this one reports failure: an admin who thinks
   * they contacted a lead and did not is worse off than one who sees the error.
   */
  async sendAdminOutreachEmail(
    to: string,
    data: AdminOutreachData,
  ): Promise<{ delivered: boolean; reason?: string }> {
    const html = renderAdminOutreachTemplate(data);
    const from = this.getFromAddress('ORA Team');

    if (!this.resend) {
      this.logger.log(
        `==================================================\n` +
          `[DEV EMAIL LOG] Admin outreach to: ${to}\n` +
          `[DEV EMAIL LOG] Subject: ${data.heading}\n` +
          `[DEV EMAIL LOG] Message: ${data.message}\n` +
          `==================================================`,
      );
      return { delivered: false, reason: 'EMAIL_PROVIDER_NOT_CONFIGURED' };
    }

    try {
      const response = await this.resend.emails.send({
        from,
        to,
        subject: data.heading,
        html,
      });
      this.logger.log(
        `[MailService] Admin outreach sent to ${to} via Resend (ID: ${response.data?.id})`,
      );
      return { delivered: true };
    } catch (err: any) {
      this.logger.error(
        `[MailService] Admin outreach to ${to} failed: ${err.message}`,
      );
      return { delivered: false, reason: err.message };
    }
  }

  /**
   * Sends one promotional message. Reports failure rather than swallowing it, because
   * a campaign's delivery count is only meaningful if every send is accounted for.
   */
  async sendPromotionalEmail(
    to: string,
    data: PromotionalEmailData,
  ): Promise<{ delivered: boolean; reason?: string }> {
    const html = renderPromotionalTemplate(data);
    const from = this.getFromAddress('ORA');

    if (!this.resend) {
      this.logger.log(
        `[DEV EMAIL LOG] Promotional email to ${to} — "${data.heading}"${data.couponCode ? ` (coupon ${data.couponCode})` : ''}`,
      );
      return { delivered: false, reason: 'EMAIL_PROVIDER_NOT_CONFIGURED' };
    }

    try {
      const response = await this.resend.emails.send({
        from,
        to,
        subject: data.heading,
        html,
        headers: {
          // One-click unsubscribe, which mailbox providers surface in their own UI.
          'List-Unsubscribe': `<${data.unsubscribeUrl}>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        },
      });
      this.logger.log(
        `[MailService] Promotional email sent to ${to} (ID: ${response.data?.id})`,
      );
      return { delivered: true };
    } catch (err: any) {
      this.logger.error(`[MailService] Promotional email to ${to} failed: ${err.message}`);
      return { delivered: false, reason: err.message };
    }
  }
}

