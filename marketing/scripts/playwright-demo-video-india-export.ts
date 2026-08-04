/**
 * India map MP4 downloader — NOT a screen recording. This drives the app headlessly to
 * reproduce the same setup as playwright-demo-video-india.ts (pick India, clear + paste a
 * historical dataset into the Tab delimited text box, add + name + manually recolor 9
 * GDP-per-capita income-tier bins, normalize ranges, set the legend title, collapse both
 * side panels), then opens the Export modal and downloads the map's own in-app-rendered
 * MP4. The downloaded file is the sole deliverable — it's moved straight into the same
 * folder as the other demo videos, nothing gets recorded.
 *
 * Steps:
 *   1. land on /projects/new, pick "India"
 *   2. switch to "Tab delimited text (manual)", clear the pre-filled sample data, paste
 *      "India gdp per capita.csv" reshaped as tab-delimited year/id/label/value, save
 *   3. expand "Ranges", add 6 more bins (3 → 9), name all 9 after GDP-per-capita income
 *      tiers, recolor each to an ascending blue shade, normalize ranges
 *   4. set legend title to "GDP per Capita" (Legend Styles → Title)
 *   5. collapse left (data) and right (styles) splitter panels for a full-bleed map
 *   6. open Export → format Video (MP4), quality 80 → Download
 *   7. save the downloaded file as demo-video-india-map-export.mp4
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
import {
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  readSync,
  statSync,
} from 'node:fs';
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
  await page.waitForLoadState('domcontentloaded', { timeout: 30_000 });
  await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {
    log('⚠ post-login networkidle timed out — continuing');
  });

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
      await page.waitForLoadState('domcontentloaded', { timeout: 30_000 });
      await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {
        log('⚠ /projects networkidle timed out — continuing');
      });
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

/** Default legend title is "INTENSITY RATIO" — replace with a label that matches the dataset. */
const LEGEND_TITLE = 'GDP per Capita';

/**
 * Set the floating legend's title text (Legend Styles → Title → Title text).
 * Title `show` defaults to true; the store commit is debounced (~300ms).
 */
async function setLegendTitle(page: Page, title: string): Promise<void> {
  const titlePanelItem = page
    .locator('.ant-collapse-item')
    .filter({ has: page.locator('[data-i18n-key="visualizer.legendStyles.collapseTitle"]') });
  const titleAccordionHeader = titlePanelItem.locator('.ant-collapse-header');
  await click(titleAccordionHeader);

  const titleInput = titlePanelItem.locator(
    '[data-i18n-key="visualizer.legendStyles.titlePlaceholder"]',
  );
  await click(titleInput);
  await page.keyboard.press('Control+A');
  await page.keyboard.type(title, { delay: 20 });
  // Flush the debounced store write before collapsing panels / exporting.
  await page.waitForTimeout(500);
  log(`✓ legend title set to "${title}"`);
}

/**
 * Collapse both splitter side panels so the exported MP4 is mostly map.
 * Animation export sizes the canvas from the live map SVG's getBoundingClientRect.
 * India's SVG has no viewBox/width/height — when the splitter flex height chain breaks
 * after collapse, the SVG can grow to its path bbox (~thousands of px) and AVC encode fails.
 */
async function collapseSidePanels(page: Page): Promise<void> {
  const rightCollapse = page.locator('.ant-splitter-bar-collapse-bar-end').last();
  if (await rightCollapse.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await rightCollapse.click();
    await page.waitForTimeout(400);
    log('✓ right (styles) panel collapsed');
  } else {
    log('⚠ right panel collapse control not visible — continuing');
  }

  const leftCollapse = page
    .locator('.ant-splitter-bar')
    .first()
    .locator('.ant-splitter-bar-collapse-bar-start');
  if (await leftCollapse.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await leftCollapse.click();
    await page.waitForTimeout(400);
    log('✓ left (data) panel collapsed');
  } else {
    log('⚠ left panel collapse control not visible — continuing');
  }

  await ensureSaneMapExportFrame(page);
}

/**
 * Force the export root / map SVG into a viewport-bounded box so MP4 encode stays within
 * codec limits (and even pixel sizes preferred by AVC).
 */
