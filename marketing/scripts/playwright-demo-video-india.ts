/**
 * Marketing demo video recorder — manual paste import variant. Unlike
 * playwright-demo-video-italy-ai-parser.ts (which pastes raw data into the AI Parser to
 * reshape it), this records the "paste already-correct data into the Tab delimited text
 * (manual) box" path: clear the pre-filled sample data, paste, add + name 6 GDP-per-capita
 * bins (each manually recolored to an ascending blue), normalize ranges, save the project,
 * then open the Embed modal and copy the iframe code.
 *
 * Storyboard (~55-75 s) — tutorial: pick India, clear + paste a historical dataset into the
 * Tab delimited text box, expand the Legend Configuration's Ranges panel, add 3 more bins,
 * name + recolor all 6 after GDP-per-capita income tiers, normalize ranges, play the
 * timeline, save the project, enable + copy the embed code.
 *   0-3s    land on /projects/new
 *   3-8s    pick "India" in the country picker
 *   8-13s   sample data loads
 *   13-17s  click the "Tab delimited text (manual)" import-format radio
 *   17-21s  click "Edit Manually in Text" → modal opens → select all → delete (clears the
 *           pre-filled sample data) → wait 1s → paste "India gdp per capita.csv" reshaped
 *           as tab-delimited year/id/label/value → click Save
 *   21-25s  timeline slider appears — historical data landed
 *   25-??s  expand "Ranges" → click "Add range" ×3 (3 → 6 bins) → for each of the 6, rename
 *           after a GDP-per-capita income tier AND recolor via its color picker to an
 *           ascending blue shade (typed/colored at 4× — see WAIT_SEGMENT_SPEED_FACTOR) →
 *           click "Normalize ranges" once — six named, distinctly-colored bins make each
 *           year's transition read as more dramatic than the default three
 *   ??-??s  click Play on the timeline → animation runs through every year → Pause
 *   ??-??s  click header "Save" → name modal appears prefilled → click "Create"
 *           → app navigates to /projects/:id, Embed button becomes enabled
 *   ??-??s  click "Embed" → modal opens → toggle "Enabled" (slower pacing throughout this
 *           modal so each click reads clearly) → Share section appears → click the modal's
 *           own "Save" → scroll the iframe code block fully into view → click the
 *           copy-iframe-code button
 *   ??-end  "Copied" toast shows, recording ends
 *
 * This is a tutorial, not an export harvester — the deliverable is the recording itself.
 *
 * Post-processed via ffmpeg: flat 2× speed for the whole video, with the range naming +
 * recoloring segment sped up further to 4× — same two-tier approach as
 * playwright-demo-video-italy-ai-parser.ts's AI-wait segments. Without ffmpeg on PATH the
 * raw 1× recording is kept. As a final step the Cocktail Lounge - Dyalla.mp3 track is
 * muxed into the sped-up recording to produce a ready-to-post MP4 — the silent, sped-up
 * .webm is kept alongside it in case a different track is wanted later.
 *
 * Output:
 *   docs/marketing/assets/video/sample-data-to-mp4/demo-video-india.webm
 *   docs/marketing/assets/video/sample-data-to-mp4/demo-video-india-with-music-Cocktail Lounge - Dyalla.mp4
 *
 * Run:
 *   pnpm --filter @regionify/marketing generate-demo-video-india
 *   pnpm --filter @regionify/marketing generate-demo-video-india -- --headed   # to watch
 *
 * Requires:
 *   marketing/.env with CLIENT_URL, REGIONIFY_EMAIL, REGIONIFY_PASSWORD set.
 *   Account must be on a tier with historical data import AND public embed access.
 *   ffmpeg on PATH, or the `ffmpeg-static` npm devDependency (bundled binary).
 */

import { chromium, type BrowserContext, type Locator, type Page } from 'playwright';
import { config as loadEnv } from 'dotenv';
import ffmpegStaticPath from 'ffmpeg-static';
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync } from 'node:fs';
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
/** Playwright writes videos with random filenames — collect them in a scratch dir first. */
const VIDEO_TMP_DIR = join(ASSETS_ROOT, '.video-tmp-india');
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
const OUTPUT_FILE = 'demo-video-india.webm';

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

