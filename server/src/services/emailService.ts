import {
  BADGES,
  buildBadgeFeatureRows,
  type Badge,
  type BadgeFeatureRowKey,
  type BadgeFeatureRowParams,
} from '@regionify/shared';

import { env } from '@/config/env.js';
import { logger } from '@/lib/logger.js';

type PayableBadge = Exclude<Badge, typeof BADGES.observer>;

const BADGE_DISPLAY: Record<PayableBadge, { name: string; tagline: string }> = {
  [BADGES.explorer]: {
    name: 'Explorer',
    tagline: "You've unlocked the tools to craft polished, professional regional visualizations.",
  },
  [BADGES.chronographer]: {
    name: 'Chronographer',
    tagline:
      "You've unlocked the complete Regionify toolkit — public embed & sharing, plus our highest AI request allowance.",
  },
};

/**
 * English strings for each feature row. MUST stay in sync with `badges.rows.*` in
 * `client/src/locales/en.ts` so the purchase email lists the exact same wording as the
 * /billing card. The client renders these via i18n; the server has no i18n, so we mirror
 * the English source of truth here.
 */
const BADGE_FEATURE_ROW_EN: Record<BadgeFeatureRowKey, (params?: BadgeFeatureRowParams) => string> =
  {
    projectsLimited: (p) => `Up to ${p?.count ?? 0} saved projects`,
    projectsUnlimited: () => 'Unlimited saved projects',
    sessionsLimited: (p) => `Up to ${p?.count ?? 0} simultaneous devices`,
    imageExport: (p) => `${p?.formats ?? ''} export, up to ${p?.quality ?? 100}% quality`,
    advancedStyles: () => 'Advanced map & legend styling',
    noWatermark: () => 'No watermark on image exports',
    highResolutionExport: () => 'High-resolution export (2K, 4K)',
    timeSeries: () => 'Time-series data & timeline on the map',
    animationExport: () => 'Animated export (GIF & MP4)',
    embedMapIframe: () => 'Embed map (iframe)',
    publicMapPage: () => 'Public page with map',
    aiParser: (p) => `AI data parser and generator (up to ${p?.count ?? 0} requests/day)`,
  };

/**
 * Build the "what you unlocked" feature bullets for a paid badge. Uses the same shared
 * row-builder as the client billing card (`useBillingBadges`), so both surfaces list
 * identical features in identical order.
 */
function buildPaidBadgeFeatures(badge: PayableBadge): readonly string[] {
  return buildBadgeFeatureRows(badge)
    .filter((row) => row.included)
    .map((row) => BADGE_FEATURE_ROW_EN[row.key](row.params));
}

const APP_ID = 'regionify';
const APP_NAME = 'Regionify';

/** Logo URL for auth emails. Place logo at client/public/logo.png so it is served at /logo.png. */
const LOGO_URL = `${env.CLIENT_URL.replace(/\/$/, '')}/logo.png`;

/** Verification link expiry (must match emailVerificationRepository TOKEN_EXPIRY_HOURS) */
const VERIFY_EMAIL_EXPIRY_HOURS = 48;

// Brand colors - keep in sync with client theme
const COLORS = {
  primary: '#18294d',
  primaryDark: '#096dd9',
  textDark: '#262626',
  textLight: '#595959',
  textMuted: '#8c8c8c',
  background: '#f5f5f5',
  white: '#ffffff',
  border: '#e8e8e8',
  success: '#52c41a',
};

interface MailApiResponse {
  success: boolean;
  message: string;
  messageId?: string;
}

interface MailApiErrorResponse {
  success: false;
  error: string;
}

interface SendEmailParams {
  to: string;
  subject: string;
  text: string;
  html: string;
}

type EmailLayoutOptions = { preheader?: string; logoUrl?: string };

/**
 * Base email layout: minimal, logo in header, compact spacing
 */
