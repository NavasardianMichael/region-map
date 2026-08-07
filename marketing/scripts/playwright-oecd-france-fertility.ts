/**
 * One-off asset generator for the "embeddable choropleth map" Medium article
 * (docs/marketing/medium/embed-guide.md). Builds a real Regionify project from
 * OECD regional fertility data for France's 13 modern régions (2018-2023,
 * fetched from the OECD SDMX API — see docs/marketing/assets/data/oecd-fertility-france.csv),
 * then produces the two "drop-in embed" deliverables the article demonstrates
 * (SVG, animated GIF) plus a live public iframe embed, screenshotting each step.
 *
 * Deliberately picks "France (2016 Regions)" (not the default "France" map,
 * which uses the old 22-région split) because the OECD dataset's TL2 region
 * codes match the modern 13-région reform.
 *
 * Region ids in the CSV are pre-normalized to match the map SVG's `title` attributes
 * exactly (e.g. "Bretagne"/"Normandie", not OECD's English exonyms "Brittany"/"Normandy";
 * a straight apostrophe in "Provence-Alpes-Côte d'Azur", not OECD's curly one). This is
 * required, not cosmetic: `findBestMatch`/`textSimilarity.ts` — the deterministic
 * fuzzy-matching logic described in the product's own marketing — is dead code, never
 * called by any import path (`convertToRegionData` → `mapDataToSvgRegions` is a pure
 * passthrough that ignores the `svgTitles` argument). Every plain import (CSV, Excel,
 * tab-delimited, manual, Google Sheets) requires a byte-exact id match; anything else
 * silently renders as "No Data" with no warning.
 *
 * Steps:
 *   1. /projects/new → pick "France (2016 Regions)"
 *   2. Switch to "Tab delimited text (manual)" import, clear the sample data, paste the
 *      OECD fertility time series, screenshot the pasted data
 *   3. Expand the legend to 5 named ranges (Very Low → Very High), normalize them to
 *      the data's real min/max, title the legend, jump the timeline to 2023, screenshot
 *      the styled product view
 *   4. Export animated GIF (all years) with a transparent background
 *   5. Paste a real, year-less 2023-only snapshot (NOT "Switch to static data" — that
 *      button unconditionally discards the dataset and fills it with random sample
 *      values instead of snapshotting the current frame; see `applySwitchToStatic` in
 *      the app's ImportDataPanel.tsx), re-normalize, export SVG
 *   6. Re-import the full OECD time series (NOT "Switch to dynamic data" — same
 *      destructive-toggle problem in the other direction), save the project, enable
 *      public embed with SEO metadata, screenshot the live embed page, record the
 *      embed URL + code
 *
 * Run:
 *   pnpm --filter @regionify/marketing exec tsx scripts/playwright-oecd-france-fertility.ts
 *   … -- --headed   to watch
 *
 * Requires:
 *   marketing/.env with CLIENT_URL, REGIONIFY_EMAIL, REGIONIFY_PASSWORD set.
 *   Account must be on the Chronographer tier (historical import + public embed).
 */

import { chromium, type BrowserContext, type Locator, type Page } from 'playwright';
import { config as loadEnv } from 'dotenv';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: join(__dirname, '..', '.env') });

const BASE_URL = (process.env.CLIENT_URL ?? '').replace(/\/$/, '');
const EMAIL = process.env.REGIONIFY_EMAIL ?? '';
const PASSWORD = process.env.REGIONIFY_PASSWORD ?? '';

function resolveApiBaseUrl(clientUrl: string): string {
  const fromEnv = process.env.API_BASE_URL ?? process.env.VITE_API_BASE_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  if (/localhost:7002$/i.test(clientUrl)) return 'http://localhost:9002';
  return clientUrl;
}
const API_BASE_URL = BASE_URL ? resolveApiBaseUrl(BASE_URL) : '';

const ASSETS_ROOT = join(__dirname, '..', 'assets');
const AUTH_STATE_FILE = join(ASSETS_ROOT, '.auth-state.json');
// All generated deliverables (raw exports + UI screenshots) live together under this
// article's own subfolder in docs/marketing/medium/, not scattered across marketing/assets/
// and docs/marketing/assets/images/.
const OUTPUT_DIR = join(__dirname, '..', '..', 'docs', 'marketing', 'medium', 'embed-guide');
const UI_SCREENSHOTS_DIR = OUTPUT_DIR;

const DATA_CSV_PATH = join(
  __dirname,
  '..',
  '..',
  'docs',
  'marketing',
  'assets',
  'data',
  'oecd-fertility-france.csv',
);

