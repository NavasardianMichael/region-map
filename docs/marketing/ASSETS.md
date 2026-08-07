# Marketing Assets — Generation Guide

Where the screenshots, images, and videos referenced in the LinkedIn post and Medium article come from, and how to (re)generate them.

## Two categories of marketing asset

The repo has two kinds of generated marketing asset, plus the Astro website's own pool. Which one you touch depends on what you need:

| Source folder                                 | Purpose                                                                                                                                                                                                                | Regenerate with                       |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| `docs/marketing/assets/images/*.png`          | Generic UI-visible screenshots (sample data, no real dataset) shared by the LinkedIn post and any Medium article that wants them                                                                                       | `pnpm generate-marketing-screenshots` |
| `docs/marketing/assets/video/demo-video.webm` | Generic demo clip, same sharing model as the screenshots above                                                                                                                                                         | `pnpm generate-demo-video`            |
| `docs/marketing/assets/audio/`                | Background music tracks (manual; not generated)                                                                                                                                                                        | —                                     |
| `docs/marketing/medium/{article}/`            | Every generated deliverable (screenshots, raw SVG/GIF/video exports, embed URL/code) for a Medium article built around its own **real dataset** — one subfolder per such article, holding both the `.md` and its media | see the per-article table below       |
| `marketing/assets/{country}/`                 | Country-specific output previews (PNG/GIF/MP4/SVG/embed page) consumed by the Astro marketing website AND cited as source material by the marketing posts                                                              | `pnpm generate-marketing-assets`      |

**Why the split?** Generic, sample-data screenshots (map picker, styling panel with placeholder data) don't belong to any one article — the LinkedIn post and a future Medium piece can both cite `docs/marketing/assets/images/data-import-panel.png` without duplicating it. But an article built around a specific real dataset (OECD fertility rates, German GDP) needs its own dedicated capture script and its own home for the resulting files — bundling the `.md` and its media in one `docs/marketing/medium/{article}/` folder means the article and its assets move together.

They rarely overlap with the Astro site's pool. When a Medium article cites `marketing/assets/spain/spain-embed-page.png` as source material for a hero composite, it's borrowing from the website's asset pool as a matter of convenience — not building a dependency.

## `docs/marketing/medium/{article}/` — real-dataset Medium articles

```
docs/marketing/medium/
├── embed-guide/
│   └── embed-guide.md                       (+ screenshots, raw SVG/GIF, embed URL/code)
└── feature-tour-germany-gdp/
    └── feature-tour-germany-gdp.md          (+ screenshots, hero PNG, GIF, embed URL/code)
```

| Article                                                | Dataset                                                                                                                                                                                      | Generator script                                                                                                                    |
| ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `embed-guide/embed-guide.md`                           | `docs/marketing/assets/data/oecd-fertility-france.csv`                                                                                                                                       | `marketing/scripts/playwright-oecd-france-fertility.ts` (`pnpm --filter @regionify/marketing generate-oecd-france-fertility`)       |
| `feature-tour-germany-gdp/feature-tour-germany-gdp.md` | `docs/marketing/assets/data/Germany gdp per capita.csv` (16 Länder × 1995-2024, OECD Regional Economy database, `year,id,label,value` shape — same convention as `India gdp per capita.csv`) | `marketing/scripts/playwright-germany-gdp-feature-tour.ts` (`pnpm --filter @regionify/marketing generate-germany-gdp-feature-tour`) |

A third, generic product-intro article previously lived here (reusing the shared sample-data screenshots below); it's been retired, so `docs/marketing/assets/images/` and `docs/marketing/assets/video/` are back to being the LinkedIn post's direct source rather than a Medium article's.

## `docs/marketing/assets/images/` — shared social-media screenshots

These four screenshots are generic (sample data, no specific dataset) and shared across whichever posts want them — currently the LinkedIn post:

| File                    | What it is                                                     | Referenced by           |
| ----------------------- | -------------------------------------------------------------- | ----------------------- |
| `map-picker.png`        | `/projects/new` with the country dropdown open                 | —                       |
| `product-overview.png`  | Full app with data + styles sidebars visible                   | LinkedIn: carousel bg   |
| `data-import-panel.png` | Manual-entry modal with a deliberately messy Spain CSV pasted  | LinkedIn: hero fallback |
| `styling-panel.png`     | Right styles panel expanded, palette + legend controls visible | —                       |

## `marketing/assets/{country}/` — website + composite source material

`marketing/assets/{country}/` contains a full asset pack for ~180 countries, produced by the country-batch generator (`marketing/scripts/playwright-asset-generator.ts`).

Per country, you'll find:

