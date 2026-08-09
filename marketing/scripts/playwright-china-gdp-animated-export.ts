/**
 * One-off asset generator for the "animated map export" Medium article
 * (docs/marketing/medium/animated-map-export/animated-map-export.md). Builds a real
 * Regionify project from OECD regional GDP-per-capita data for China's 31 provinces
 * (1999-2024, fetched from the OECD SDMX API — see
 * docs/marketing/assets/data/oecd-gdp-china.csv), then exports the same styled,
 * time-series map two ways — animated GIF and MP4 video — screenshotting each step and
 * each export's preview.
 *
 * Unlike the embed-guide script, this one never saves the project or sets up a public
 * embed — every export here is a local file download, so there's nothing to persist.
 *
 * Region ids in the CSV are pre-normalized to match china.svg's `title` attributes
 * exactly (byte-for-byte — see the fuzzy-matching dead-code note in
 * playwright-oecd-france-fertility.ts, which applies identically here). Building that
 * mapping surfaced a real product bug: china.svg's Tibet path had a trailing space in
 * its `title` ("Xizang (Tibet) "), which the import pipeline's `.trim()` on every parsed
 * id made permanently unmatchable — no dataset could ever color that province. Fixed
 * directly in the SVG (client/src/assets/images/maps/china.svg) as part of this work.
 *
 * Steps:
 *   1. /projects/new → pick "China"
 *   2. Switch to "Tab delimited text (manual)" import, clear the sample data, paste the
 *      OECD GDP-per-capita time series, screenshot the pasted data
 *   3. Expand the legend to 5 named ranges (Low → High), normalize them to the data's
 *      real min/max, title the legend, jump the timeline to 2024, screenshot the styled
 *      product view
 *   4. Export animated GIF (all years, transparent background), compress a small inline
 *      preview copy via ffmpeg
 *   5. Export MP4 video, screenshot Chrome's native video player mid-clip as a preview
 *
 * Run:
 *   pnpm --filter @regionify/marketing exec tsx scripts/playwright-china-gdp-animated-export.ts
 *   … -- --headed   to watch
 *
 * Requires:
 *   marketing/.env with CLIENT_URL, REGIONIFY_EMAIL, REGIONIFY_PASSWORD set.
 *   Account must be on the Explorer tier or higher (historical import + animation export).
 *   ffmpeg on PATH, or the bundled `ffmpeg-static` dev dependency, for the compressed
 *   GIF preview (skipped with a warning if neither is available).
 */

import { chromium, type BrowserContext, type Locator, type Page } from 'playwright';
import { config as loadEnv } from 'dotenv';
import ffmpegStaticPath from 'ffmpeg-static';
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
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
  'medium',
  'animated-map-export',
);
const UI_SCREENSHOTS_DIR = OUTPUT_DIR;

const DATA_CSV_PATH = join(
  __dirname,
  '..',
  '..',
  'docs',
  'marketing',
  'assets',
  'data',
  'oecd-gdp-china.csv',
);

const COUNTRY_LABEL = 'China';
const LEGEND_TITLE = 'GDP per Capita (USD, PPP)';
const VIEWPORT = { width: 1600, height: 1000 } as const;

/** Default legend has 3 bins (Low/Medium/High) — add 2 more so real variation across
 * China's 31 provinces doesn't get flattened into three broad buckets, then rename all 5
 * to match the dataset (economic-output tiers) instead of the generic defaults. */
const RANGE_NAMES = ['Low', 'Below Average', 'Average', 'Above Average', 'High'];
const RANGE_COLORS = ['E0F2F1', '80CBC4', '26A69A', '00796B', '004D40'];

const ANIMATED_EXPORT_QUALITY = 50;
const SECONDS_PER_PERIOD = 0.3;

function log(msg: string): void {
  console.log(`[china-gdp-export] ${msg}`);
}