const COUNTRY_LABEL = 'France (2016 Regions)';
const PROJECT_NAME = 'France — OECD Fertility Rate (2018–2023)';
const LEGEND_TITLE = 'Total Fertility Rate';
const REFERENCE_YEAR = '2023';
const VIEWPORT = { width: 1600, height: 1000 } as const;

/** Default legend has 3 bins (Low/Medium/High) — add 2 more so real variation across
 * France's 13 régions doesn't get flattened into three broad buckets, then rename all 5
 * to match the dataset (demographic fertility-rate tiers) instead of the generic defaults. */
const RANGE_NAMES = ['Very Low', 'Low', 'Moderate', 'High', 'Very High'];
const RANGE_COLORS = ['DBEAFE', '93C5FD', '3B82F6', '1D4ED8', '1E3A8A'];

function log(msg: string): void {
  console.log(`[oecd-france] ${msg}`);
}

function buildTabDelimitedData(): string {
  const content = readFileSync(DATA_CSV_PATH, 'utf-8').replace(/^﻿/, '');
  return content
    .trim()
    .split('\n')
    .map((line) => line.trim().split(',').join('\t'))
    .join('\n');
}

/**
 * A single year, WITHOUT a year column — pasting this (instead of the full multi-year
 * file) keeps the import on the static (non-timeline) branch of `commitParsedImport`,
 * which uses the real pasted values as-is. This is the only safe way to get a real,
 * single-frame static export: the "Switch to static data" button does NOT snapshot the
 * current frame — `applySwitchToStatic` in ImportDataPanel.tsx unconditionally discards
 * the dataset and fills it with fresh random sample values instead (confirmed by
 * inspecting its source — this cost an entire wrong SVG export before being caught here).
 */
function buildSingleYearTabDelimited(year: string): string {
  const content = readFileSync(DATA_CSV_PATH, 'utf-8').replace(/^﻿/, '');
  const lines = content.trim().split('\n');
  const header = lines[0].split(',');
  const yearIdx = header.indexOf('year');
  const rows = lines
    .slice(1)
    .map((line) => line.trim().split(','))
    .filter((cols) => cols[yearIdx] === year)
    .map((cols) => cols.filter((_, i) => i !== yearIdx).join('\t'));
  if (rows.length === 0) {
    throw new Error(`No rows found for year ${year} in ${DATA_CSV_PATH}`);
  }
  return ['id\tlabel\tvalue', ...rows].join('\n');
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

async function login(page: Page, context: BrowserContext): Promise<void> {
  await page.goto(`${BASE_URL}/login`);
  await page.locator('input#email').fill(EMAIL);
  await page.locator('input[autocomplete="current-password"]').fill(PASSWORD);
  await page.locator('button[type="submit"]').click();

  const evictBtn = page.getByRole('button', { name: 'Sign in and log out from all other devices' });
  const evictAppeared = await evictBtn
    .waitFor({ timeout: 3_000 })
    .then(() => true)
    .catch(() => false);
  if (evictAppeared) {
    log('Session limit hit — evicting other devices');
    await evictBtn.click();
  }

  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 40_000 });
  await page.waitForLoadState('networkidle', { timeout: 25_000 }).catch(() => {});
  await page.waitForTimeout(1_000);

  mkdirSync(ASSETS_ROOT, { recursive: true });
  await context.storageState({ path: AUTH_STATE_FILE });
  log('Logged in — session saved');
}

async function ensureAuthedContext(
  browser: Awaited<ReturnType<typeof chromium.launch>>,
): Promise<BrowserContext> {
  const context = await browser.newContext({
    acceptDownloads: true,
    viewport: VIEWPORT,
    ...(existsSync(AUTH_STATE_FILE) ? { storageState: AUTH_STATE_FILE } : {}),
  });
  const page = await context.newPage();

  if (existsSync(AUTH_STATE_FILE)) {
    await page.goto(`${BASE_URL}/projects`);
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
    const sessionExpired = await page
      .waitForURL((url) => url.pathname.startsWith('/login'), { timeout: 3_000 })
      .then(() => true)
      .catch(() => false);
    if (sessionExpired) {
      log('Saved session expired — logging in fresh');
      await login(page, context);
    } else {
      log('Resumed saved session');
    }
  } else {
    await login(page, context);
  }

  await page.close();
  return context;
}

async function ensureEnglishProfile(context: BrowserContext): Promise<void> {
  if (!API_BASE_URL) return;
  try {
    const res = await context.request.patch(`${API_BASE_URL}/auth/profile`, {
      data: { locale: 'en' },
      headers: { 'Content-Type': 'application/json' },
    });
    if (res.ok()) log('✓ profile locale set to English');
    else log(`⚠ profile locale patch failed (${res.status()})`);
  } catch (err) {
    log(`⚠ could not patch profile locale: ${err instanceof Error ? err.message : err}`);
  }
}

