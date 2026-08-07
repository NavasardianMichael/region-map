# Post 10 — r/dataisbeautiful [OC][GIF]: India GDP per capita, 2001→2023

## Meta

| Field        | Value                                                                    |
| ------------ | ------------------------------------------------------------------------ |
| Subreddit    | [r/dataisbeautiful](https://www.reddit.com/r/dataisbeautiful/)           |
| Day          | Week 4, Tuesday                                                          |
| Time slot    | 5-7 PM local (9-11 AM ET)                                                |
| Post type    | GIF (animated)                                                           |
| Tags         | `[OC][GIF]` (both mandatory — `[OC]` per Rule 3, `[GIF]` per convention) |
| UTM campaign | `dataisbeautiful-10`                                                     |

Rationale: Same animated-timeline format as post 07 (EU unemployment) — that one performed well and r/dataisbeautiful's top-of-all-time posts skew heavily toward animated maps — but a completely different geography (India, non-EU) and dataset (GDP per capita, not unemployment) so it reads as new content, not a repeat. Also showcases something post 07 didn't: this map uses **named income tiers** (Low → Very High Income, World-Bank-style) with a hand-picked ascending blue ramp instead of a raw continuous scale, which is a nice point of difference to mention if anyone asks "why not just a color gradient with a number legend."

**Timing note:** last r/dataisbeautiful post from this account was post 07, in Week 3. Confirm it's been >30 days before posting (check the account history) — different dataset and geography either way, so this isn't a repost under Rule 6, but the account-level OC cadence still matters.

---

## Title

Rule 7: plain, descriptive, no sensationalism. "Choropleth map" is accurate terminology for
this exact visualization (not a keyword stuffed in) — it's also one of our established SEO
phrases (see `docs/marketing/linkedin/post.md`, `medium/embed-guide/embed-guide.md`), so leading with it here
is both correct and on-brand.

**Primary:**

```
[OC] Choropleth map of GDP per capita by Indian state, 2001–2023 (OECD, TL2 regions) [GIF]
```

**Backup 1:**

```
[OC][GIF] Animated choropleth map — GDP per capita by Indian state, 2001–2023
```

**Backup 2:**

```
[OC] Indian states' GDP per capita since 2001 — animated choropleth map [GIF]
```

Primary and Backup 1 are equally safe; Backup 1 leads with the tags which some scrollers prefer.

---

## Body

_Image-first sub. GIF is the whole post; body text optional._

Optional short body:

```
Annual GDP per capita (USD, PPP-adjusted, constant prices) by Indian state/UT, from the OECD's
regional economy database — rendered as an animated choropleth map, one frame per year, 2001
through 2023, grouped into six income tiers rather than a raw color scale. Made this regional
map with a browser-based map tool; details and data source in top comment.
```

Keyword note: "choropleth map" and "regional map" both appear once each, in places where they're
literally the accurate description of what's shown — not repeated or stacked. Rule 7 forbids
sensationalism, not accurate terminology, so this doesn't read as keyword stuffing to a moderator
or a reader. Resist the urge to add more than this; a body with 4-5 SEO phrases crammed in is
exactly what gets a post removed as low-effort/promotional on this sub.

<!-- ASSET: docs/marketing/assets/video/sample-data-to-mp4/india-gdp-per-capita-2001-20024.gif
     (rename to fix the typo before posting: should be ...-2001-2023.gif, not ...-20024.gif)
     Content: animated choropleth of India's 33 states/UTs, one frame per year, 2001-2023.
     Data: OECD Regional Economy database — GDP by TL2 region (OECD.CFE.EDS:DSD_REG_ECO@DF_GDP),
     USD PPP-converted, constant prices, reference year 2020.
     Legend: 6 named tiers (Low Income / Lower-Middle Income / Middle Income / Upper-Middle Income /
     High Income / Very High Income), ascending blue ramp (#DBEAFE -> #1E3A8A), ranges normalized to
     the dataset's real min/max across all 23 years.
     Watermark bottom-right: "regionify.pro" — keep it visible (Reddit users respect a visible
     watermark more than a suspiciously "clean" screenshot).
     Story visible in the animation: Chandigarh/Goa/Delhi lead in 2001; by 2023 Sikkim has
     overtaken everyone (a genuinely surprising result worth calling out if asked), Bihar and
     Uttar Pradesh stay at the bottom the entire animation.
     If the GIF stays this large, re-export as MP4 before posting — Reddit prefers MP4 for
     animated content and it compresses far better than GIF for 23 frames. -->

---

## First comment (mandatory — r/dataisbeautiful Rule 3)

```
Data: OECD Regional Economy database — Gross Domestic Product by TL2 region
  (dataflow OECD.CFE.EDS:DSD_REG_ECO@DF_GDP), via OECD Data Explorer.
  USD per person, PPP-converted, constant prices (reference year 2020). Annual, 2001-2023.

Tool: Regionify (regionify.pro) — I built this. Made with the Explorer-tier time-series export:
imported the OECD CSV, grouped values into 6 income tiers (World Bank-style naming) with a
hand-set ascending blue color ramp, normalized ranges to the real 2001-2023 min/max, then
exported the animation as MP4/GIF, one frame per year.

Method: pulled the regional GDP series for India (33 TL2 states/UTs) from OECD Data Explorer,
mapped OECD region codes to state names, imported into Regionify, defined the 6 tiers manually
(rather than a raw gradient), normalized ranges once, exported.

Some observations:

- 2001 leaders: Chandigarh (~$7,920), Goa (~$6,840), Delhi (~$6,100).
- 2001 bottom: Bihar (~$900), Uttar Pradesh (~$1,490), Odisha (~$1,650).
- 2023 leaders: Sikkim (~$29,560), Goa (~$28,210), Delhi (~$21,550) — Sikkim overtaking everyone
  by 2023 surprised me too; it's a small state that's leaned hard into hydropower, tourism, and
  pharma manufacturing over the past two decades.
- 2023 bottom: Bihar (~$2,790), Uttar Pradesh (~$4,520), Jharkhand (~$4,850) — same three states
  roughly bottom-of-the-pack the entire 23 years, despite big absolute gains.
- Gap: the richest-to-poorest ratio barely narrowed (~8.8x in 2001 vs ~10.6x in 2023) even though
  every single state got richer in absolute terms.

Full disclosure: I'm the founder of Regionify. Happy to share the cleaned CSV — just ask.
```

Link (put in the comment above where indicated, or as your own reply if you'd rather not embed
raw markdown link syntax in a Reddit comment):

```
https://regionify.pro/?utm_source=reddit&utm_medium=organic&utm_campaign=dataisbeautiful-10
```

---

## Prepared replies

**Q: "What tool made this animation?"**

> Regionify (regionify.pro) — the Explorer tier lets you import time-series data (one row per
> region per year) and export it as an animated GIF/MP4 with a fixed or normalized color scale.
> Link in my top comment.

**Q: "Why only 33 regions — where are the other union territories?"**

> OECD's TL2 classification covers India's states and larger UTs, but Daman & Diu, Dadra & Nagar
> Haveli, and Lakshadweep aren't reported at that level in this dataset — they're small enough
> that OECD folds or omits them. They show up as "no data" gray in the animation.

**Q: "Sikkim at #1 in 2023 seems off — is that real?"**

> Yes, and I double-checked it because it surprised me too. Sikkim has a small population
> (~650k), 100% organic-certified agriculture, heavy hydropower revenue, a growing pharma
> manufacturing sector, and tourism — small denominator + several high-value sectors pushes
> per-capita GDP well above much larger, more industrial states.

**Q: "Why income tiers instead of a continuous color scale?"**

> Personal preference on this one — a continuous gradient is more common on this sub, but I
> wanted to test whether naming the bins (World Bank-style: Low/Lower-Middle/Middle/Upper-Middle/
> High/Very High Income) made the map easier to read at a glance versus inferring value from a
> gradient. Ranges are normalized to the real 2001-2023 min/max either way, so the underlying
> data isn't distorted — it's purely a presentation choice.

**Q: "Can I get the underlying CSV?"**

> Yes — DM me or comment and I'll share the cleaned CSV (OECD region codes mapped to state
> names, long format: year, state, value). The raw OECD export needs some reshaping first,
> happy to send the already-cleaned version.

**Q: "PPP-adjusted — does that account for regional cost-of-living differences within India, or just USD conversion?"**

> Just the USD/PPP conversion at the national level (India-wide PPP factor) — this dataset
> doesn't have sub-national cost-of-living adjustments. So a state like Bihar likely looks
> relatively poorer here than its real local purchasing power, since cost of living there is
> lower than in, say, Delhi. Worth flagging as a real limitation of the data, not something the
> visualization can fix.

---

## Compliance checklist (r/dataisbeautiful rules)

- [ ] `[OC]` tag in title (Rule 3)
- [ ] `[GIF]` tag in title (convention for animated content)
- [ ] Title is plain and descriptive (Rule 7)
- [ ] First comment states **data source** AND **tool used** (Rule 3)
- [ ] Fixed/normalized color scale across all frames (statistical honesty)
- [ ] Same geographic coverage in every frame (no appearing/disappearing regions mid-animation)
- [ ] Not a repost of a similar India GDP animation within 1 month (Rule 6 — check quickly before posting)
- [ ] No US politics (non-issue)
- [ ] No personal data (non-issue — regional aggregate GDP only)
- [ ] Animation length is comfortable (~25-35 seconds total; longer than that and Reddit users bail)
- [ ] MP4 preferred over GIF if the file size is large (better compression, same experience) — the
      current GIF is 87.6 MB, well above the ~20 MB where this stops being optional
- [ ] Filename typo fixed before upload (`20024` → `2023`)
- [ ] Watermark ("regionify.pro") left visible on the export
- [ ] Ready to reply for 3+ hours after posting
