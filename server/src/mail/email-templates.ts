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

export interface CongratulationsEmailData {
  recipientName: string;
  storeName: string;
  planName: string;
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
function getTemplatePath(fileName: string): string {
  const possiblePaths = [
    path.join(__dirname, 'templates', fileName),
    path.join(process.cwd(), 'src', 'mail', 'templates', fileName),
    path.join(process.cwd(), 'server', 'src', 'mail', 'templates', fileName),
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }

  throw new Error(`[EmailTemplatesEngine] EJS template file not found: ${fileName}. Checked paths: ${possiblePaths.join(', ')}`);
}

/**
 * Render EJS body template inside base layout.ejs
 */
export function renderEjsTemplate(templateName: string, data: Record<string, any>, meta: { title: string; preheader: string }): string {
  const layoutPath = getTemplatePath('layout.ejs');
  const bodyPath = getTemplatePath(`${templateName}.ejs`);

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
 * 6. CONGRATULATIONS ON SUBSCRIPTION (EJS Render)
 */
export function renderCongratulationsTemplate(data: CongratulationsEmailData): string {
  return renderEjsTemplate('congratulations-subscription', data, {
    title: `🎉 Subscription Confirmed — ${data.storeName}`,
    preheader: `Congratulations! Your subscription to ${data.planName} is active. Welcome as Store Owner.`,
  });
}

/**
 * 7. SECURITY ALERT (EJS Render)
 */
export function renderSecurityAlertTemplate(data: SecurityAlertData): string {
  return renderEjsTemplate('security-alert', data, {
    title: `Security Alert: ${data.eventName}`,
    preheader: `Security notification for your ORA account: ${data.eventName}.`,
  });
}