// ---------------------------------------------------------------------------
// Shared UI helpers (adapted from playwright-asset-generator.ts)
// ---------------------------------------------------------------------------

async function click(locator: Locator): Promise<void> {
  await locator.waitFor({ state: 'visible', timeout: 15_000 });
  await locator.click();
}

async function switchOn(switchEl: Locator): Promise<void> {
  await switchEl.waitFor({ timeout: 5_000 });
  if ((await switchEl.getAttribute('aria-checked')) !== 'true') {
    await switchEl.click();
  }
}

async function closeModal(page: Page): Promise<void> {
  const closeBtn = page.locator('.ant-modal-close:visible').first();
  if (await closeBtn.isVisible({ timeout: 1_000 }).catch(() => false)) {
    await closeBtn.click({ timeout: 5_000 }).catch(() => page.keyboard.press('Escape'));
  } else {
    await page.keyboard.press('Escape');
  }
  await page
    .locator('.ant-modal:visible')
    .waitFor({ state: 'hidden', timeout: 5_000 })
    .catch(() => {});
}

function exportConfigureModal(page: Page): Locator {
  return page
    .locator('.ant-modal:visible')
    .filter({ has: page.locator('[data-i18n-key="visualizer.exportModal.title"]') });
}

function exportCropModal(page: Page): Locator {
  return page
    .locator('.ant-modal:visible')
    .filter({ has: page.locator('[data-i18n-key="visualizer.exportModal.cropAndDownload"]') });
}

function exportPrimaryDownloadButton(modal: Locator): Locator {
  return modal
    .locator('button.ant-btn-primary')
    .filter({ has: modal.page().locator('.anticon-download') })
    .first();
}

async function selectAntOption(page: Page, i18nKey: string, optionLabel: string): Promise<void> {
  const select = page
    .locator('.ant-modal:visible')
    .locator(`[data-i18n-key="${i18nKey}"]`)
    .locator('..')
    .locator('..')
    .locator('.ant-select');
  await select.click();
  // rc-trigger renders the dropdown once off-screen to measure size, then repositions it —
  // clicking too early hits the stale (measuring) position and silently misses, leaving
  // whatever was already selected. Wait for the dropdown to settle before targeting an option.
  const dropdown = page.locator('.ant-select-dropdown:visible').first();
  await dropdown.waitFor({ state: 'visible', timeout: 5_000 });
  await page.waitForTimeout(350);

  const option = dropdown
    .locator('.ant-select-item-option-content', { hasText: optionLabel })
    .first();
  await option.scrollIntoViewIfNeeded();
  await option.waitFor({ state: 'visible', timeout: 5_000 });
  await option.click({ force: true });
  await dropdown.waitFor({ state: 'hidden', timeout: 5_000 }).catch(() => {});
  await page.waitForTimeout(300);
}

async function setInputNumberByLabel(page: Page, i18nKey: string, value: number): Promise<void> {
  const modal = page.locator('.ant-modal:visible');
  const input = modal
    .locator(`[data-i18n-key="${i18nKey}"]`)
    .locator('..')
    .locator('..')
    .locator('.ant-input-number-input');
  await input.click({ clickCount: 3 });
  await input.fill(String(value));
  await input.press('Tab');
}

async function waitForVisualizerReady(page: Page, timeoutMs = 30_000): Promise<void> {
  await page
    .locator('[data-i18n-key="visualizer.embed.openButton"]')
    .waitFor({ state: 'visible', timeout: timeoutMs });
}

// ---------------------------------------------------------------------------
// Steps
// ---------------------------------------------------------------------------

async function createProject(page: Page): Promise<void> {
  await page.goto(`${BASE_URL}/projects/new`);
  await page.waitForLoadState('networkidle', { timeout: 15_000 });
  await waitForVisualizerReady(page);

  const regionInput = page.locator('input[aria-label="Select a country"]');
  await regionInput.waitFor({ timeout: 15_000 });
  await regionInput.click();
  await page.keyboard.type('France (2016', { delay: 50 });
  await page.locator('.ant-select-dropdown:visible').waitFor({ timeout: 5_000 });
  await page
    .locator('.ant-select-dropdown:visible .ant-select-item-option-content', {
      hasText: COUNTRY_LABEL,
    })
    .first()
    .click({ timeout: 30_000 });

  await page.waitForLoadState('networkidle', { timeout: 20_000 });
  await page
    .getByRole('button', { name: /Switch to (dynamic|static) data/ })
    .waitFor({ timeout: 30_000 });
  log('✓ "France (2016 Regions)" selected — sample data loaded');
}

