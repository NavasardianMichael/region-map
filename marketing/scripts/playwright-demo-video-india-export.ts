/**
 * India map MP4 downloader — NOT a screen recording. This drives the app headlessly to
 * reproduce the same setup as playwright-demo-video-india.ts (pick India, clear + paste a
 * historical dataset into the Tab delimited text box, add + name + manually recolor 6
 * GDP-per-capita income-tier bins, normalize ranges), then opens the Export modal and
 * downloads the map's own in-app-rendered MP4. The downloaded file is the sole deliverable —
 * it's moved straight into the same folder as the other demo videos, nothing gets recorded.
 *
 * Steps:
 *   1. land on /projects/new, pick "India"
 *   2. switch to "Tab delimited text (manual)", clear the pre-filled sample data, paste
 *      "India gdp per capita.csv" reshaped as tab-delimited year/id/label/value, save
 *   3. expand "Ranges", add 3 more bins (3 → 6), name all 6 after GDP-per-capita income
 *      tiers, recolor each to an ascending blue shade, normalize ranges
 *   4. open Export → format Video (MP4), quality 80 → Download
 *   5. save the downloaded file as demo-video-india-map-export.mp4
 *
 * Output (same folder as playwright-demo-video-india.ts's output):
 *   docs/marketing/assets/video/sample-data-to-mp4/demo-video-india-map-export.mp4
 *
 * Run:
 *   pnpm --filter @regionify/marketing generate-demo-video-india-export
 *
 * Requires:
 *   marketing/.env with CLIENT_URL, REGIONIFY_EMAIL, REGIONIFY_PASSWORD set.
 *   Account must be on a tier with historical data import access.
 */

import { chromium, type BrowserContext, type Locator, type Page } from 'playwright';
import { config as loadEnv } from 'dotenv';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: join(__dirname, '..', '.env') });

const BASE_URL = (process.env.CLIENT_URL ?? '').replace(/\/$/, '');
const EMAIL = process.env.REGIONIFY_EMAIL ?? '';
const PASSWORD = process.env.REGIONIFY_PASSWORD ?? '';

/** API origin for session-scoped requests (profile locale patch). */
function resolveApiBaseUrl(clientUrl: string): string {
  const fromEnv = process.env.API_BASE_URL ?? process.env.VITE_API_BASE_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  // Local dev default: Vite client :7002 → Express API :9002.
  if (/localhost:7002$/i.test(clientUrl)) return 'http://localhost:9002';
  return clientUrl;
}

const API_BASE_URL = BASE_URL ? resolveApiBaseUrl(BASE_URL) : '';

const ASSETS_ROOT = join(__dirname, '..', 'assets');
const AUTH_STATE_FILE = join(ASSETS_ROOT, '.auth-state.json');
const OUTPUT_DIR = join(
  __dirname,
  '..',
  '..',
  'docs',
  'marketing',
  'assets',
  'video',
  'sample-data-to-mp4',
);
/** The deliverable: the app's own in-app-rendered MP4 export. */
const EXPORTED_MP4_DEST = join(OUTPUT_DIR, 'demo-video-india-map-export.mp4');

/** Already shaped as year,id,label,value — read, reshaped to tabs, and pasted into the
 *  Tab delimited text (manual) box (not uploaded as a file, not the AI Parser). */
const INDIA_CSV_PATH = join(
  __dirname,
  '..',
  '..',
  'docs',
  'marketing',
  'assets',
  'data',
  'India gdp per capita.csv',
);

const VIEWPORT = { width: 1280, height: 960 } as const;

const DEMO_COUNTRY = { slug: 'india', name: 'India' } as const;

function log(msg: string): void {
  console.log(`[export] ${msg}`);
}

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
  await page.waitForLoadState('networkidle', { timeout: 25_000 });

  mkdirSync(ASSETS_ROOT, { recursive: true });
  await context.storageState({ path: AUTH_STATE_FILE });
  log('Logged in — session saved');
}

