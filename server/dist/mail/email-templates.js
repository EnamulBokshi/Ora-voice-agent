"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ORA_EMAIL_THEME = void 0;
exports.renderEjsTemplate = renderEjsTemplate;
exports.renderVerifyEmailTemplate = renderVerifyEmailTemplate;
exports.renderOtpTemplate = renderOtpTemplate;
exports.renderForgotPasswordTemplate = renderForgotPasswordTemplate;
exports.renderTeamInviteTemplate = renderTeamInviteTemplate;
exports.renderWelcomeTemplate = renderWelcomeTemplate;
exports.renderSecurityAlertTemplate = renderSecurityAlertTemplate;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const ejs = __importStar(require("ejs"));
exports.ORA_EMAIL_THEME = {
    primary: '#6C5CE7',
    primaryDark: '#5645C7',
    secondary: '#2DD4C8',
    bgVoid: '#12121A',
    bgLight: '#F7F7FB',
    bgWhite: '#FFFFFF',
    borderLight: '#E4E4EE',
    textPrimary: '#15151F',
    textSecondary: '#4A4A6A',
    textMuted: '#6B6B8A',
    textLight: '#8B8BB0',
};
function getTemplatePath(fileName) {
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
function renderEjsTemplate(templateName, data, meta) {
    const layoutPath = getTemplatePath('layout.ejs');
    const bodyPath = getTemplatePath(`${templateName}.ejs`);
    const layoutSource = fs.readFileSync(layoutPath, 'utf8');
    const bodySource = fs.readFileSync(bodyPath, 'utf8');
    const renderedBody = ejs.render(bodySource, data);
    const finalHtml = ejs.render(layoutSource, {
        title: meta.title,
        preheader: meta.preheader,
        body: renderedBody,
    });
    return finalHtml;
}
function renderVerifyEmailTemplate(data) {
    return renderEjsTemplate('verify-email', data, {
        title: 'Verify your email — ORA Command Center',
        preheader: `Your verification code is ${data.code}. Confirm your email to get started.`,
    });
}
function renderOtpTemplate(data) {
    const action = data.actionName || 'account verification';
    return renderEjsTemplate('otp-code', data, {
        title: `${data.code} is your ORA verification code`,
        preheader: `Your one-time security code is ${data.code} for ${action}.`,
    });
}
function renderForgotPasswordTemplate(data) {
    return renderEjsTemplate('forgot-password', data, {
        title: 'Reset your ORA password',
        preheader: 'Requested a password reset for your ORA merchant account? Click here to set a new password.',
    });
}
function renderTeamInviteTemplate(data) {
    return renderEjsTemplate('team-invite', data, {
        title: `Invitation to join ${data.storeName} on ORA`,
        preheader: `${data.inviterName} invited you to join ${data.storeName} as ${data.role}.`,
    });
}
function renderWelcomeTemplate(data) {
    return renderEjsTemplate('welcome-merchant', data, {
        title: `Welcome to ORA, ${data.recipientName}!`,
        preheader: `Your workspace for ${data.storeName} is ready. Launch your AI sales agent today.`,
    });
}
function renderSecurityAlertTemplate(data) {
    return renderEjsTemplate('security-alert', data, {
        title: `Security Alert: ${data.eventName}`,
        preheader: `Security notification for your ORA account: ${data.eventName}.`,
    });
}
//# sourceMappingURL=email-templates.js.map