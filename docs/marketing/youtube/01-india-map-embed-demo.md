# YouTube Upload — CSV to Animated Map to Live Embed (India GDP Demo)

## Meta

| Field            | Value                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Source file      | `docs/marketing/assets/video/sample-data-to-mp4/demo-video-india-with-music-Cocktail Lounge - Dyalla.mp4` (verified playable — see below)                                                                                                                                                                                                                                                                                                |
| Format           | H.264 (video) + AAC (audio) / MP4                                                                                                                                                                                                                                                                                                                                                                                                        |
| Resolution       | 1280 × 960 (4:3 landscape)                                                                                                                                                                                                                                                                                                                                                                                                               |
| Duration         | ~43.8 s                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Frame rate       | 25 fps                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| File size        | 3.29 MB (3,445,303 bytes)                                                                                                                                                                                                                                                                                                                                                                                                                |
| Audio            | Music only, no voiceover — "Cocktail Lounge" by Dyalla (confirm attribution requirement before publishing, see note below)                                                                                                                                                                                                                                                                                                               |
| Content          | Full screen-recorded tutorial: pick India → clear the pre-filled sample data → paste tab-delimited GDP-per-capita data → expand Legend Configuration → Ranges → add 3 bins (3→6) → name + recolor each as a World-Bank-style income tier → normalize ranges → play the 2001–2023 animation → Save the project → open **Embed** → enable public embed → Save → scroll to the iframe code → copy it (recording ends on the "Copied" toast) |
| Recommended slot | Regular YouTube upload — 4:3 landscape doesn't qualify for the Shorts shelf regardless of the sub-3-minute runtime                                                                                                                                                                                                                                                                                                                       |
| Category         | Howto & Style (alt: Education)                                                                                                                                                                                                                                                                                                                                                                                                           |
| Made for kids    | No                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| UTM campaign     | `tutorial-india-embed-01`                                                                                                                                                                                                                                                                                                                                                                                                                |
| Data source      | OECD Regional Economy database — GDP by TL2 region (`OECD.CFE.EDS:DSD_REG_ECO@DF_GDP`), USD PPP-converted, constant prices, 2001–2023                                                                                                                                                                                                                                                                                                    |
| Related assets   | Same dataset already used in `docs/marketing/reddit/week-04/10-dataisbeautiful-india-gdp.md` and `11-mapporn-india-gdp.md`. Sibling silent `.webm` (no music) exists if a different track is preferred. The separate export-only clip (`demo-video-india-map-export.mp4`) is a different, shorter, silent, portrait file with no embed content — see the note in README.md, not relevant to this upload.                                 |

**Verified by pulling sample frames (`ffmpeg -ss <t> -frames:v 1`)** — the Embed modal frame matches the script exactly: "Public map embed" title, Enable toggle, SEO page title/meta description fields, Trusted origins, Layout, Public Page URL, and the iframe code block, with the cursor-highlight ring on Save. Confirms the file is intact and the storyboard actually plays out as described.

---

## ⚠️ Before publishing — two things to confirm

1. **Real account name is visible.** The top-right nav shows "Michael Navasardyan" (the real logged-in account) for the entire recording — this is a genuine screen capture, not a synthetic export, so there's no UI chrome to strip. This already matches the founder-disclosure you do on the Reddit/LinkedIn posts, so it's likely fine as-is — flagging it so it's a decision, not an accident. If you'd rather not show it, options are: re-record under a display name that doesn't show your full legal name, or crop the top nav bar out in a re-edit.
2. **Music attribution.** "Cocktail Lounge" by Dyalla is muxed into this file. Same caution as the LinkedIn post's Aylex track: confirm the exact attribution requirement (if any) from wherever this track was sourced before publishing — YouTube's Content ID will flag it automatically if the license requires credit and it's missing, which can get a video muted or blocked after the fact.

---

## Title — pick ONE

**Primary — outcome-forward (recommended):**

```
Turn a Spreadsheet Into a Live, Embeddable Map (Full Demo)
```

**Backup 1 — literal workflow, matches the LinkedIn post's framing style:**

```
From CSV to Animated Map to Website Embed — Regionify Walkthrough
```

**Backup 2 — how-to phrasing (good for search intent like "how to embed a map on my website"):**

```
How to Turn Regional Data Into an Embeddable Interactive Map
```

Primary leads with the payoff (embeddable live map) rather than the tool name — better for viewers who don't know Regionify yet and are searching around the problem, not the brand.

---

## Description

