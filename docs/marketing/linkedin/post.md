# LinkedIn Post — Introducing Regionify

## Meta

| Field        | Value                                            |
| ------------ | ------------------------------------------------ |
| Platform     | LinkedIn (personal profile)                      |
| Day          | Tuesday, Wednesday, or Thursday                  |
| Time slot    | 4-6 PM UTC+4 (8-10 AM US Eastern)                |
| Post type    | **Native video + text body** (video is primary)  |
| Media backup | Portrait or square hero image if video not ready |
| Char budget  | Body ≤ 3,000 chars (LinkedIn hard limit)         |
| UTM campaign | `intro-post`                                     |

---

## Hook — pick ONE

The first 2 lines are the whole game (mobile "see more" cutoff is ~140 chars). Pick the variant that best matches your audience.

Each variant below works the phrase "choropleth map" into line 1 — it's the exact term Regionify's homepage, `llms.txt`, and every country landing page are already built around, and it's specific enough that people who search for it are already the right audience (unlike generic "map," which is dominated by Google Maps / navigation results).

**Primary — problem/outcome contrast (recommended):**

```
Turning a regional CSV into a publishable choropleth map used to take me an hour.

Now it takes 60 seconds — because I got tired of it and built the tool I wished existed.
```

**Backup 1 — reader-benefit, product-forward:**

```
If you've ever pasted a spreadsheet into a choropleth map tool and watched it fail on "Île-de-France" or "Catalunya" — this one's for you.

Meet Regionify.
```

**Backup 2 — contrarian, dev-forward:**

```
D3.js is the wrong tool for 90% of the choropleth maps people actually need.

So I spent the last few months building the right one.
```

**Backup 3 — outcome first, minimal:**

```
Excel spreadsheet → publishable choropleth map. Under a minute. No code, no GIS.

Here's what I built.
```

**Backup 4 — matches the actual demo video (AI-generated data, not CSV import):**

```
I typed one sentence. AI generated a 10-year regional dataset — then animated it as a choropleth map.

No spreadsheet. Here's the whole thing, unedited.
```

The three hooks above describe the CSV-cleanup workflow — still a real Regionify feature, but it's not what plays in the first few seconds of `demo-video-with-music-Aylex - Good Days (freetouse.com).mp4`. That video opens on picking a country, then the AI Agent generating data from a prompt. If you're posting _that_ video, use Backup 4 so the hook matches what people actually see; save the other three for a future post built around the CSV/fuzzy-matching angle instead.

---

## Body (paste after the chosen hook)

> The hook above IS lines 1-2 of the post. Continue from here on line 3.

```
Regionify is a browser tool that turns region-level data (populations, sales, election results — anything with a region column) into styled, publishable choropleth maps.

No D3.js. No QGIS. No manual region-name cleanup.

What's inside:

→ 200+ ready-made country maps with real administrative divisions (provinces, régions, states, cantons — Spain, France, Germany, USA, Brazil, Japan, and pretty much everywhere else)

→ Paste your data from Excel, CSV, or Google Sheets. An AI parser auto-matches messy region names — "Île-de-France", "ile de france", "IDF" all bind to the same shape

→ Or skip the spreadsheet entirely — describe the dataset in plain English ("average temperature by region, 2015-2024") and the AI Agent generates it, region-by-region, streamed live into the table

→ Style everything — legend, palette, breakpoints, borders, labels, background

→ Export to PNG or JPEG up to 4K, plus SVG (vector, scales to any size) and PDF. GIF and MP4 for animated time-series data

→ Publish as an embeddable public page with SEO metadata (Chronographer only)

→ Localised in 7 languages: EN, DE, FR, ES, PT, RU, ZH

Pricing is one-time, not a subscription — and the free plan is genuinely free, no credit card:
• Observer (free) — 5 projects, PNG/JPEG/PDF export, all 200+ maps included, advanced styling + up to 4K
• Explorer ($19 once) — unlimited projects, SVG export, time-series data + animated GIF/MP4, AI Agent (parse & generate, up to 5/day)
• Chronographer ($39 once) — everything in Explorer, plus public embeds and a bigger AI Agent allowance (up to 10/day)

Built for analysts, journalists, policy researchers, agency PMs, and anyone who ships regional data visualization more than twice a year.

Link in the first comment. What's the messiest regional dataset you've ever had to clean up before mapping it?

#DataVisualization #DataJournalism #DataAnalytics #GIS #NoCode
```

---

## Media assets

### Primary — native video