/** Pastes tab-delimited text into the manual-entry modal and saves. Caller decides
 * whether to screenshot first and which post-condition (timeline vs static) to wait for. */
async function pasteTabDelimitedData(page: Page, tabDelimitedData: string): Promise<void> {
  const tabDelimitedRadio = page.locator('input[type="radio"][value="tab_delimited"]');
  await tabDelimitedRadio.waitFor({ timeout: 10_000 });
  const tabDelimitedLabel = page
    .locator('label.ant-radio-wrapper', { has: tabDelimitedRadio })
    .first();
  await click(tabDelimitedLabel);

  const editInTextBtn = page.locator('[data-i18n-key="visualizer.importData.editManuallyInText"]');
  await click(editInTextBtn);

  const modal = page
    .locator('.ant-modal:visible')
    .filter({ has: page.locator('.ant-modal-title', { hasText: 'Tab Delimited Text' }) });
  await modal.waitFor({ timeout: 15_000 });

  const textarea = modal.locator('textarea');
  await click(textarea);
  await page.keyboard.press('Control+A');
  await page.keyboard.press('Delete');
  await page.evaluate((text) => navigator.clipboard.writeText(text), tabDelimitedData);
  await page.keyboard.press('Control+V');
  await page.waitForTimeout(400);

  const saveBtn = modal.getByRole('button', { name: 'Save' });
  await click(saveBtn);
  await modal.waitFor({ state: 'hidden', timeout: 15_000 }).catch(() => {});
}

async function importOecdData(page: Page, tabDelimitedData: string): Promise<void> {
  const tabDelimitedRadio = page.locator('input[type="radio"][value="tab_delimited"]');
  await tabDelimitedRadio.waitFor({ timeout: 10_000 });
  const tabDelimitedLabel = page
    .locator('label.ant-radio-wrapper', { has: tabDelimitedRadio })
    .first();
  await click(tabDelimitedLabel);

  const editInTextBtn = page.locator('[data-i18n-key="visualizer.importData.editManuallyInText"]');
  await click(editInTextBtn);

  const modal = page
    .locator('.ant-modal:visible')
    .filter({ has: page.locator('.ant-modal-title', { hasText: 'Tab Delimited Text' }) });
  await modal.waitFor({ timeout: 15_000 });

  const textarea = modal.locator('textarea');
  await click(textarea);
  await page.keyboard.press('Control+A');
  await page.keyboard.press('Delete');
  await page.evaluate((text) => navigator.clipboard.writeText(text), tabDelimitedData);
  await page.keyboard.press('Control+V');
  await page.waitForTimeout(400);

  // Screenshot the pasted-but-unsaved data for the article's import-step visual.
  mkdirSync(UI_SCREENSHOTS_DIR, { recursive: true });
  await page.screenshot({
    path: join(UI_SCREENSHOTS_DIR, 'oecd-fertility-import-panel.png'),
    fullPage: false,
  });
  log('✓ import panel screenshot saved');

  const saveBtn = modal.getByRole('button', { name: 'Save' });
  await click(saveBtn);
  await modal.waitFor({ state: 'hidden', timeout: 15_000 }).catch(() => {});

  // Excludes `.ant-color-picker-slider` — on a second import (after legend ranges have
  // already been colored once), leftover color-picker popovers can still match a bare
  // `.ant-slider` selector and violate Playwright's strict mode.
  await page
    .locator('.ant-slider:not(.ant-color-picker-slider)')
    .first()
    .waitFor({ state: 'visible', timeout: 15_000 });
  log('✓ OECD fertility time series imported — timeline slider active');
}

/**
 * Pastes a single year's data with NO year column, which keeps `commitParsedImport` on
 * its static branch and uses the real pasted values as-is — the safe way to get a real
 * static snapshot. See the note on `buildSingleYearTabDelimited` for why "Switch to
 * static data" cannot be used for this instead.
 */
async function importSingleYearStaticData(page: Page, tabDelimitedData: string): Promise<void> {
  await pasteTabDelimitedData(page, tabDelimitedData);
  await page
    .locator('.ant-slider:not(.ant-color-picker-slider)')
    .first()
    .waitFor({ state: 'hidden', timeout: 10_000 })
    .catch(() => {});
  log('✓ single-year static data imported (real 2023 values, no timeline)');
}

