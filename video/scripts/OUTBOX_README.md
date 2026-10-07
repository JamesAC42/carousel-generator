# Hanbok outbox

Finished lesson videos waiting to be posted. The Hanbok video pipeline adds them here.

- `index.json` lists every post, newest first:
  `{ "id", "account", "hook", "folder", "createdAt", "test"? }`.
- Each `folder` holds `video.mp4`, `caption.txt` (the full caption with hashtags, ready to paste)
  and `post.json` (the same fields plus the account's bio link).
- The same video goes to every platform. `post.json` has ready-to-use text for each under `platforms`:
  - `tiktok`: `caption`.
  - `youtube` (Shorts): `title` (100 characters max), `description` (with a tracked link), `tags`.
  - `instagram` (Reels) and `facebook` (Reels; Meta's cross-post toggle works too): `caption`, and
    `bioLink`, which is what that account's profile link should be.
  - `pinterest` (video pin): `title`, `description`, `link`.
  Use these as they are; the links carry `utm_source=<platform>` so signups are counted per platform.
  Older posts without `platforms`: post to TikTok only, or use `caption.txt` everywhere.
- `account` says where it goes: `main` is @hanbokstudy; `kdrama` and `kpop` are the niche accounts.
- Skip entries with `"test": true`. They're pipeline checks, not posts.
- Keep your own record of which ids you've posted. An id never changes once it's here.