/** Ensure auth state exists and is valid, reusing the session the other India scripts share. */
async function ensureAuthState(
  browser: Awaited<ReturnType<typeof chromium.launch>>,
): Promise<void> {
  const context = await browser.newContext({
    viewport: VIEWPORT,
    ...(existsSync(AUTH_STATE_FILE) ? { storageState: AUTH_STATE_FILE } : {}),
  });
  const page = await context.newPage();

  try {
    if (existsSync(AUTH_STATE_FILE)) {
      await page.goto(`${BASE_URL}/projects`);
      await page.waitForLoadState('networkidle', { timeout: 15_000 });
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
  } finally {
    await context.close();
  }
}

/** Patch the logged-in user's profile locale so button labels match English selectors. */
async function ensureEnglishProfile(context: BrowserContext): Promise<void> {
  if (!API_BASE_URL) return;
  try {
    const res = await context.request.patch(`${API_BASE_URL}/auth/profile`, {
      data: { locale: 'en' },
      headers: { 'Content-Type': 'application/json' },
    });
    if (res.ok()) {
      log('✓ profile locale set to English');
    } else {
      log(`⚠ profile locale patch failed (${res.status()}) — UI may not be English`);
    }
  } catch (err) {
    log(`⚠ could not patch profile locale: ${err instanceof Error ? err.message : err}`);
  }
}

async function waitForVisualizerReady(page: Page, timeoutMs = 30_000): Promise<void> {
  await page
    .locator('[data-i18n-key="visualizer.embed.openButton"]')
    .waitFor({ state: 'visible', timeout: timeoutMs });
}

/** Plain wait-then-click — no on-screen highlight/dwell theatrics, this run isn't recorded. */
async function click(locator: Locator): Promise<void> {
  await locator.waitFor({ state: 'visible', timeout: 15_000 });
  await locator.click();
}

/** Locator for the Ant Design Select whose adjacent label has `data-i18n-key={i18nKey}`. */
function antSelectByLabelKey(scope: Locator | Page, i18nKey: string): Locator {
  return scope
    .locator(`[data-i18n-key="${i18nKey}"]`)
    .locator('..')
    .locator('..')
    .locator('.ant-select')
    .first();
}

/** Locator for the Export configure modal (step 1). Locale-independent (uses i18n key). */
function exportConfigureModal(page: Page): Locator {
  return page
    .locator('.ant-modal:visible')
    .filter({ has: page.locator('[data-i18n-key="visualizer.exportModal.title"]') });
}

/** Primary "Download" button (skips "Next" — different icon). */
function exportPrimaryDownloadButton(modal: Locator): Locator {
  return modal
    .locator('button.ant-btn-primary')
    .filter({ has: modal.page().locator('.anticon-download') })
    .first();
}

/** Set an Ant Design InputNumber value by locating it via its adjacent label's data-i18n-key. */
async function setInputNumberByLabelKey(page: Page, i18nKey: string, value: number): Promise<void> {
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

/**
 * India gdp per capita.csv is comma-delimited (year,id,label,value); the Tab delimited
 * text (manual) box is named for what it actually is, so reshape to real tabs before
 * pasting rather than relying on parseCSV's looser comma/semicolon/tab split.
 */
function buildTabDelimitedIndiaData(): string {
  const content = readFileSync(INDIA_CSV_PATH, 'utf-8').replace(/^﻿/, '');
  return content
    .trim()
    .split('\n')
    .map((line) => line.trim().split(',').join('\t'))
    .join('\n');
}

/**
 * Open a legend range row's color popover, replace its hex value, then close the popover.
 * The AntD ColorPicker only commits via `onChangeComplete` for drag interactions OR for any
 * non-drag change (typing the hex field counts) — typing a full hex value into
 * `.ant-color-picker-hex-input` is a reliable, precise way to change the color from a script.
 */
async function changeLegendRowColor(page: Page, row: Locator, hex: string): Promise<void> {
  const trigger = row.locator('.ant-color-picker-trigger');
  await click(trigger);

  // The popover renders in a body-level portal, most-recently-opened last — `.last()` is a
  // safety net in case a previous row's popover hasn't fully unmounted yet.
  const hexInput = page.locator('.ant-color-picker-hex-input input').last();
  await hexInput.waitFor({ state: 'visible', timeout: 10_000 });
  await hexInput.click({ clickCount: 3 });
  await hexInput.fill(hex);
  await page.waitForTimeout(150);

  // Close the popover via Escape — reliably dismisses whichever popover is currently open.
  await page.keyboard.press('Escape');
  await page.waitForTimeout(150);
}

// ---------------------------------------------------------------------------
// The automation
// ---------------------------------------------------------------------------

async function runAutomation(page: Page, tabDelimitedData: string): Promise<void> {
  await page.goto(`${BASE_URL}/projects/new`);
  await page.waitForLoadState('networkidle', { timeout: 15_000 });
  await waitForVisualizerReady(page);

  // Pick the demo country from the country dropdown.
  const regionSelect = antSelectByLabelKey(page, 'visualizer.region.sectionTitle');
  await click(regionSelect);
  await page.keyboard.type(DEMO_COUNTRY.name, { delay: 40 });
  await page.waitForTimeout(300);

  // Prefer stable region id over localized label text (works in any UI locale).
  const countryOptionByValue = page.locator(
    `.ant-select-dropdown:visible .ant-select-item-option[data-value="${DEMO_COUNTRY.slug}"]`,
  );
  let countryOption: Locator;
  if ((await countryOptionByValue.count()) > 0) {
    countryOption = countryOptionByValue;
  } else {
    countryOption = page
      .locator('.ant-select-dropdown:visible .ant-select-item-option-content')
      .filter({ hasText: new RegExp(`^${DEMO_COUNTRY.name}$`) });
  }
  await click(countryOption);

  // Sample data loads. Wait for the mode-toggle button as "app is ready".
  await page.waitForLoadState('networkidle', { timeout: 20_000 });
  await page
    .getByRole('button', { name: /Switch to (dynamic|static) data/ })
    .waitFor({ timeout: 30_000 });

  // Click the "Tab delimited text (manual)" import-format radio.
  const tabDelimitedRadio = page.locator('input[type="radio"][value="tab_delimited"]');
  await tabDelimitedRadio.waitFor({ timeout: 10_000 });
  const tabDelimitedLabel = page
    .locator('label.ant-radio-wrapper', { has: tabDelimitedRadio })
    .first();
  await click(tabDelimitedLabel);

  // Open the manual-paste modal, replace its pre-filled text, and save.
  const editInTextBtn = page.locator('[data-i18n-key="visualizer.importData.editManuallyInText"]');
  await click(editInTextBtn);

  // TabDelimitedTextModal passes its `data-i18n-key` as a prop straight to AntD's <Modal>,
  // which doesn't reliably land on any element inside `.ant-modal` — scope by the rendered
  // title text instead (locale is forced to English).
  const tabDelimitedModal = page
    .locator('.ant-modal:visible')
    .filter({ has: page.locator('.ant-modal-title', { hasText: 'Tab Delimited Text' }) });
  await tabDelimitedModal.waitFor({ timeout: 15_000 });

  // The textarea is pre-filled with the currently-loaded sample data — select all and
  // delete it first, then paste the India data in.
  const tabDelimitedTextarea = tabDelimitedModal.locator('textarea');
  await click(tabDelimitedTextarea);
  await page.keyboard.press('Control+A');
  await page.keyboard.press('Delete');
  await page.evaluate((text) => navigator.clipboard.writeText(text), tabDelimitedData);
  await page.keyboard.press('Control+V');
  await page.waitForTimeout(300);

  const tabDelimitedSaveBtn = tabDelimitedModal.getByRole('button', { name: 'Save' });
  await click(tabDelimitedSaveBtn);
  await tabDelimitedModal.waitFor({ state: 'hidden', timeout: 15_000 }).catch(() => {});

  // Timeline slider appears once the historical import lands.
  await page.locator('.ant-slider').waitFor({ state: 'visible', timeout: 15_000 });

  // ── Legend Configuration → expand Ranges, add 3 more bins, name + recolor all 6, THEN
  // normalize. ──
  const rangesPanelItem = page
    .locator('.ant-collapse-item')
    .filter({ has: page.locator('[data-i18n-key="visualizer.legendConfig.collapseRanges"]') });
  const rangesAccordionHeader = rangesPanelItem.locator('.ant-collapse-header');
  await click(rangesAccordionHeader);

  const addRangeBtn = page.locator('[data-i18n-key="visualizer.legendConfig.addRangeAria"]');
  for (let i = 0; i < 3; i++) {
    await click(addRangeBtn);
  }

  // The default 3 bins (Low/Medium/High) come first, the 3 just-added "New Range" rows
  // follow — rename + recolor all 6, in ascending order, since normalizeLegendRanges()
  // redistributes min/max across bins in their current array order
  // (client/src/helpers/normalizeLegendRanges.ts). Names follow the World Bank's
  // GDP-per-capita income tiers; colors are a manually-set ascending blue ramp.
  const RANGE_NAMES = [
    'Low Income',
    'Lower-Middle Income',
    'Middle Income',
    'Upper-Middle Income',
    'High Income',
    'Very High Income',
  ];
  const RANGE_COLORS = ['DBEAFE', '93C5FD', '60A5FA', '3B82F6', '1D4ED8', '1E3A8A'];
  const rangeRows = rangesPanelItem.locator('[data-index]');
  for (let i = 0; i < RANGE_NAMES.length; i++) {
    const row = rangeRows.nth(i);
    const nameInput = row.locator('input[aria-label="Legend item name"]');
    await click(nameInput);
    await page.keyboard.press('Control+A');
    await page.keyboard.type(RANGE_NAMES[i]);
    await changeLegendRowColor(page, row, RANGE_COLORS[i]);
  }

  // The single "Normalize ranges" click — redistributes the 6 named, recolored bins evenly
  // across the dataset's real min/max.
  const normalizeRangesBtn = page.locator(
    '[data-i18n-key="visualizer.legendConfig.normalizeRangesAria"]',
  );
  await click(normalizeRangesBtn);
  await page.waitForTimeout(500);

  // ── Export as MP4 ──
  const exportBtn = page.getByRole('button', { name: 'Export' });
  await click(exportBtn);

  const configureModal = exportConfigureModal(page);
  await configureModal.waitFor({ timeout: 10_000 });

  // Change format to Video (MP4).
  const formatSelect = antSelectByLabelKey(
    configureModal,
    'visualizer.exportModal.exportTypeLabel',
  );
  await click(formatSelect);

  const mp4Option = page
    .locator('.ant-select-dropdown:visible .ant-select-item-option-content', {
      hasText: 'Video (MP4)',
    })
    .first();
  await click(mp4Option);

  // Quality → 80 — this downloaded file is the actual deliverable.
  await setInputNumberByLabelKey(page, 'visualizer.exportModal.qualityLabel', 80);

  const downloadBtn = exportPrimaryDownloadButton(configureModal);
  await downloadBtn.waitFor({ timeout: 30_000 });

  const downloadPromise = page.waitForEvent('download', { timeout: 180_000 });
  await click(downloadBtn);

  log('⏳ the app is rendering the MP4 export — can take a while at this quality');
  const download = await downloadPromise;
  log('✓ MP4 render completed');

  await download.saveAs(EXPORTED_MP4_DEST);
  log(`✓ exported MP4 saved: ${EXPORTED_MP4_DEST}`);
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

  if (!existsSync(INDIA_CSV_PATH)) {
    console.error(`Missing India dataset: ${INDIA_CSV_PATH}`);
    process.exit(1);
  }
  const tabDelimitedData = buildTabDelimitedIndiaData();

  mkdirSync(OUTPUT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });

  // Phase 1 — ensure a valid session.
  await ensureAuthState(browser);

  // Phase 2 — drive the app. No recordVideo here — this run isn't recorded, only the
  // downloaded MP4 at the end matters.
  const context = await browser.newContext({
    acceptDownloads: true,
    viewport: VIEWPORT,
    storageState: AUTH_STATE_FILE,
  });

  // The "paste data" step writes to the real clipboard and reads it back via Ctrl+V —
  // needs explicit permission since there's no user gesture behind the automated write.
  if (BASE_URL) {
    await context
      .grantPermissions(['clipboard-read', 'clipboard-write'], { origin: BASE_URL })
      .catch((err: unknown) => {
        log(`⚠ could not grant clipboard permissions: ${err instanceof Error ? err.message : err}`);
      });
  }

  await ensureEnglishProfile(context);

  const page = await context.newPage();

  try {
    await runAutomation(page, tabDelimitedData);
  } finally {
    await context.close();
    await browser.close();
  }

  console.log(`\n✅  Exported MP4 saved: ${EXPORTED_MP4_DEST}`);
}

main().catch((err: unknown) => {
  console.error('\n✗  Unhandled script error:', err);
  process.exit(1);
});
