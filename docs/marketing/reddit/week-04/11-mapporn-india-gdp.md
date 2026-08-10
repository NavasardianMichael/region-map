# Post 11 — r/MapPorn [OC][GIF]: India GDP per capita, 2001→2023

## Meta

| Field        | Value                                          |
| ------------ | ---------------------------------------------- |
| Subreddit    | [r/MapPorn](https://www.reddit.com/r/MapPorn/) |
| Day          | Week 4, Wednesday                              |
| Time slot    | 5-7 PM local (9-11 AM ET)                      |
| Post type    | GIF (animated)                                 |
| Tags         | `[OC][GIF]` + true resolution in brackets      |
| UTM campaign | `mapporn-11`                                   |

Rationale: same asset as post 10 (r/dataisbeautiful), different audience angle — MapPorn rewards **beautiful cartography**, not methodology. Per the subreddit cheatsheet in this repo's `README.md`, animated maps are allowed here with the `[GIF]` tag (unlike the still-only assumption baked into post 04's checklist, which was specific to that post, not a subreddit-wide rule). India's 23-state color progression from pale to deep blue is visually strong enough to stand on its own without the data-nerd framing post 10 leans on.

**Important difference from post 04:** post 04 rendered at a fixed 1920×1080 (landscape) because France's outline fits that frame. India's outline is much taller than wide, so the honest resolution bracket will be portrait (something like `[1200x1900]`, adjust to whatever the actual final export dimensions are) — **do not** force a fake 1920x1080 label; MapPorn readers will call out a wrong resolution in brackets immediately.

---

## Title

r/MapPorn convention: location + resolution in brackets, `[OC]` for original work, `[GIF]` for animated. "Choropleth map" stays out of this one — MapPorn's own culture favors plain geographic description over cartography jargon in the title (save "choropleth" for the r/dataisbeautiful post, where that audience expects it).

**Primary:**

```
GDP per capita by Indian state, 2001–2023 [OC][GIF][1200x1900]
```

**Backup 1:**

```
India — GDP per capita by state, animated 2001–2023 [OC][GIF][1200x1900]
```

**Backup 2:**

```
The regions of India, mapped by GDP per capita over two decades [OC][GIF][1200x1900]
```

Primary is safest. Backup 2 is more evocative but edges toward the "no clickbait" line some MapPorn mods enforce — same tradeoff as post 04's Backup 2.

**Before posting:** replace `1200x1900` with the actual pixel dimensions of the final exported file.

---

## Body

_r/MapPorn is image/GIF-only — post the GIF directly, no body text needed._

If the sub's post composer requires or allows a short caption, keep it to one line and skip
brand language entirely here — this crowd reacts to the map, not the pitch:

```
Regional map of India, GDP per capita by state, 2001 through 2023.
```

<!-- ASSET: same India choropleth GIF as post 10
     (docs/marketing/assets/video/sample-data-to-mp4/india-gdp-per-capita-2001-2023.gif —
     regenerated at export quality 25 via marketing/scripts/playwright-india-gdp-gif-export.ts;
     filename typo fixed, and file size cut from the original 87.6 MB hand-export to comfortably
     under Reddit's ~20 MB ceiling — see post 10's asset note for the full rationale).
     Aesthetic bar for this sub is higher than r/dataisbeautiful: consider a version with
     no UI chrome, no legend title bar clutter, and a clean off-white or transparent
     background if Regionify's export supports it, so the map itself is the whole frame.
     Watermark bottom-right: "regionify.pro" — keep it small and unobtrusive per this sub's
     "gallery-quality" expectation, same as post 04's watermark note. -->

---

## First comment

```
Data: OECD Regional Economy database — GDP by TL2 region (OECD.CFE.EDS:DSD_REG_ECO@DF_GDP),
USD PPP-converted, constant prices, 2001-2023.

Highlights:

- Sikkim goes from a small, unremarkable dot in 2001 to the single richest state on the map
  by 2023 (~$29,500 per capita) — hydropower, tourism, and pharma manufacturing, on a small
  population base.
- Chandigarh, Goa, and Delhi lead early; by the end Goa and Delhi are still near the top but
  Sikkim overtakes all of them.
- Bihar and Uttar Pradesh stay visibly the darkest-low color the entire animation, despite
  real absolute growth every year.

Built with Regionify, a browser-based regional map tool (I'm the founder) —
https://regionify.pro/?utm_source=reddit&utm_medium=organic&utm_campaign=mapporn-11
```

---

## Prepared replies

**Q: "Why is the map so tall / why not crop it differently?"**

> That's India's actual proportions — north-to-south is a lot longer than east-to-west at this
> scale. Didn't want to distort the geography to force a landscape frame.

**Q: "GDP per capita ≠ standard of living, PPP doesn't capture regional cost-of-living."**

> Fair callout — this is PPP at the national conversion rate, so it doesn't adjust for the fact
> that, say, Bihar's cost of living is meaningfully lower than Delhi's. A state like Bihar
> likely looks poorer here than its real local purchasing power. Worth keeping in mind reading
> this one.

**Q: "What tool is this?"**

> Regionify — a browser-based choropleth/regional map maker I built. Link in my top comment.

**Q: "Where are Daman & Diu / Dadra & Nagar Haveli / Lakshadweep?"**

> Not covered at this regional level in the OECD dataset I used — they show up as no-data gray.
> Small enough territories that OECD doesn't report them separately at TL2 level.

**Q: "Can you do [other country]?"**

> Planned — happy to bump a specific country up if there's demand, drop a request.

---

## Compliance checklist (r/MapPorn rules)

- [ ] `[OC]` tag in title
- [ ] `[GIF]` tag in title (this post is animated — confirm the sub currently allows GIF; the
      cheatsheet in this repo's README says yes, but double-check the live sidebar before
      posting since sub policy can change)
- [ ] **Real** resolution in brackets, matching the actual exported file (not a copy-pasted
      1920x1080 from post 04 — India's map is portrait, not landscape)
- [ ] Location ("India") in title
- [ ] Not a repost within 3 months
- [ ] Data source stated in first comment
- [ ] Tool disclosure is transparent, kept out of the title/body
- [ ] Aesthetic is gallery-quality — cleaner/less UI chrome than the dataisbeautiful (post 10)
      version if possible; this sub is unforgiving of anything that looks like a screenshot
      of an app rather than a finished map
- [ ] File size reasonable — convert to MP4 if the GIF is still 80+ MB
