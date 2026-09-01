# Post 09 — r/SideProject follow-up: 3 weeks in, lessons + numbers

## Meta

| Field        | Value                                                  |
| ------------ | ------------------------------------------------------ |
| Subreddit    | [r/SideProject](https://www.reddit.com/r/SideProject/) |
| Day          | Week 3, Thursday                                       |
| Time slot    | 5-7 PM local (9-11 AM ET)                              |
| Post type    | Text post                                              |
| Tags         | None required                                          |
| UTM campaign | `sideproject-09`                                       |

Rationale: r/SideProject rewards two kinds of posts: **launches** (Post 01) and **milestone retrospectives** — the "X weeks/months in, here's what happened" format. A follow-up 3 weeks after the launch post is the perfect cadence: long enough for real numbers, short enough that the launch post is still fresh in some readers' memory. This post also serves as the closing loop for the 3-week campaign — traffic from it feeds back to the site with a totally different narrative than the launch post.

**Prerequisite:** you need real numbers by this point. If the first 2 weeks flopped, this post is not "3 weeks in and it flopped" — pivot the angle to "what I'd do differently" and be honest. Reddit sniffs out fake numbers instantly; understating always beats overstating.

---

## Title

**Primary:**

```
3 weeks after posting my choropleth map SaaS here — real numbers, mistakes, and what I'd do differently
```

**Backup 1:**

```
Regionify update: 3 weeks after the r/SideProject launch — signups, revenue, and 4 things that surprised me
```

**Backup 2:**

```
Follow-up to my launch here 3 weeks ago — what worked, what didn't, and the one comment that changed the product
```

Primary reads honest and analytical, which is what the sub rewards.

---

## Body

_Fill in the [BRACKETS] with your real numbers before posting. Under-report if uncertain; specifics build trust._

Three weeks ago I [posted Regionify here](../week-01/01-launch-r-sideproject.md) — a browser-based choropleth map maker. First launch post got [XXX upvotes] and [YY comments]. Here's what happened next.

## The numbers

- **Signups (all sources, 3 weeks):** [XXX]
- **From Reddit specifically (UTM-tracked):** [XX]
- **Paid conversions (Explorer + Chronographer combined):** [X]
- **MRR change:** [$X → $X]
- **Landing-page bounce rate before / after copy changes:** [XX% → XX%]

## What worked

1. **The r/dataisbeautiful posts drove more signups than the r/SideProject launch.** The Spain density map (Week 1) and the EU unemployment animation (Week 3) both hit [top of sub / trending / whatever]. r/SideProject people are supportive but rarely become paying users — r/dataisbeautiful people were curious enough to sign up and try.
2. **The AI parser demo was the closer.** The GIF in the r/webdev post — pasting messy CSV and watching it auto-match — converted noticeably better than the pretty-map posts. People signed up specifically to try that feature.
3. **The "Made with Regionify" watermark on shared maps.** [X] signups came from users who saw a Regionify-made map somewhere else (embed, someone else's Reddit post) and searched for it.

## What flopped

1. **[Sub name] rejected the [Nth] post** — moderator flagged it as self-promo despite the disclosure. Lesson: even with disclosure and the 19:1 rule, some subs need a whitelisted account.
2. **The r/coolguides post got low upvotes** because [reason — maybe the design was too busy, maybe the sub had a similar guide recently]. Reddit is unpredictable at that layer.
3. **First-hour engagement matters more than I thought.** The two posts where I couldn't reply for the first 90 minutes both underperformed vs equivalent-quality posts where I was at the keyboard.

## The comment that changed the product

Someone on the launch post said: [quote a real comment that led to a real change — e.g. "your pricing page has 3 tiers but no clear reason to choose the middle one"]. I [what you did about it]. Since then, [what changed].

## What I'd do differently

- **Prep the Chronographer public-embed project first.** I launched with only static-image posts because the embed feature wasn't polished enough for the r/Maps interactive-showcase post. Week 3 finally hit it; should've been Week 1.
- **Batch the asset production.** Rendering fresh Regionify exports for every post + writing the copy is 4-5 hours per post. Next campaign I'll pre-render 20+ maps in one weekend and pull from that library.
- **Get an actual "How did you hear about us?" question on signup.** UTM-based attribution missed [X]% of signups that came from Reddit — people saw the post on mobile, opened the URL later on desktop without UTM, and signed up "from direct traffic". Adding the survey question would've caught them.

## What's next

- Week 4-6: same cadence but pivot to Hacker News (Show HN for the AI parser), Twitter/X reply-guy strategy on maps accounts, and the r/dataisbeautiful weekly OC contest.
- Building 30 templates for the gallery so the SEO play kicks in.
- If anyone here is thinking about a Reddit launch, happy to share the exact 9-post plan and the calendar I used. DM me.

---

## First comment

```
For anyone who missed the launch: https://regionify.pro/?utm_source=reddit&utm_medium=organic&utm_campaign=sideproject-09

The 3-week Reddit calendar I ran (in case it's useful to someone building here):
  Week 1: r/SideProject launch, r/coolguides evergreen guide, r/dataisbeautiful data map
  Week 2: r/MapPorn beautiful still, r/webdev tech deep-dive, r/EuropeanCulture cultural comparison
  Week 3: r/dataisbeautiful animation, r/Maps interactive embed, this follow-up

Happy to expand on any of the numbers, the copy iterations, or the exact posting times.
```

---

## Prepared replies

**Q: "How much did you spend on ads?"**

> Zero. This entire campaign was organic Reddit + one Show HN (planned for next week). The only paid spend was $9/mo for the domain and $32/mo for the VPS.

**Q: "Real numbers or vanity metrics?"**

> Both, and I've flagged which is which. Signups and MRR are real (I can DM screenshots to anyone skeptical — happy to be transparent). Upvote counts are self-reported and easy to check on the original posts if anyone wants to verify.

**Q: "Reddit really converts?"**

> For a visual, freemium, prosumer tool like this — yes. My CAC from these 9 posts was effectively my time: ~40 hours of writing + rendering + replying, zero dollars. Compare that to running Google Ads for "choropleth map maker" at ~$4-6 CPC.

**Q: "What tools did you use to schedule / track?"**

> Nothing fancy. Google Sheets for the post-mortem template, Reddit's own analytics for upvote/comment counts, UTM parameters + Plausible for signup attribution. No scheduler — every post published manually at the optimal time.

**Q: "Would you do it again?"**

> Yes, but with two changes: (1) pre-render assets in bulk before the campaign starts (biggest bottleneck), (2) add a signup survey question to catch the attribution gap. Next campaign I'll run parallel Twitter reply-guy strategy alongside Reddit — different audience, different angle.

**Q: "Where's Regionify going next?"**

> Product: multi-language template gallery, better mobile embed experience — the country-map count actually outpaced the original roadmap already (past 200 now, from 70 at launch), so next there is filling in remaining territories and disputed-boundary variants rather than chasing raw count. Distribution: Show HN, YouTube channel doing "recreate the [famous map] in Regionify" videos, partnership pitches to 2-3 data-journalism outlets.

**Q: (harsh) "3 weeks and only $X MRR? That's tiny."**

> Yeah, it is. I'm treating month 1 as pure top-of-funnel and top of learning curve, not revenue. If Q2 doesn't get to a specific MRR target I'm going to reassess whether the freemium bar is set right — currently leaning toward moving the public-embed feature down from Chronographer ($39) to Explorer ($19) as a growth-loop driver. But that's a separate decision.

---

## Compliance checklist

- [ ] Numbers are real (or clearly labeled as ranges/estimates)
- [ ] References the original launch post — closes the loop
- [ ] Acknowledges failures, not just wins — r/SideProject punishes hype
- [ ] Actionable takeaways, not just narrative
- [ ] UTM link in first comment only
- [ ] Prepared for skeptical replies about the numbers (screenshots ready to DM if asked)
- [ ] No cross-posting simultaneously — if you also want to hit r/Entrepreneur or r/startups with this content, wait at least a week and rewrite the framing
