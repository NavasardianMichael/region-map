# Post 05 — r/webdev: AI CSV parser + fuzzy region matching

## Meta

| Field        | Value                                                                                     |
| ------------ | ----------------------------------------------------------------------------------------- |
| Subreddit    | [r/webdev](https://www.reddit.com/r/webdev/)                                              |
| Day          | Week 2, Wednesday                                                                         |
| Time slot    | 5-7 PM local (9-11 AM ET)                                                                 |
| Post type    | Text post with inline GIF                                                                 |
| Tags         | None (but "Showoff Saturday" thread on Saturdays is safer if unsure — see fallback below) |
| UTM campaign | `webdev-05`                                                                               |

Rationale: r/webdev punishes "look at my SaaS" posts and rewards technical deep-dives. The AI-parser + fuzzy-matching pipeline is a genuinely interesting engineering problem — Damerau-Levenshtein + normalization heuristics for the deterministic path, small LLM call for the tail. Framing this as a "here's how I solved X" post gets front-page; framing it as a launch pitch gets removed.

**Fallback:** if your account has low karma or the r/webdev mods have been strict lately, post this in the weekly **"Showoff Saturday"** thread instead of as a standalone post. Same body, same demo, just as a top-level comment in the pinned thread.

---

## Title

**Primary:**

```
How I built an AI-assisted CSV importer that auto-matches messy region names to map polygons (fuzzy matching + LLM fallback)
```

**Backup 1:**

```
Solving the "Cataluña vs Catalonia vs CAT" problem in a choropleth map tool — two-stage matcher writeup
```

**Backup 2:**

```
Show r/webdev: two-stage fuzzy + LLM matcher that resolves user-typed region names to canonical map IDs
```

Primary reads as a genuine engineering post, which is exactly what r/webdev rewards. Avoid "Show r/webdev" wording — it's more of a Hacker News convention and reads as launch pitch here.

---

## Body

The single biggest UX problem in choropleth map tools is this: **users paste data with region names that don't match your map's canonical labels.** "Île-de-France", "ile de france", "IDF", "Ile de France (75)" all need to resolve to the same polygon.

I've been building [Regionify](https://regionify.pro) (a browser-based choropleth map maker) for the last 8 months, and this problem eats disproportionate UX real estate. Here's the two-stage approach that landed in production.

<!-- ASSET: 1080x720 GIF, ~8-12 seconds. Screen recording of the CSV import flow:
     1. User pastes a messy CSV into the import panel (region names with typos, extra spaces, abbreviations).
     2. Match preview appears — green rows are auto-matched, yellow rows are "AI-suggested with confirm", red rows are unmatched.
     3. User clicks "Confirm all suggestions" and the map fills in with color.
     Speed: real-time, not sped up. Watermark visible bottom-right. -->

## The setup

- Client: React 19 + TypeScript, Vite, Zustand for state
- Server: Express 5, Prisma, PostgreSQL, Redis
- Maps: 200+ hand-curated SVGs, each region tagged with a stable `data-region-id`

Each country has a canonical list of region names (in the country's primary language) plus optional alternate names (English, historical, common abbreviations). Example for Spain:

```json
{
  "id": "es-cat",
  "name": "Cataluña",
  "altNames": ["Catalonia", "Catalunya", "CAT"]
}
```

## Stage 1 — deterministic fuzzy matcher

Runs entirely client-side. No network round-trip, no cost per call.

1. **Normalize both sides.** Lowercase, NFD-normalize + strip diacritics, collapse whitespace, strip common suffixes like "province", "region", "état de", "état d'".
2. **Exact match on normalized form** — hits 60-70% of clean data instantly.
3. **Damerau-Levenshtein distance** against `name + altNames`. Threshold is `max(2, len * 0.15)` — tuned empirically. Ties broken by shorter edit distance, then by longer common prefix.
4. **Confidence tiers.** 0 edits = green (auto), 1-2 edits = yellow (auto-fill, user can override), 3+ edits or ambiguous = red (unmatched, needs help).

This handles ~80-85% of real-world CSVs. The tail is where it gets interesting.

## Stage 2 — LLM fallback for the unmatched tail

For rows the deterministic matcher gave up on, batch them into a single LLM call:

```
System: You match user-provided region names to canonical region IDs.
Context: [country's canonical region list, JSON]
Task: For each of these unmatched user inputs, return the best matching
region ID, or null if none. Consider historical names, abbreviations,
alternate spellings across languages.

Inputs: ["IDF", "Alsace-Lorraine", "Provence"]
```

Response is a JSON array. **Never bind to the map without user confirmation** — the UI shows the LLM suggestion in yellow and requires a click to accept. This is important both for data quality and for LLM-hallucination safety.

## What surprised me

- The 15% headroom for LLM fallback is where all the perceived magic is. Users don't notice the deterministic 85%; they notice the "wait, it figured out that IDF meant Île-de-France?" moments.
- **Historical/political name changes** (e.g., "Alsace-Lorraine" → user probably means Grand Est post-2016 reform) are the hardest cases. I default to null and let the user pick.
- Diacritic normalization alone (Ñ→N, É→E, Ü→U, etc.) fixes about 12% of unmatched cases with zero LLM cost.
- **Cost per import**: ~$0.0002 for the LLM call using GPT-4o-mini on typical batches of 5-15 unmatched names. Negligible.

## What's next

- Multi-language altName sets sourced from Wikidata (Q-IDs → all label variants). Currently doing this manually per country.
- Precomputed embedding index for pure semantic match without an LLM roundtrip.

Happy to answer questions on any part — Prisma schema, the front-end binding UI, the LLM prompt tuning, whatever.

---

## First comment

```
For anyone who wants to try it: https://regionify.pro/?utm_source=reddit&utm_medium=organic&utm_campaign=webdev-05

Full disclosure — I'm the solo founder. Observer tier is free, no credit card. The AI parser is currently a paid-tier feature (Explorer, $49 one-time — up to 5 AI requests/day; Chronographer raises that to 10/day) but the deterministic fuzzy matcher runs for everyone on the free tier and covers ~80% of real inputs.

I open-sourced the deterministic matching layer as a standalone TS package a few weeks ago — if you're building anything similar and want to skip re-inventing the wheel, DM me and I'll share the repo.
```

---

## Prepared replies

**Q: "Why not just use a vector DB / embeddings for everything?"**

> Considered it — my worry was cost at scale (embedding + vector search on every CSV import) plus latency (the deterministic matcher is instant, embeddings need a round-trip). For a country with 100 regions, Damerau-Levenshtein is O(regions × avg_string_length²) which is <1ms — hard to beat. Embeddings are on the roadmap for the pathological cases where fuzzy fails but semantic proximity would work (e.g., "Silicon Valley" → "Santa Clara County").

**Q: "Damerau-Levenshtein specifically vs plain Levenshtein?"**

> Damerau handles adjacent transpositions in one edit (e.g., "Cataluina" → "Cataluña" is one op instead of two). It's about 5% better hit rate on real user input because transposition typos are super common.

**Q: "How do you handle ambiguous inputs like 'Georgia' (US state vs country)?"**

> Country is pre-selected before the CSV import, so the matcher only searches within that country's region set. If the user selects USA, "Georgia" → GA. If they select country of Georgia, there's only one match (it's Sakartvelo). Cross-country ambiguity never comes up in practice.

**Q: "Do you ever send user data to an LLM?"**

> Only the region name column values (not the actual numeric data being mapped), and only for rows the deterministic matcher gave up on. All shown to the user as a suggestion before anything gets bound. Server-side; the LLM API key isn't on the client.

**Q: "What LLM provider?"**

> Currently OpenAI (GPT-4o-mini for the matcher). Provider is behind an abstraction so swapping to Claude Haiku, Groq, or a local model is a config change.

**Q: (criticism) "This should be a comment on r/programming, not a post."**

> r/programming skews language/OS/tooling; r/webdev fits the browser-based build story better. If you'd rather see the discussion there too, I'm happy to cross-post — but not simultaneously (Reddit's cross-post spam filter is aggressive).

---

## Compliance checklist

- [ ] Post is a technical deep-dive, not a product pitch — actual code, actual numbers, actual tradeoffs
- [ ] Explicit disclosure ("I'm the solo founder") in the first comment
- [ ] Screenshot/GIF shows the feature working (r/webdev demands proof)
- [ ] Named the tool once in the body, not repeatedly
- [ ] UTM link in first comment only
- [ ] Ready to reply to technical questions for 3+ hours
- [ ] Fallback plan if standalone post gets removed: repost in next Saturday's "Showoff Saturday" pinned thread