function buildTabDelimitedData(): string {
  const content = readFileSync(DATA_CSV_PATH, 'utf-8').replace(/^﻿/, '');
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
// Shared UI helpers (adapted from playwright-oecd-france-fertility.ts)
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

/** Works for fields where the InputNumber sits two DOM levels above its own label
 * (label nested in an inner Flex, InputNumber a sibling of that inner Flex) — the
 * quality field's layout. See {@link setSecondsPerPeriod} for the one-level variant. */
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

/**
 * The "seconds per period" field's label and InputNumber are direct siblings in the same
 * row (one level up from the label), unlike quality's two-level layout — going up two
 * levels here would land on the shared outer container that also holds the quality
 * InputNumber, matching two elements and violating Playwright's strict mode.
 */
async function setSecondsPerPeriod(page: Page, value: number): Promise<void> {
  const modal = page.locator('.ant-modal:visible');
  const input = modal
    .locator('[data-i18n-key="visualizer.exportModal.secondsPerPeriod"]')
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
  await page.keyboard.type('China', { delay: 50 });
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
  log('✓ "China" selected — sample data loaded');
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

  // Screenshot the pasted-but-unsaved data for the article's import-step visual.
  mkdirSync(UI_SCREENSHOTS_DIR, { recursive: true });
  await page.screenshot({
    path: join(UI_SCREENSHOTS_DIR, 'china-gdp-import-panel.png'),
    fullPage: false,
  });
  log('✓ import panel screenshot saved');

  const saveBtn = modal.getByRole('button', { name: 'Save' });
  await click(saveBtn);
  await modal.waitFor({ state: 'hidden', timeout: 15_000 }).catch(() => {});
  await dismissNormalizeRangesPromptIfPresent(page);

  await page
    .locator('.ant-slider:not(.ant-color-picker-slider)')
    .first()
    .waitFor({ state: 'visible', timeout: 15_000 });
  log('✓ China GDP-per-capita time series imported — timeline slider active');
}

async function jumpTimelineToLastFrame(page: Page): Promise<void> {
  const sliderHandle = page
    .locator('.ant-slider:not(.ant-color-picker-slider) [role="slider"]')
    .first();
  await sliderHandle.waitFor({ timeout: 10_000 });
  await sliderHandle.focus();
  await page.keyboard.press('End');
  await page.waitForTimeout(500);
  log('✓ timeline jumped to last frame (2024)');
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

/** Grows the default 3 bins to 5 and renames/recolors all of them. Must run BEFORE
 * normalizeRanges — normalize only redistributes min/max across whatever bins already
 * exist. Self-verifying (see the identical note in playwright-oecd-france-fertility.ts
 * for why): reads row count and each input's actual value back and retries before
 * moving on, so a real failure throws loudly instead of quietly producing a wrong
 * screenshot. */
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

/** See the identical helper in playwright-oecd-france-fertility.ts for why this is
 * necessary (Ant Design splitter panels lacking min-height:0 at the CSS level). */
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
// Exports
// ---------------------------------------------------------------------------

async function exportGif(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Export' }).click();
  const configureModal = exportConfigureModal(page);
  await configureModal.waitFor({ timeout: 10_000 });

  await selectAntOption(page, 'visualizer.exportModal.exportTypeLabel', 'GIF (Animation)');
  await setInputNumberByLabel(page, 'visualizer.exportModal.qualityLabel', ANIMATED_EXPORT_QUALITY);
  await setSecondsPerPeriod(page, SECONDS_PER_PERIOD);

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
  await download.saveAs(join(OUTPUT_DIR, 'china-gdp-animation.gif'));
  log('✓ GIF exported');
  await closeModal(page);
}

/** MP4 skips the crop step entirely — `skipCropStep` in the app's useExportMapModal is
 * true for it, so the configure modal's own button triggers the download directly
 * instead of advancing to a separate crop dialog. */
async function exportMp4(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Export' }).click();
  const configureModal = exportConfigureModal(page);
  await configureModal.waitFor({ timeout: 10_000 });

  await selectAntOption(page, 'visualizer.exportModal.exportTypeLabel', 'Video (MP4)');
  await setInputNumberByLabel(page, 'visualizer.exportModal.qualityLabel', ANIMATED_EXPORT_QUALITY);
  await setSecondsPerPeriod(page, SECONDS_PER_PERIOD);

  const downloadBtn = exportPrimaryDownloadButton(configureModal);
  await downloadBtn.waitFor({ timeout: 30_000 });
  const downloadPromise = page.waitForEvent('download', { timeout: 300_000 });
  await downloadBtn.click();
  const download = await downloadPromise;
  await download.saveAs(join(OUTPUT_DIR, 'china-gdp-video.mp4'));
  log('✓ MP4 exported');
  await closeModal(page);
}

// ---------------------------------------------------------------------------
// Preview screenshots of the downloaded files
// ---------------------------------------------------------------------------

async function screenshotVideoPreview(
  context: BrowserContext,
  filePath: string,
  destPath: string,
): Promise<void> {
  const previewPage = await context.newPage();
  await previewPage.setViewportSize({ width: 1000, height: 750 });
  await previewPage.goto(`file://${filePath.replace(/\\/g, '/')}`);
  await previewPage
    .waitForFunction(
      () => {
        const v = document.querySelector('video');
        return !!v && v.readyState >= 1 && !Number.isNaN(v.duration) && v.duration > 0;
      },
      { timeout: 15_000 },
    )
    .catch(() => {});
  await previewPage
    .evaluate(() => {
      const v = document.querySelector('video');
      if (v) v.currentTime = v.duration / 2;
    })
    .catch(() => {});
  await previewPage.waitForTimeout(600);
  await previewPage.screenshot({ path: destPath });
  await previewPage.close();
  log('✓ video preview screenshot saved');
}

// ---------------------------------------------------------------------------
// GIF compression (ffmpeg) — same approach as other marketing scripts' demo-video
// post-processing, duplicated here since each script in this folder is self-contained.
// ---------------------------------------------------------------------------

function resolveFfmpegBinary(): string | null {
  try {
    const r = spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' });
    if (r.status === 0) return 'ffmpeg';
  } catch {
    // System ffmpeg not on PATH — try bundled binary below.
  }
  if (typeof ffmpegStaticPath === 'string' && existsSync(ffmpegStaticPath)) {
    return ffmpegStaticPath;
  }
  return null;
}

function runFfmpeg(ffmpegBin: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(ffmpegBin, args, { stdio: 'ignore' });
    child.once('error', reject);
    child.once('close', (code) =>
      code === 0 ? resolve() : reject(new Error(`ffmpeg exited with code ${code}`)),
    );
  });
}