/** Track muxed into the final deliverable — matches audio-apply-to-video.bat's naming scheme. */
const AUDIO_TRACK_NAME = 'Cocktail Lounge - Dyalla';
const AUDIO_TRACK_PATH = join(
  __dirname,
  '..',
  '..',
  'docs',
  'marketing',
  'assets',
  'audio',
  `${AUDIO_TRACK_NAME}.mp3`,
);

/** Landscape, taller than standard 16:9 — matches the recently-tuned Italy variant's viewport. */
const VIDEO_SIZE = { width: 1280, height: 960 } as const;

/** Gives fixed-height sidebar controls proportionally more headroom inside VIDEO_SIZE. */
const PAGE_ZOOM = 0.85;

const DEMO_COUNTRY = { slug: 'india', name: 'India' } as const;

/** Default playback speed for all segments (2× = half the real-time duration). */
const GLOBAL_SPEED_FACTOR = 2;

/** Extra speed while typing the 6 legend range names (4× vs real-time). */
const WAIT_SEGMENT_SPEED_FACTOR = 4;

type SpeedRange = { startMs: number; endMs: number; factor: number };

const speedRanges: SpeedRange[] = [];
/** Wall-clock timestamp when the recorded page opens — video t=0 for trim boundaries. */
let pageOpenAt = 0;

function markSpeedRangeStart(): number {
  return Date.now() - pageOpenAt;
}

function commitSpeedRange(startMs: number, factor: number): void {
  const endMs = Date.now() - pageOpenAt;
  if (endMs <= startMs || factor <= 1) return;
  speedRanges.push({ startMs, endMs, factor });
  log(
    `⏩ speed range ${(startMs / 1_000).toFixed(1)}s – ${(endMs / 1_000).toFixed(1)}s @ ${factor}×`,
  );
}

// ---------------------------------------------------------------------------
// Visible cursor + click-target highlight overlays
// ---------------------------------------------------------------------------

/** Applied once per document via `addInitScript` — see the `PAGE_ZOOM` comment. */
const PAGE_ZOOM_INIT_SCRIPT = `
  (() => {
    document.documentElement.style.zoom = '${PAGE_ZOOM}';
  })();
`;

/** Force English UI for marketing recordings (logged-in locale overrides localStorage). */
const LOCALE_EN_INIT_SCRIPT = `
  (() => {
    try { localStorage.setItem('regionify-locale', 'en'); } catch {}
  })();
`;

const OVERLAY_INIT_SCRIPT = `
  (() => {
    if (window.__marketingOverlaysInjected) return;
    window.__marketingOverlaysInjected = true;

    const install = () => {
      if (document.getElementById('__marketing_cursor__')) return;

      const style = document.createElement('style');
      style.textContent = \`
        #__marketing_cursor__ {
          position: fixed;
          top: 0;
          left: 0;
          width: 22px;
          height: 22px;
          margin-left: -2px;
          margin-top: -2px;
          pointer-events: none;
          z-index: 2147483647;
          transform: translate3d(-100px, -100px, 0);
          background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><path d='M5 3 L5 19 L9.5 14.5 L12.5 21 L15 20 L12 13.5 L18 13 Z' fill='%23111827' stroke='%23ffffff' stroke-width='1.4' stroke-linejoin='round'/></svg>");
          background-size: 22px 22px;
          background-repeat: no-repeat;
          transition: transform 40ms linear;
        }
        #__marketing_cursor__.click::after {
          content: '';
          position: absolute;
          top: 4px;
          left: 4px;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: rgba(24, 41, 77, 0.45);
          animation: __cursorClick 500ms ease-out forwards;
        }
        @keyframes __cursorClick {
          from { transform: scale(0.3); opacity: 1; }
          to   { transform: scale(2.2); opacity: 0; }
        }
        #__marketing_highlight__ {
          position: fixed;
          pointer-events: none;
          z-index: 2147483646;
          border: 4px solid #ef4444;
          border-radius: 10px;
          background: rgba(239, 68, 68, 0.12);
          box-shadow: 0 0 0 6px rgba(239, 68, 68, 0.35), 0 0 32px rgba(239, 68, 68, 0.75);
          opacity: 0;
          transform: scale(1.18);
          transition: opacity 180ms ease-out, transform 220ms ease-out;
        }
        #__marketing_highlight__.visible {
          opacity: 1;
          transform: scale(1);
        }
      \`;
      document.head.appendChild(style);

      // ------- Cursor sprite -------
      const cursor = document.createElement('div');
      cursor.id = '__marketing_cursor__';
      document.body.appendChild(cursor);

      document.addEventListener('mousemove', (e) => {
        cursor.style.transform = 'translate3d(' + e.clientX + 'px,' + e.clientY + 'px,0)';
      }, true);
      document.addEventListener('mousedown', () => {
        cursor.classList.remove('click');
        // Force reflow so the animation restarts on repeat clicks
        void cursor.offsetWidth;
        cursor.classList.add('click');
      }, true);

      // ------- Click-target highlight ring -------
      // Small padding — the ring hugs the target so the exact click point is unambiguous.
      const PADDING = 2;

      window.__marketingHighlight = (rect) => {
        window.__marketingHighlightClear();
        const el = document.createElement('div');
        el.id = '__marketing_highlight__';
        el.style.top = (rect.top - PADDING) + 'px';
        el.style.left = (rect.left - PADDING) + 'px';
        el.style.width = (rect.width + PADDING * 2) + 'px';
        el.style.height = (rect.height + PADDING * 2) + 'px';
        document.body.appendChild(el);
        // Force reflow, then trigger fade-in transition
        void el.offsetWidth;
        el.classList.add('visible');
      };

      window.__marketingHighlightClear = () => {
        const existing = document.getElementById('__marketing_highlight__');
        if (!existing) return;
        existing.classList.remove('visible');
        setTimeout(() => existing.remove(), 220);
      };
    };

    if (document.body) install();
    else document.addEventListener('DOMContentLoaded', install, { once: true });
  })();
`;