async function jumpTimelineToLastFrame(page: Page): Promise<void> {
  const sliderHandle = page
    .locator('.ant-slider:not(.ant-color-picker-slider) [role="slider"]')
    .first();
  await sliderHandle.waitFor({ timeout: 10_000 });
  await sliderHandle.focus();
  await page.keyboard.press('End');
  await page.waitForTimeout(500);
  log('✓ timeline jumped to last frame (2023)');
}

function rangesPanel(page: Page): Locator {
  return page
    .locator('.ant-collapse-item')
    .filter({ has: page.locator('[data-i18n-key="visualizer.legendConfig.collapseRanges"]') });
}

async function expandRangesPanel(page: Page): Promise<Locator> {
  const panel = rangesPanel(page);
  const addBtn = page.locator('[data-i18n-key="visualizer.legendConfig.addRangeAria"]');
  if (!(await addBtn.isVisible().catch(() => false))) {
    await click(panel.locator('.ant-collapse-header'));
    await addBtn.waitFor({ timeout: 5_000 });
  }
  return panel;
}

/** Open a legend range row's color popover, type a hex value, close via Escape. */
async function changeLegendRowColor(page: Page, row: Locator, hex: string): Promise<void> {
  await click(row.locator('.ant-color-picker-trigger'));
  const hexInput = page.locator('.ant-color-picker-hex-input input').last();
  await hexInput.waitFor({ state: 'visible', timeout: 10_000 });
  await hexInput.click({ clickCount: 3 });
  await hexInput.fill(hex);
  await page.waitForTimeout(150);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(150);
}

/** Grows the default 3 bins to 5 and renames/recolors all of them to fertility-rate
 * tiers, ascending light-to-dark. Must run BEFORE normalizeRanges — normalize only
 * redistributes min/max across whatever bins already exist.
 *
 * Self-verifying: a previous run silently ended up with the original 3 unnamed
 * default bins in the final export (normalize had redistributed min/max across
 * only 3 items, not 5) even though no step threw — the "Add Range" click(s) and/or
 * the name keystrokes didn't reliably stick. Rather than trust fire-and-forget
 * clicks, this reads the row count and each input's actual value back and retries
 * before moving on, so a real failure throws loudly instead of quietly producing a
 * wrong screenshot. */
async function addAndNameRanges(page: Page): Promise<void> {
  const panel = await expandRangesPanel(page);
  const addBtn = page.locator('[data-i18n-key="visualizer.legendConfig.addRangeAria"]');
  const rows = panel.locator('[data-index]');

  const targetCount = RANGE_NAMES.length;
  for (let i = 3; i < targetCount; i++) {
    const before = await rows.count();
    for (let attempt = 0; attempt < 3 && (await rows.count()) === before; attempt++) {
      await click(addBtn);
      await page.waitForTimeout(250);
    }
    const after = await rows.count();
    if (after !== before + 1) {
      throw new Error(
        `"Add Range" click didn't grow the legend from ${before} to ${before + 1} rows (got ${after}) after 3 attempts.`,
      );
    }
  }

  const finalCount = await rows.count();
  if (finalCount !== targetCount) {
    throw new Error(`Expected ${targetCount} legend ranges after adding, found ${finalCount}.`);
  }

  for (let i = 0; i < RANGE_NAMES.length; i++) {
    const row = rows.nth(i);
    const nameInput = row.locator('input[aria-label="Legend item name"]');

    let actual = '';
    for (let attempt = 0; attempt < 2; attempt++) {
      await click(nameInput);
      await page.keyboard.press('Control+A');
      await page.keyboard.type(RANGE_NAMES[i], { delay: 20 });
      await nameInput.press('Tab');
      actual = await nameInput.inputValue();
      if (actual === RANGE_NAMES[i]) break;
      // Retry with a direct fill — covers the rare case where keystrokes raced a re-render.
      await nameInput.click({ clickCount: 3 });
      await nameInput.fill(RANGE_NAMES[i]);
      await nameInput.press('Tab');
      actual = await nameInput.inputValue();
      if (actual === RANGE_NAMES[i]) break;
    }
    if (actual !== RANGE_NAMES[i]) {
      throw new Error(`Range row ${i} name is "${actual}", expected "${RANGE_NAMES[i]}".`);
    }

    await changeLegendRowColor(page, row, RANGE_COLORS[i]);
  }
  log(`✓ expanded to ${RANGE_NAMES.length} named ranges: ${RANGE_NAMES.join(', ')}`);
}

async function normalizeRanges(page: Page): Promise<void> {
  const panel = rangesPanel(page);
  const header = panel.locator('.ant-collapse-header');
  const btn = page.locator('[data-i18n-key="visualizer.legendConfig.normalizeRangesAria"]');

  if (!(await btn.isVisible().catch(() => false))) {
    await click(header);
    await btn.waitFor({ timeout: 5_000 });
  }
  await click(btn);
  await page.waitForTimeout(400);
  log('✓ legend ranges normalized');
}

