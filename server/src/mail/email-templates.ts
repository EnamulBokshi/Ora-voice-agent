import * as fs from 'fs';
import * as path from 'path';
import * as ejs from 'ejs';

/**
 * ORA Brand Theme Baseline (Stitch / Obsidian Dark + Lime)
 * Primary (`#C8F031`), Background (`#050505`), Card (`#111111`), Border (`#262626`).
 */
export const ORA_EMAIL_THEME = {
  primary: '#C8F031',           // Signature ORA Lime
  primaryHover: '#D4F536',      // Lime Dim / Hover
  primaryForeground: '#111111', // Dark text on lime
  bgCanvas: '#050505',          // Deep Canvas Background
  bgCard: '#111111',            // Primary Container Card
  bgSurface: '#181818',         // Inner Info Panel
  bgInput: '#080808',           // Code / OTP Input Box
  border: '#262626',            // Container Border
  borderHighlight: '#333333',   // Highlighted Border
  textPrimary: '#FAFAFA',       // Headings & High-contrast Text
  textSecondary: '#D1D5DB',     // Body Copy
  textMuted: '#9CA3AF',         // Subtitles & Secondary Labels
  textDim: '#6B7280',           // Footnotes & Meta
  statusOnline: '#C8F031',      // Online / Success
  statusWarning: '#F59E0B',     // Warning
  statusError: '#EF4444',       // Critical / Security
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

/** A message a platform admin writes by hand to one merchant. */
export interface AdminOutreachData {
  recipientName: string;
  heading: string;
  message: string;
  ctaUrl?: string;
  ctaLabel?: string;
  senderName: string;
}

/** A promotional message sent to one or many merchants. */
export interface PromotionalEmailData {
  recipientName: string;
  heading: string;
  message: string;
  couponCode?: string | null;
  couponDetail?: string | null;
  ctaUrl?: string | null;
  ctaLabel?: string;
  unsubscribeUrl: string;
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
 * Clean responsive fallback HTML template matching ORA Obsidian + Lime design system
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
<body style="margin:0;padding:36px 12px;background-color:#050505;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#FAFAFA;">
  <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width:580px;background-color:#111111;border:1px solid #262626;border-radius:16px;overflow:hidden;box-shadow:0 16px 48px rgba(0,0,0,0.7);">
    <tr>
      <td style="background:linear-gradient(90deg, #C8F031 0%, #D4F536 100%);height:4px;font-size:0;line-height:0;">&nbsp;</td>
    </tr>
    <tr>
      <td style="padding:22px 32px;background-color:#0A0A0A;border-bottom:1px solid #222222;">
        <table border="0" cellpadding="0" cellspacing="0" width="100%">
          <tr>
            <td valign="middle" style="width:36px;">
              <div style="width:32px;height:32px;border-radius:8px;background-color:#C8F031;text-align:center;line-height:32px;color:#111111;font-weight:900;font-size:15px;">O</div>
            </td>
            <td valign="middle" style="padding-left:10px;">
              <span style="font-size:19px;font-weight:800;letter-spacing:-0.5px;color:#FAFAFA;display:block;line-height:1.1;">ORA</span>
              <span style="font-size:10px;color:#C8F031;font-weight:700;text-transform:uppercase;letter-spacing:1.4px;display:block;margin-top:2px;">AI Sales Platform</span>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding:32px;">
        <h2 style="font-size:22px;font-weight:800;letter-spacing:-0.5px;color:#FAFAFA;margin:0 0 12px 0;">${meta.title}</h2>
        <p style="font-size:14px;line-height:1.6;color:#D1D5DB;margin:0 0 16px 0;">Hi <strong>${name}</strong>,</p>
        <p style="font-size:14px;line-height:1.6;color:#9CA3AF;margin:0 0 24px 0;">${meta.preheader}</p>
        ${code ? `<div style="background-color:#080808;border:1px dashed rgba(200, 240, 49, 0.4);border-radius:12px;padding:20px;text-align:center;margin:22px 0;"><span style="font-size:32px;letter-spacing:8px;font-weight:800;color:#C8F031;font-family:'JetBrains Mono','Courier New',monospace;">${code}</span></div>` : ''}
        ${url !== '#' ? `<div style="text-align:center;margin:26px 0;"><a href="${url}" style="background-color:#C8F031;color:#111111;padding:13px 32px;border-radius:8px;text-decoration:none;font-weight:800;font-size:14px;display:inline-block;letter-spacing:0.2px;">Proceed to ORA &rarr;</a></div>` : ''}
        <p style="font-size:12px;color:#6B7280;margin:28px 0 0 0;padding-top:18px;border-top:1px solid #1F1F1F;line-height:18px;">If you did not request this email, you can safely ignore it.</p>
      </td>
    </tr>
    <tr>
      <td style="background-color:#0A0A0A;padding:20px 32px;border-top:1px solid #222222;text-align:center;">
        <span style="color:#6B7280;font-size:11px;">&copy; ${new Date().getFullYear()} ORA Inc. Multi-Tenant AI Commerce.</span>
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

/**
 * 8. ADMIN OUTREACH (EJS Render)
 *
 * The body is written by an admin, so it is interpolated with `<%= %>` and rendered
 * inside a white-space-preserving block: their line breaks survive, their text is
 * escaped, and no markup they paste can reshape the email.
 */
export function renderAdminOutreachTemplate(data: AdminOutreachData): string {
  return renderEjsTemplate(
    'admin-outreach',
    { ctaUrl: '', ctaLabel: 'Open ORA', ...data },
    {
      title: `${data.heading} — ORA`,
      preheader: data.message.slice(0, 120),
    },
  );
}

/**
 * 9. PROMOTIONAL / CAMPAIGN EMAIL (EJS Render)
 *
 * The admin's copy is escaped and rendered in a pre-wrap block, so their line breaks
 * survive and nothing they paste can restyle the message. The unsubscribe link is
 * not optional: this template is only ever used for marketing.
 */
export function renderPromotionalTemplate(data: PromotionalEmailData): string {
  return renderEjsTemplate(
    'promotional',
    {
      couponCode: '',
      couponDetail: '',
      ctaUrl: '',
      ctaLabel: 'Open ORA',
      ...data,
    },
    {
      title: `${data.heading} — ORA`,
      preheader: data.message.slice(0, 120),
    },
  );
}
