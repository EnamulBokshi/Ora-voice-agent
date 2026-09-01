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
  clientOrigin?: string;
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

  async sendOnboardingEmail(payload: OnboardingEmailPayload): Promise<{ success: boolean; messageId?: string }> {
    const frontendUrl =
      payload.clientOrigin?.startsWith('http')
        ? payload.clientOrigin.replace(/\/+$/, '')
        : this.configService.get<string>('FRONTEND_URL') ||
          (this.configService.get<string>('NODE_ENV') === 'production'
            ? 'https://tryora.live'
            : 'http://localhost:3000');
    const serverUrl =
      process.env.BACKEND_URL || (this.configService.get<string>('NODE_ENV') === 'production' ? 'https://tryora.live' : 'http://localhost:5000');
    const fromEmail = this.getFromAddress('ORA AI Sales Platform');

    const widgetScriptTag = `&lt;!-- ORA Voice AI Sales Assistant Widget --&gt;\n&lt;script \n  src="${frontendUrl}/widget/ora-widget.js" \n  data-ora-key="${payload.publishableKey}" \n  async&gt;\n&lt;/script&gt;`;

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #050505; color: #FAFAFA; margin: 0; padding: 32px 12px; }
    .container { max-width: 600px; margin: 0 auto; background-color: #111111; border: 1px solid #262626; border-radius: 16px; overflow: hidden; box-shadow: 0 16px 48px rgba(0, 0, 0, 0.7); }
    .accent-strip { height: 4px; background: linear-gradient(90deg, #C8F031 0%, #D4F536 100%); }
    .header { background-color: #0A0A0A; padding: 24px 32px; border-bottom: 1px solid #222222; text-align: left; }
    .logo-badge { display: inline-block; width: 32px; height: 32px; border-radius: 8px; background-color: #C8F031; color: #111111; font-weight: 900; font-size: 15px; text-align: center; line-height: 32px; vertical-align: middle; }
    .brand-title { display: inline-block; vertical-align: middle; margin-left: 10px; }
    .brand-name { font-size: 19px; font-weight: 800; color: #FAFAFA; letter-spacing: -0.5px; line-height: 1.1; margin: 0; }
    .brand-subtitle { font-size: 10px; color: #C8F031; font-weight: 700; text-transform: uppercase; letter-spacing: 1.4px; margin-top: 2px; }
    .content { padding: 32px; font-size: 14px; line-height: 1.6; color: #D1D5DB; }
    .badge { display: inline-block; background-color: rgba(200, 240, 49, 0.12); border: 1px solid rgba(200, 240, 49, 0.28); border-radius: 20px; padding: 4px 12px; margin-bottom: 14px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: #C8F031; }
    .key-box { background-color: #080808; border: 1px solid #2A2A2A; border-radius: 12px; padding: 18px 20px; margin: 20px 0; }
    .key-label { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #9CA3AF; font-weight: 700; margin-bottom: 6px; }
    .key-val { font-family: 'JetBrains Mono', 'Courier New', monospace; font-size: 15px; color: #C8F031; word-break: break-all; font-weight: 700; }
    .code-box { background-color: #080808; border: 1px solid #262626; border-radius: 10px; padding: 14px 16px; font-family: 'JetBrains Mono', 'Courier New', monospace; font-size: 12px; color: #D4F536; overflow-x: auto; white-space: pre; line-height: 1.5; }
    .step-card { background-color: #181818; border: 1px solid #262626; border-radius: 10px; padding: 16px; margin-bottom: 12px; }
    .step-num { display: inline-block; width: 22px; height: 22px; background-color: #C8F031; color: #111111; font-weight: 800; border-radius: 50%; text-align: center; line-height: 22px; font-size: 12px; margin-right: 8px; }
    .step-title { font-weight: 700; color: #FAFAFA; font-size: 13px; }
    .step-desc { font-size: 12px; color: #9CA3AF; margin-top: 4px; padding-left: 30px; line-height: 18px; }
    .btn { display: inline-block; background-color: #C8F031; color: #111111; font-weight: 800; font-size: 14px; padding: 13px 32px; border-radius: 8px; text-decoration: none; text-align: center; letter-spacing: 0.2px; box-shadow: 0 4px 14px rgba(200, 240, 49, 0.3); }
    .manual-box { background-color: #181818; border: 1px dashed rgba(200, 240, 49, 0.35); border-radius: 12px; padding: 20px; margin-top: 24px; text-align: center; }
    .footer { background-color: #0A0A0A; padding: 24px 32px; text-align: center; font-size: 11px; color: #6B7280; border-top: 1px solid #222222; }
  </style>
</head>
<body>
  <div class="container">
    <div class="accent-strip"></div>
    <div class="header">
      <div class="logo-badge">O</div>
      <div class="brand-title">
        <div class="brand-name">ORA</div>
        <div class="brand-subtitle">AI Sales Platform</div>
      </div>
    </div>
    <div class="content">
      <div class="badge">Merchant Onboarding</div>
      <h1 style="margin: 0 0 12px 0; color: #FAFAFA; font-size: 23px; font-weight: 800; letter-spacing: -0.5px;">Welcome to ORA, ${payload.merchantName || 'Merchant'}!</h1>
      <p style="margin: 0 0 20px 0; color: #D1D5DB; font-size: 14px; line-height: 22px;">Congratulations! Your store workspace for <strong>"${payload.storeName}"</strong> is equipped with ORA — your autonomous multimodal AI sales assistant with voice intelligence, real-time catalog search, and instant checkout.</p>
      
      <div class="key-box">
        <div class="key-label">Your Publishable Widget Key</div>
        <div class="key-val">${payload.publishableKey}</div>
      </div>

      <h3 style="color: #FAFAFA; font-size: 15px; font-weight: 700; margin-top: 26px; margin-bottom: 8px;">⚡ 1-Minute Storefront Embed</h3>
      <p style="font-size: 13px; color: #9CA3AF; margin: 0 0 12px 0;">Paste this script tag before the closing <code>&lt;/body&gt;</code> tag of your storefront HTML (Shopify, WooCommerce, or Custom Store):</p>
      <div class="code-box">${widgetScriptTag}</div>

      <h3 style="color: #FAFAFA; font-size: 15px; font-weight: 700; margin-top: 30px; margin-bottom: 14px;">📖 Merchant Quickstart Playbook</h3>
      
      <div class="step-card">
        <div><span class="step-num">1</span><span class="step-title">Ingest Product Catalog</span></div>
        <div class="step-desc">Upload products via CSV / Excel, or connect Shopify / WooCommerce to index inventory with live prices.</div>
      </div>

      <div class="step-card">
        <div><span class="step-num">2</span><span class="step-title">Define Brand Voice & Sales Persona</span></div>
        <div class="step-desc">Configure tone of voice (Energetic, Consultative, Luxury), discounts, and low-stock urgency hints.</div>
      </div>

      <div class="step-card">
        <div><span class="step-num">3</span><span class="step-title">Add Store FAQs & Shipping Policies</span></div>
        <div class="step-desc">Upload return policies and shipping guides into the Knowledge Base for instantaneous, accurate answers.</div>
      </div>

      <div class="step-card">
        <div><span class="step-num">4</span><span class="step-title">Test Live in the Voice Sandbox</span></div>
        <div class="step-desc">Open the Voice Sandbox to speak directly with ORA over microphone and test voice cart additions in real time.</div>
      </div>

      <div class="manual-box">
        <h4 style="color: #C8F031; margin: 0 0 8px 0; font-size: 14px; font-weight: 700;">📥 Official Merchant Implementation Handbook</h4>
        <p style="color: #9CA3AF; font-size: 12px; margin: 0 0 14px 0; line-height: 18px;">Step-by-step guide covering catalog sync, voice fine-tuning, Shopify/Woo embed, and conversion optimization.</p>
        <a href="${frontendUrl}/docs/ORA-Merchant-Owner-Manual.md" target="_blank" style="display: inline-block; background-color: #111111; color: #FAFAFA; border: 1px solid #333333; font-weight: 600; font-size: 12px; padding: 9px 18px; border-radius: 6px; text-decoration: none;">
          📄 View / Download Manual (.md)
        </a>
      </div>

      <div style="text-align: center; margin-top: 28px;">
        <a href="${frontendUrl}/agent" class="btn">Launch ORA Command Center &rarr;</a>
      </div>
    </div>

    <div class="footer">
      <p style="margin: 0 0 6px 0;">&copy; ${new Date().getFullYear()} ORA Inc. Multi-Tenant Voice Sales Agent. All rights reserved.</p>
      <p style="margin: 0; color: #4B5563;">Need assistance? Contact your ORA deployment team or reply directly to this email.</p>
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
