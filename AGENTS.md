# Hanbok social content (for an agent)

This repo makes Hanbok's social posts. Every post starts as a **line breakdown**: one Korean line
from a show or song, explained. Each breakdown becomes two posts, and both go through the outbox
repo (private JamesAC42/hanbok-outbox).

**How to post to each platform is in [`POSTING.md`](POSTING.md) in this repo.** It covers which
platforms get each post, the exact text and link for each one, account setup, and logging. The
outbox's `README.md` is a copy of it.

| Post | What it is | How it's made | Outbox `type` |
|---|---|---|---|
| Slideshow | Usually 9 or 10 slides, 1080x1350, in one of three styles (`chat`, `quiz`, `comic`) | The breakdown itself, below | `slides` |
| Lesson video | 35 to 50 seconds, 1080x1920: the show's scene with a "Korean Lesson #N" title card, a pause and rewind to the line, then the characters' guess-the-meaning poll, the reveal, and "link in bio, follow for more" | `video/AGENTS.md` | `lesson-video` |

## The whole workflow

1. **Find a line and its clip yourself** with `npm run clips` in `video/` (see "Finding the line
   and clip" in `video/AGENTS.md`). Never ask James to find, pick or cut a clip; he only approves
   or vetoes the finished post. Pick the account it suits: `main`, `kdrama` or `kpop`.
2. **Make the breakdown.**
   - Start the generator with `npm run dev:server` (port 3001). It needs `GEMINI_API_KEY`.
   - Send `POST /api/line-breakdown` with `{ "line": "우리는 깐부잖아", "source": "Squid Game", "account": "kdrama" }`.
   - It answers with an `id` right away. `output/<id>/` is done when `metadata.json` appears. It
     holds the slides (`slide-1.png`, ...), alternative covers, `caption.txt` and `metadata.json`.
   - Leave out `style`, so the generator rotates between `chat` (Sora texts Horang in a
     KakaoTalk-style chat), `quiz` (a Bright Path lesson, like the app) and `comic` (a webtoon page
     with Sora and Horang). We're testing all three, so they need to stay even. The old
     `storybook`, `variety` and `notes` styles are retired; don't ask for them.
   - Every style runs the same story: hook, a guess-the-meaning poll ("comment A, B or C"), the
     reveal, one slide per piece, "your turn", a cheat sheet, and the CTA. The poll is what earns
     comments, so reply to guesses (see `POSTING.md`).
   - To re-render a finished breakdown in another style without a new LLM call, run
     `npm run slides -- output/<id> --style quiz`.
3. **Check the slides.**
   - Look at every slide. No text may be cut off or run under another element; if it does,
     regenerate or re-render in another style.
   - The quiz's right answer (slide 3) has to be the real meaning, and the other options wrong.
   - Regenerate if any slide states something about the show you can't confirm, or if the Korean
     is wrong.
4. **Publish the slideshow.** From the repo root, run:
   ```
   node video/scripts/publish-slides.mjs output/<id> [--learn-url https://hanbokstudy.com/learn/<slug>]
   ```
   If a guide on https://hanbokstudy.com/learn covers the line's main grammar point, pass it as
   `--learn-url` so the Pinterest pin links there. Otherwise leave it out.
5. **Make and publish the lesson video** from the same `output/<id>/metadata.json`, following
   `video/AGENTS.md`.
6. **Post both** by following [`POSTING.md`](POSTING.md):
   - Which platforms each post goes to.
   - Which text and link to use on each one.
   - How each post is logged in `metrics/posts.csv`.

The other generators in the app (classic lessons, cheat sheets, sentence analysis) aren't part of
this workflow.
