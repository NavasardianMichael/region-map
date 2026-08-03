# Post 01 — r/SideProject launch (generic overview)

## Meta

| Field        | Value                                                  |
| ------------ | ------------------------------------------------------ |
| Subreddit    | [r/SideProject](https://www.reddit.com/r/SideProject/) |
| Day          | Week 1, Tuesday                                        |
| Time slot    | 5-7 PM local (9-11 AM ET)                              |
| Post type    | Text post with inline image                            |
| Tags         | None required by the sub                               |
| UTM campaign | `sideproject-01`                                       |

---

## Title

**Primary:**

```
I built Regionify — a tool that turns messy Excel/CSV data into publishable regional maps (by country, state, province, etc.) in under a minute
```

**Backup 1:**

```
I got tired of D3.js for one-off regional maps, so I built a no-code map maker for administrative divisions (regions, states, provinces) with an AI CSV parser — Regionify
```

**Backup 2:**

```
Regionify — color-coded maps for 200+ countries by region/state/province, AI-powered data import, animated timelines. My side project after 3 months.
```

Pick the primary unless the sub feed is already saturated with similar phrasing that day.

---

## Body (paste as-is)

Hey r/SideProject,

For the last 3 months I've been building [**Regionify**](https://regionify.pro) — a browser-based tool for turning region-level data (populations, sales, election results, whatever) into publishable choropleth maps without touching D3, QGIS, or a spreadsheet macro.

<!-- ASSET: hero image, 1600x900 PNG, screenshot or curated composite of the app showing the map editor with a real map loaded (Europe or Spain works well), sidebar visible with data + style controls, "Made with Regionify" watermark bottom-right. -->

**What it does:**

- Pick from **200+ country maps** with real administrative divisions (provinces, régions, states, cantons — Spain, France, Germany, USA, Brazil, Japan, etc.).
- **Paste or upload your data** (Excel, CSV, or just paste from a Google Sheet). The AI parser auto-matches messy region names to the map polygons — "Île-de-France", "ile de france", "IDF" all resolve to the same shape.
- **Style it** — legend, palette, breakpoints, borders, labels, background. Ant Design under the hood so controls feel native.
- **Export** — PNG or JPEG at up to 4K, plus SVG (vector, scales to any size) and PDF. GIF/MP4 for animated timelines.
- **Embed** — public iframe + SSR-rendered public page with SEO metadata (Chronographer only).
- **7 languages** — EN, DE, FR, ES, PT, RU, ZH.

**Pricing (one-time, not a subscription):**

- **Observer** — free, 5 projects, PNG/JPEG/PDF export, advanced styling, up to 4K
- **Explorer** — $49 once, unlimited projects, SVG export, time-series data + animated GIF/MP4, AI parser (5/day)
- **Chronographer** — $149 once, everything in Explorer plus public iframe embeds and a higher AI quota (10/day)

**What I'm looking for from r/SideProject:**

1. Rip it apart — landing page copy, onboarding, pricing, anything.
2. If you try the free tier and get stuck anywhere, tell me exactly where.
3. What data would you map first? I'm collecting ideas for the template gallery.

Happy to answer any questions about the stack, the AI parser implementation, or how I'm handling the SVG map library.

---

## First comment (post immediately after publishing)

```
For anyone who wants to try it without signing up, here's the landing page:
https://regionify.pro/?utm_source=reddit&utm_medium=organic&utm_campaign=sideproject-01

The Observer tier is fully free — no credit card, 5 projects, all core features. If you want to see what the animated timeline export looks like without paying, the demo project on the homepage runs one live.

Full disclosure: I'm the solo founder. This is my first SaaS launch after 6 years of frontend consulting.
```

---

## Prepared replies

**Q: "Why not just use Datawrapper / Flourish / Mapbox Studio?"**

> Fair question — I use Datawrapper too. Regionify is aimed at a slightly different job: you have a spreadsheet with region names that don't quite match anything, and you want a styled map in one minute. The AI parser + fuzzy matching handles the "why is 'Cataluña' not matching 'Catalonia'?" problem that eats 20 minutes in most tools. Also, no watermarks removed at $49 vs $599/mo for Datawrapper's team plan.

**Q: "Does it support [country X]?"**

> The full list is on the homepage — 200+ countries covering essentially every UN member state plus most territories. If yours isn't there, DM me the country and I'll prioritize adding it. Adding a new map is a few hours of work if a clean SVG exists.

**Q: "How does the AI parser work?"**

> Two stages. First, a deterministic fuzzy matcher (Damerau-Levenshtein + a few normalization rules for diacritics/casing/common abbreviations) — that handles ~80% of real-world cases. For the rest, a small LLM call with the list of unmatched user names and the canonical region names for the selected country as context. It returns a JSON mapping which then goes through a human-confirmable UI before any data is bound.

**Q: "How much did the maps cost to build?"**

> All maps are hand-curated SVGs sourced from public geographic data (Natural Earth, OpenStreetMap boundaries) then cleaned in Inkscape. Each region has a stable `data-region-id` so the matching engine can bind to it independent of the display name.

**Q: "Can I self-host?"**

> Not currently — everything runs on the hosted service. If enough people want it I'll consider a self-hosted "team" edition at some point.

**Q: (criticism) "Your landing page is confusing."**

> That's exactly the feedback I need — mind saying which part specifically? Hero, pricing, features section? I'll fix this week.

---

## Compliance checklist

- [ ] Post is a genuine build story with real tech stack and honest pricing (r/SideProject values authenticity)
- [ ] Explicit disclosure ("I built this") in the body
- [ ] Real screenshot embedded (not a Figma mockup)
- [ ] Asked for actionable feedback, not "what do you think?"
- [ ] UTM link only in the first comment, never in the title
- [ ] Ready to reply to comments for the next 3 hours minimum