| File                       | What it is                                          |
| -------------------------- | --------------------------------------------------- |
| `{country}-static.png`     | Styled choropleth PNG (transparent bg, watermarked) |
| `{country}.svg`            | SVG export of the same map                          |
| `{country}-animation.gif`  | Time-series animation (dynamic mode)                |
| `{country}-video.mp4`      | Same animation as MP4                               |
| `{country}-embed-page.png` | Public embed page screenshot (full page)            |
| `{country}-embed-url.txt`  | Live embed URL for that country                     |

Use these as-is wherever the article/post calls for a "finished map" visual. Recommended demo countries with strong visual identity:

- **Spain** — autonomous communities are large and colour-distinct
- **France** — régions with recognisable names
- **Germany** — Länder, familiar to European readers
- **Armenia** — small country, works well as an animated GIF in-flow

## Run instructions

### One-time setup

1. Copy `marketing/.env.example` → `marketing/.env` if you haven't already.
2. Set these vars in `marketing/.env`:
   - `CLIENT_URL` — the Regionify origin (`https://regionify.pro` for prod, `http://localhost:7002` for local dev)
   - `REGIONIFY_EMAIL` — an account on any paid tier
   - `REGIONIFY_PASSWORD` — its password
3. If targeting local dev: bring the app up first (`docker compose up -d && pnpm dev`).

### Regenerate the four social-media screenshots

From the repo root:

```
pnpm generate-marketing-screenshots
```

Or filter to a subset (note the quotes — PowerShell splits unquoted commas):

```
pnpm generate-marketing-screenshots -- '--only=map-picker,product-overview'
```

Run headed to watch it work (useful while iterating on selectors):

```
pnpm generate-marketing-screenshots -- '--headed'
```

Outputs overwrite anything in `docs/marketing/assets/images/`.

The script:

- Reuses the persisted auth session from `marketing/assets/.auth-state.json` when possible
- Falls back to a fresh login if the saved session has expired
- Creates or reuses a "Spain" demo project (same behaviour as the country-batch generator)
- Runs each capture routine sequentially; a single failure doesn't stop the others

### Regenerate the country-specific asset packs

From the repo root:

```
pnpm generate-marketing-assets
```

This runs against every country listed in `marketing/scripts/countries.ts` (currently ~230). It's the slow one — expect 20-40 minutes on a full run — but it's idempotent: existing files are skipped, so re-runs after failures only regenerate what's missing.

## Composite / hero image

Not generated by any script — assemble in Figma or Canva from:

- The **top half**: crop `docs/marketing/assets/images/data-import-panel.png` to the modal region (shows the messy CSV)
- The **bottom half**: crop `marketing/assets/spain/spain-embed-page.png` (or france/germany) to the map region

Portrait 4:5 (1200 × 1500) for LinkedIn, 2:1 (1500 × 750) for Medium hero.

## Demo video (`video/demo-video.webm`)

Auto-generated by `pnpm generate-demo-video`. Saved under `docs/marketing/assets/video/`. No audio by default — add a track from `audio/` and export to `video/demo-video-with-music.mp4` when posting.

**Storyboard** (scripted in `marketing/scripts/playwright-demo-video.ts`):

| Timestamp   | Action                                             |
| ----------- | -------------------------------------------------- |
| 0:00 – 0:03 | Land on `/projects/new`                            |
| 0:03 – 0:09 | Type "Spain" in country picker, click Spain option |
| 0:09 – 0:14 | Sample data loads, styled map paints               |
| 0:14 – 0:18 | Click "Apply Random Palette" — first palette swap  |
| 0:18 – 0:22 | Click "Apply Random Palette" — second palette swap |
| 0:22 – 0:27 | Click Export button, export modal opens            |
| 0:27 – 0:30 | Close modal, hold on final styled map              |

**Two quality-boosters baked into the script:**

