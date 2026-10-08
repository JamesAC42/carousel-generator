# Making a Hanbok lesson video (for an agent)

You turn one Korean line from a show into a 20 to 30 second vertical TikTok built for engagement,
not for teaching. The full lesson is on hanbokstudy.com, and the video's job is to get watched to
the end, get comments, and send people to the link in bio:
- A hook on screen from the first frame, over a short clip of the show saying the line.
- The tutor and Sora (visual-novel characters; Sora is a countryside girl who just moved to Seoul,
  the same character as the "Sora in Seoul" skits) ask viewers to comment their guess on a two-option
  poll, then reveal the answer and say why it matters in the scene.
- It ends on a tease of what the video left out, over a screen recording of hanbokstudy.com with
  "Full breakdown: link in bio".

Gameplay fills the bottom band, and the caption ends on the poll question. Then you put
the finished video in the outbox for posting. The whole workflow, slideshows included, starts at
`AGENTS.md` in the repo root.

## One-time setup

- Node 22+, ffmpeg/ffprobe, git. `cd video && npm install`.
- Keys: `ELEVENLABS_API_KEY`, and `OPENAI_API_KEY` for the script writer. The carousel generator (repo root) needs `GEMINI_API_KEY` too.
  - Put them in the environment, or as `KEY=value` lines in `.env` at the repo root. That file is
    git-ignored, and the video scripts and the generator server both read it.
  - If your keys are injected by a proxy instead, leave them unset and run node with
    `NODE_USE_ENV_PROXY=1`.
- Always run the repo's scripts (`npm run lesson`, `npm run narrate`, ...). Never re-implement them
  in another language. They do more than the API calls, for example dropping voice tags the voice
  model doesn't know.
- Remotion downloads its own headless Chrome on first render. If that's blocked, set `CHROME_PATH`.
- Publishing pushes to the private repo JamesAC42/hanbok-outbox, so git needs push access to it.
- Put the gameplay video (the Minecraft parkour video, `gameplay.webm`) in `video/public/gameplay/`.
  It's too big for git, so that folder is git-ignored. Every video uses it automatically, starting at a
  random point so each one shows different footage.
- The character art is in the repo (`public/cast/`, listed in `src/cast.json`); nothing to set up.

## Per video

1. **Pick the line.** A Korean line from a drama, film or song that people quote, with a meaning the
   usual translation misses.

2. **Make the line breakdown** with the carousel generator in the repo root (`npm run dev:server`, port 3001):
   `POST /api/line-breakdown` with `{ "line": "우리는 깐부잖아", "source": "Squid Game", "account": "kdrama" }`.
   It answers with an `id` right away; `output/<id>/metadata.json` appears when it's done.
   `account` is `main`, `kdrama` or `kpop` and decides the caption hashtags and where it's posted.

3. **Get the clip.** Download the scene (e.g. with yt-dlp) and find where the line is said.
   - Keep the cut to the line itself: 2 to 5 seconds, starting just before the first word.
   - Write one sentence of context: who says it to whom, and what's happening. Only facts you're
     sure of; the script is written from it.
   - Don't use clips longer than that, and don't burn in your own subtitles (the video adds them).

4. **Run it** from `video/`:
   ```
   npm run lesson -- ../output/<id>/metadata.json \
     --clip /path/to/scene.mp4 --clip-start 83.2 --clip-end 86.9 \
     --clip-context "Il-nam says it to Gi-hun during the marble game, where they have to play against each other"
   ```
   Leave `--publish` off the first time. (`--gameplay <path under video/public/>` overrides the gameplay video.)
   The script writer is GPT-6.1 Sol (James's pick), so `OPENAI_API_KEY` must be set. `WRITER_MODEL`
   overrides it (e.g. `gemini-3.8-flash` with `GEMINI_API_KEY`).
   Output: `out/<id>/video.mp4`, `caption.txt`, `post.json`, `scene.json`.

5. **Check it before publishing.** Watch the whole video. Reject it and re-run step 4 (the script
   is rewritten each run) if any line sounds forced, states something about the show you can't
   confirm, the clip is cut mid-word, the first line gives the answer away before the poll, or the
   poll's marked answer is wrong. To change only the dialogue, edit the beat texts in
   `out/<id>/scene.json` and run `npm run narrate -- out/<id>/scene.json` then
   `npm run render -- out/<id>/scene.json out/<id>/video.mp4`.

6. **Publish**: `node scripts/publish.mjs out/<id>`. It pushes the video, caption and post.json to
   hanbok-outbox and lists it in `index.json`. It refuses videos with the placeholder gameplay or
   character art.

## Posting from the outbox

Follow `POSTING.md` in the repo root (the same file is hanbok-outbox's `README.md`). It
says which platforms get each post, what text and link to use on each, and how to log posts in
`metrics/posts.csv`. The slideshow made from the same breakdown goes out too; see `AGENTS.md` at the
repo root.