function emailLayout(content: string, options?: EmailLayoutOptions): string {
  const preheader = options?.preheader;
  const logoUrl = options?.logoUrl ?? LOGO_URL;
  const preheaderHtml = preheader
    ? `<div style="display:none;font-size:1px;color:#f5f5f5;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">${preheader}</div>`
    : '';

  const headerContent = `<img src="${logoUrl}" alt="${APP_NAME}" width="140" height="32" style="display:block;max-height:32px;width:auto;height:auto;" />`;

  return `
<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="format-detection" content="telephone=no,address=no,email=no,date=no,url=no">
  <title>${APP_NAME}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
    body { height: 100% !important; margin: 0 !important; padding: 0 !important; width: 100% !important; }
    a[x-apple-data-detectors] { color: inherit !important; text-decoration: none !important; }
    @media only screen and (max-width: 600px) {
      .email-container { width: 100% !important; }
      .mobile-padding { padding: 16px 20px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:${COLORS.background};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  ${preheaderHtml}
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:${COLORS.background};">
    <tr>
      <td style="padding:24px 16px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="560" class="email-container" style="margin:0 auto;background-color:${COLORS.white};border-radius:8px;box-shadow:0 1px 4px rgba(0,0,0,0.06);">
          <tr>
            <td style="padding:20px 24px 16px;text-align:center;">
              ${headerContent}
            </td>
          </tr>
          <tr>
            <td class="mobile-padding" style="padding:0 24px 24px;">
              ${content}
            </td>
          </tr>
          <tr>
            <td style="padding:12px 24px;text-align:center;color:${COLORS.textMuted};font-size:12px;">
              &copy; ${new Date().getFullYear()} ${APP_NAME}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`.trim();
}

function emailButton(text: string, url: string): string {
  return `
<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:16px 0;">
  <tr>
    <td style="border-radius:6px;background-color:${COLORS.primary};">
      <!--[if mso]>
      <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${url}" style="height:44px;v-text-anchor:middle;width:180px;" arcsize="14%" strokecolor="${COLORS.primary}" fillcolor="${COLORS.primary}">
        <w:anchorlock/>
        <center style="color:#ffffff;font-family:sans-serif;font-size:15px;font-weight:600;">${text}</center>
      </v:roundrect>
      <![endif]-->
      <!--[if !mso]><!-->
      <a href="${url}" target="_blank" style="display:inline-block;padding:10px 32px;font-size:15px;font-weight:600;color:${COLORS.white};text-decoration:none;border-radius:6px;background-color:${COLORS.primary};">${text}</a>
      <!--<![endif]-->
    </td>
  </tr>
</table>
`.trim();
}

function emailHeading(text: string): string {
  return `<h2 style="margin:0 0 12px 0;font-size:20px;font-weight:600;color:${COLORS.textDark};line-height:28px;">${text}</h2>`;
}

function emailParagraph(text: string): string {
  return `<p style="margin:0 0 12px 0;font-size:15px;line-height:24px;color:${COLORS.textLight};">${text}</p>`;
}

function emailMuted(text: string): string {
  return `<p style="margin:8px 0 0 0;font-size:13px;line-height:20px;color:${COLORS.textMuted};">${text}</p>`;
}

// =============================================================================
// EMAIL TEMPLATES
// =============================================================================