1. `slowMo: 120` on the browser — every Playwright action runs a beat slower so motion looks intentional rather than machine-fast.
2. A custom cursor overlay injected via `page.addInitScript` — makes the mouse visible in the recording (Playwright doesn't render it by default) with a subtle click-ripple animation.

**Converting to MP4** — LinkedIn does not accept `.webm` uploads. Convert with any of:

- Local ffmpeg (if installed):
  `ffmpeg -i video/demo-video.webm -c:v libx264 -pix_fmt yuv420p -crf 22 video/demo-video.mp4`
- Online: [cloudconvert.com/webm-to-mp4](https://cloudconvert.com/webm-to-mp4)
- YouTube: upload as unlisted, then re-download the MP4

**Quality caveat.** This is a functional raw take, not a polished marketing edit. If you want smooth cursor tracking, click-triggered zooms, burned-in captions, or background music, treat this file as a rehearsal reference and re-record the same storyboard in Screen Studio, Descript, or ScreenFlow.

## Lessons learned writing per-article capture scripts

Real-dataset articles (`embed-guide/`, `feature-tour-germany-gdp/`) need their own Playwright capture script rather than reusing the generic ones above, since they paste a specific real dataset and configure a specific legend rather than using sample data. The pre-existing `marketing/assets/germany/*` and `marketing/assets/france/*` files (from `pnpm generate-marketing-assets`) do **not** substitute for this — they're generated from the country-batch generator's generic placeholder sample data ("Intensity Ratio" legend), not a real per-article dataset.

**Real bugs found while writing `playwright-oecd-france-fertility.ts` and `playwright-germany-gdp-feature-tour.ts` (2026-08-07), worth checking for in any new per-article script:**

1. **Clicks that "succeed" without taking effect.** The script added 2 extra legend ranges and renamed all 5, then called Normalize — but the final export showed only the original 3 unnamed default bins. No step threw; the interaction just didn't stick. Fixed by making the add/rename loop self-verifying: read the actual row count and each input's value back after acting, retry once, and throw a clear error if it still doesn't match — a loud failure beats a silently wrong screenshot.
2. **Absurdly tall/narrow exports (thousands of px) right after collapsing a panel.** Root cause: Ant Design's `Splitter.Panel` doesn't set `min-height: 0`, so collapsing a sibling panel can leave the map's flex-column ancestors without a definite height — the map SVG's `height: 100%` then falls through to its content bounding box instead of the visible frame. Fixed at the source in `client/src/styles/antd-overrides.css` (`.ant-splitter-panel { min-height: 0; }` — **needs a deploy to take effect on production**), plus a Playwright-side `ensureSaneMapExportFrame()` helper that force-constrains the export root's dimensions right before every export, so today's runs are correct regardless of deploy timing.
3. **"Switch to static data" / "Switch to dynamic data" do not snapshot the current state.** `applySwitchToStatic`/`applySwitchToDynamic` in `client/src/components/visualizer/ImportDataPanel/ImportDataPanel.tsx` unconditionally discard the dataset and replace it with fresh random sample values — they don't freeze the currently-displayed frame. Clicking either on a project with real data silently corrupts it (both scripts hit this: the France SVG and the Germany hero PNG each initially shipped with fabricated sample values instead of the real dataset, caught only by numerically cross-checking exported colors against the source CSV). **Never click these buttons on a project with real data.** For a real single-year static snapshot, paste that one year's rows with no `year` column instead — this stays on `commitParsedImport`'s static branch and uses the pasted values as-is. See `importSingleYearStaticData` in either script for the exact mechanism.
4. **The deterministic fuzzy region-matcher is dead code.** `findBestMatch`/`textSimilarity.ts` (Unicode normalization, Levenshtein distance) is never called by any import path — confirmed by a repo-wide grep, zero call sites. `convertToRegionData` → `mapDataToSvgRegions` is a pure passthrough that ignores its `svgTitles` argument. Every plain import (CSV, Excel, tab-delimited, manual, Google Sheets) requires a byte-exact id match against the map SVG's `title` attribute; anything else (a different exonym, a curly vs. straight apostrophe, a missing diacritic) silently renders as "No Data" with no warning. Don't rely on marketing copy describing automatic fuzzy matching when preparing a dataset for a script — pre-normalize ids to the map's exact labels instead (check with `grep -o 'title="[^"]*"' client/src/assets/images/maps/{country}.svg`).

## Not-covered captures (potential future work)

The **AI-parser review dialog** — with proposed name-to-region bindings visible — is not captured by the marketing-screenshots script because mocking the SSE-based `/ai/parse` endpoint reliably is non-trivial. If you want that specific screenshot:

1. **Manual capture** — trigger the AI parser flow in the app yourself and screenshot the modal when the review UI appears. Takes 30 seconds.
2. **Real LLM call from Playwright** — extend the script to click through the AI parser flow and wait for the modal. Costs ~$0.01/run in LLM tokens; needs the server's `OPENAI_API_KEY` configured.
3. **Mocked SSE response** — extend the script with a `page.route()` interceptor for `/ai/parse` that streams a canned SSE response. Free and reproducible, but takes an hour to get right.

Option 1 is by far the fastest for a one-off marketing screenshot.

## Debugging tips

- If a routine fails, the script continues with the next one and prints a summary at the end.
- Selector regressions: the script relies on `data-i18n-key` attributes wherever possible for locale-independence. If the client renames one, both this script and `playwright-asset-generator.ts` need updating.
- Auth issues: delete `marketing/assets/.auth-state.json` to force a fresh login on the next run.
- Rate limiting on login: the login route rate-limiter is aggressive. If you hit it, wait 10-15 minutes before retrying.