```
Paste in a spreadsheet of regional data, style it as an animated map, and publish it as a live, embeddable map — no code, no GIS software. This is the whole workflow, unedited except for playback speed.

What happens in this video:
• Pick a country (India) from 200+ built-in region sets
• Paste GDP-per-capita data (2001–2023) into the manual data box, replacing the sample data
• Expand the legend's Ranges panel, add 3 more bins, name and recolor all 6 after World Bank-style income tiers (Low → Very High Income), then normalize
• Play the animation through all 23 years
• Save the project, then open Embed → enable public embed → copy the ready-to-paste iframe code

Data shown: OECD Regional Economy database, GDP by TL2 region (OECD.CFE.EDS:DSD_REG_ECO@DF_GDP), USD PPP-converted, constant prices, 2001–2023.

Made with Regionify (regionify.pro) — I'm the founder. Public embeds and animated GIF/MP4 export are Chronographer-tier features; the free Observer tier covers PNG/JPEG/PDF export and all 200+ region sets.

Try it free: https://regionify.pro/?utm_source=youtube&utm_medium=organic&utm_campaign=tutorial-india-embed-01

Music: "Cocktail Lounge" by Dyalla

#Regionify #DataVisualization #ChoroplethMap
```

Notes:

- First 3 hashtags (`#Regionify #DataVisualization #ChoroplethMap`) auto-display above the title.
- Unlike the LinkedIn post's hashtag rule ("never use a branded hashtag on your own posts"), YouTube descriptions don't carry the same spam signal for `#Regionify` — it's fine here since this is your own channel, not a third-party community.

---

## Tags (legacy field)

```
regionify, csv to map, embed map on website, iframe map, live map embed, choropleth map tutorial, data visualization tutorial, India GDP per capita, animated map, no code map maker, how to make a map from spreadsheet, regional data visualization, OECD data, dataviz tool
```

---

## Thumbnail

This is a regular upload, so a custom 1280×720 thumbnail matters for CTR (unlike a Short, which can rely on an auto-picked cover frame).

- **Strongest single frame:** the Embed modal moment (~t=40s) — it's the payoff and the least "generic SaaS demo" looking shot, showing the actual iframe code and public URL.
- **If compositing a custom thumbnail instead:** split-screen the messy-legend-styling moment (left) against the finished animated map (right), with bold text overlay ("Spreadsheet → Live Map"). Same asset-assembly approach as the LinkedIn hero image brief in `docs/marketing/linkedin/post.md`.
- Crop carefully — source is 4:3 (1280×960); a 1280×720 thumbnail needs a vertical crop, not a squeeze/stretch.

---

## Pinned comment (post immediately after publishing)

```
Data: OECD Regional Economy database — GDP by TL2 region (OECD.CFE.EDS:DSD_REG_ECO@DF_GDP),
USD PPP-converted, constant prices, 2001–2023.

Made with Regionify (regionify.pro) — I'm the founder. The embed feature (shown at the end)
publishes a read-only, live version of the map as an iframe — same underlying data and legend,
publicly viewable and embeddable on any site.

Try it: https://regionify.pro/?utm_source=youtube&utm_medium=organic&utm_campaign=tutorial-india-embed-01
```

---

## Prepared replies

**Q: "Can I actually embed this on my own site, or is that just for the demo?"**

> Real feature — Chronographer tier. Once enabled, you get a public URL and an iframe snippet; the embedded map stays live if you edit the underlying project later. "Allow embedding from any origin" is a toggle — you can restrict it to specific domains instead.

**Q: "What tool is this?"**

> Regionify (regionify.pro) — link in the pinned comment. Free tier covers PNG/JPEG/PDF export and all 200+ built-in region sets; the paid tiers add SVG, time-series/animated export, and public embeds.

**Q: "Why income tiers instead of a smooth color gradient?"**

> Personal preference — wanted to test whether naming the bins (Low/Lower-Middle/Middle/Upper-Middle/High/Very High Income, World Bank-style) reads more clearly at a glance than a raw gradient. Ranges are still normalized to the real 2001–2023 min/max either way.

**Q: "Is the embedded map's data live, or a static snapshot?"**

> It reflects whatever the project currently has — if you edit the data or styling later and save, the public embed updates too. It's not a one-time static export like the PNG/SVG/MP4 options.

**Q: "Does PPP account for regional cost-of-living differences within India?"**

> No — this is PPP at the national conversion rate only, so it doesn't adjust for the fact that, say, Bihar's cost of living is meaningfully lower than Delhi's. Worth flagging as a real limitation of the underlying data.

---

## Compliance checklist (before hitting Publish)

- [ ] Confirmed the file plays correctly end-to-end (already verified via `ffprobe` + sample frames in this doc, but re-check if the file changes)
- [ ] Decided how to handle the visible real account name in the nav bar (see blocker note above)
- [ ] Confirmed music attribution requirement for "Cocktail Lounge" by Dyalla, added credit to description if required
- [ ] Category set (Howto & Style or Education)
- [ ] "Not made for kids" set
- [ ] Thumbnail picked/composited (1280×720, cropped not stretched from the 4:3 source)
- [ ] UTM link resolves to regionify.pro with the right campaign param
- [ ] Pinned comment ready to paste immediately after publishing
- [ ] Added to a playlist if the channel has (or should start) one, e.g. "Regionify Demos"
- [ ] Double-checked the "Allow embedding from any origin" + public URL shown on screen isn't pointing at a project you'd rather keep private (it's a demo project, but confirm before this goes out publicly)