async function ensureSaneMapExportFrame(page: Page): Promise<void> {
  // Keep this callback free of nested functions — tsx/esbuild can inject `__name`
  // helpers that blow up when Playwright serializes the function into the page.
  const dims = await page.evaluate(() => {
    const root = document.querySelector('[data-map-export-root]');
    const mapArea = document.querySelector('[data-map-export-map-area]');
    const svg = document.querySelector('.map-svg-container svg');
    const splitter = document.querySelector('.ant-splitter');
    if (!(root instanceof HTMLElement) || !(svg instanceof SVGSVGElement)) return null;

    const rawH = Math.min(
      window.innerHeight - 100,
      splitter instanceof HTMLElement ? splitter.clientHeight : window.innerHeight - 100,
    );
    const rawW = Math.min(
      window.innerWidth - 24,
      splitter instanceof HTMLElement ? splitter.clientWidth : window.innerWidth - 24,
    );
    // Multiples of 5 keep quality-80 layoutScale (3.2) on even AVC pixel sizes.
    const targetH = Math.max(360, Math.round(rawH / 5) * 5);
    const targetW = Math.max(480, Math.round(rawW / 5) * 5);

    let el = root;
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
    const sr = svg.getBoundingClientRect();
    return {
      targetW,
      targetH,
      rootW: Math.round(rr.width),
      rootH: Math.round(rr.height),
      svgW: Math.round(sr.width),
      svgH: Math.round(sr.height),
    };
  });

  if (!dims) {
    log('⚠ could not measure map export frame after collapse');
    return;
  }
  log(
    `✓ map frame constrained to ~${dims.targetW}×${dims.targetH} (root ${dims.rootW}×${dims.rootH}, svg ${dims.svgW}×${dims.svgH})`,
  );
  await page.waitForTimeout(400);
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

  // ── Legend Configuration → expand Ranges, add 6 more bins (3 → 9), name + recolor all 9,
  // THEN normalize. ──
  const rangesPanelItem = page
    .locator('.ant-collapse-item')
    .filter({ has: page.locator('[data-i18n-key="visualizer.legendConfig.collapseRanges"]') });
  const rangesAccordionHeader = rangesPanelItem.locator('.ant-collapse-header');
  await click(rangesAccordionHeader);

  const addRangeBtn = page.locator('[data-i18n-key="visualizer.legendConfig.addRangeAria"]');
  // Default legend has 3 bins; add 6 more so we end at 9 (3 original + 3 prior demo + 3 extra).
  for (let i = 0; i < 6; i++) {
    await click(addRangeBtn);
  }

  // The default 3 bins (Low/Medium/High) come first, the 6 just-added "New Range" rows
  // follow — rename + recolor all 9, in ascending order, since normalizeLegendRanges()
  // redistributes min/max across bins in their current array order
  // (client/src/helpers/normalizeLegendRanges.ts). Names follow GDP-per-capita income
  // tiers; colors are a manually-set ascending blue ramp.
  const RANGE_NAMES = [
    'Extremely Low Income',
    'Low Income',
    'Lower-Middle Income',
    'Middle Income',
    'Upper-Middle Income',
    'High Income',
    'Very High Income',
    'Ultra High Income',
    'Highest Income',
  ];
  const RANGE_COLORS = [
    'EFF6FF',
    'DBEAFE',
    'BFDBFE',
    '93C5FD',
    '60A5FA',
    '3B82F6',
    '2563EB',
    '1D4ED8',
    '1E3A8A',
  ];
  const rangeRows = rangesPanelItem.locator('[data-index]');
  for (let i = 0; i < RANGE_NAMES.length; i++) {
    const row = rangeRows.nth(i);
    const nameInput = row.locator('input[aria-label="Legend item name"]');
    await click(nameInput);
    await page.keyboard.press('Control+A');
    await page.keyboard.type(RANGE_NAMES[i]);
    await changeLegendRowColor(page, row, RANGE_COLORS[i]);
  }

  // The single "Normalize ranges" click — redistributes the 9 named, recolored bins evenly
  // across the dataset's real min/max.
  const normalizeRangesBtn = page.locator(
    '[data-i18n-key="visualizer.legendConfig.normalizeRangesAria"]',
  );
  await click(normalizeRangesBtn);
  await page.waitForTimeout(500);

  // Legend title must match the dataset (default store value is "INTENSITY RATIO").
  await setLegendTitle(page, LEGEND_TITLE);

  // Collapse both sidebars before export so the rendered MP4 is mostly the map.
  // (Animation export samples the live map SVG's getBoundingClientRect for canvas size.)
  await collapseSidePanels(page);

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

  // Quality → 80 with smooth on. Allow a long download timeout (~30min) — ~690 blend
  // frames at this scale are slow in headless but produce clear year-to-year blends.
  await setInputNumberByLabelKey(page, 'visualizer.exportModal.qualityLabel', 80);

  // Keep smooth transitions on (default) so year-to-year blends look continuous in the MP4.
  const smoothSwitch = configureModal.getByRole('switch', { name: /Smooth transitions/i });
  if (await smoothSwitch.isVisible({ timeout: 3_000 }).catch(() => false)) {
    if (!(await smoothSwitch.isChecked())) {
      await smoothSwitch.click();
    }
    log('✓ smooth transitions enabled for export');
  }

  const downloadBtn = configureModal.getByRole('button', { name: /Download Video/i });
  await downloadBtn.waitFor({ state: 'visible', timeout: 30_000 });
  if (await downloadBtn.isDisabled()) {
    throw new Error('Download Video button is disabled — cannot start export');
  }

  // Smooth MP4 with 23 years is ~690 frames — allow up to 30 minutes.
  const EXPORT_DOWNLOAD_TIMEOUT_MS = 1_800_000;
  const downloadPromise = page.waitForEvent('download', { timeout: EXPORT_DOWNLOAD_TIMEOUT_MS });
  await downloadBtn.click();
  log('⏳ the app is rendering the MP4 export — can take a while at this quality');

  // Fail fast if export never enters the loading state (click missed / handler threw).
  const exportStarted = await configureModal
    .locator('.ant-progress, .ant-btn-loading')
    .first()
    .waitFor({ state: 'visible', timeout: 20_000 })
    .then(() => true)
    .catch(() => false);
  if (!exportStarted) {
    const errorToast = page.locator('.ant-message-error, .ant-notification-notice-error');
    const errText = (
      await errorToast
        .first()
        .textContent()
        .catch(() => null)
    )?.trim();
    const shotPath = join(OUTPUT_DIR, '_debug-india-export-timeout.png');
    await page.screenshot({ path: shotPath, fullPage: true }).catch(() => {});
    throw new Error(
      `Export did not start after clicking Download Video` +
        (errText ? ` (toast: ${errText})` : '') +
        ` — screenshot: ${shotPath}`,
    );
  }
  log('✓ export progress UI visible');

  const progressPoll = setInterval(() => {
    void configureModal
      .locator('.ant-progress-text')
      .first()
      .textContent()
      .then((text) => {
        if (text?.trim()) log(`… export progress ${text.trim()}`);
      })
      .catch(() => {});
  }, 5_000);

  // If the loading button clears without a download, the export failed in-app.
  const exportEndedWithoutDownload = configureModal
    .locator('.ant-btn-loading')
    .waitFor({ state: 'hidden', timeout: EXPORT_DOWNLOAD_TIMEOUT_MS })
    .then(async () => {
      await page.waitForTimeout(1_500);
      const errText = (
        await page
          .locator('.ant-message-error, .ant-notification-notice-error')
          .first()
          .textContent()
          .catch(() => null)
      )?.trim();
      throw new Error(
        `Export finished without a download` + (errText ? ` (toast: ${errText})` : ''),
      );
    });

  try {
    const download = await Promise.race([downloadPromise, exportEndedWithoutDownload]);
    clearInterval(progressPoll);
    log('✓ browser download event received');
    await download.saveAs(EXPORTED_MP4_DEST);

    const { size } = statSync(EXPORTED_MP4_DEST);
    if (size < 50_000) {
      throw new Error(`Exported MP4 is too small (${size} bytes) — likely incomplete`);
    }

    const head = Buffer.alloc(8);
    const fd = openSync(EXPORTED_MP4_DEST, 'r');
    readSync(fd, head, 0, 8, 0);
    closeSync(fd);
    const asText = head.toString('utf8');
    if (asText.startsWith('<?xml') || asText.startsWith('<svg')) {
      throw new Error('Exported file is SVG/XML, not an MP4');
    }

    log(`✓ exported MP4 saved: ${EXPORTED_MP4_DEST} (${(size / 1_024 / 1_024).toFixed(2)} MB)`);
  } catch (err) {
    clearInterval(progressPoll);
    const shotPath = join(OUTPUT_DIR, '_debug-india-export-timeout.png');
    await page.screenshot({ path: shotPath, fullPage: true }).catch(() => {});
    const modalText = await configureModal.innerText().catch(() => '(modal gone)');
    log(`✗ export failed — screenshot: ${shotPath}`);
    log(`✗ modal text:\n${modalText}`);
    throw err;
  }
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
  page.on('console', (msg) => {
    if (msg.type() === 'error' || msg.type() === 'warning') {
      log(`browser console ${msg.type()}: ${msg.text()}`);
    }
  });
  page.on('pageerror', (err) => {
    log(`pageerror: ${err.message}`);
  });

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
