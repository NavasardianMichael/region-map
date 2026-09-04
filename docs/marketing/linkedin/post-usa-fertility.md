# LinkedIn Post — US fertility rate, 2001→2023 (animated map)

## Meta

| Field        | Value                                                            |
| ------------ | ---------------------------------------------------------------- |
| Platform     | LinkedIn (personal profile)                                      |
| Day          | Tuesday, Wednesday, or Thursday                                  |
| Time slot    | 4-6 PM UTC+4 (8-10 AM US Eastern)                                |
| Post type    | Native video (MP4 converted from the GIF) — see media note below |
| Asset        | `docs/marketing/linkedin/usa-fertility-animation.gif` (21 MB)    |
| UTM campaign | `usa-fertility`                                                  |

Plain and short: what the animation shows, where the data came from, what made it. No feature
list, no pricing.

> **Asset status:** exported, 21 MB. At that size LinkedIn's image uploader will likely strip the
> animation — convert to MP4 first, see the media note below.

---

## Body (paste as-is)

```
Fertility rate by US state, animated year by year from 2001 to 2023.

All 50 states plus the District of Columbia, one frame per year, grouped into five tiers from Very Low to Very High. The color ranges are normalized across all 23 years, so a shade means the same thing in every frame.

Data: OECD Regional Demography database — fertility rate by TL2 region, in live births per woman.

Made with Regionify, a web tool I built for turning regional data into choropleth maps. Link in the first comment.

#DataVisualization #ChoroplethMap #Demographics #Fertility #DataViz
```

The mobile fold hits at ~140 characters. The first line is 68, so it survives intact — the
"see more" tap is earned by the line alone.

### Optional third paragraph

The sibling India post (`post-india-gdp.md`) deliberately runs analysis-free. This dataset has an
unusually clean finding, so if you want one line of substance, insert this after the "five tiers"
paragraph:

```
All 51 end lower than they started, and by 2023 not one is at replacement level — South Dakota is highest at 2.00 births per woman, DC lowest at 1.20. The unweighted state average falls from 2.08 to 1.63.
```

Every figure there is computed from the source CSV (see **Source data** below): all 51 regions
decline over the period, zero are at or above 2.1 in 2023, and the largest drops are Nevada
(2.54 → 1.50), Arizona (2.64 → 1.60), and Utah (2.76 → 1.80).

### Verified against the GIF

The tier count, tier labels, and year range above are read off the rendered animation itself, not
assumed: the baked-in map title is "Fertility rate by US state 2001-2023", the first frame is
labelled 2001 and the last 2023, and the legend lists five tiers — Very Low, Low, Medium, High,
Very High — plus a No Data swatch. If you re-render with a different tier count, the body and both
alt-text variants need the number changed in three places.

### Hashtag note

Five is LinkedIn's practical ceiling (see `README.md`), so this set is full — swap, don't add.
`#Fertility` is the precise term but a thin tag on LinkedIn; `#Population` or `#Economics` are far
more widely followed if reach matters more than precision. Camel case (`#DataVisualization`, not
`#datavisualization`) is what screen readers need to split the words.

---

## Alt text (add in LinkedIn's media editor before publishing)

LinkedIn caps alt text at 300 characters. This is 289:

```
Animated choropleth map of the United States, 2001 to 2023, showing the fertility rate for all 50 states and the District of Columbia. Each state is shaded in one of five tiers by live births per woman. Every state lightens over the period; by 2023 South Dakota is darkest and DC lightest.
```

Shorter variant if you want room to spare:

```
Animated map of the United States showing the fertility rate by state from 2001 to 2023, with all 50 states and DC shaded in one of five tiers by live births per woman.
```

**Caveat:** LinkedIn only offers an alt-text field on **images**, not native video. If you follow
the MP4 conversion below, that field won't appear — accessibility then depends on captions or a
description in the body. Two options: upload the GIF as an image if it fits LinkedIn's uploader
(then you get the alt-text field), or keep the MP4 and work the first sentence of the alt text into
the post body, where it reads naturally as the opening line anyway.

---

## First comment (paste within 30 seconds of publishing)

```
Try it free: https://regionify.pro/?utm_source=linkedin&utm_medium=organic&utm_campaign=usa-fertility

Source data is OECD Data Explorer (dataflow OECD.CFE.EDS:DSD_REG_DEMO@DF_FERTILITY), measure FERT_RATIO, age Total, TL2 regions. Happy to share the cleaned CSV — just ask.
```

The link points at `ROUTES.HOME` (`/`), the only path this post references. `utm_medium=organic`
and `utm_source=linkedin` match the convention in `README.md`; only `utm_campaign` changes per post.

---

## Source data

`docs/marketing/assets/data/oecd-fertility-usa.csv` — OECD Regional Database, fertility rate
(`FERT_RATIO`, `AGE=Total`, `SEX=Female`), unit `BR_L_W` (live births per woman), TL2 regions,
United States. Fetched from the OECD SDMX API (`OECD.CFE.EDS:DSD_REG_DEMO@DF_FERTILITY`), all
observations flagged `A` (normal value).

**Coverage mismatch — check before publishing.** The GIF was rendered from a 2001–2023 extract
(51 regions × 23 years = 1,173 observations); the CSV in the repo has since been trimmed to
**2003–2023** (51 × 21 = 1,071). The post copy describes the animation, so it says 2001–2023 and
23 years — correct for the asset, but the committed CSV no longer contains the 2001 and 2002 rows
that back the baseline figures in the optional paragraph. Either re-render the GIF from 2003–2023
(then change the year range and 23-year count everywhere in this file), or restore the two missing
years to the CSV.

This is the **Regional Demography** database, not Regional Economy — no currency, PPP conversion,
or price base applies to these values. Don't reuse the `post-india-gdp.md` data line here.

---

## Media note — convert the GIF before uploading

LinkedIn's image uploader is unreliable on large GIFs and can strip the animation entirely (the
India GIF is 17 MB, this one is 21 MB). Upload as **native video** instead:

```
ffmpeg -i "docs/marketing/linkedin/usa-fertility-animation.gif" \
  -movflags +faststart -pix_fmt yuv420p \
  -vf "scale=trunc(iw/2)*2:trunc(ih/2)*2" \
  docs/marketing/linkedin/usa-fertility-animation.mp4
```

Before publishing:

- [ ] Convert to MP4 with the command above — do not upload the 21 MB GIF directly
- [ ] Keep the `regionify.pro` watermark visible
- [ ] No URL anywhere in the body — link goes in the first comment only
- [ ] Check the mobile preview: the first 2 lines must survive the ~140-char "see more" fold
