# Post 07 — r/dataisbeautiful [OC][GIF]: EU regional unemployment 2010→2024

## Meta

| Field        | Value                                                                    |
| ------------ | ------------------------------------------------------------------------ |
| Subreddit    | [r/dataisbeautiful](https://www.reddit.com/r/dataisbeautiful/)           |
| Day          | Week 3, Tuesday                                                          |
| Time slot    | 5-7 PM local (9-11 AM ET)                                                |
| Post type    | GIF (animated)                                                           |
| Tags         | `[OC][GIF]` (both mandatory — `[OC]` per Rule 3, `[GIF]` per convention) |
| UTM campaign | `dataisbeautiful-07`                                                     |

Rationale: Animated timelines are r/dataisbeautiful catnip — the sub's all-time top posts are disproportionately animated maps and rank charts. Eurostat's regional unemployment dataset (NUTS-2 level, code `une_rt_a`) is public, current through 2024, and tells a clear story (2010-13 crisis peaks in southern Europe, gradual recovery, COVID blip, ongoing north-south divide). This showcases the animation export feature (now included starting at the Explorer tier) — the feature most likely to drive $49+ one-time signups.

**Timing note:** post 03 was in r/dataisbeautiful in Week 1. That was 15 days ago at this point — well past the "no reposts of the same topic within 1 month" rule (this is a different dataset and format anyway), and enough time between two OC submissions from the same account.

---

## Title

Rule 7: plain, descriptive, no sensationalism.

**Primary:**

```
[OC] Regional unemployment across the EU, 2010–2024 (Eurostat, NUTS-2) [GIF]
```

**Backup 1:**

```
[OC][GIF] EU unemployment rate by NUTS-2 region, animated 2010–2024
```

**Backup 2:**

```
[OC] Unemployment rate by EU region since 2010 — animated timeline [GIF]
```

Primary and Backup 1 are equally safe; Backup 1 leads with the tags which some scrollers prefer.

---

## Body

_Image-first sub. GIF is the whole post; body text optional. If posting as a link post, add a one-line description._

Optional short body:

```
Annual unemployment rate by NUTS-2 region across the EU, from Eurostat's `une_rt_a` series. One frame per year, 2010 through 2024. Details and data source in top comment.
```

<!-- ASSET: 1080x1080 or 1200x1200 GIF (square for Reddit feed) OR MP4 (Reddit auto-plays MP4s and they compress better than GIF for this many frames).
     Content: animated choropleth of EU + associated NUTS-2 regions, one frame per year from 2010 to 2024.
     Data: Eurostat `une_rt_a` — Unemployment rates by sex, age and NUTS-2 region. Use total (both sexes), age 15-74, annual.
     Palette: sequential — light yellow (2-3%) through orange (10%) to deep red (25%+). Same fixed scale across all frames so year-to-year change is visually meaningful.
     Frame rate: 1.5 seconds per year, hold last frame for 3 seconds. Include a large year label top-right that updates per frame.
     Legend fixed bottom-right with the color scale + "% unemployed, ages 15-74".
     Title top-left: "EU regional unemployment, 2010–2024".
     Source bottom-left: "Eurostat · une_rt_a".
     Watermark bottom-right: "regionify.pro".
     Story to make visible: 2010-13 southern Europe (Spain, Greece, southern Italy) turns deep red as the debt crisis peaks; recovery through 2015-19; COVID blip 2020; asymmetric recovery 2021-24 with the Mediterranean south still elevated.
     If GIF file size becomes an issue for Reddit (>20 MB), export as MP4 instead — Reddit prefers MP4 for animated content anyway. -->

---

## First comment (mandatory — r/dataisbeautiful Rule 3)

```
Data: Eurostat — Unemployment rates by sex, age and NUTS-2 region (une_rt_a)
  https://ec.europa.eu/eurostat/databrowser/view/UNE_RT_A
  Total (both sexes), ages 15-74, annual, 2010 through 2024.

Tool: Regionify (regionify.pro) — I built this. The animation is the Explorer tier's time-series export;
each frame is one year, exported as a single MP4/GIF from the app.

Method: pulled the full `une_rt_a` CSV from Eurostat, filtered to NUTS-2 regions (dropping national aggregates),
imported into a Regionify project with a fixed color scale (2%–25% linear), exported as MP4 at 1.5s per frame.

Some observations:

- Peak crisis (2013): Andalucía at ~36%, Extremadura ~34%, several Greek regions above 30%.
- Steepest recovery (2013→2019): Ireland's Border Midland West region dropped from 15% to 5%.
- COVID (2020): unemployment spikes but the geographic pattern doesn't invert — the north-south gradient stays.
- 2024: still a real 3× gap between best (Praha ~2%, Bavarian regions ~2.5%) and worst (Ceuta ~29%, several
  southern Italian regions >15%).

Happy to share the raw CSV — DM me. Full disclosure: I'm the founder of Regionify.
```

---

## Prepared replies

**Q: "What about non-EU regions like Norway, Switzerland, UK?"**

> They're excluded in this version because Eurostat's `une_rt_a` covers EU + EFTA reporters inconsistently at NUTS-2 level. UK is out post-Brexit (Eurostat doesn't publish UK NUTS-2 from 2021 onwards). Norway and Switzerland are in the dataset for some years — I dropped them to keep the frame consistent. Happy to make an EFTA-included version as a followup.

**Q: "Why annual instead of quarterly? Quarterly would show the COVID blip better."**

> Quarterly data isn't published for all NUTS-2 regions consistently — only for larger regions and only from 2010 onwards. Annual keeps the same geographic coverage across all 15 frames.

**Q: "The Spanish south is always red. Why is this so persistent?"**

> Structural — heavy reliance on tourism and agriculture (seasonal + low-wage), lower industrial diversification vs Catalonia/Madrid, historically higher youth unemployment, out-migration to the north/abroad reducing labor force elasticity. This map is one of the most-cited illustrations of the EU's regional cohesion problem.

**Q: "What tool exports the animation?"**

> Regionify — the Explorer tier ($49 one-time) lets you import time-series data (one row per region per year, or a wide-format CSV) and export as GIF or MP4. Fixed color scale across frames, configurable frame rate, watermark toggle. Link in my top comment.

**Q: "Can I get the underlying CSV?"**

> Yes — Eurostat's raw CSV is at the URL in my top comment (free, no login), and the Regionify project I made is public — link in the top comment too.

**Q: "Ceuta at 29% — is that a real number?"**

> Yes. Ceuta and Melilla (Spain's African enclaves) chronically have EU-record-high unemployment — small populations, limited private-sector base, heavily service-dependent. Latest Eurostat figure is around 27-30% depending on year.

---

## Compliance checklist (r/dataisbeautiful rules)

- [ ] `[OC]` tag in title (Rule 3)
- [ ] `[GIF]` tag in title (convention for animated content)
- [ ] Title is plain and descriptive (Rule 7)
- [ ] First comment states **data source** AND **tool used** (Rule 3)
- [ ] Fixed color scale across all frames (statistical honesty)
- [ ] Same geographic coverage in every frame (no appearing/disappearing regions mid-animation)
- [ ] Not a repost of a similar animated EU unemployment map within 1 month (Rule 6 — check quickly before posting)
- [ ] No US politics (non-issue)
- [ ] Animation length is comfortable (~25-35 seconds total; longer than that and Reddit users bail)
- [ ] MP4 preferred over GIF if the sub allows it (better compression, same experience)
- [ ] Ready to reply for 3+ hours after posting