async function makeCompressedGifPreview(sourcePath: string, destPath: string): Promise<void> {
  const ffmpegBin = resolveFfmpegBinary();
  if (!ffmpegBin) {
    log(
      '⚠ ffmpeg not found — skipping compressed GIF preview (run node node_modules/ffmpeg-static/install.js)',
    );
    return;
  }
  await runFfmpeg(ffmpegBin, [
    '-y',
    '-i',
    sourcePath,
    '-vf',
    'fps=8,scale=640:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse',
    destPath,
  ]);
  log('✓ compressed GIF preview generated');
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
    await importGdpData(page, tabDelimitedData);
    await addAndNameRanges(page);
    await normalizeRanges(page);
    await setLegendTitle(page, LEGEND_TITLE);
    await jumpTimelineToLastFrame(page);

    // "Styled map" UI screenshot — panels visible, full app chrome.
    await page.waitForTimeout(1_000);
    await page.screenshot({
      path: join(UI_SCREENSHOTS_DIR, 'china-gdp-styled-map.png'),
      fullPage: true,
    });
    log('✓ styled map screenshot saved');

    // Clean exports: transparent background, panels collapsed. Stays this way for all
    // three exports below — none of them mutate project state, only trigger downloads.
    await setTransparentBackground(page);
    await closeRightPanel(page);
    await ensureSaneMapExportFrame(page);

    await exportGif(page);
    await makeCompressedGifPreview(
      join(OUTPUT_DIR, 'china-gdp-animation.gif'),
      join(UI_SCREENSHOTS_DIR, 'china-gdp-animation-preview.gif'),
    );

    await exportMp4(page);
    await screenshotVideoPreview(
      context,
      join(OUTPUT_DIR, 'china-gdp-video.mp4'),
      join(UI_SCREENSHOTS_DIR, 'china-gdp-video-preview.png'),
    );

    console.log(`\n✅  All done — assets saved to ${OUTPUT_DIR}`);
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
