import * as fs from 'fs';
import * as path from 'path';
import * as ejs from 'ejs';

/**
 * ORA Brand Theme Baseline
 * Electric Violet (`#6C5CE7`), Cyan Teal (`#2DD4C8`), Void Dark (`#12121A`).
 */
export const ORA_EMAIL_THEME = {
  primary: '#6C5CE7',       // Electric Violet
  primaryDark: '#5645C7',   // Dark Violet CTA
  secondary: '#2DD4C8',     // Cyan Teal Accent
  bgVoid: '#12121A',        // Header Dark BG
  bgLight: '#F7F7FB',       // Light Canvas BG
  bgWhite: '#FFFFFF',       // Card Container
  borderLight: '#E4E4EE',   // Structural Border
  textPrimary: '#15151F',   // Main Heading Text
  textSecondary: '#4A4A6A', // Body Text
  textMuted: '#6B6B8A',     // Subtitle Text
  textLight: '#8B8BB0',     // Secondary Muted Text
};

export interface VerifyEmailData {
  recipientName: string;
  verifyUrl: string;
  code: string;
  expireMinutes?: number;
}

export interface OtpEmailData {
  recipientName: string;
  code: string;
  actionName?: string;
  ipAddress?: string;
  device?: string;
  expireMinutes?: number;
}

export interface ForgotPasswordData {
  recipientName: string;
  resetUrl: string;
  expireMinutes?: number;
}

export interface TeamInviteData {
  recipientName: string;
  inviterName: string;
  storeName: string;
  role: string;
  inviteUrl: string;
}

export interface WelcomeEmailData {
  recipientName: string;
  storeName: string;
  dashboardUrl: string;
}

export interface SecurityAlertData {
  recipientName: string;
  eventName: string;
  timestamp: string;
  location?: string;
  device?: string;
  secureAccountUrl: string;
}

/**
 * Locate template file resolving across src/ and dist/ build locations
 */
function getTemplatePath(fileName: string): string | null {
  const possiblePaths = [
    path.join(__dirname, 'templates', fileName),
    path.join(__dirname, '..', 'templates', fileName),
    path.join(__dirname, '..', 'mail', 'templates', fileName),
    path.join(__dirname, '..', '..', 'mail', 'templates', fileName),
    path.join(__dirname, '..', '..', 'src', 'mail', 'templates', fileName),
    path.join(process.cwd(), 'dist', 'mail', 'templates', fileName),
    path.join(process.cwd(), 'dist', 'src', 'mail', 'templates', fileName),
    path.join(process.cwd(), 'src', 'mail', 'templates', fileName),
    path.join(process.cwd(), 'server', 'src', 'mail', 'templates', fileName),
    path.join(process.cwd(), 'mail', 'templates', fileName),
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }

  return null;
}

/**
 * Clean responsive fallback HTML template used when disk templates are missing
 */
