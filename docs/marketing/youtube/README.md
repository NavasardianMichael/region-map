# Regionify — YouTube Upload Checklist

One ready-to-use YouTube upload for `docs/marketing/assets/video/sample-data-to-mp4/demo-video-india-with-music-Cocktail Lounge - Dyalla.mp4` — the screen-recorded tutorial produced by `marketing/scripts/playwright-demo-video-india.ts` (pick country → paste data → style legend → play animation → save → enable public embed → copy iframe code, sped up + music muxed in). This folder contains a single post — not a campaign — so this README is the tactical checklist; `01-india-map-embed-demo.md` has the actual title/description/tags copy.

```
docs/marketing/youtube/
├── README.md                          ← publish checklist (you are here)
└── 01-india-map-embed-demo.md         ← title, description, tags, thumbnail, pinned comment
```

---

## File is verified playable

Confirmed via `ffprobe` (H.264 + AAC, 1280×960, 43.8 s) and by pulling sample frames with `ffmpeg -ss <t> -frames:v 1` — the extracted frames match the script's storyboard exactly, including the "Public map embed" modal with the real iframe code and public URL. No blocker here.

**Separate, unrelated issue if you ever revisit it:** the _other_ India video, `demo-video-india-map-export.mp4` (produced by the sibling script `playwright-demo-video-india-export.ts` — no screen recording, just downloads the app's own rendered MP4, no embed step, silent, portrait), is currently a 138 MB PDF mis-saved with an `.mp4` extension in the working tree (confirmed by file signature). Not used by this post — ignore unless you specifically want that clip later, in which case restore it first with `git checkout -- "docs/marketing/assets/video/sample-data-to-mp4/demo-video-india-map-export.mp4"`.

---

## Before publishing — two things to actually decide

- [ ] **Real account name is visible throughout.** The nav bar shows "Michael Navasardyan" (the real logged-in account) for the whole recording, since this is a genuine screen capture, not a synthetic export. Matches your existing founder-disclosure pattern on Reddit/LinkedIn, so probably fine — just confirm it's a deliberate choice, not an oversight.
- [ ] **Music attribution.** "Cocktail Lounge" by Dyalla is muxed in. Confirm whatever attribution the source requires (same caution as the LinkedIn post's Aylex track) — YouTube's Content ID can mute/block a video after the fact if a required credit is missing.

---

## Publish checklist (in order)

- [ ] Confirm the two items above.
- [ ] **Pick a title** from the variants in `01-india-map-embed-demo.md`.
- [ ] **Paste the description**, confirm the UTM link resolves.
- [ ] **Add tags** (legacy field, low SEO weight now but still free — no reason to skip it).
- [ ] **Set category** → Howto & Style (or Education as the alternate).
- [ ] **Set "No, it's not made for kids."**
- [ ] **Upload/pick a thumbnail** — see thumbnail note in `01-india-map-embed-demo.md`. This is a regular upload, so thumbnail choice actually affects CTR (unlike a Short).
- [ ] **Publish**, then immediately pin the top comment (data source + tool disclosure + link) from `01-india-map-embed-demo.md`.
- [ ] **Add to a playlist** if the channel has (or should start) a "Regionify Demos" playlist.

---

## YouTube-specific things that matter here

### This is a regular upload, not a Short

4:3 landscape (1280×960) doesn't qualify for the Shorts shelf regardless of the sub-3-minute runtime — Shorts needs vertical or square. Don't try to force it; upload as a normal video.

### Thumbnail actually matters here

Unlike a Short (auto cover frame), a regular upload's CTR is thumbnail-driven. The Embed-modal frame near the end is the strongest single-frame option — it's the payoff and the least generic-looking shot. See `01-india-map-embed-demo.md` for the composited-thumbnail alternative.

### Hashtags in the description

The **first 3 hashtags** anywhere in the description automatically display above the title on the watch page — don't add more than 3-5 total or YouTube may ignore the excess.

### Pinning the first comment

Not a YouTube rule the way it is on r/dataisbeautiful, but keep doing it anyway — same transparency habit as the Reddit posts (data source + "I built this" disclosure), and it puts the UTM link somewhere viewers can tap without leaving the app.

---

## UTM link

```
https://regionify.pro/?utm_source=youtube&utm_medium=organic&utm_campaign=tutorial-india-embed-01
```

---

## What NOT to do

- Don't crop or letterbox the 4:3 source into a fake 16:9 — pad or accept the pillarbox in the player instead of stretching.
- Don't skip the music-attribution check — confirm it before publishing, not after a Content ID claim.
- Don't invent a duration/resolution in the title or description that doesn't match the actual file — re-run `ffprobe` if the file changes.
- Don't skip the "Made for Kids" setting — leaving it unset blocks some monetization/comment features.
