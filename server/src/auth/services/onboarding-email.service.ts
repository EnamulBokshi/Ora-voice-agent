import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import * as nodemailer from 'nodemailer';
import * as path from 'path';
import * as fs from 'fs';

export interface OnboardingEmailPayload {
  toEmail: string;
  merchantName: string;
  storeName: string;
  publishableKey?: string | null;
}

@Injectable()
export class OnboardingEmailService {
  private readonly logger = new Logger(OnboardingEmailService.name);
  private resendClient: Resend | null = null;
  private nodemailerTransporter: nodemailer.Transporter | null = null;

  constructor(private readonly configService: ConfigService) {
    const resendKey = this.configService.get<string>('RESEND_API_KEY');
    if (resendKey && resendKey.startsWith('re_')) {
      this.resendClient = new Resend(resendKey);
    }

    const smtpHost = this.configService.get<string>('SMTP_HOST');
    const smtpPort = parseInt(this.configService.get<string>('SMTP_PORT') || '587', 10);
    const smtpUser = this.configService.get<string>('SMTP_USER');
    const smtpPass = this.configService.get<string>('SMTP_PASS');

    if (smtpHost && smtpUser && smtpPass) {
      this.nodemailerTransporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: { user: smtpUser, pass: smtpPass },
      });
    }
  }

  async sendOnboardingEmail(payload: OnboardingEmailPayload): Promise<{ success: boolean; messageId?: string }> {
    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    const serverUrl =
      process.env.BACKEND_URL || 'http://localhost:5000';
    const fromEmail =
      this.configService.get<string>('RESEND_FROM_EMAIL') ||
      'ORA Sales AI <onboarding@noreply.magicfunnel.io>';

    const widgetScriptTag = `&lt;!-- ORA Voice AI Sales Assistant Widget --&gt;\n&lt;script \n  src="${frontendUrl}/widget/ora-widget.js" \n  data-ora-key="${payload.publishableKey}" \n  defer&gt;\n&lt;/script&gt;`;

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0A0A0A; color: #FAFAFA; margin: 0; padding: 24px; }
    .container { max-width: 640px; margin: 0 auto; background-color: #111111; border: 1px solid #2A2A2A; border-radius: 16px; overflow: hidden; }
    .header { background: linear-gradient(135deg, #111111 0%, #1A1A1A 100%); padding: 36px 32px; border-bottom: 1px solid #2A2A2A; text-align: center; }
    .logo { font-size: 28px; font-weight: 800; color: #C8F031; letter-spacing: 2px; }
    .subtitle { color: #9CA3AF; font-size: 14px; margin-top: 6px; }
    .content { padding: 32px; font-size: 14px; line-height: 1.6; color: #E5E7EB; }
    .key-box { background-color: #050505; border: 1px solid #333333; border-radius: 10px; padding: 16px; margin: 20px 0; }
    .key-label { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #9CA3AF; font-weight: 700; margin-bottom: 6px; }
    .key-val { font-family: monospace; font-size: 15px; color: #C8F031; word-break: break-all; font-weight: bold; }
    .code-box { background-color: #050505; border: 1px solid #2A2A2A; border-radius: 8px; padding: 14px; font-family: monospace; font-size: 12px; color: #D4F536; overflow-x: auto; white-space: pre; line-height: 1.4; }
    .step-card { background-color: #161616; border: 1px solid #2A2A2A; border-radius: 10px; padding: 16px; margin-bottom: 12px; }
    .step-num { display: inline-block; width: 22px; height: 22px; background-color: #C8F031; color: #111111; font-weight: bold; border-radius: 50%; text-align: center; line-height: 22px; font-size: 12px; margin-right: 8px; }
    .step-title { font-weight: 700; color: #FFFFFF; font-size: 14px; }
    .step-desc { font-size: 13px; color: #9CA3AF; margin-top: 4px; padding-left: 30px; }
    .btn { display: inline-block; background-color: #C8F031; color: #111111; font-weight: 700; font-size: 14px; padding: 14px 28px; border-radius: 10px; text-decoration: none; margin-top: 16px; text-align: center; }
    .footer { padding: 24px; text-align: center; font-size: 12px; color: #6B7280; border-top: 1px solid #2A2A2A; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">✦ ORA SALES AGENT</div>
      <div class="subtitle">Welcome to the future of AI-powered conversational sales</div>
    </div>
    <div class="content">
      <p>Hello <strong>${payload.merchantName || 'Merchant'}</strong>,</p>
      <p>Congratulations! Your store <strong>"${payload.storeName}"</strong> is now equipped with ORA — your real-time multimodal AI sales assistant with voice, live catalog intelligence, and instant checkout capabilities.</p>
      
      <div class="key-box">
        <div class="key-label">Your Publishable Widget Key</div>
        <div class="key-val">${payload.publishableKey}</div>
      </div>

      <h3 style="color: #FFFFFF; margin-top: 28px; margin-bottom: 12px;">⚡ 1-Minute Storefront Embed</h3>
      <p style="font-size: 13px; color: #9CA3AF;">Copy and paste this script tag right before the closing <code>&lt;/body&gt;</code> tag of your store's HTML (Shopify, WooCommerce, or Custom Website):</p>
      <div class="code-box">${widgetScriptTag}</div>

      <h3 style="color: #FFFFFF; margin-top: 32px; margin-bottom: 16px;">📖 ORA Merchant Quickstart Playbook</h3>
      
      <div class="step-card">
        <div><span class="step-num">1</span><span class="step-title">Ingest Your Product Catalog</span></div>
        <div class="step-desc">Upload your product list via CSV / Excel, or connect Shopify / WooCommerce. ORA will automatically vectorize and index every product with live price and stock verification.</div>
      </div>

      <div class="step-card">
        <div><span class="step-num">2</span><span class="step-title">Define Brand Voice & Sales Playbook</span></div>
        <div class="step-desc">Go to the AI Agent settings in your dashboard to choose ORA's tone (e.g. Energetic, Consultative, Luxury), low-stock urgency hints, and discount rules.</div>
      </div>

      <div class="step-card">
        <div><span class="step-num">3</span><span class="step-title">Add Store Policies & FAQ</span></div>
        <div class="step-desc">Upload your return policy, shipping rules, and warranties into the Knowledge Base so ORA can answer customer inquiries accurately.</div>
      </div>

      <div class="step-card">
        <div><span class="step-num">4</span><span class="step-title">Test Live in the Sandbox</span></div>
        <div class="step-desc">Open the Voice Sandbox in your dashboard to speak with ORA over your microphone and verify product discovery, pricing, and cart actions.</div>
      </div>

      <div style="background-color: #1A1A1A; border: 1px dashed #C8F031; border-radius: 12px; padding: 20px; margin-top: 24px; text-align: center;">
        <h4 style="color: #C8F031; margin: 0 0 8px 0; font-size: 15px;">📥 Official ORA Merchant Manual & Implementation Handbook</h4>
        <p style="color: #9CA3AF; font-size: 13px; margin: 0 0 16px 0;">We've prepared an actionable step-by-step PDF & Markdown guide covering catalog sync, voice fine-tuning, Shopify/Woo embed, and conversion optimization.</p>
        <a href="${frontendUrl}/docs/ORA-Merchant-Owner-Manual.md" target="_blank" style="display: inline-block; background-color: #222222; color: #FAFAFA; border: 1px solid #444444; font-weight: 600; font-size: 13px; padding: 10px 20px; border-radius: 8px; text-decoration: none; margin-right: 8px;">
          📄 View / Download Manual (.md)
        </a>
      </div>

      <div style="text-align: center; margin-top: 28px;">
        <a href="${frontendUrl}/agent" class="btn">Launch ORA Command Center &rarr;</a>
      </div>
    </div>

    <div class="footer">
      <p>© ${new Date().getFullYear()} ORA Inc. Multi-Tenant Voice Sales Agent. All rights reserved.</p>
      <p>Need support? Contact your ORA deployment team or reply directly to this email.</p>
    </div>
  </div>
</body>
</html>
    `;

    // Resolve manual file buffer if available on disk
    const candidateManualPaths = [
      path.resolve(process.cwd(), '../docs/ORA-Merchant-Owner-Manual.md'),
      path.resolve(process.cwd(), 'docs/ORA-Merchant-Owner-Manual.md'),
      path.resolve(__dirname, '../../../../../docs/ORA-Merchant-Owner-Manual.md'),
      path.resolve(process.cwd(), '../client/public/docs/ORA-Merchant-Owner-Manual.md'),
    ];
    let manualContentBuffer: Buffer | null = null;
    for (const p of candidateManualPaths) {
      if (fs.existsSync(p)) {
        try {
          manualContentBuffer = fs.readFileSync(p);
          break;
        } catch (e) {}
      }
    }

    // 1. Send via Resend if available
    if (this.resendClient) {
      try {
        const res = await this.resendClient.emails.send({
          from: fromEmail,
          to: payload.toEmail,
          subject: `✦ Your ORA Voice AI Credentials & User Manual — ${payload.storeName}`,
          html: htmlContent,
          ...(manualContentBuffer
            ? {
                attachments: [
                  {
                    filename: 'ORA-Merchant-Owner-Manual.md',
                    content: manualContentBuffer,
                  },
                ],
              }
            : {}),
        });

        this.logger.log(
          `[OnboardingEmail] Sent welcome email via Resend to ${payload.toEmail} (ID: ${res.data?.id})`,
        );
        return { success: true, messageId: res.data?.id };
      } catch (err: any) {
        this.logger.warn(`[OnboardingEmail] Resend delivery failed: ${err.message}. Trying SMTP...`);
      }
    }

    // 2. Send via Nodemailer SMTP fallback
    if (this.nodemailerTransporter) {
      try {
        const info = await this.nodemailerTransporter.sendMail({
          from: fromEmail,
          to: payload.toEmail,
          subject: `✦ Your ORA Voice AI Credentials & User Manual — ${payload.storeName}`,
          html: htmlContent,
          ...(manualContentBuffer
            ? {
                attachments: [
                  {
                    filename: 'ORA-Merchant-Owner-Manual.md',
                    content: manualContentBuffer,
                  },
                ],
              }
            : {}),
        });

        this.logger.log(
          `[OnboardingEmail] Sent welcome email via SMTP to ${payload.toEmail} (ID: ${info.messageId})`,
        );
        return { success: true, messageId: info.messageId };
      } catch (err: any) {
        this.logger.error(`[OnboardingEmail] SMTP delivery failed: ${err.message}`);
      }
    }

    // 3. Fallback log for development
    this.logger.log(
      `[OnboardingEmail] Dev preview for ${payload.toEmail}: PublishableKey=${payload.publishableKey}, Store=${payload.storeName}`,
    );
    return { success: true, messageId: 'dev_mock_id' };
  }
}