**File:** `docs/marketing/assets/video/demo-video-with-music-Aylex - Good Days (freetouse.com).mp4` — the finished cut, already `.mp4` with music mixed in. (A second cut with a different track also exists: `demo-video-with-music-Chill Pulse - Office Jam (freetouse.com).mp4`, if you'd rather use that one.)

43 s: land on the new-project page → pick France → sample data loads → switch to AI Agent import → type a plain-English prompt ("average annual temperature for each region, 2015-2024") → AI streams structured data live (sped up 4× in this cut) → auto-switches to table view → Save, map + timeline populate → expand Legend Configuration → Ranges → Normalize ranges → hit Play and watch the map animate through all 10 years → Export → format Video (MP4) → Download, renders on-camera (also sped up 4×). Landscape 1280 × 960, with background music.

**Before uploading to LinkedIn:**

- Already `.mp4` — no conversion needed, and the AI-wait / render-wait trimming suggested below has already been handled by the 4× speed ramps baked into this cut.
- Music credit: "Good Days" by Aylex, freetouse.com — confirm the exact required attribution against the pop-up shown at download time on freetouse.com, and include it in the post or first comment if this account monetizes video.
- Still missing, worth doing before posting:
  1. Burned-in captions — LinkedIn autoplay is muted by default; without captions the AI-streaming and timeline-play moments (the actual payoffs) are silent and easy to scroll past
  2. A title card at 0-2 s: "Regionify — one sentence, an animated regional map" and an end card in the final 2-3 s: "Try free at regionify.pro"
  3. Optional: crop to 1:1 square (1080 × 1080) — LinkedIn's algorithm slightly favours it over landscape

If you'd rather record a more polished take, use this cut as a rehearsal reference for the storyboard — Screen Studio's smart-cursor tracking would give a nicer result than the injected-cursor overlay used here.

### Fallback if you skip the video — hero image

<!--
ASSET: STATIC HERO
- Dimensions: 1200 × 1500 px (portrait 4:5 — LinkedIn native ratio, biggest feed real estate)
- Format: PNG
- SIMPLEST BUILD PATH:
    1. Run `pnpm generate-marketing-screenshots` — produces `docs/marketing/assets/images/data-import-panel.png` (with messy CSV visible in the modal)
    2. Compose in Figma: crop the messy-CSV area from step 1 as the top half, and `marketing/assets/spain/spain-embed-page.png` (or france/germany-embed-page.png) as the bottom half. Portrait 4:5 crop overall.
- Content: Split composition — TOP shows messy CSV in the manual entry modal (mixed casing, diacritics, abbreviations). BOTTOM shows the resulting clean Regionify map with a styled legend and watermark bottom-right.
- Bold text overlay on top: "From this... to this. In 60 seconds."
- No busy elements at the very bottom (LinkedIn overlays the reactions bar there)
-->

### Optional — 3-slide carousel (LinkedIn document post)

If you want a third format to A/B test on future publishing rounds. Carousels get the highest dwell time on LinkedIn. Export as a single PDF with 3 pages, each 1080 × 1350:

<!--
ASSET: CAROUSEL PDF
- Assemble in Figma or Canva as a 3-page PDF, each page 1080 × 1350
- Slide 1 (cover): "Regionify — regional data → styled maps in 60 seconds" over `marketing/assets/spain/spain-embed-page.png` (or france/germany equivalent)
- Slide 2 (features): 4 icons + one-liners — Import • AI-match • Style • Export. Use `docs/marketing/assets/images/product-overview.png` as a subtle background
- Slide 3 (CTA): "Try free — link in comments" + regionify.pro URL + a small watermarked mini-map thumbnail
-->

---

## First comment (paste within 30 seconds of publishing)

```
Try it free: https://regionify.pro/?utm_source=linkedin&utm_medium=organic&utm_campaign=intro-post

Observer plan is fully free — no credit card, no trial timer. 5 projects, PNG/JPEG/PDF export, all 200+ country maps included.

If you try it and get stuck anywhere, tell me exactly where. I'm iterating on onboarding this week.
```

---

## Prepared replies to likely comments

**Q: "How is this different from Datawrapper / Flourish?"**

> Great tools — I use Datawrapper myself for time-series charts. The specific job Regionify solves is turning a _messy_ regional spreadsheet into a styled map without manual name-matching. Datawrapper needs your region names to match its list exactly; Regionify's AI parser resolves diacritics, abbreviations, and language variants automatically. Also, watermark-free exports start at a one-time $19 vs Datawrapper's $599/mo team plan.

**Q: "Does it support [country X]?"**

> The full list is on the homepage — 200+ country maps covering essentially every UN member state plus most territories. If yours is missing, DM me — usually a few hours of work to add if a clean boundary SVG exists.

**Q: "Can I self-host this for our agency?"**

> Not currently — everything runs on the hosted service. Genuinely open to a self-hosted "Team" edition if there's real agency demand. DM me your use case.

**Q: "What's the tech stack?"**

> React 19 + TypeScript + Vite + Ant Design + Tailwind v4 on the client, Zustand for state. Express 5 + Prisma + PostgreSQL + Redis on the server. Deployed on a VPS with Docker Compose + Nginx — full control over the embed SSR was worth avoiding a serverless platform.

**Q: "How does the AI parser actually work?"**

> Two stages. First a deterministic fuzzy matcher (Damerau-Levenshtein + normalisation for diacritics/casing/abbreviations) handles ~80% of real inputs. For the tail, a small structured LLM call maps unmatched names against the canonical region list for that country. Crucially, every AI-suggested binding goes through a human confirmation step before any data is bound — no silent hallucinations.

**Q: (soft criticism) "The pricing feels steep for solo users."**

> Fair point on sticker shock — but it's a one-time $19, not a monthly charge, so it tends to pay for itself after the first paid deliverable. If there's still a gap for occasional or solo use, tell me what's missing on the free tier and I'll factor it into a lighter tier.

**Q: (agency DM) "We do X regional visualisations a month for clients — is there an agency plan?"**

> Yes, happy to talk. DM me the volume and use case — agency licensing with reseller rights for embeds is on the roadmap for Q3.

---

## Compliance checklist (before hitting Publish)

- [ ] Hook fits within ~140 chars (verify in mobile preview)
- [ ] No external URL anywhere in the main post body
- [ ] Video uploaded as **native** LinkedIn media (not a YouTube link)
- [ ] Video has captions (85% of views are muted)
- [ ] Watermark visible on all media assets
- [ ] 3-5 hashtags at the bottom, none at the top
- [ ] First comment queued in clipboard, ready to paste in <30 seconds
- [ ] Blocked next 3 hours for real-time reply to every comment
- [ ] Zero mention of the word "excited"
- [ ] Question at the end of the body to prime comments
