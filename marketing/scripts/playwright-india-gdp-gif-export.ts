/**
 * One-off asset generator for the r/dataisbeautiful India GDP-per-capita post
 * (docs/marketing/reddit/week-04/10-dataisbeautiful-india-gdp.md). Rebuilds the same
 * Regionify project as playwright-demo-video-india.ts (India, 2001-2023 GDP per capita,
 * 6 named income-tier bins, ascending blue ramp) and exports it as an animated GIF only —
 * no MP4, no screenshots, no save/embed. Every export here is a local file download.
 *
 * Exists because the GIF actually posted (india-gdp-per-capita-2001-20024.gif, note the
 * filename typo) was exported by hand through the app UI at an unrecorded quality setting
 * and came out 87.6 MB — far past Reddit's reliable ~20 MB direct-upload ceiling. This
 * script reproduces that same map/legend/animation from a real, scripted setup so the
 * quality knob (the export dialog's "Quality (%)" field) can be turned down and the
 * result regenerated deterministically instead of by hand.
 *
 * Quality calibration: playwright-china-gdp-animated-export.ts (31 provinces, 1999-2024,
 * a similar scale to India's 33 regions/23 years) measured its full-quality GIF at ~28 MB
 * at quality 50, and needed quality 38 for a comfortable margin under a 25 MB limit. Quality
 * 25 here is a deliberately more aggressive cut for Reddit's tighter ~20 MB ceiling — if the
 * result is still too large, cut further; if it lands well under budget, a smaller cut can
 * be tried on a re-run for better visual quality (see GIF_EXPORT_QUALITY below).
 *
 * Output (replaces the oversized hand-exported file, filename typo fixed):
 *   docs/marketing/assets/video/sample-data-to-mp4/india-gdp-per-capita-2001-2023.gif
 *
 * Run:
 *   pnpm --filter @regionify/marketing generate-india-gdp-gif-export
 *   … -- --headed   to watch
 *
 * Requires:
 *   marketing/.env with CLIENT_URL, REGIONIFY_EMAIL, REGIONIFY_PASSWORD set.
 *   Account must be on a tier with historical data import + animation export access.
 */

import { chromium, type BrowserContext, type Locator, type Page } from 'playwright';
import { config as loadEnv } from 'dotenv';
import { existsSync, mkdirSync, readFileSync, rmSync, statSync } from 'node:fs';
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
/** Fixes the "20024" typo in the originally hand-exported file's name. */
const OUTPUT_FILE = 'india-gdp-per-capita-2001-2023.gif';
/** The oversized hand-exported file this script replaces. */
const OLD_OUTPUT_FILE = 'india-gdp-per-capita-2001-20024.gif';

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

const COUNTRY_LABEL = 'India';
const VIEWPORT = { width: 1600, height: 1000 } as const;

/**
 * Reddit's reliable direct-upload ceiling for image/GIF media — see the compliance
 * checklist in the Reddit post doc. Just informational: logged after export so a still-
 * too-large result is obvious immediately instead of discovered at upload time.
 */
const REDDIT_SAFE_MAX_BYTES = 20 * 1_024 * 1_024;

/**
 * Quality knob for the GIF export — the file-size lever (see the "Quality (%)" field in
 * the export dialog). See the module doc comment above for the China-script calibration
 * this value is based on.
 */
const GIF_EXPORT_QUALITY = 25;

/** Same 6-tier setup (names + ascending blue ramp) as playwright-demo-video-india.ts,
 * which matches the already-posted GIF's documented legend (see the asset note in
 * docs/marketing/reddit/week-04/10-dataisbeautiful-india-gdp.md). Default legend has 3
 * bins (Low/Medium/High); add 3 more so real variation across India's 33 states/UTs isn't
 * flattened into three broad buckets. */
const RANGE_NAMES = [
  'Low Income',
  'Lower-Middle Income',
  'Middle Income',
  'Upper-Middle Income',
  'High Income',
  'Very High Income',
];
const RANGE_COLORS = ['DBEAFE', '93C5FD', '60A5FA', '3B82F6', '1D4ED8', '1E3A8A'];

