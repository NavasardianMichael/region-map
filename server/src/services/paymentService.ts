import { HttpStatus, ErrorCode, Badge, BADGES } from '@regionify/shared';
import crypto from 'node:crypto';

import { env } from '@/config/env.js';
import { getDeviceType } from '@/lib/deviceType.js';
import { sendInternalMail } from '@/lib/internalMail.js';
import { logger } from '@/lib/logger.js';
import { AppError } from '@/middleware/errorHandler.js';
import { userRepository } from '@/repositories/userRepository.js';
import { emailService } from '@/services/emailService.js';
import type { User } from '@prisma/client';

type PayableBadge = Exclude<Badge, typeof BADGES.observer>;

const PADDLE_API_BASE =
  env.PADDLE_SANDBOX === 'true' ? 'https://sandbox-api.paddle.com' : 'https://api.paddle.com';

/** Paid tier to Paddle price ID (from env). */
function getPriceIdByBadge(badge: PayableBadge): string {
  const id =
    badge === BADGES.explorer ? env.PADDLE_PRICE_ID_EXPLORER : env.PADDLE_PRICE_ID_CHRONOGRAPHER;
  if (!id) {
    throw new AppError(
      HttpStatus.SERVICE_UNAVAILABLE,
      ErrorCode.INTERNAL_ERROR,
      'Paddle price not configured for this badge tier',
    );
  }
  return id;
}

export type CreateCheckoutResult = {
  checkoutUrl: string;
};

export type LocalizedPrices = { explorer: string | null; chronographer: string | null };

type PaddlePricingPreviewResponse = {
  data?: {
    details?: {
      line_items?: Array<{
        price?: { id?: string };
        formatted_totals?: { total?: string };
      }>;
    };
  };
};

type TransactionWebhookPayload = {
  data?: {
    id?: string;
    custom_data?: { user_id?: string; device_type?: string };
    items?: Array<{ price?: { id?: string } }>;
  };
};

type PaddleErrorResponse = {
  error?: { code?: string; detail?: string };
  meta?: { request_id?: string };
};

/**
 * Log a failed Paddle API response with the fields Paddle Support asks for (`code`, `request_id`)
 * and return the human-readable detail for the client-facing error message.
 */
async function logPaddleFailure(
  res: Response,
  operation: string,
  context: Record<string, unknown>,
): Promise<string> {
  const body = (await res.json().catch(() => ({}))) as PaddleErrorResponse;
  const detail = body.error?.detail ?? res.statusText;
  logger.error(
    {
      ...context,
      operation,
      status: res.status,
      paddleErrorCode: body.error?.code,
      paddleRequestId: body.meta?.request_id,
      sandbox: env.PADDLE_SANDBOX === 'true',
      action: 'payment_failed',
    },
    `paddle ${operation} failed: ${detail}`,
  );
  return detail;
}