async function setLegendTitle(page: Page, title: string): Promise<void> {
  const titlePanelItem = page
    .locator('.ant-collapse-item')
    .filter({ has: page.locator('[data-i18n-key="visualizer.legendStyles.collapseTitle"]') });
  const header = titlePanelItem.locator('.ant-collapse-header');
  await click(header);

  const titleInput = titlePanelItem.locator(
    '[data-i18n-key="visualizer.legendStyles.titlePlaceholder"]',
  );
  await click(titleInput);
  await page.keyboard.press('Control+A');
  await page.keyboard.type(title, { delay: 20 });
  await page.waitForTimeout(500);
  log(`✓ legend title set to "${title}"`);
}

async function setTransparentBackground(page: Page): Promise<void> {
  const transparentSwitch = page.getByRole('switch', { name: 'Transparent' });
  if (!(await transparentSwitch.isVisible().catch(() => false))) {
    await page.locator('[data-i18n-key="visualizer.mapStyles.collapseBackground"]').first().click();
    await transparentSwitch.waitFor({ timeout: 5_000 });
  }
  await switchOn(transparentSwitch);
  log('✓ background set to transparent');
}

async function closeRightPanel(page: Page): Promise<void> {
  const collapseBtn = page.locator('.ant-splitter-bar-collapse-bar-end').last();
  if (await collapseBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await collapseBtn.click();
    await page.waitForTimeout(500);
  }
}

/**
 * Ant Design's splitter panels don't set min-height:0 (fixed at the CSS level in
 * client/src/styles/antd-overrides.css, but that fix won't be live on production until
 * the next deploy) — collapsing the right panel can leave the map's flex-column ancestors
 * without a definite height, so the map SVG's `height:100%` falls through to its content
 * bounding box instead of the visible frame, producing absurdly tall/narrow exports
 * (thousands of px). Force a sane bounded frame on the export root right before exporting,
 * so today's exports are correctly sized regardless of deploy timing.
 */
async function ensureSaneMapExportFrame(page: Page): Promise<void> {
  const dims = await page.evaluate(() => {
    const root = document.querySelector('[data-map-export-root]');
    const mapArea = document.querySelector('[data-map-export-map-area]');
    const svg = document.querySelector('.map-svg-container svg');
    const splitter = document.querySelector('.ant-splitter');
    if (!(root instanceof HTMLElement) || !(svg instanceof SVGSVGElement)) return null;

    const targetH = Math.max(
      360,
      Math.round(
        Math.min(
          window.innerHeight - 100,
          splitter instanceof HTMLElement ? splitter.clientHeight : window.innerHeight - 100,
        ) / 5,
      ) * 5,
    );
    const targetW = Math.max(
      480,
      Math.round(
        Math.min(
          window.innerWidth - 24,
          splitter instanceof HTMLElement ? splitter.clientWidth : window.innerWidth - 24,
        ) / 5,
      ) * 5,
    );

    let el: HTMLElement | null = root;
    while (el && el !== document.body) {
      el.style.minHeight = '0';
      const isPanel =
        el.classList.contains('ant-splitter-panel') ||
        el.classList.contains('ant-splitter') ||
        el.hasAttribute('data-map-export-root') ||
        el === mapArea;
      if (isPanel) {
        el.style.height = `${targetH}px`;
        el.style.maxHeight = `${targetH}px`;
      }
      el = el.parentElement;
    }

    root.style.width = `${targetW}px`;
    root.style.maxWidth = `${targetW}px`;
    svg.style.width = '100%';
    svg.style.height = '100%';
    svg.style.maxWidth = '100%';
    svg.style.maxHeight = '100%';
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');

    void root.offsetHeight;
    const rr = root.getBoundingClientRect();
    return { targetW, targetH, rootW: Math.round(rr.width), rootH: Math.round(rr.height) };
  });

  if (!dims) {
    log('⚠ could not measure map export frame after collapse');
    return;
  }
  log(
    `✓ map export frame constrained to ~${dims.targetW}×${dims.targetH} (root ${dims.rootW}×${dims.rootH})`,
  );
  await page.waitForTimeout(400);
}

// NOTE: deliberately no "switchToStaticMode" helper here. The "Switch to static data"
// button does not snapshot the current frame — `applySwitchToStatic` in the app's
// ImportDataPanel.tsx unconditionally discards the dataset and fills it with fresh
// random sample values instead. Use `importSingleYearStaticData` (pastes real values
// with no year column) to get a real static snapshot instead.