// ---------------------------------------------------------------------------
// Helpers — trimmed subset of playwright-demo-video-italy-ai-parser.ts
// ---------------------------------------------------------------------------

function log(msg: string): void {
  console.log(`[video] ${msg}`);
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
  await page.waitForTimeout(1_000);

  mkdirSync(ASSETS_ROOT, { recursive: true });
  await context.storageState({ path: AUTH_STATE_FILE });
  log('Logged in — session saved');
}

/**
 * Ensure auth state exists and is valid. Uses a non-recorded context so the
 * login flow doesn't end up in the demo video.
 */
async function ensureAuthState(
  browser: Awaited<ReturnType<typeof chromium.launch>>,
): Promise<void> {
  const context = await browser.newContext({
    viewport: VIDEO_SIZE,
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

/**
 * Draw a highlight ring around `locator`'s bounding box, wait `dwellMs`, then
 * click. The ring fades out ~220 ms after the click via `__marketingHighlightClear`.
 */
async function clickWithHighlight(
  page: Page,
  locator: Locator,
  opts: { dwellMs?: number; force?: boolean } = {},
): Promise<void> {
  const { dwellMs = 500, force = false } = opts;

  await locator.waitFor({ state: 'visible', timeout: 15_000 });
  await locator.hover({ force }).catch(() => {
    /* hover isn't essential — proceed even if it fails on tricky elements */
  });

  const box = await locator.boundingBox();
  if (box) {
    type HighlightRect = { top: number; left: number; width: number; height: number };
    const rect: HighlightRect = {
      top: box.y,
      left: box.x,
      width: box.width,
      height: box.height,
    };
    await page.evaluate(
      (r: HighlightRect) =>
        (
          window as unknown as { __marketingHighlight?: (rect: HighlightRect) => void }
        ).__marketingHighlight?.(r),
      rect,
    );
    await page.waitForTimeout(dwellMs);
  }

  await locator.click({ force });

  await page.waitForTimeout(220);
  await page.evaluate(() => {
    (window as unknown as { __marketingHighlightClear?: () => void }).__marketingHighlightClear?.();
  });
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

/** Locator for a modal scoped by an i18n-keyed element inside its title (locale-independent). */
function modalByTitleKey(page: Page, i18nKey: string): Locator {
  return page
    .locator('.ant-modal:visible')
    .filter({ has: page.locator(`[data-i18n-key="${i18nKey}"]`) });
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
  await clickWithHighlight(page, trigger, { dwellMs: 350 });

  // The popover renders in a body-level portal, most-recently-opened last — `.last()` is a
  // safety net in case a previous row's popover hasn't fully unmounted yet.
  const hexInput = page.locator('.ant-color-picker-hex-input input').last();
  await hexInput.waitFor({ state: 'visible', timeout: 10_000 });
  await hexInput.click({ clickCount: 3 });
  await hexInput.fill(hex);
  await page.waitForTimeout(300);

  // Close the popover via Escape — clicking the trigger again to "toggle it shut" isn't
  // reliable across repeated calls in a loop (the previous popover can still be closing),
  // whereas Escape reliably dismisses whichever ColorPicker popover is currently open.
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
}

// ---------------------------------------------------------------------------
// The recorded storyboard
// ---------------------------------------------------------------------------

async function recordStoryboard(page: Page, tabDelimitedData: string): Promise<void> {
  // 0-3s — land on the new-project page.
  await page.goto(`${BASE_URL}/projects/new`);
  await page.waitForLoadState('networkidle', { timeout: 15_000 });
  await waitForVisualizerReady(page);
  await page.waitForTimeout(1_500);

  // 3-8s — pick the demo country from the country dropdown.
  const regionSelect = antSelectByLabelKey(page, 'visualizer.region.sectionTitle');
  await clickWithHighlight(page, regionSelect, { dwellMs: 450 });
  await page.waitForTimeout(400);
  await page.keyboard.type(DEMO_COUNTRY.name, { delay: 80 });
  await page.waitForTimeout(500);

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
  await clickWithHighlight(page, countryOption, { dwellMs: 400 });

  // 8-13s — sample data loads. Wait for the mode-toggle button as "app is ready".
  await page.waitForLoadState('networkidle', { timeout: 20_000 });
  await page
    .getByRole('button', { name: /Switch to (dynamic|static) data/ })
    .waitFor({ timeout: 30_000 });
  await page.waitForTimeout(2_000);

  // 13-17s — click the "Tab delimited text (manual)" import-format radio.
  const tabDelimitedRadio = page.locator('input[type="radio"][value="tab_delimited"]');
  await tabDelimitedRadio.waitFor({ timeout: 10_000 });
  const tabDelimitedLabel = page
    .locator('label.ant-radio-wrapper', { has: tabDelimitedRadio })
    .first();
  await clickWithHighlight(page, tabDelimitedLabel, { dwellMs: 450 });

  // 17-21s — open the manual-paste modal, replace its pre-filled text, and save.
  const editInTextBtn = page.locator('[data-i18n-key="visualizer.importData.editManuallyInText"]');
  await clickWithHighlight(page, editInTextBtn, { dwellMs: 500 });

  // TabDelimitedTextModal passes its `data-i18n-key` as a prop straight to AntD's <Modal>
  // (via AppExpandableModal's `{...rest}`), which doesn't reliably land on any element inside
  // `.ant-modal` — unlike modals that wrap an explicit `data-i18n-key`'d element in `title`
  // (e.g. SaveProjectNameModal). Scope by the rendered title text instead (locale is forced
  // to English for this recording).
  const tabDelimitedModal = page
    .locator('.ant-modal:visible')
    .filter({ has: page.locator('.ant-modal-title', { hasText: 'Tab Delimited Text' }) });
  await tabDelimitedModal.waitFor({ timeout: 15_000 });
  await page.waitForTimeout(800);

  // The textarea is pre-filled with the currently-loaded sample data (Modal.tsx seeds it
  // from the current dataset on open) — select all and delete it first so the viewer sees
  // the sample data actually removed, then pause a beat before pasting the India data in
  // (rather than a paste immediately replacing the selection in one motion).
  const tabDelimitedTextarea = tabDelimitedModal.locator('textarea');
  await clickWithHighlight(page, tabDelimitedTextarea, { dwellMs: 400 });
  await page.keyboard.press('Control+A');
  await page.keyboard.press('Delete');
  await page.waitForTimeout(1_000);
  await page.evaluate((text) => navigator.clipboard.writeText(text), tabDelimitedData);
  await page.keyboard.press('Control+V');
  await page.waitForTimeout(800);

  const tabDelimitedSaveBtn = tabDelimitedModal.getByRole('button', { name: 'Save' });
  await clickWithHighlight(page, tabDelimitedSaveBtn, { dwellMs: 500 });
  await tabDelimitedModal.waitFor({ state: 'hidden', timeout: 15_000 }).catch(() => {});

  // 21-25s — timeline slider appears once the historical import lands.
  await page.locator('.ant-slider').waitFor({ state: 'visible', timeout: 15_000 });
  await page.waitForTimeout(1_500);

  // ── Legend Configuration → expand Ranges, add 3 more bins, name + recolor all 6, THEN
  // normalize. Six named, distinctly-colored bins (vs. the default three) make the
  // animation read as more dramatic: each year's values get sorted into finer buckets, so
  // more regions visibly change band as the timeline plays. ──
  const rangesPanelItem = page
    .locator('.ant-collapse-item')
    .filter({ has: page.locator('[data-i18n-key="visualizer.legendConfig.collapseRanges"]') });
  const rangesAccordionHeader = rangesPanelItem.locator('.ant-collapse-header');
  await clickWithHighlight(page, rangesAccordionHeader, { dwellMs: 450 });
  await page.waitForTimeout(500);

  const addRangeBtn = page.locator('[data-i18n-key="visualizer.legendConfig.addRangeAria"]');
  for (let i = 0; i < 3; i++) {
    await clickWithHighlight(page, addRangeBtn, { dwellMs: 350 });
    await page.waitForTimeout(300);
  }

  // The default 3 bins (Low/Medium/High) come first, the 3 just-added "New Range" rows
  // follow — rename + recolor all 6, in ascending order, since normalizeLegendRanges()
  // redistributes min/max across bins in their current array order
  // (client/src/helpers/normalizeLegendRanges.ts). Names follow the World Bank's
  // GDP-per-capita income tiers (this dataset's topic); colors are a manually-set
  // ascending blue ramp (light → dark) instead of a random palette, so lightest =
  // lowest income and darkest = highest, matching the ascending name order.
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
  const renamingStart = markSpeedRangeStart();
  for (let i = 0; i < RANGE_NAMES.length; i++) {
    const row = rangeRows.nth(i);
    const nameInput = row.locator('input[aria-label="Legend item name"]');
    await clickWithHighlight(page, nameInput, { dwellMs: 300 });
    await page.keyboard.press('Control+A');
    await page.keyboard.type(RANGE_NAMES[i], { delay: 40 });
    await page.waitForTimeout(200);
    await changeLegendRowColor(page, row, RANGE_COLORS[i]);
  }
  commitSpeedRange(renamingStart, WAIT_SEGMENT_SPEED_FACTOR);
  await page.waitForTimeout(500);

  // The single "Normalize ranges" click — redistributes the 6 named, recolored bins evenly
  // across the dataset's real min/max.
  const normalizeRangesBtn = page.locator(
    '[data-i18n-key="visualizer.legendConfig.normalizeRangesAria"]',
  );
  await clickWithHighlight(page, normalizeRangesBtn, { dwellMs: 500 });
  await page.waitForTimeout(1_500);

  // ── Play the timeline animation through all years ──
  const playBtn = page.getByRole('button', { name: 'Play animation' });
  const playBtnAppeared = await playBtn
    .waitFor({ timeout: 10_000 })
    .then(() => true)
    .catch(() => false);

  if (playBtnAppeared) {
    // Read the period count off the slider's own aria attributes so the wait scales
    // with however many years the CSV actually had.
    const sliderHandle = page.locator('.ant-slider [role="slider"]').first();
    const maxAttr = await sliderHandle.getAttribute('aria-valuemax').catch(() => null);
    const periodCount = maxAttr !== null ? Number(maxAttr) + 1 : 23;

    await clickWithHighlight(page, playBtn, { dwellMs: 450 });

    // Default playback is 1s/period (AnimationControls.tsx) — wait one full loop
    // through every period, plus a buffer for the smooth blend transition and a
    // beat to land on the final frame before pausing. Trimmed 3s off the buffer —
    // the original wait ran noticeably longer than the animation actually needed.
    const fullLoopMs = Math.max(0, periodCount * 1_300 + 1_000 - 3_000);
    await page.waitForTimeout(fullLoopMs);

    const pauseBtn = page.getByRole('button', { name: 'Pause animation' });
    if (await pauseBtn.isVisible().catch(() => false)) {
      await clickWithHighlight(page, pauseBtn, { dwellMs: 400 });
    }
  }

  // ── Save the project (new project → name modal → Create) ──
  const headerSaveBtn = page.locator('[data-i18n-key="visualizer.save"]');
  await clickWithHighlight(page, headerSaveBtn, { dwellMs: 450 });

  const nameModal = modalByTitleKey(page, 'visualizer.saveModalTitle');
  await nameModal.waitFor({ timeout: 10_000 });
  await page.waitForTimeout(600);

  const createBtn = page.locator('[data-i18n-key="visualizer.saveModalCreate"]');
  await clickWithHighlight(page, createBtn, { dwellMs: 500 });
  await nameModal.waitFor({ state: 'hidden', timeout: 15_000 }).catch(() => {});

  // Project created — app navigates to /projects/:id, Embed button becomes enabled.
  await page.waitForURL((url) => /\/projects\/[^/]+$/.test(url.pathname), { timeout: 15_000 });
  await page.waitForLoadState('networkidle', { timeout: 15_000 });
  await page.waitForTimeout(1_000);

  // ── Open Embed, enable it, save, copy the iframe code ──
  const embedBtn = page.locator('[data-i18n-key="visualizer.embed.openButton"]');
  await embedBtn.waitFor({ state: 'visible', timeout: 15_000 });
  await clickWithHighlight(page, embedBtn, { dwellMs: 500 });

  const embedModal = modalByTitleKey(page, 'visualizer.embed.modalTitle');
  await embedModal.waitFor({ timeout: 15_000 });
  await page.waitForTimeout(1_500);

  // Every click inside this modal is deliberately slower/more spaced out than elsewhere —
  // this is the payoff moment of the whole video, so the viewer needs a clear beat to
  // register what was just clicked before the next thing happens.

  // The "Enabled" switch is the first switch in DOM order (EmbedForm.tsx renders it
  // before the allowed-origins and show-header toggles). Toggling it alone reveals
  // the Share section — no need to wait for a save round-trip first.
  const enabledSwitch = embedModal.getByRole('switch').first();
  await clickWithHighlight(page, enabledSwitch, { dwellMs: 900 });
  await page.waitForTimeout(1_800);

  // Persist the enabled state (+ auto-filled SEO defaults) server-side.
  const embedSaveBtn = embedModal.locator('[data-i18n-key="visualizer.save"]');
  await clickWithHighlight(page, embedSaveBtn, { dwellMs: 900 });
  await page.waitForTimeout(2_000);

  // Scroll the modal body all the way down first, so the iframe code block AND its copy
  // button are both fully in view together before anything gets clicked — the Share
  // section (public URL + iframe code) sits below the SEO/origins form and doesn't fully
  // fit in the modal's viewport otherwise.
  const embedModalBody = embedModal.locator('.ant-modal-body');
  const iframeCode = embedModal.locator('pre');
  await iframeCode.waitFor({ state: 'visible', timeout: 15_000 });
  await embedModalBody.evaluate((el) => el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' }));
  await page.waitForTimeout(900);
  await iframeCode.scrollIntoViewIfNeeded();
  await page.waitForTimeout(700);

  const copyEmbedBtn = embedModal.locator('[data-i18n-key="visualizer.embed.copyEmbed"]');
  await clickWithHighlight(page, copyEmbedBtn, { dwellMs: 900 });

  // Hold on the "Copied" toast before the recording cuts.
  await page.waitForTimeout(2_500);
}

// ---------------------------------------------------------------------------
// ffmpeg post-processing — apply speed ranges captured during recording
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
    const child = spawn(ffmpegBin, args, { stdio: 'inherit' });
    child.once('error', reject);
    child.once('close', (code) =>
      code === 0 ? resolve() : reject(new Error(`ffmpeg exited with code ${code}`)),
    );
  });
}

function buildSpeedFilter(
  ranges: SpeedRange[],
  baseFactor: number,
): { filter: string; segmentCount: number } {
  const sorted = [...ranges]
    .filter((r) => r.endMs > r.startMs && r.factor > 1)
    .sort((a, b) => a.startMs - b.startMs);

  /** Collect segment specs first so we know how many split outputs we need. */
  type SegmentSpec = { startMs: number; endMs: number | null; factor: number };
  const segments: SegmentSpec[] = [];
  let cursorMs = 0;

  for (const r of sorted) {
    if (r.startMs < cursorMs) continue;
    if (r.startMs > cursorMs)
      segments.push({ startMs: cursorMs, endMs: r.startMs, factor: baseFactor });
    segments.push({ startMs: r.startMs, endMs: r.endMs, factor: r.factor });
    cursorMs = r.endMs;
  }
  segments.push({ startMs: cursorMs, endMs: null, factor: baseFactor });

  const parts: string[] = [];
  const labels: string[] = [];

  // Each trim branch needs its own copy of the input — [0:v] cannot be reused without split.
  const splitOuts = segments.map((_, i) => `[vs${i}]`).join('');
  parts.push(`[0:v]split=${segments.length}${splitOuts}`);

  segments.forEach((seg, i) => {
    const label = `s${i}`;
    const startSec = (seg.startMs / 1_000).toFixed(3);
    const trim =
      seg.endMs !== null
        ? `trim=start=${startSec}:end=${(seg.endMs / 1_000).toFixed(3)}`
        : `trim=start=${startSec}`;
    const pts = seg.factor === 1 ? 'setpts=PTS-STARTPTS' : `setpts=(PTS-STARTPTS)/${seg.factor}`;
    parts.push(`[vs${i}]${trim},${pts}[${label}]`);
    labels.push(`[${label}]`);
  });

  const concat = `${labels.join('')}concat=n=${labels.length}:v=1:a=0[v]`;
  return { filter: `${parts.join(';')};${concat}`, segmentCount: labels.length };
}

function encodeOutputArgs(outputPath: string): string[] {
  return [
    '-c:v',
    'libvpx-vp9',
    '-b:v',
    '0',
    '-crf',
    '32',
    '-deadline',
    'good',
    '-cpu-used',
    '4',
    '-an',
    outputPath,
  ];
}

async function postProcessSpeedRanges(
  rawPath: string,
  finalPath: string,
  ranges: SpeedRange[],
): Promise<void> {
  const needsProcessing = GLOBAL_SPEED_FACTOR > 1 || ranges.length > 0;
  if (!needsProcessing) {
    renameSync(rawPath, finalPath);
    return;
  }

  const ffmpegBin = resolveFfmpegBinary();
  if (!ffmpegBin) {
    log('⚠ ffmpeg not found — writing raw recording without speed-ups.');
    log('   Restart your terminal after installing ffmpeg, or run:');
    log('   node node_modules/ffmpeg-static/install.js');
    renameSync(rawPath, finalPath);
    return;
  }
  if (ffmpegBin !== 'ffmpeg') {
    log(`▶ using bundled ffmpeg (${ffmpegBin})`);
  }

  const tmpOut = `${rawPath}.processed.webm`;

  if (ranges.length === 0) {
    log(`▶ ffmpeg global ${GLOBAL_SPEED_FACTOR}× speed-up`);
    await runFfmpeg(ffmpegBin, [
      '-y',
      '-i',
      rawPath,
      '-vf',
      `setpts=PTS/${GLOBAL_SPEED_FACTOR}`,
      ...encodeOutputArgs(tmpOut),
    ]);
  } else {
    const { filter, segmentCount } = buildSpeedFilter(ranges, GLOBAL_SPEED_FACTOR);
    log(
      `▶ ffmpeg ${GLOBAL_SPEED_FACTOR}× base + ${ranges.length} wait range(s) @ ${WAIT_SEGMENT_SPEED_FACTOR}× (${segmentCount} segments)`,
    );
    await runFfmpeg(ffmpegBin, [
      '-y',
      '-i',
      rawPath,
      '-filter_complex',
      filter,
      '-map',
      '[v]',
      ...encodeOutputArgs(tmpOut),
    ]);
  }

  rmSync(rawPath, { force: true });
  renameSync(tmpOut, finalPath);
}

/**
 * Mux an audio track into the (silent, sped-up) recording — same ffmpeg args as
 * `docs/marketing/assets/scripts/audio-apply-to-video.bat`, just run automatically as
 * the last step instead of by hand. `-shortest` trims to whichever stream is shorter.
 */
async function muxAudioTrack(
  videoPath: string,
  audioPath: string,
  outputPath: string,
): Promise<boolean> {
  if (!existsSync(audioPath)) {
    log(`⚠ audio track not found (${audioPath}) — skipping music mux.`);
    return false;
  }

  const ffmpegBin = resolveFfmpegBinary();
  if (!ffmpegBin) {
    log('⚠ ffmpeg not found — skipping music mux (silent .webm is still available).');
    return false;
  }

  log(`▶ muxing "${AUDIO_TRACK_NAME}" into the final MP4`);
  await runFfmpeg(ffmpegBin, [
    '-y',
    '-i',
    videoPath,
    '-i',
    audioPath,
    '-map',
    '0:v:0',
    '-map',
    '1:a:0',
    '-c:v',
    'libx264',
    '-pix_fmt',
    'yuv420p',
    '-crf',
    '22',
    '-c:a',
    'aac',
    '-b:a',
    '192k',
    '-shortest',
    outputPath,
  ]);
  return true;
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

  const cliArgs = process.argv.slice(2);
  const headed = cliArgs.includes('--headed');

  mkdirSync(OUTPUT_DIR, { recursive: true });
  // Start with a clean scratch dir so we don't grab an old recording.
  if (existsSync(VIDEO_TMP_DIR)) rmSync(VIDEO_TMP_DIR, { recursive: true, force: true });
  mkdirSync(VIDEO_TMP_DIR, { recursive: true });

  // `slowMo` slows every Playwright action; makes on-screen motion look intentional.
  const browser = await chromium.launch({ headless: !headed, slowMo: 120 });

  // Phase 1 — ensure a valid session in a NON-recorded context.
  await ensureAuthState(browser);

  // Phase 2 — the recorded context. This is what ends up in the video.
  const context = await browser.newContext({
    acceptDownloads: true,
    viewport: VIDEO_SIZE,
    storageState: AUTH_STATE_FILE,
    recordVideo: {
      dir: VIDEO_TMP_DIR,
      size: VIDEO_SIZE,
    },
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

  // Zoom out slightly so sidebar content isn't clipped at the fold, then inject
  // cursor + click-target-highlight overlays — both apply on every page load.
  await context.addInitScript(PAGE_ZOOM_INIT_SCRIPT);
  await context.addInitScript(OVERLAY_INIT_SCRIPT);
  await context.addInitScript(LOCALE_EN_INIT_SCRIPT);
  await ensureEnglishProfile(context);

  const page = await context.newPage();
  pageOpenAt = Date.now();

  try {
    log('▶ recording storyboard');
    await recordStoryboard(page, tabDelimitedData);
    log('✓ storyboard finished — closing context to flush video');
  } finally {
    // Closing the context (not just the page) is what finalises the video file.
    await context.close();
    await browser.close();
  }

  // Playwright writes videos with an auto-generated filename; move the newest
  // .webm from the scratch dir to the final location.
  const webms = readdirSync(VIDEO_TMP_DIR).filter((f) => f.endsWith('.webm'));
  if (webms.length === 0) {
    console.error(`No .webm recording found in ${VIDEO_TMP_DIR}`);
    process.exit(1);
  }
  // If for some reason there are multiple, take the freshest.
  webms.sort();
  const rawPath = join(VIDEO_TMP_DIR, webms[webms.length - 1]);
  const dest = join(OUTPUT_DIR, OUTPUT_FILE);
  if (existsSync(dest)) rmSync(dest);

  await postProcessSpeedRanges(rawPath, dest, speedRanges);
  rmSync(VIDEO_TMP_DIR, { recursive: true, force: true });

  console.log(`\n✅  Demo video saved: ${dest}`);

  const musicDest = join(OUTPUT_DIR, `demo-video-india-with-music-${AUDIO_TRACK_NAME}.mp4`);
  if (existsSync(musicDest)) rmSync(musicDest);
  const muxed = await muxAudioTrack(dest, AUDIO_TRACK_PATH, musicDest);
  if (muxed) {
    console.log(`✅  Demo video with music saved: ${musicDest}`);
  } else {
    console.log('    To add music manually, if you have ffmpeg installed:');
    console.log(
      `    ffmpeg -i "${dest}" -i "${AUDIO_TRACK_PATH}" -map 0:v:0 -map 1:a:0 -c:v libx264 -pix_fmt yuv420p -crf 22 -c:a aac -b:a 192k -shortest "${musicDest}"`,
    );
  }
}

main().catch((err: unknown) => {
  console.error('\n✗  Unhandled script error:', err);
  process.exit(1);
});