function log(msg: string): void {
  console.log(`[india-gdp-gif] ${msg}`);
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
// Shared UI helpers (adapted from playwright-china-gdp-animated-export.ts)
// ---------------------------------------------------------------------------

async function click(locator: Locator): Promise<void> {
  await locator.waitFor({ state: 'visible', timeout: 15_000 });
  await locator.click();
}

/**
 * Every import offers to normalize the legend ranges to the new data's min/max via an
 * AntD `Modal.confirm`. This script always normalizes explicitly later via
 * {@link normalizeRanges}, so dismiss the prompt here — otherwise its `.ant-modal-wrap`
 * overlay lingers and swallows the next click.
 */
async function dismissNormalizeRangesPromptIfPresent(page: Page): Promise<void> {
  const confirmModal = page
    .locator('.ant-modal-confirm:visible')
    .filter({ hasText: 'Normalize legend ranges' });
  const appeared = await confirmModal
    .waitFor({ state: 'visible', timeout: 3_000 })
    .then(() => true)
    .catch(() => false);
  if (!appeared) return;
  await confirmModal.getByRole('button', { name: 'Cancel' }).click();
  await confirmModal.waitFor({ state: 'hidden', timeout: 5_000 }).catch(() => {});
  log('✓ dismissed "normalize ranges?" prompt (normalized explicitly later instead)');
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
  await page.keyboard.type('India', { delay: 50 });
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
  log('✓ "India" selected — sample data loaded');
}

async function importGdpData(page: Page, tabDelimitedData: string): Promise<void> {
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
  await dismissNormalizeRangesPromptIfPresent(page);

  await page
    .locator('.ant-slider:not(.ant-color-picker-slider)')
    .first()
    .waitFor({ state: 'visible', timeout: 15_000 });
  log('✓ India GDP-per-capita time series imported — timeline slider active');
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

/** Grows the default 3 bins to 6 and renames/recolors all of them. Must run BEFORE
 * normalizeRanges — normalize only redistributes min/max across whatever bins already
 * exist. Self-verifying (see the identical note in playwright-oecd-france-fertility.ts
 * for why): reads row count and each input's actual value back and retries before
 * moving on, so a real failure throws loudly instead of quietly producing a wrong
 * export. */
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

/** See the identical helper in playwright-china-gdp-animated-export.ts for why this is
 * necessary (Ant Design splitter panels lacking min-height:0 at the CSS level, and
 * India's SVG specifically has no viewBox/width/height so an unconstrained frame can grow
 * to its path bbox and break the export). Side panels are deliberately left open — the
 * exported GIF is generated from the map's SVG+data, never from a page screenshot, so the
 * panels' on-screen visibility doesn't affect it either way (see the china script's note). */
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

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

async function exportGif(page: Page): Promise<string> {
  await page.getByRole('button', { name: 'Export' }).click();
  const configureModal = exportConfigureModal(page);
  await configureModal.waitFor({ timeout: 10_000 });

  await selectAntOption(page, 'visualizer.exportModal.exportTypeLabel', 'GIF (Animation)');
  await setInputNumberByLabel(page, 'visualizer.exportModal.qualityLabel', GIF_EXPORT_QUALITY);

  await configureModal
    .locator('[data-i18n-key="visualizer.exportModal.nextCropAndDownload"]')
    .click();
  const cropModal = exportCropModal(page);
  await cropModal.waitFor({ timeout: 15_000 });

  const downloadBtn = exportPrimaryDownloadButton(cropModal);
  await downloadBtn.waitFor({ timeout: 30_000 });
  // 23 years of frames at even a low quality can take a while headless — generous timeout.
  const downloadPromise = page.waitForEvent('download', { timeout: 600_000 });
  await downloadBtn.click();
  const download = await downloadPromise;
  const destPath = join(OUTPUT_DIR, OUTPUT_FILE);
  await download.saveAs(destPath);
  log(`✓ GIF exported → ${OUTPUT_FILE}`);
  await closeModal(page);
  return destPath;
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
    console.error(`Missing dataset: ${INDIA_CSV_PATH}`);
    process.exit(1);
  }

  const tabDelimitedData = buildTabDelimitedIndiaData();
  mkdirSync(OUTPUT_DIR, { recursive: true });

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
    await importGdpData(page, tabDelimitedData);
    await addAndNameRanges(page);
    await normalizeRanges(page);
    await ensureSaneMapExportFrame(page);

    const destPath = await exportGif(page);

    const { size } = statSync(destPath);
    if (size < 50_000) {
      throw new Error(`Exported GIF is too small (${size} bytes) — likely incomplete`);
    }
    const sizeMb = (size / 1_024 / 1_024).toFixed(2);
    if (size > REDDIT_SAFE_MAX_BYTES) {
      log(
        `⚠ exported GIF is ${sizeMb} MB — still over Reddit's ~20 MB ceiling. Re-run with a lower GIF_EXPORT_QUALITY.`,
      );
    } else {
      log(`✓ exported GIF is ${sizeMb} MB — under Reddit's ~20 MB ceiling`);
    }

    // Replace the oversized hand-exported file now that a real replacement exists.
    const oldPath = join(OUTPUT_DIR, OLD_OUTPUT_FILE);
    if (existsSync(oldPath)) {
      rmSync(oldPath);
      log(`✓ removed superseded file: ${OLD_OUTPUT_FILE}`);
    }

    console.log(`\n✅  Done — GIF saved: ${destPath} (${sizeMb} MB)`);
  } catch (err) {
    const shotPath = join(OUTPUT_DIR, '_debug-india-gif-failure.png');
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