const ANIMATED_EXPORT_QUALITY = 50;

async function exportGif(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Export' }).click();
  const configureModal = exportConfigureModal(page);
  await configureModal.waitFor({ timeout: 10_000 });

  await selectAntOption(page, 'visualizer.exportModal.exportTypeLabel', 'GIF (Animation)');
  await setInputNumberByLabel(page, 'visualizer.exportModal.qualityLabel', ANIMATED_EXPORT_QUALITY);

  await configureModal
    .locator('[data-i18n-key="visualizer.exportModal.nextCropAndDownload"]')
    .click();
  const cropModal = exportCropModal(page);
  await cropModal.waitFor({ timeout: 15_000 });

  const downloadBtn = exportPrimaryDownloadButton(cropModal);
  await downloadBtn.waitFor({ timeout: 30_000 });
  const downloadPromise = page.waitForEvent('download', { timeout: 300_000 });
  await downloadBtn.click();
  const download = await downloadPromise;
  await download.saveAs(join(OUTPUT_DIR, 'france-oecd-fertility-animation.gif'));
  log('✓ GIF exported');
  await closeModal(page);
}

async function exportSvg(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Export' }).click();
  const configModal = exportConfigureModal(page);
  await configModal.waitFor({ timeout: 10_000 });
  await selectAntOption(page, 'visualizer.exportModal.exportTypeLabel', 'SVG');

  // SVG usually downloads directly from the configure step, but tolerate an
  // interposed crop step in case the app requires one for this format/version.
  const nextCropBtn = configModal.locator(
    '[data-i18n-key="visualizer.exportModal.nextCropAndDownload"]',
  );
  const needsCropStep = await nextCropBtn.isVisible({ timeout: 2_000 }).catch(() => false);

  let downloadRoot = configModal;
  if (needsCropStep) {
    await nextCropBtn.click();
    downloadRoot = exportCropModal(page);
    await downloadRoot.waitFor({ timeout: 15_000 });
  }

  const svgBtn = exportPrimaryDownloadButton(downloadRoot);
  await svgBtn.waitFor({ timeout: 30_000 });
  const svgDl = page.waitForEvent('download', { timeout: 60_000 });
  await svgBtn.click();
  await (await svgDl).saveAs(join(OUTPUT_DIR, 'france-oecd-fertility.svg'));
  log('✓ SVG exported');
  await closeModal(page);
}

async function saveProject(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Save' }).click();
  const modal = page.locator('.ant-modal').filter({ hasText: 'Save Project' });
  await modal.waitFor({ timeout: 10_000 });

  const nameInput = modal.locator('[data-i18n-key="visualizer.saveModalPlaceholder"]');
  await nameInput.click({ clickCount: 3 });
  await nameInput.fill(PROJECT_NAME);

  await page.getByRole('button', { name: 'Create' }).click();
  await page.waitForURL((url) => /\/projects\/[^/]+$/.test(url.pathname), { timeout: 15_000 });
  await page.waitForLoadState('networkidle', { timeout: 15_000 });
  log(`✓ project saved as "${PROJECT_NAME}"`);
}

async function setupEmbed(page: Page): Promise<{ url: string; iframeCode: string }> {
  await page.getByRole('button', { name: 'Embed' }).click();
  const modal = page.locator('.ant-modal:visible').filter({ hasText: 'Public map embed' });
  await modal.waitFor({ timeout: 10_000 });

  await switchOn(modal.locator('button#enabled[role="switch"]'));

  const titleInput = modal.locator('input#seoTitle');
  await titleInput.clear();
  await titleInput.fill('France Fertility Rate by Région (2018–2023) — OECD Data | Regionify');

  const descInput = modal.locator('textarea#seoDescription');
  await descInput.clear();
  await descInput.fill(
    'Interactive choropleth map of total fertility rate across France’s 13 régions, 2018-2023, sourced from the OECD Regional Database. Pan, zoom, and scrub the timeline.',
  );

  await switchOn(modal.locator('button#allowedOriginsAllowAll[role="switch"]'));

  await modal.locator('[data-i18n-key="visualizer.save"]').click();
  await page
    .locator('.ant-message-notice', { hasText: 'Embed settings saved' })
    .waitFor({ timeout: 10_000 });
  log('✓ embed saved');

  const embedLink = modal.locator('a[href*="/embed/"]');
  await embedLink.waitFor({ timeout: 10_000 });
  const href = (await embedLink.getAttribute('href')) ?? '';
  const url = href.startsWith('http') ? href : `${BASE_URL}${href}`;

  const iframeCode =
    (await modal
      .locator('pre')
      .first()
      .textContent()
      .catch(() => '')) ?? '';

  log(`✓ embed URL: ${url}`);
  await closeModal(page);
  return { url, iframeCode: iframeCode.trim() };
}

