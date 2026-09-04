/**
 * Resolve any way a country can be written in an import file to a single ISO alpha-2 code.
 *
 * Group maps (World, continents, UN regions) use country names as their region titles, and
 * datasets name the same country very differently: `Russian Federation` vs `Russia`,
 * `Türkiye` vs `Turkey`, `USA` / `US` / `840` vs `United States`. Comparing both sides by
 * code instead of by spelling lets those files import against a group map.
 *
 * Sub-national maps are unaffected: their titles do not resolve to country codes, so nothing
 * a data column contains can match one.
 */
import { alpha3ToAlpha2, getNames, numericToAlpha2 } from 'i18n-iso-countries';
import { normalizeText } from '@/helpers/textSimilarity';

import './registerIsoCountriesLocales';

/** Kept in step with the locales registered by `registerIsoCountriesLocales`. */
const ISO_COUNTRY_LANGS = ['en', 'de', 'es', 'fr', 'pt', 'ru', 'zh'] as const;

const ALPHA2_LENGTH = 2;
const ALPHA3_LENGTH = 3;
const NUMERIC_CODE_REGEX = /^\d{3}$/;

/** Marks a normalized name claimed by more than one country, so it can never resolve. */
const AMBIGUOUS = '';

let codeByName: Map<string, string> | null = null;

/**
 * Index every localized name and alias across the registered locales. Names claimed by two
 * countries (bare `Congo` is both `CD` and `CG`) are poisoned rather than resolved, so an
 * ambiguous cell falls through to similarity matching instead of landing on the wrong region.
 */
const buildNameIndex = (): Map<string, string> => {
  const index = new Map<string, string>();

  for (const lang of ISO_COUNTRY_LANGS) {
    const namesByCode = getNames(lang, { select: 'all' });

    for (const [code, names] of Object.entries(namesByCode)) {
      for (const name of names) {
        const key = normalizeText(name);
        if (!key) continue;

        const existing = index.get(key);
        if (existing === undefined) {
          index.set(key, code);
          continue;
        }
        if (existing !== code) index.set(key, AMBIGUOUS);
      }
    }
  }

  return index;
};

const getNameIndex = (): Map<string, string> => {
  if (!codeByName) codeByName = buildNameIndex();
  return codeByName;
};

/**
 * ISO alpha-2 code for a country written as a name (in any supported locale), an alpha-2 or
 * alpha-3 code, or a UN M.49 numeric code. `null` when the value names no country, or names
 * one ambiguously.
 */
export const resolveCountryCode = (value: string): string | null => {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const upper = trimmed.toUpperCase();

  if (NUMERIC_CODE_REGEX.test(trimmed)) {
    return numericToAlpha2(trimmed) ?? null;
  }

  if (upper.length === ALPHA3_LENGTH) {
    const fromAlpha3 = alpha3ToAlpha2(upper);
    if (fromAlpha3) return fromAlpha3;
  }

  const byName = getNameIndex().get(normalizeText(trimmed));
  if (byName) return byName;

  // Checked last: a bare two-letter cell is ambiguous enough that a real name should win first.
  if (
    upper.length === ALPHA2_LENGTH &&
    getNames('en')[upper as keyof ReturnType<typeof getNames>]
  ) {
    return upper;
  }

  return null;
};

/** Country codes covered by a map's region titles; empty for maps whose regions are not countries. */
export const buildMapCountryCodeIndex = (svgTitles: string[]): Map<string, string> => {
  const byCode = new Map<string, string>();

  for (const title of svgTitles) {
    const code = resolveCountryCode(title);
    if (code && !byCode.has(code)) byCode.set(code, title);
  }

  return byCode;
};
