# Regionify — Medium Articles

Ready-to-paste Medium articles about [regionify.pro](https://regionify.pro). Each article is fully self-contained in its own folder — the `.md` file plus every image/GIF it references, and its own Meta table (title options, tags, UTM campaign, recommended publication). This README is only the checklist and guidance shared across all of them.

```
docs/marketing/medium/
├── README.md                                              ← publish checklist (you are here)
├── embed-guide/
│   └── embed-guide.md                                     ← how-to: generating a live iframe embed of a choropleth map, France fertility example
│       + oecd-fertility-*.png/gif, france-oecd-fertility.*
├── feature-tour-germany-gdp/
│   └── feature-tour-germany-gdp.md                        ← full feature tour (data types, styling, animated-map export), Germany GDP-per-capita example
│       + germany-*.png/gif
└── animated-map-export/
    └── animated-map-export.md                             ← how-to: animated map export (GIF/MP4), China GDP-per-capita example
        + china-gdp-*.png/gif/mp4
```

Space these articles at least a couple of weeks apart — all three lean on an OECD time-series dataset and an animated-export demo, and publishing them back-to-back would cannibalize each other's novelty.

---

## Publish checklist (in order, per article)

- [ ] **Prepare the media** — every image/GIF the article needs already lives alongside its `.md` file; nothing to generate by hand unless a regeneration script note in the article says otherwise.
- [ ] **Pick a title + subtitle** from the variants at the top of that article's file.
- [ ] **Apply as a Writer** to the article's recommended publication (see its Meta table, or the fallback list below) — do this a few days in advance, editorial takes 1-3 days.
- [ ] **Paste the article body** into Medium's editor (it accepts Markdown) and upload each image at its position.
- [ ] **Add the tags** listed in the article's Meta table (Medium hard-caps at 5).
- [ ] **Add to publication** via the … menu → "Add to publication" before hitting Publish.
- [ ] **Publish** at the day/time in the Meta table — usually a weekday morning US Eastern, for both search indexing and first-day reader traffic.
- [ ] **Announce** the article same day: LinkedIn native post referring to it (link in first comment), Twitter/X thread with 3-4 pull quotes.
- [ ] **3-5 days after publishing**, cross-post to dev.to and Hashnode with `canonical_url` set to the Medium URL.

---

## Publications to submit to (fallback list — prefer the article's own Meta table recommendation first)

Medium's algorithm distributes articles inside curated Publications 3-5× more than standalone posts. Being accepted takes 1-3 days for the fast pubs.

| Publication                     | Fit                      | Turnaround | Notes                                          |
| ------------------------------- | ------------------------ | ---------- | ---------------------------------------------- |
| **JavaScript in Plain English** | Frontend/dev audience    | 1-3 days   | Fastest to publish, less selective (best pick) |
| **Nightingale**                 | Data visualization       | Varies     | Best fit for dataviz-led pieces, not dev-led   |
| **Better Programming**          | Broad dev-SaaS           | 3-7 days   | Higher-quality bar; they may edit copy         |
| **ITNEXT**                      | Backend / architecture   | 3-7 days   | Best if the piece leans into the stack itself  |
| **Level Up Coding**             | Broad dev                | 2-5 days   | Good general fit                               |
| **The Startup**                 | Founder / business angle | 5-10 days  | Big reach but slow; leans business over tech   |

**How to submit:** Apply as a Writer via the publication's homepage (usually a Google Form or dedicated page). Once accepted, publish through Medium's editor → … menu → "Add to publication".

---

## Cross-posting

Publish on Medium **first**. Wait 3-5 days for Medium's initial indexing push. Then:

| Platform                                     | Canonical URL   | Notes                                                                                                              |
| -------------------------------------------- | --------------- | ------------------------------------------------------------------------------------------------------------------ |
| **dev.to**                                   | Medium article  | Use "Import from Medium" or manual paste; set `canonical_url:` in front-matter                                     |
| **Hashnode**                                 | Medium article  | Configure canonical in the SEO panel                                                                               |
| **Your blog** (if regionify.pro/blog exists) | The blog itself | Publish natively there and reverse: point Medium's canonical to the blog. Whichever you want as the SEO authority. |

**Do NOT cross-post to LinkedIn Articles.** LinkedIn hides articles from the feed; a native LinkedIn post referencing the Medium URL (link in first comment) gets 10-50× more reach. See `../linkedin/` for the companion LinkedIn post.

---

## What NOT to do on Medium

- No pure sales pitch — every paragraph must give the reader something (insight, code, honest opinion, screenshot).
- No aggressive CTA above the fold — the "sign up" ask goes at the end, softly.
- No linkless article — Medium expects hyperlinks to citations, previous work, competitor products. Zero outbound links looks suspicious to the algorithm.
- No AI-tone giveaways: "delve", "in the realm of", "furthermore", "it is important to note", "landscape of". Rewrite if any of these appear.
- No image without alt text.
- No `<h1>` inside the body — Medium reserves that for the article title. Use `<h2>` (Big Title) and `<h3>` (Subtitle) for sections.
- No unverified numeric claims — every figure quoted in either article has been checked against its source CSV; re-verify anything you edit.
