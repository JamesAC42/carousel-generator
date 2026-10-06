# Hanbok outbox

Finished TikTok lesson videos waiting to be posted. The Hanbok video pipeline adds them here.

- `index.json` lists every post, newest first:
  `{ "id", "account", "hook", "folder", "createdAt", "test"? }`.
- Each `folder` holds `video.mp4`, `caption.txt` (the full caption with hashtags, ready to paste)
  and `post.json` (the same fields plus the account's bio link).
- `account` says where it goes: `main` is @hanbokstudy; `kdrama` and `kpop` are the niche accounts.
- Skip entries with `"test": true`. They're pipeline checks, not posts.
- Keep your own record of which ids you've posted. An id never changes once it's here.
