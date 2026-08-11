export declare const ORA_EMAIL_THEME: {
    primary: string;
    primaryDark: string;
    secondary: string;
    bgVoid: string;
    bgLight: string;
    bgWhite: string;
    borderLight: string;
    textPrimary: string;
    textSecondary: string;
    textMuted: string;
    textLight: string;
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
export declare function renderEjsTemplate(templateName: string, data: Record<string, any>, meta: {
    title: string;
    preheader: string;
}): string;
export declare function renderVerifyEmailTemplate(data: VerifyEmailData): string;
export declare function renderOtpTemplate(data: OtpEmailData): string;
export declare function renderForgotPasswordTemplate(data: ForgotPasswordData): string;
export declare function renderTeamInviteTemplate(data: TeamInviteData): string;
export declare function renderWelcomeTemplate(data: WelcomeEmailData): string;
export declare function renderSecurityAlertTemplate(data: SecurityAlertData): string;
