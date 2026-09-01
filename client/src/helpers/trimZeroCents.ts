/**
 * Drop zero cents from an already-localized currency string — Paddle's `formatted_totals.total`
 * always carries two decimals, so a whole price arrives as `$19.00`.
 *
 * The separator is removed only when its two zeros are the last digits in the string, which keeps
 * grouped amounts (`1.234,00 €` → `1.234 €`), real cents (`€17,50`), and zero-decimal currencies
 * (`¥1,900`) intact regardless of where the locale puts the symbol.
 */
export function trimZeroCents(formattedPrice: string): string {
  return formattedPrice.replace(/([.,])00(?=\D*$)/, '');
}
