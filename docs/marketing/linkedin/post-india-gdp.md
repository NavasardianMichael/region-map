# LinkedIn Post — India GDP per capita, 2001→2023 (animated map)

## Meta

| Field        | Value                                                                               |
| ------------ | ----------------------------------------------------------------------------------- |
| Platform     | LinkedIn (personal profile)                                                         |
| Day          | Tuesday, Wednesday, or Thursday                                                     |
| Time slot    | 4-6 PM UTC+4 (8-10 AM US Eastern)                                                   |
| Post type    | Native video (MP4 converted from the GIF) — see media note below                    |
| Asset        | `docs/marketing/assets/video/sample-data-to-mp4/india-gdp-per-capita-2001-2023.gif` |
| UTM campaign | `india-gdp`                                                                         |

Plain and short: what the animation shows, where the data came from, what made it. No analysis,
no feature list, no pricing.

---

## Body (paste as-is)

```
GDP per capita by Indian state, animated year by year from 2001 to 2023.

33 states and union territories, one frame per year, grouped into six income tiers from Low to Very High. The color ranges are normalized across all 23 years, so a shade means the same thing in every frame.

Data: OECD Regional Economy database — GDP by TL2 region, in USD, PPP-converted, constant 2020 prices.

Made with Regionify, a browser tool I built for turning regional data into maps like this one. Link in the first comment.

#DataVisualization #ChoroplethMap #GDPperCapita #India #DataViz
```

Hashtag note: five is LinkedIn's practical ceiling (see `README.md`), so this set is full — swap,
don't add. `#GDPperCapita` is the accurate term for what's shown but is a thin tag on LinkedIn;
`#GDP` or `#Economics` are far more widely followed if reach matters more than precision here.
Camel case (`#GDPperCapita`, not `#gdppercapita`) is what screen readers need to split the words.

---

## Alt text (add in LinkedIn's media editor before publishing)

LinkedIn caps alt text at 300 characters. This is 275:

```
Animated choropleth map of India, 2001 to 2023, showing GDP per capita for 33 states and union territories. Each state is shaded in one of six blue income tiers, from Low to Very High Income. Most states darken over the years; Bihar and Uttar Pradesh stay lightest throughout.
```

Shorter variant if you want room to spare:

```
Animated map of India showing GDP per capita by state from 2001 to 2023, with each of the 33 states and union territories shaded in one of six blue income tiers.
```

**Caveat:** LinkedIn only offers an alt-text field on **images**, not native video. If you follow
the MP4 conversion below, that field won't appear — accessibility then depends on captions or a
description in the body. Two options: upload the GIF as an image if it fits LinkedIn's uploader
(then you get the alt-text field), or keep the MP4 and work the first sentence of the alt text
into the post body, where it reads naturally as the opening line anyway.

---

## First comment (paste within 30 seconds of publishing)

```
Try it free: https://regionify.pro/?utm_source=linkedin&utm_medium=organic&utm_campaign=india-gdp

Source data is OECD Data Explorer (dataflow OECD.CFE.EDS:DSD_REG_ECO@DF_GDP). Happy to share the cleaned CSV — just ask.
```

---

## Media note — convert the GIF before uploading

The asset is a 17 MB GIF. LinkedIn's image uploader is unreliable at that size and can strip the
animation entirely. Upload it as **native video** instead:

```
ffmpeg -i "docs/marketing/assets/video/sample-data-to-mp4/india-gdp-per-capita-2001-2023.gif" \
  -movflags +faststart -pix_fmt yuv420p \
  -vf "scale=trunc(iw/2)*2:trunc(ih/2)*2" \
  docs/marketing/assets/video/sample-data-to-mp4/india-gdp-per-capita-2001-2023.mp4
```

Before publishing:

- [ ] Keep the `regionify.pro` watermark visible
- [ ] No URL anywhere in the body — link goes in the first comment only
- [ ] Check the mobile preview: the first 2 lines must survive the ~140-char "see more" fold
