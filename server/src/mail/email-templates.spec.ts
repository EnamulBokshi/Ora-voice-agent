import {
  renderVerifyEmailTemplate,
  renderOtpTemplate,
  renderForgotPasswordTemplate,
  renderTeamInviteTemplate,
  renderWelcomeTemplate,
  renderCongratulationsTemplate,
  renderSecurityAlertTemplate,
  ORA_EMAIL_THEME,
} from './email-templates';

describe('Email Templates Design & Rendering', () => {
  it('should have ORA Stitch / Obsidian + Lime brand tokens', () => {
    expect(ORA_EMAIL_THEME.primary).toBe('#C8F031');
    expect(ORA_EMAIL_THEME.bgCanvas).toBe('#050505');
    expect(ORA_EMAIL_THEME.bgCard).toBe('#111111');
    expect(ORA_EMAIL_THEME.textPrimary).toBe('#FAFAFA');
  });

  it('should render verify email template with brand headers and OTP code', () => {
    const html = renderVerifyEmailTemplate({
      recipientName: 'Apex Store Owner',
      verifyUrl: 'https://ora.hypecorp.com/verify?token=abc123xyz',
      code: '849201',
      expireMinutes: 15,
    });

    expect(html).toContain('Verify your merchant email');
    expect(html).toContain('849201');
    expect(html).toContain('Apex Store Owner');
    expect(html).toContain('https://ora.hypecorp.com/verify?token=abc123xyz');
    expect(html).toContain('#C8F031');
    expect(html).toContain('ORA');
    expect(html).toContain('AI Sales Platform');
  });

  it('should render OTP passcode email template', () => {
    const html = renderOtpTemplate({
      recipientName: 'Sarah Connor',
      code: '654321',
      actionName: 'Admin Login',
      ipAddress: '103.205.12.4',
      device: 'Chrome on macOS',
      expireMinutes: 10,
    });

    expect(html).toContain('One-Time Verification Code');
    expect(html).toContain('654321');
    expect(html).toContain('Sarah Connor');
    expect(html).toContain('Admin Login');
    expect(html).toContain('103.205.12.4');
    expect(html).toContain('Chrome on macOS');
    expect(html).toContain('#C8F031');
  });

  it('should render forgot password email template', () => {
    const html = renderForgotPasswordTemplate({
      recipientName: 'Alex Mercer',
      resetUrl: 'https://ora.hypecorp.com/reset-password?token=secure987',
      expireMinutes: 30,
    });

    expect(html).toContain('Reset your ORA password');
    expect(html).toContain('Alex Mercer');
    expect(html).toContain('https://ora.hypecorp.com/reset-password?token=secure987');
    expect(html).toContain('#C8F031');
  });

  it('should render team invite email template', () => {
    const html = renderTeamInviteTemplate({
      recipientName: 'Elena Rostova',
      inviterName: 'Marcus Vance',
      storeName: 'Velvet Horizon Apparel',
      role: 'Staff Specialist',
      inviteUrl: 'https://ora.hypecorp.com/invite/accept?token=invite99',
    });

    expect(html).toContain("You've been invited to join Velvet Horizon Apparel");
    expect(html).toContain('Elena Rostova');
    expect(html).toContain('Marcus Vance');
    expect(html).toContain('Staff Specialist');
    expect(html).toContain('https://ora.hypecorp.com/invite/accept?token=invite99');
  });

  it('should render welcome merchant email template', () => {
    const html = renderWelcomeTemplate({
      recipientName: 'David Sterling',
      storeName: 'Sterling Audio Co.',
      dashboardUrl: 'https://ora.hypecorp.com/dashboard',
    });

    expect(html).toContain('Welcome to ORA, David Sterling!');
    expect(html).toContain('Sterling Audio Co.');
    expect(html).toContain('Quick Start Playbook');
    expect(html).toContain('https://ora.hypecorp.com/dashboard');
  });

  it('should render congratulations subscription email template', () => {
    const html = renderCongratulationsTemplate({
      recipientName: 'David Sterling',
      storeName: 'Sterling Audio Co.',
      planName: 'Enterprise Growth Tier',
      dashboardUrl: 'https://ora.hypecorp.com/dashboard',
    });

    expect(html).toContain('Subscription Confirmed!');
    expect(html).toContain('Enterprise Growth Tier');
    expect(html).toContain('Sterling Audio Co.');
    expect(html).toContain('Owner (Full Access)');
  });

  it('should render security alert email template', () => {
    const html = renderSecurityAlertTemplate({
      recipientName: 'Admin Dave',
      eventName: 'New IP Login from Unusual Location',
      timestamp: '2026-08-21 15:30 UTC',
      location: 'Frankfurt, Germany',
      device: 'Firefox 130 on Linux',
      secureAccountUrl: 'https://ora.hypecorp.com/security/lock',
    });

    expect(html).toContain('Security Alert: New IP Login from Unusual Location');
    expect(html).toContain('Admin Dave');
    expect(html).toContain('Frankfurt, Germany');
    expect(html).toContain('Firefox 130 on Linux');
    expect(html).toContain('https://ora.hypecorp.com/security/lock');
  });
});
