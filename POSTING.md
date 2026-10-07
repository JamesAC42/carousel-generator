# Posting Hanbok's social posts

The runbook for posting what's in the outbox (the private repo JamesAC42/hanbok-outbox) to every
platform. Whoever posts (Muse, or James) follows this file. It lives at `POSTING.md` in
JamesAC42/carousel-generator, and every publish copies it to the outbox as its `README.md`. How posts
are made is in the carousel generator's `AGENTS.md`.

## What's in here

- `index.json` lists every post, newest first:
  `{ "id", "type", "account", "hook", "folder", "createdAt", "test"? }`.
- `type` is `lesson-video` or `slides`. Entries without a `type` are lesson videos.
- Each `folder` holds the files to post and `post.json`:
  - `lesson-video`: `video.mp4` (1080x1920, about 45 seconds).
  - `slides`: `slide-1.png`, `slide-2.png`, ... (1080x1350, post them in that order).
  - Both: `caption.txt` (the TikTok caption, ready to paste) and `post.json`, which has `format`
    (for `posts.csv`) and ready-to-use text for each platform under `platforms`.
- `account` is `main` (@hanbokstudy), `kdrama` or `kpop`.
- Skip entries with `"test": true`. They're pipeline checks, not posts.
- An id never changes once it's here.

## Accounts (one-time setup)

Only TikTok has the niche accounts. On every other platform one Hanbok account posts everything,
whatever the post's `account` says (the links inside posts still carry it, so niches stay
measurable). Set each profile link once, exactly as below.

| Platform | Account | Profile link |
|---|---|---|
| TikTok | `main` @hanbokstudy, plus the `kdrama` and `kpop` accounts | `https://hanbokstudy.com/?utm_source=tiktok&utm_medium=social&utm_campaign=<account>` |
| YouTube | @HanbokStudy | `https://hanbokstudy.com/?utm_source=youtube&utm_medium=social&utm_campaign=main` |
| Instagram | One professional (Creator or Business) account | `https://hanbokstudy.com/?utm_source=instagram&utm_medium=social&utm_campaign=main` |
| Facebook | The Hanbok Page | `https://hanbokstudy.com/?utm_source=facebook&utm_medium=social&utm_campaign=main` |
| Pinterest | The Hanbok business account | `https://hanbokstudy.com/?utm_source=pinterest&utm_medium=social&utm_campaign=main` |

- **Instagram and Facebook:**
  - Link the Instagram account to the Facebook Page in Meta Accounts Center.
  - In Instagram's sharing settings, turn on sharing posts and Reels to Facebook, so every Instagram
    post also lands on the Page.
  - Turn on sharing to Threads too, which needs a Threads profile on the same Instagram login.
- **Pinterest:**
  - Claim hanbokstudy.com in the business account's settings. The meta-tag option needs a small
    site change, so send the tag to James for a site PR.
  - Make three boards: "Learn Korean with K-dramas" for `kdrama` posts, "Learn Korean with K-pop"
    for `kpop` posts, and "Korean phrases and grammar" for `main` posts.
- **X:** skip for now.

## What goes where

| | TikTok | YouTube | Instagram | Facebook | Pinterest | Threads |
|---|---|---|---|---|---|---|
| `lesson-video` | Video, on the post's `account` | Short | Reel | Through Instagram's share toggle | No | Through Instagram's share toggle |
| `slides` | Photo post (all slides, in order), on the post's `account` | No | Carousel post (all slides, in order) | Through Instagram's share toggle | One pin, on the post's board | Through Instagram's share toggle |

## Text and links for each platform

Use the text in `post.json` → `platforms` exactly as it is. Don't rewrite captions or links, because
each link is tagged with its platform so signups are counted per platform.

- **`tiktok`:** `caption`.
  - Slides go up as a photo post. Add a quiet sound from TikTok's library, because photo posts
    without one get less reach.
- **`youtube`** (videos only):
  - Use `title`, `description` and `tags`.
  - Links in Shorts descriptions aren't clickable, so the channel link above is the one that counts.
- **`instagram`:** `caption`.
  - Videos go up as a Reel and slides as a carousel.
  - Leave the share-to-Facebook and share-to-Threads toggles on.
- **`facebook`:** `caption`. You only need it when the Instagram toggle didn't post to the Page;
  in that case, post the same thing to the Page yourself.
- **`pinterest`** (slides only):
  - Pin the `image` file (the cover slide) with `title`, `description` and `link`, on the board
    for the post's `account`.
  - `link` is a clickable link, often to a matching Learn guide, so never swap it for the home page.

Older posts without `platforms`: post them to TikTok only, with `caption.txt`.

## Posting, step by step

1. Pull this repo. Go through `index.json` from the oldest entry you haven't posted. To tell what's
   been posted, look at `metrics/posts.csv`: an id and platform pair with a row there is already up.
2. For each post, put it on every platform the table above gives its `type`.
3. Right after each one goes live, add a row to `metrics/posts.csv`. Make one row per platform,
   Facebook and Threads included, with the post's link if you can find it:
   - `post_id`: the outbox `id`.
   - `platform`: `tiktok`, `youtube`, `instagram`, `facebook`, `pinterest` or `threads`.
   - `account`: the post's `account`.
   - `format`: `post.json` → `format` (`lesson-video`, `slides-storybook`, `slides-variety` or
     `slides-notes`).
   - Also fill in `hook`, `posted_at` and `url`.
4. About 48 hours later, and again at 7 days, fill in that row's numbers from the platform's
   analytics.
5. Once a week, add each account's numbers to `metrics/accounts.csv`.
6. Commit and push your changes to `metrics/` on `main`.

`metrics/README.md` explains every column. This is how we learn which hooks, formats and platforms
bring signups.