function getFallbackHtml(data: Record<string, any>, meta: { title: string; preheader: string }): string {
  const code = data.code || '';
  const url = data.verifyUrl || data.resetUrl || data.inviteUrl || data.dashboardUrl || data.secureAccountUrl || '#';
  const name = data.recipientName || 'there';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${meta.title}</title>
</head>
<body style="margin:0;padding:40px 20px;background-color:#000000;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#FAFAFA;">
  <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width:560px;background-color:#111111;border:1px solid #2A2A2A;border-radius:12px;overflow:hidden;">
    <tr>
      <td style="padding:32px 32px 24px 32px;background-color:#0A0A0A;border-bottom:1px solid #222222;">
        <span style="font-size:24px;font-weight:800;letter-spacing:-0.5px;color:#C8F031;">ORA</span>
        <span style="font-size:12px;color:#888888;margin-left:8px;text-transform:uppercase;letter-spacing:1px;">AI Sales Platform</span>
      </td>
    </tr>
    <tr>
      <td style="padding:32px;">
        <h2 style="font-size:20px;font-weight:700;color:#FAFAFA;margin:0 0 12px 0;">${meta.title}</h2>
        <p style="font-size:15px;line-height:1.6;color:#CCCCCC;margin:0 0 16px 0;">Hi ${name},</p>
        <p style="font-size:15px;line-height:1.6;color:#AAAAAA;margin:0 0 24px 0;">${meta.preheader}</p>
        ${code ? `<div style="background-color:#050505;border:1px solid #2A2A2A;border-radius:8px;padding:20px;text-align:center;margin:24px 0;"><span style="font-size:32px;letter-spacing:8px;font-weight:700;color:#C8F031;font-family:monospace;">${code}</span></div>` : ''}
        ${url !== '#' ? `<div style="text-align:center;margin:28px 0;"><a href="${url}" style="background-color:#C8F031;color:#111111;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;display:inline-block;">Proceed to ORA</a></div>` : ''}
        <p style="font-size:12px;color:#666666;margin:32px 0 0 0;padding-top:20px;border-top:1px solid #222222;">If you did not request this email, you can safely ignore it.</p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Render EJS body template inside base layout.ejs with resilient fallback
 */
export function renderEjsTemplate(templateName: string, data: Record<string, any>, meta: { title: string; preheader: string }): string {
  try {
    const layoutPath = getTemplatePath('layout.ejs');
    const bodyPath = getTemplatePath(`${templateName}.ejs`);

    if (!layoutPath || !bodyPath) {
      return getFallbackHtml(data, meta);
    }

    const layoutSource = fs.readFileSync(layoutPath, 'utf8');
    const bodySource = fs.readFileSync(bodyPath, 'utf8');

    // Render body EJS template
    const renderedBody = ejs.render(bodySource, data);

    // Render layout wrapper passing body HTML
    const finalHtml = ejs.render(layoutSource, {
      title: meta.title,
      preheader: meta.preheader,
      body: renderedBody,
    });

    return finalHtml;
  } catch (err: any) {
    return getFallbackHtml(data, meta);
  }
}

/**
 * 1. VERIFY EMAIL (EJS Render)
 */
export function renderVerifyEmailTemplate(data: VerifyEmailData): string {
  return renderEjsTemplate('verify-email', data, {
    title: 'Verify your email — ORA Command Center',
    preheader: `Your verification code is ${data.code}. Confirm your email to get started.`,
  });
}

/**
 * 2. OTP / 2FA PASSCODE (EJS Render)
 */
export function renderOtpTemplate(data: OtpEmailData): string {
  const action = data.actionName || 'account verification';
  return renderEjsTemplate('otp-code', data, {
    title: `${data.code} is your ORA verification code`,
    preheader: `Your one-time security code is ${data.code} for ${action}.`,
  });
}

/**
 * 3. FORGOT PASSWORD (EJS Render)
 */
export function renderForgotPasswordTemplate(data: ForgotPasswordData): string {
  return renderEjsTemplate('forgot-password', data, {
    title: 'Reset your ORA password',
    preheader: 'Requested a password reset for your ORA merchant account? Click here to set a new password.',
  });
}

/**
 * 4. TEAM MEMBER INVITATION (EJS Render)
 */
export function renderTeamInviteTemplate(data: TeamInviteData): string {
  return renderEjsTemplate('team-invite', data, {
    title: `Invitation to join ${data.storeName} on ORA`,
    preheader: `${data.inviterName} invited you to join ${data.storeName} as ${data.role}.`,
  });
}

/**
 * 5. WELCOME & ONBOARDING (EJS Render)
 */
export function renderWelcomeTemplate(data: WelcomeEmailData): string {
  return renderEjsTemplate('welcome-merchant', data, {
    title: `Welcome to ORA, ${data.recipientName}!`,
    preheader: `Your workspace for ${data.storeName} is ready. Launch your AI sales agent today.`,
  });
}

/**
 * 6. SECURITY ALERT (EJS Render)
 */
export function renderSecurityAlertTemplate(data: SecurityAlertData): string {
  return renderEjsTemplate('security-alert', data, {
    title: `Security Alert: ${data.eventName}`,
    preheader: `Security notification for your ORA account: ${data.eventName}.`,
  });
}