export const paymentService = {
  /**
   * Create a Paddle Billing transaction/checkout for a badge tier upgrade. Returns URL to redirect the user.
   * Server-only; API key never sent to client.
   */
  async createCheckout(
    userId: string,
    badge: PayableBadge,
    userAgent: string | undefined,
  ): Promise<CreateCheckoutResult> {
    const apiKey = env.PADDLE_API_KEY;
    if (!apiKey) {
      throw new AppError(
        HttpStatus.SERVICE_UNAVAILABLE,
        ErrorCode.INTERNAL_ERROR,
        'Paddle is not configured',
      );
    }

    const priceId = getPriceIdByBadge(badge);
    // Paddle Billing requires `checkout.url` to point at a page on an approved domain that loads
    // Paddle.js. Paddle returns this URL with `?_ptxn=…` appended; Paddle.js then auto-opens the
    // overlay. See PaymentCheckoutPage on the client.
    const checkoutPageUrl = `${env.CLIENT_URL}/payments/checkout`;
    const deviceType = getDeviceType(userAgent);

    const res = await fetch(`${PADDLE_API_BASE}/transactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        items: [{ price_id: priceId, quantity: 1 }],
        custom_data: { user_id: userId, device_type: deviceType },
        checkout: { url: checkoutPageUrl },
      }),
    });

    if (!res.ok) {
      const detail = await logPaddleFailure(res, 'checkout', { userId, badge, priceId });
      throw new AppError(
        HttpStatus.BAD_GATEWAY,
        ErrorCode.INTERNAL_ERROR,
        `Paddle checkout failed: ${detail}`,
      );
    }

    const json = (await res.json()) as {
      data?: { checkout?: { url?: string } };
    };
    const checkoutUrl = json.data?.checkout?.url;
    if (!checkoutUrl) {
      throw new AppError(
        HttpStatus.BAD_GATEWAY,
        ErrorCode.INTERNAL_ERROR,
        'Paddle did not return a checkout URL',
      );
    }

    return { checkoutUrl };
  },

  /**
   * Call Paddle Pricing Preview API and return formatted totals for paid badge tiers.
   * Returns null for a badge if its price ID is not configured.
   */
  async getPricingPreview(customerIp: string): Promise<LocalizedPrices> {
    const explorerPriceId = env.PADDLE_PRICE_ID_EXPLORER;
    const chronographerPriceId = env.PADDLE_PRICE_ID_CHRONOGRAPHER;

    if (!explorerPriceId && !chronographerPriceId) {
      return { explorer: null, chronographer: null };
    }

    const apiKey = env.PADDLE_API_KEY;
    if (!apiKey) {
      return { explorer: null, chronographer: null };
    }

    const items = [
      ...(explorerPriceId ? [{ price_id: explorerPriceId, quantity: 1 }] : []),
      ...(chronographerPriceId ? [{ price_id: chronographerPriceId, quantity: 1 }] : []),
    ];

    const res = await fetch(`${PADDLE_API_BASE}/pricing-preview`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ items, customer_ip_address: customerIp || undefined }),
    });

    if (!res.ok) {
      const detail = await logPaddleFailure(res, 'pricing preview', {
        priceIds: items.map((item) => item.price_id),
      });
      throw new AppError(
        HttpStatus.BAD_GATEWAY,
        ErrorCode.INTERNAL_ERROR,
        `Paddle pricing preview failed: ${detail}`,
      );
    }

    const json = (await res.json()) as PaddlePricingPreviewResponse;
    const lineItems = json.data?.details?.line_items ?? [];

    const findTotal = (priceId: string | undefined): string | null => {
      if (!priceId) return null;
      const item = lineItems.find((li) => li.price?.id === priceId);
      return item?.formatted_totals?.total ?? null;
    };

    return {
      explorer: findTotal(explorerPriceId),
      chronographer: findTotal(chronographerPriceId),
    };
  },

  /**
   * Verify Paddle webhook signature (Paddle-Signature header).
   * Header format: ts=TIMESTAMP;h1=HASH[;h1=HASH2] — all h1 values are checked.
   * PADDLE_WEBHOOK_SECRET may hold several comma-separated secrets; a match on any one passes,
   * so a new notification destination can be added before the old one is deleted.
   */
  verifyWebhookSignature(rawBody: Buffer, signature: string): boolean {
    const secrets = env.PADDLE_WEBHOOK_SECRET;
    if (secrets.length === 0) {
      logger.error(
        { action: 'payment_failed' },
        'paddle webhook: PADDLE_WEBHOOK_SECRET is not configured',
      );
      return false;
    }

    const parts = signature.split(';');
    const ts = parts.find((p) => p.startsWith('ts='))?.slice(3);
    const h1Values = parts.filter((p) => p.startsWith('h1=')).map((p) => p.slice(3));
    if (!ts || h1Values.length === 0) return false;

    // Signed payload is "{ts}:{rawBody}" as bytes — avoid string coercion of rawBody
    const signedPayload = Buffer.concat([Buffer.from(`${ts}:`, 'utf8'), rawBody]);

    // Every configured secret is tried: during a rotation the old and new notification
    // destinations are both live, and either one may have signed this event.
    const matchedIndex = secrets.findIndex((secret) => {
      const computed = crypto.createHmac('sha256', secret).update(signedPayload).digest('hex');
      const computedBuf = Buffer.from(computed, 'utf8');
      return h1Values.some((h1) => {
        const h1Buf = Buffer.from(h1, 'utf8');
        return computedBuf.length === h1Buf.length && crypto.timingSafeEqual(computedBuf, h1Buf);
      });
    });

    if (matchedIndex > 0) {
      // Rotation is only finished once nothing verifies against a fallback secret any more.
      logger.warn(
        { secretIndex: matchedIndex, secretCount: secrets.length },
        'paddle webhook: verified with a fallback secret, rotation still in progress',
      );
    }

    return matchedIndex !== -1;
  },

  /**
   * Send an internal notification email about a badge purchase attempt (success or failure).
   * Best-effort — failures must never break the webhook response.
   */
  async sendPurchaseNotification(params: {
    user: User;
    badge: string;
    transactionId: string | undefined;
    eventType: 'transaction.completed' | 'transaction.payment_failed';
    deviceType: string;
  }): Promise<void> {
    const { user, badge, transactionId, eventType, deviceType } = params;
    const status = eventType === 'transaction.completed' ? 'succeeded' : 'failed';

    try {
      await sendInternalMail({
        subject: `Badge purchase ${status}: ${badge}`,
        body: `User ${user.name} (${user.email}) ${
          status === 'succeeded' ? 'purchased' : 'attempted to purchase'
        } the "${badge}" badge. Payment status: ${status}.`,
        details: {
          userId: user.id,
          userEmail: user.email,
          userName: user.name,
          badge,
          status,
          transactionId: transactionId ?? 'unknown',
          deviceType,
        },
      });
      logger.info(
        { transactionId, userId: user.id, badge, status, action: 'purchase_notification_sent' },
        'internal purchase notification email sent',
      );
    } catch (err) {
      logger.error(
        { err, transactionId, userId: user.id, badge, status, action: 'payment_failed' },
        'failed to send internal purchase notification email',
      );
    }
  },

  /**
   * Handle transaction.completed webhook: upgrade user badge from custom_data.user_id and price ID.
   * Idempotent — safe to call multiple times for the same transaction.
   */
  async handleTransactionCompleted(payload: TransactionWebhookPayload): Promise<void> {
    const userId = payload.data?.custom_data?.user_id;
    const priceId = payload.data?.items?.[0]?.price?.id;
    const transactionId = payload.data?.id;
    const deviceType = payload.data?.custom_data?.device_type ?? 'unknown';

    if (!userId || !priceId) {
      logger.error(
        { transactionId, userId, priceId, action: 'payment_failed' },
        'webhook: missing userId or priceId in payload, badge not assigned',
      );
      return;
    }

    let badge: User['badge'] | null = null;
    if (priceId === env.PADDLE_PRICE_ID_EXPLORER) {
      badge = BADGES.explorer as User['badge'];
    } else if (priceId === env.PADDLE_PRICE_ID_CHRONOGRAPHER) {
      badge = BADGES.chronographer as User['badge'];
    }
    if (!badge) {
      logger.error(
        { transactionId, userId, priceId, action: 'payment_failed' },
        'webhook: priceId does not match any configured badge tier, badge not assigned',
      );
      return;
    }

    const user = await userRepository.findById(userId);
    if (!user) {
      logger.error(
        { transactionId, userId, badge, action: 'payment_failed' },
        'webhook: user not found, badge not assigned',
      );
      return;
    }
    if (user.badge === badge) {
      logger.info(
        { transactionId, userId, badge },
        'webhook: user already has this badge, skipping update',
      );
      return;
    }

    await userRepository.update(userId, { badge });

    // Congratulatory "you've unlocked ..." email. Failure must not break the webhook — Paddle
    // would otherwise retry the whole event and the user could be spammed.
    try {
      await emailService.sendBadgePurchased(user.email, user.name, badge as PayableBadge);
      logger.info(
        { transactionId, userId, badge, action: 'badge_purchase_email_sent' },
        'badge purchase email sent',
      );
    } catch (err) {
      logger.error(
        { err, transactionId, userId, badge, action: 'badge_purchase_email_failed' },
        'failed to send badge purchase email',
      );
    }

    // Fire-and-forget: never let the internal notification delay or fail the webhook response.
    // sendPurchaseNotification already catches its own errors and cannot reject.
    void this.sendPurchaseNotification({
      user,
      badge,
      transactionId,
      eventType: 'transaction.completed',
      deviceType,
    });
  },

  /**
   * Handle transaction.payment_failed webhook: send an internal notification only.
   * Does not touch the user's badge or send the user-facing "badge purchased" email.
   */
  async handleTransactionPaymentFailed(payload: TransactionWebhookPayload): Promise<void> {
    const userId = payload.data?.custom_data?.user_id;
    const priceId = payload.data?.items?.[0]?.price?.id;
    const transactionId = payload.data?.id;
    const deviceType = payload.data?.custom_data?.device_type ?? 'unknown';

    if (!userId) {
      logger.error(
        { transactionId, action: 'payment_failed' },
        'webhook: missing userId in payload, cannot notify about failed payment',
      );
      return;
    }

    let badge: string = 'unknown';
    if (priceId === env.PADDLE_PRICE_ID_EXPLORER) badge = BADGES.explorer;
    else if (priceId === env.PADDLE_PRICE_ID_CHRONOGRAPHER) badge = BADGES.chronographer;

    const user = await userRepository.findById(userId);
    if (!user) {
      logger.error(
        { transactionId, userId, badge, action: 'payment_failed' },
        'webhook: user not found for failed transaction',
      );
      return;
    }

    // Fire-and-forget: never let the internal notification delay or fail the webhook response.
    // sendPurchaseNotification already catches its own errors and cannot reject.
    void this.sendPurchaseNotification({
      user,
      badge,
      transactionId,
      eventType: 'transaction.payment_failed',
      deviceType,
    });
  },
};