async function screenshotEmbedPage(context: BrowserContext, embedUrl: string): Promise<void> {
  const embedPage = await context.newPage();
  await embedPage.goto(embedUrl, { waitUntil: 'networkidle', timeout: 30_000 });
  await embedPage.waitForTimeout(4_000);
  await embedPage.screenshot({
    path: join(OUTPUT_DIR, 'france-oecd-fertility-embed-page.png'),
    fullPage: true,
  });
  await embedPage.close();
  log('✓ embed page screenshot saved');
}

// ---------------------------------------------------------------------------
// Entry
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  if (!BASE_URL || !EMAIL || !PASSWORD) {
    console.error(
      'Missing config. Set CLIENT_URL, REGIONIFY_EMAIL, REGIONIFY_PASSWORD in marketing/.env',
    );
    process.exit(1);
  }
  if (!existsSync(DATA_CSV_PATH)) {
    console.error(`Missing dataset: ${DATA_CSV_PATH}`);
    process.exit(1);
  }

  const tabDelimitedData = buildTabDelimitedData();
  mkdirSync(OUTPUT_DIR, { recursive: true });
  mkdirSync(UI_SCREENSHOTS_DIR, { recursive: true });

  const cliArgs = process.argv.slice(2);
  const headed = cliArgs.includes('--headed');
  const browser = await chromium.launch({ headless: !headed, slowMo: 60 });

  const context = await ensureAuthedContext(browser);
  if (BASE_URL) {
    await context
      .grantPermissions(['clipboard-read', 'clipboard-write'], { origin: BASE_URL })
      .catch((err: unknown) => log(`⚠ clipboard permission grant failed: ${err}`));
  }
  await ensureEnglishProfile(context);

  const page = await context.newPage();
  page.on('pageerror', (err) => log(`pageerror: ${err.message}`));

  try {
    await createProject(page);
    await importOecdData(page, tabDelimitedData);
    await addAndNameRanges(page);
    await normalizeRanges(page);
    await setLegendTitle(page, LEGEND_TITLE);
    await jumpTimelineToLastFrame(page);

    // "Styled map" UI screenshot — panels visible, full app chrome.
    await page.waitForTimeout(1_000);
    await page.screenshot({
      path: join(UI_SCREENSHOTS_DIR, 'oecd-fertility-styled-map.png'),
      fullPage: true,
    });
    log('✓ styled map screenshot saved');

    // Clean exports: transparent background, panels collapsed.
    await setTransparentBackground(page);
    await closeRightPanel(page);
    await ensureSaneMapExportFrame(page);

    await exportGif(page);

    // Real single-year snapshot for the static export — NOT "Switch to static data",
    // which discards the dataset and fills it with random sample values (see the note
    // on importSingleYearStaticData).
    await importSingleYearStaticData(page, buildSingleYearTabDelimited(REFERENCE_YEAR));
    await normalizeRanges(page);
    await ensureSaneMapExportFrame(page);
    await exportSvg(page);

    // Re-import the same OECD data rather than clicking "Switch to dynamic data" —
    // that toggle synthesizes a brand-new random sample timeline when no historical
    // data is currently loaded (which is exactly the state right after a static-mode
    // export), silently replacing the real 2018-2023 fertility series with placeholder
    // numbers before it ever reaches Save/Embed. Re-importing restores the genuine data.
    await importOecdData(page, tabDelimitedData);
    await normalizeRanges(page);
    await jumpTimelineToLastFrame(page);

    await saveProject(page);
    const { url, iframeCode } = await setupEmbed(page);
    await screenshotEmbedPage(context, url);

    writeFileSync(join(OUTPUT_DIR, 'france-oecd-fertility-embed-url.txt'), url);
    writeFileSync(join(OUTPUT_DIR, 'france-oecd-fertility-embed-code.txt'), iframeCode);

    console.log(`\n✅  All done — assets saved to ${OUTPUT_DIR}`);
    console.log(`    Embed URL: ${url}`);
  } catch (err) {
    const shotPath = join(OUTPUT_DIR, '_debug-failure.png');
    await page.screenshot({ path: shotPath, fullPage: true }).catch(() => {});
    console.error(`\n✗  Script failed — debug screenshot: ${shotPath}`);
    throw err;
  } finally {
    await context.close();
    await browser.close();
  }
}

main().catch((err: unknown) => {
  console.error('\n✗  Unhandled script error:', err);
  process.exit(1);
});
