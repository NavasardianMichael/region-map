# Paddle Pricing Preview — Localized Prices on Billing Page

## Context

Prices on the billing/pricing page are currently hardcoded numbers (`19`, `39`) from `BADGE_DETAILS`. Paddle's free Pricing Preview API returns the exact localized price (with correct currency symbol) that will appear at checkout, based on the visitor's IP. This avoids surprise currency mismatches and improves conversion for non-US visitors. The API key must stay server-side, so the client calls our own proxy endpoint.

---

## Files to Modify

### Server

- `server/src/services/paymentService.ts` — add `getPricingPreview(customerIp)`
- `server/src/routes/payments.ts` — add `GET /pricing-preview` (no auth required)

### Client

- `client/src/api/payments/endpoints.ts` — add `pricingPreview` entry
- `client/src/api/payments/types.ts` — add `LocalizedPrices` type
- `client/src/api/payments/index.ts` — add `getPricingPreview()` function
- `client/src/hooks/usePricingPreview.ts` — new hook (create)
- `client/src/components/billing/BadgeCard.tsx` — add optional `localizedPrice?: string` prop
- `client/src/components/billing/BadgesSection.tsx` — use `usePricingPreview`, pass localized prices to cards (covers both home page and billing page)

---

## Implementation

### 1. `paymentService.getPricingPreview(customerIp: string)`

Call `POST {PADDLE_API_BASE}/pricing-preview` with both price IDs and the customer's IP:

```typescript
type LocalizedPrices = { explorer: string | null; chronographer: string | null };

async getPricingPreview(customerIp: string): Promise<LocalizedPrices>
```

Paddle response shape to extract:

```
data.details.line_items[].price.id         → match to badge
data.details.line_items[].formatted_totals.total → "€17.50"
```

- Skip price IDs that aren't configured in env (return `null` for that badge)
- Throw `AppError` on non-ok Paddle response (caught by route → `next(error)`)
- If both price IDs are missing, return `{ explorer: null, chronographer: null }` without calling Paddle

### 2. `GET /api/payments/pricing-preview` (no auth)

```typescript
router.get('/pricing-preview', async (req, res, next) => {
  try {
    const data = await paymentService.getPricingPreview(req.ip ?? '');
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});
```

Uses `req.ip` — Express already has `trust proxy` enabled so this resolves to the real client IP.

### 3. Client API layer

**`endpoints.ts`** — add:

```typescript
pricingPreview: `${BASE_URL}/payments/pricing-preview`;
```

**`types.ts`** — add:

```typescript
export type LocalizedPrices = { explorer: string | null; chronographer: string | null };
```

**`index.ts`** — add:

```typescript
export async function getPricingPreview(): Promise<LocalizedPrices> {
  const response = await fetch(PAYMENT_ENDPOINTS.pricingPreview);
  const data = (await response.json()) as ApiResult<LocalizedPrices>;
  if (!response.ok || !data.success) throw new Error('Failed to fetch pricing');
  return data.data;
}
```

### 4. `usePricingPreview` hook (`client/src/hooks/usePricingPreview.ts`)

```typescript
export function usePricingPreview(): { prices: LocalizedPrices | null; isLoading: boolean };
```

- `useEffect` on mount → calls `getPricingPreview()`
- On error: sets `prices` to `null` (silent fallback — hardcoded prices remain)
- Returns `isLoading: true` until settled

### 5. `BadgeCard` — add `localizedPrice?: string` prop

Render logic for the price display:

- If `localizedPrice` is provided → show it (e.g. "€17.50 one-time")
- Otherwise → fall back to `t('badges.priceOneTime', { price })` with hardcoded number
- No skeleton/loading state needed — hardcoded price shows until localized price resolves

### 6. `BadgesSection` integration (covers both home page and billing page)

`BadgesSection` already calls `useBillingBadges()` internally. Add `usePricingPreview()` alongside it:

```typescript
const { prices } = usePricingPreview();
```

Pass `localizedPrice` to each `BadgeCard` when rendering:

- Explorer → `prices?.explorer ?? undefined`
- Chronographer → `prices?.chronographer ?? undefined`
- Observer → always `undefined` (free, no Paddle price ID)

After the cards list, render a small note **only when localized prices are loaded** (`prices !== null`):

```tsx
{
  prices !== null && (
    <Typography.Text type="secondary" className="text-center text-sm">
      {t('badges.localCurrencyNote')}
    </Typography.Text>
  );
}
```

Add locale key to all 7 locale files (`en`, `de`, `es`, `fr`, `pt`, `ru`, `zh`) and to `client/src/locales/types.ts`:

- `badges.localCurrencyNote`: `"Prices shown in your local currency."`

---

### Locale files to update

`client/src/locales/types.ts` — add `localCurrencyNote` to `badges` type  
`client/src/locales/en.ts`, `de.ts`, `es.ts`, `fr.ts`, `pt.ts`, `ru.ts`, `zh.ts` — add translated string

---

## No new env vars needed

Uses existing: `PADDLE_API_KEY`, `PADDLE_PRICE_ID_EXPLORER`, `PADDLE_PRICE_ID_CHRONOGRAPHER`, `PADDLE_SANDBOX`

---

## Verification

1. Open billing page → prices initially show hardcoded values ($19 / $39)
2. After fetch resolves (~200ms) → prices update to localized format (e.g. "€17.50 one-time" for IE visitor)
3. Disconnect network → prices stay at hardcoded fallback, no error shown
4. Check Network tab → `GET /api/payments/pricing-preview` returns `{ success: true, data: { explorer: "€17.50", chronographer: "€36.00" } }`
5. Verify the returned price matches what Paddle shows at checkout
