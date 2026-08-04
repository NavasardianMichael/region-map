# Regionify — Reddit Launch Plan (3 weeks, 9 posts)

Ready-to-paste Reddit posts for the first 3 weeks of promoting [regionify.pro](https://regionify.pro). Each post file contains the exact title, body, first comment, asset briefs, and canned replies for likely questions.

> Nothing in this folder is auto-published. Each post is a manual copy-paste when you're ready.

---

## Contents

```
docs/marketing/reddit/
├── README.md                                    ← you are here
├── week-01/
│   ├── 01-launch-r-sideproject.md               (generic app overview)
│   ├── 02-coolguide-driving-side.md
│   └── 03-dataisbeautiful-spain-density.md
├── week-02/
│   ├── 04-mapporn-france-wine.md
│   ├── 05-webdev-ai-parser.md
│   └── 06-europeanculture-coffee-vs-tea.md
├── week-03/
│   ├── 07-dataisbeautiful-animation.md
│   ├── 08-maps-interactive-embed.md
│   └── 09-sideproject-3weeks-lessons.md
└── week-04/
    ├── 10-dataisbeautiful-india-gdp.md
    └── 11-mapporn-india-gdp.md
```

---

## The 3-week calendar at a glance

| #   | Week | Day | Subreddit                     | Angle                                                                          | Format             |
| --- | ---- | --- | ----------------------------- | ------------------------------------------------------------------------------ | ------------------ |
| 01  | 1    | Tue | r/SideProject                 | Launch — generic overview of Regionify, all tiers, all features                | Text + hero image  |
| 02  | 1    | Wed | r/coolguides                  | "Which side of the road every country drives on" (evergreen)                   | Image (world map)  |
| 03  | 1    | Thu | r/dataisbeautiful `[OC]`      | Population density by province — Spain (INE)                                   | Image (Spain SVG)  |
| 04  | 2    | Tue | r/MapPorn `[OC][1920x1080]`   | Wine production by région — France                                             | High-res still     |
| 05  | 2    | Wed | r/webdev                      | Show r/webdev — AI CSV parser + fuzzy region matching                          | Text + GIF         |
| 06  | 2    | Thu | r/EuropeanCulture             | Coffee vs tea consumption by European country (Eurostat)                       | Image (Europe SVG) |
| 07  | 3    | Tue | r/dataisbeautiful `[OC][GIF]` | Animated: EU regional unemployment 2010 → 2024                                 | GIF/MP4            |
| 08  | 3    | Wed | r/Maps                        | Interactive public embed showcase                                              | Link + preview     |
| 09  | 3    | Thu | r/SideProject                 | Follow-up: 3 weeks in — signups, lessons, mistakes                             | Text               |
| 10  | 4    | Tue | r/dataisbeautiful `[OC][GIF]` | Animated choropleth map: India GDP per capita, 2001 → 2023 (OECD, TL2 regions) | GIF/MP4            |
| 11  | 4    | Wed | r/MapPorn `[OC][GIF]`         | Same India GDP per capita animation, aesthetics-first angle                    | GIF/MP4            |

**Rhythm.** 3 posts per week, one per day Tue → Wed → Thu. Fridays and weekends are quiet for B2B; Monday mornings are for lurking + commenting on other people's posts to keep account activity looking natural.

---

## Timing — when to hit "post"

Optimal windows (verified against 2026 Reddit engagement data):

| Slot                                               | Timezone   | Local time (UTC+4, Yerevan/Tbilisi)         |
| -------------------------------------------------- | ---------- | ------------------------------------------- |
| **A** — US East Coast morning                      | 9-11 AM ET | 5-7 PM local                                |
| **B** — US West Coast early morning + EU afternoon | 6-8 AM PT  | 5-7 PM local (same window; ideal)           |
| **C** — US evening scroll                          | 6-8 PM ET  | 2-4 AM local (skip; not worth losing sleep) |

**Use Slot A/B for every post.** Reddit engagement is bursty — the first 60 minutes decide whether the algorithm picks the post up. Post, then be at your keyboard for the next 3 hours.

---

## Account prep (only if the account is new — skip if you already have 1000+ karma and 3+ months age)

Reddit's 2026 spam filter is aggressive. If the account posting is fresh, do this first:

1. **2 weeks of lurking + commenting.** Zero promo. 5-10 genuine comments per week across the target subs. Answer questions in your area of expertise (data viz, geography, frontend).
2. **Hit 200-500 comment karma minimum** before the first post. 1000+ is much safer.
3. **Fill in the profile** — bio, avatar, banner. Empty profiles get auto-flagged.
4. **Never delete-and-repost.** If a post underperforms, leave it and learn. Deleting-and-reposting the same content triggers manual shadow-bans.
5. **Never use alts to upvote your own posts.** Reddit's fingerprinting catches this instantly.

---

## The 19:1 rule

For every promo-adjacent post or comment, do **19** purely helpful ones. That means:

- Mon-Thu: 15-20 min/day commenting on other people's posts in your target subs. Answer questions, share data, be useful. No mention of Regionify.
- Fri: scan for threads asking "how do I make a choropleth map / regional map / animated map?" — reply with 2-3 tool suggestions (Datawrapper, Flourish, **Regionify**), honest pros/cons, disclose you built it.
- Repeat weekly.

This is not overhead — it's the strategy. Reddit rewards people who look like they belong.

---

## Subreddit-specific rules (cheatsheet)

Read this before pasting anything.

### r/dataisbeautiful

- **`[OC]` tag** in title is mandatory for original work. No exceptions.
- **Titles must be plain and descriptive.** No clickbait, no adjectives like "shocking" or "beautiful". Just what the data shows.
- **First top-level comment must state** the data source AND the tool used to create the viz. This is Rule 3 and violating it removes the post.
- Diagram must contain at least one computer-generated element.
- **No reposts** of popular content within 1 month.
- **No US politics** unless posted on Thursday (ET).
- **No personal data** unless posted on Monday (ET).
- All our posts (03, 07) are EU data — no calendar constraint.

### r/MapPorn

- Include location and resolution **in brackets** in the title. Example: `Wine production by région — France [OC][1920x1080]`.
- `[OC]` for original work, `[GIF]` if animated. Both if both.
- **No interactive maps** here — those go to r/Maps.
- Still images only unless using the `[GIF]` tag.

### r/coolguides

- Content must actually be useful/informative — this is not a laughs sub.
- No text-heavy walls; a "guide" is a self-contained infographic.
- Self-promo is tolerated if the guide stands on its own.

### r/SideProject

- Explicitly welcomes self-promo. Disclose you built it (they'll assume anyway).
- What they hate: vague marketing copy, no screenshots, no numbers.
- What they love: real story, real screenshots, honest tech stack, ask for feedback.

### r/webdev

- Substantive tech content only. "Look at my SaaS" gets removed. "How I solved X specific problem" gets front page.
- Show r/webdev tag conventionally in the title.
- Post the code / architecture / tradeoffs, not the pitch.

### r/EuropeanCulture

- Cultural angle required. "Data about Europeans" > "data about Europe".
- Not overtly promotional; treat like r/MapPorn.

### r/Maps

- Interactive maps ARE allowed (unlike r/MapPorn).
- Link posts are fine.
- Still gets treated like a map sub — title should describe location and topic.

---

## UTM link template

Never paste bare `regionify.pro` links in post bodies. Use campaign-tagged URLs and put them in the **first comment** or in replies, never in the title.

```
https://regionify.pro/?utm_source=reddit&utm_medium=organic&utm_campaign=<subreddit-slug>-<postnum>
```

Examples:

- Post 01 (r/SideProject): `https://regionify.pro/?utm_source=reddit&utm_medium=organic&utm_campaign=sideproject-01`
- Post 03 (r/dataisbeautiful): `https://regionify.pro/?utm_source=reddit&utm_medium=organic&utm_campaign=dataisbeautiful-03`
- Post 07 (r/dataisbeautiful): `https://regionify.pro/?utm_source=reddit&utm_medium=organic&utm_campaign=dataisbeautiful-07`
- Post 10 (r/dataisbeautiful): `https://regionify.pro/?utm_source=reddit&utm_medium=organic&utm_campaign=dataisbeautiful-10`
- Post 11 (r/MapPorn): `https://regionify.pro/?utm_source=reddit&utm_medium=organic&utm_campaign=mapporn-11`

For the public-embed post (08), the URL is the actual embed URL from a Chronographer project — no UTM needed on the embed itself (SSR-served), but do UTM the "Make your own" CTA in the comment.

---

## Asset placeholders

Every post file has one or more inline HTML comments like:

```
<!-- ASSET: 1920x1080 PNG, France choropleth, wine production by région,
     burgundy palette, watermark visible in bottom-right, no legend title -->
```

That's where you drop the exported image or GIF from Regionify. The comment describes exactly what to render (dimensions, palette, data shown, whether the "Made with Regionify" watermark should be visible).

**Watermark rule for these posts:** always leave the watermark visible. It's free advertising and reddit users respect it more than sneaky "clean" branding.

---

## Kill-switch rules

If a post is tanking (net negative after 2 hours):

- **Do NOT delete it.** Delete-and-repost is a hard signal to Reddit's spam filter. You'll get shadow-banned for weeks.
- **Do NOT argue with critics.** One salty comment can drag the whole thread down.
- Reply only to genuine questions. If someone says "cool tool" reply "thanks — happy to answer questions if anything's unclear". Human touch, no marketing copy.
- Learn from it. Update the next week's post to address whatever the criticism was.

If a post is going viral (100+ upvotes in 1 hour):

- Stay at the keyboard. Reply to every comment in the first 6 hours.
- **Do not post the second scheduled post the same day.** Let the viral one breathe.
- If the sub allows it, edit the body to add "EDIT: thanks all — happy to answer more questions in comments" — signals engagement to the algorithm.

---

## Post-mortem template

After each post, fill this into a private tracker (Notion, Sheet, whatever):

```
Post #:
Subreddit:
Date/time posted:
URL:

Upvotes @ 1h:
Upvotes @ 24h:
Comments @ 24h:
Awards:

UTM signups (24h):
UTM signups (7d):
Paid conversions:

What worked:
What flopped:
Change for next:
```

After all 9 posts, aggregate: which subs converted best, which titles pulled highest CTR, which asset styles got the most upvotes. That informs the next 3 weeks.

---

## Sources

- r/dataisbeautiful [official rules](https://www.reddit.com/r/dataisbeautiful/wiki/rules)
- r/MapPorn [submission guidelines](https://www.reddit.com/r/MapPorn/wiki/index)
- Reddit Marketing for B2B SaaS: 2026 Playbook (Dupple, RedditGrowthDB, Okara)
- Internal: `client/src/assets/images/maps/` (200+ country/region SVGs available)
- Internal: `shared/src/constants/badges.ts` (tier features)