export const emailTemplates = {
  /**
   * Welcome email sent after registration
   */
  welcome(name: string): { subject: string; text: string; html: string } {
    const subject = `Welcome to ${APP_NAME}!`;

    const text = `
Welcome to ${APP_NAME}, ${name}!

Thank you for creating an account. We're excited to have you on board.

With ${APP_NAME}, you can create stunning data visualizations for regions around the world. Get started by visiting your dashboard.

If you have any questions, feel free to reach out to our support team.

Best regards,
The ${APP_NAME} Team
`.trim();

    const html = emailLayout(
      `
        ${emailHeading(`Welcome, ${name}`)}
        ${emailParagraph(`Thanks for signing up. Create stunning data visualizations for regions around the world.`)}
        ${emailButton('Get Started', env.CLIENT_URL)}
        ${emailMuted('Questions? Reach out to our support team.')}
      `,
      { preheader: `Welcome to ${APP_NAME}. Start creating visualizations today.` },
    );

    return { subject, text, html };
  },

  /**
   * Password reset request email
   */
  passwordReset(
    name: string,
    resetUrl: string,
    expiresInMinutes: number,
  ): { subject: string; text: string; html: string } {
    const subject = `Reset Your ${APP_NAME} Password`;

    const text = `
Hi ${name},

We received a request to reset your password for your ${APP_NAME} account.

Click the link below to reset your password:
${resetUrl}

This link will expire in ${expiresInMinutes} minutes.

If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.

Best regards,
The ${APP_NAME} Team
`.trim();

    const html = emailLayout(
      `
        ${emailHeading('Reset your password')}
        ${emailParagraph(`Hi ${name}, we received a request to reset your password. Click below to set a new one.`)}
        ${emailButton('Reset Password', resetUrl)}
        ${emailMuted(`Link expires in <strong>${expiresInMinutes} minutes</strong>. If you didn't request this, ignore this email.`)}
        ${emailMuted(`<a href="${resetUrl}" style="color:${COLORS.primary};word-break:break-all;">${resetUrl}</a>`)}
      `,
      { preheader: `Reset your ${APP_NAME} password. Expires in ${expiresInMinutes} minutes.` },
    );

    return { subject, text, html };
  },

  /**
   * Forgot-password request for an OAuth-only account (no password stored)
   */
  passwordResetOAuthOnly(
    name: string,
    signInWithLabel: string,
    loginUrl: string,
  ): {
    subject: string;
    text: string;
    html: string;
  } {
    const subject = `How to sign in to ${APP_NAME}`;

    const text = `
Hi ${name},

We received a request to reset a password for your ${APP_NAME} account, but this email is linked to ${signInWithLabel} sign-in. There is no password on file for this account.

To access your account, open the login page and use "${signInWithLabel}" instead of email and password for this email address.

${loginUrl}

If you didn't request this, you can ignore this email.

Best regards,
The ${APP_NAME} Team
`.trim();

    const html = emailLayout(
      `
        ${emailHeading('Sign in without a password')}
        ${emailParagraph(
          `Hi ${name}, you asked to reset a password, but this account uses ${signInWithLabel} sign-in — no password is stored.`,
        )}
        ${emailParagraph(
          `To access your account, open the login page and use <strong>${signInWithLabel}</strong> instead of email and password for this email address.`,
        )}
        ${emailButton(`Go to sign in`, loginUrl)}
        ${emailMuted(`If you didn't request this, you can ignore this email.`)}
      `,
      { preheader: `Your ${APP_NAME} account uses ${signInWithLabel} sign-in.` },
    );

    return { subject, text, html };
  },

  /**
   * Password changed confirmation email
   */
  passwordChanged(name: string): { subject: string; text: string; html: string } {
    const subject = `Your ${APP_NAME} Password Was Changed`;

    const text = `
Hi ${name},

Your ${APP_NAME} password was successfully changed.

If you made this change, you can safely ignore this email.

If you didn't change your password, please contact our support team immediately or reset your password.

Best regards,
The ${APP_NAME} Team
`.trim();

    const html = emailLayout(
      `
        ${emailHeading('Password changed')}
        ${emailParagraph(`Hi ${name}, your ${APP_NAME} password was updated. No action needed if you made this change.`)}
        ${emailMuted(`If not, <a href="${env.CLIENT_URL}/forgot-password" style="color:${COLORS.primary};">reset your password</a> or contact support.`)}
      `,
      { preheader: 'Your password was changed successfully.' },
    );

    return { subject, text, html };
  },

  /**
   * Account deletion confirmation email
   */
  accountDeleted(name: string): { subject: string; text: string; html: string } {
    const subject = `Your ${APP_NAME} Account Has Been Deleted`;

    const text = `
Hi ${name},

Your ${APP_NAME} account has been permanently deleted. All your data has been removed from our systems.

If you did not request this deletion, please contact our support team immediately.

We're sorry to see you go. If you ever change your mind, you're welcome to create a new account.

Best regards,
The ${APP_NAME} Team
`.trim();

    const html = emailLayout(
      `
        ${emailHeading(`Account deleted`)}
        ${emailParagraph(`Hi ${name}, your ${APP_NAME} account has been permanently deleted. All your data has been removed from our systems.`)}
        ${emailMuted(`If you did not request this, please contact our support team immediately.`)}
        ${emailMuted(`We're sorry to see you go. You're always welcome to create a new account in the future.`)}
      `,
      { preheader: `Your ${APP_NAME} account has been permanently deleted.` },
    );

    return { subject, text, html };
  },

  /**
   * Sent after a successful badge purchase (Explorer or Chronographer).
   * Congratulates the user and lists the features they've just unlocked.
   */
  badgePurchased(
    name: string,
    badge: PayableBadge,
  ): { subject: string; text: string; html: string } {
    const { name: badgeName, tagline } = BADGE_DISPLAY[badge];
    const features = buildPaidBadgeFeatures(badge);
    const dashboardUrl = env.CLIENT_URL;

    const subject = `Welcome to ${APP_NAME} ${badgeName} — your new tools are ready`;

    const text = `
Hi ${name},

Congratulations — you're now a ${APP_NAME} ${badgeName}!

${tagline}

Here's what you've just unlocked:
${features.map((f) => `  • ${f}`).join('\n')}

Jump back in and start creating:
${dashboardUrl}

If you have any questions or feedback, just reply to this email — we'd love to hear from you.

Best regards,
The ${APP_NAME} Team
`.trim();

    const featuresHtml = features
      .map(
        (f) =>
          `<tr><td style="padding:6px 0;font-size:15px;line-height:22px;color:${COLORS.textLight};"><span style="color:${COLORS.success};font-weight:700;margin-right:8px;">&#10003;</span>${f}</td></tr>`,
      )
      .join('');

    const html = emailLayout(
      `
        ${emailHeading(`Welcome to ${badgeName}, ${name}`)}
        ${emailParagraph(tagline)}
        ${emailParagraph(`<strong>Here's what you've unlocked:</strong>`)}
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:8px 0 4px 0;">
          ${featuresHtml}
        </table>
        ${emailButton('Open Regionify', dashboardUrl)}
        ${emailMuted(`Questions or feedback? Just reply to this email — we read every message.`)}
        ${emailMuted(`Your payment receipt is sent separately by our payment provider, Paddle.`)}
      `,
      { preheader: `You're now a ${APP_NAME} ${badgeName}. Here's what's new.` },
    );

    return { subject, text, html };
  },

  /** Email verification (link expires in 48 hours) */
  verifyEmail(
    name: string,
    verifyUrl: string,
    expiresInHours: number,
  ): { subject: string; text: string; html: string } {
    const subject = `Verify your ${APP_NAME} email`;

    const text = `
Hi ${name},

Verify your email by clicking the link below:
${verifyUrl}

This link expires in ${expiresInHours} hours.

If you didn't create an account with ${APP_NAME}, ignore this email.

Best regards,
The ${APP_NAME} Team
`.trim();

    const html = emailLayout(
      `
        ${emailHeading('Verify your email')}
        ${emailParagraph(`Hi ${name}, click below to verify your email and complete registration.`)}
        ${emailButton('Verify Email', verifyUrl)}
        ${emailMuted(`Link expires in <strong>${expiresInHours} hours</strong>. If you didn't sign up, ignore this email.`)}
        ${emailMuted(`<a href="${verifyUrl}" style="color:${COLORS.primary};word-break:break-all;">${verifyUrl}</a>`)}
      `,
      { preheader: `Verify your ${APP_NAME} email. Expires in ${expiresInHours} hours.` },
    );

    return { subject, text, html };
  },
};

// =============================================================================
// EMAIL SERVICE
// =============================================================================

export const emailService = {
  /**
   * Send an email using the external mail API
   */
  async send({
    to,
    subject,
    text,
    html,
  }: SendEmailParams): Promise<{ success: boolean; messageId?: string }> {
    const payload = {
      appId: APP_ID,
      to,
      subject,
      text,
      html,
    };

    try {
      const response = await fetch(`${env.MAIL_API_URL}/mail/external/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': env.MAIL_API_KEY,
        },
        body: JSON.stringify(payload),
      });

      const data = (await response.json()) as MailApiResponse | MailApiErrorResponse;

      if (!response.ok || !data.success) {
        const errorMessage = 'error' in data ? data.error : 'Failed to send email';
        logger.error({ response: data, statusCode: response.status }, 'Mail API error');
        throw new Error(errorMessage);
      }

      logger.info(
        { to, subject, messageId: (data as MailApiResponse).messageId },
        'Email sent successfully',
      );

      return {
        success: true,
        messageId: (data as MailApiResponse).messageId,
      };
    } catch (error) {
      logger.error({ error, to, subject }, 'Failed to send email');
      throw error;
    }
  },

  /**
   * Send welcome email after registration
   */
  async sendWelcome(to: string, name: string): Promise<void> {
    const { subject, text, html } = emailTemplates.welcome(name);
    await this.send({ to, subject, text, html });
  },

  /**
   * Send password reset email
   */
  async sendPasswordReset(to: string, name: string, resetToken: string): Promise<void> {
    const resetUrl = `${env.CLIENT_URL}/reset-password?token=${resetToken}`;
    const expiresInMinutes = 30; // 30 minutes - improved security per OWASP recommendations
    const { subject, text, html } = emailTemplates.passwordReset(name, resetUrl, expiresInMinutes);
    await this.send({ to, subject, text, html });
  },

  /**
   * OAuth-only account: user requested password reset but has no password (e.g. signed up with Google).
   */
  async sendPasswordResetOAuthNotice(to: string, name: string): Promise<void> {
    const loginUrl = `${env.CLIENT_URL.replace(/\/$/, '')}/login`;
    const { subject, text, html } = emailTemplates.passwordResetOAuthOnly(name, 'Google', loginUrl);
    await this.send({ to, subject, text, html });
  },

  /**
   * Send password changed confirmation
   */
  async sendPasswordChanged(to: string, name: string): Promise<void> {
    const { subject, text, html } = emailTemplates.passwordChanged(name);
    await this.send({ to, subject, text, html });
  },

  /**
   * Send account deletion confirmation email
   */
  async sendAccountDeleted(to: string, name: string): Promise<void> {
    const { subject, text, html } = emailTemplates.accountDeleted(name);
    await this.send({ to, subject, text, html });
  },

  /**
   * Send a "badge unlocked" email after a successful purchase.
   */
  async sendBadgePurchased(to: string, name: string, badge: PayableBadge): Promise<void> {
    const { subject, text, html } = emailTemplates.badgePurchased(name, badge);
    await this.send({ to, subject, text, html });
  },

  /**
   * Send email verification (link expires in 48 hours)
   */
  async sendVerifyEmail(to: string, name: string, verifyToken: string): Promise<void> {
    const verifyUrl = `${env.CLIENT_URL.replace(/\/$/, '')}/verify-email?token=${verifyToken}`;
    const { subject, text, html } = emailTemplates.verifyEmail(
      name,
      verifyUrl,
      VERIFY_EMAIL_EXPIRY_HOURS,
    );
    await this.send({ to, subject, text, html });
  },
};
