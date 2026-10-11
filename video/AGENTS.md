# Making a Hanbok lesson video (for an agent)

You turn one Korean line from a show into a vertical TikTok built for engagement, not for
teaching. The full lesson is on hanbokstudy.com, and the video's job is to get watched to the end,
get comments, get follows, and send people to the link in bio:
- **Cold open (about 15 seconds):** the show's scene plays centered on a blurred copy of itself.
  Half a second in it freezes under a "Korean Lesson #N" title card with a ding, then plays on.
  Right after the line it pauses, rewinds, plays the line again with its subtitle, and fades out.
- **Lesson (about 30 seconds):** Horang and Sora (visual-novel characters; Sora is a countryside
  girl who just moved to Seoul, the same character as the "Sora in Seoul" skits) set up the line,
  ask viewers to comment their guess on a two-option poll, hold a 3-second countdown, reveal the
  answer, and end on a tease with "link in bio" and "follow for more" over a screen recording of
  hanbokstudy.com. Gameplay fills the bottom band.

The caption ends on the poll question, and `thumbnail.jpg` is the cover. Then you put the finished
video in the outbox for posting. The whole workflow, slideshows included, starts at `AGENTS.md` in
the repo root.

## One-time setup

- Node 22+, ffmpeg/ffprobe, git, and yt-dlp (`pip install -U yt-dlp`; keep it updated, YouTube changes often). `cd video && npm install`.
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

1. **Find the line and its clip** (next section). You end with a downloaded scene in
   `clips/<slug>/` and the two commands to run next.

2. **Make the line breakdown** with the carousel generator, from the repo root:
   `npm run breakdown -- "우리는 깐부잖아" --source "Squid Game" --account kdrama`.
   It prints `output/<id>` when it's done (see the root `AGENTS.md`).
   `account` is `main`, `kdrama` or `kpop` and decides the caption hashtags and where it's posted.
   `npm run clips -- take` prints this command with the line filled in.

3. **Check the clip** before running anything else: watch `clips/<slug>/scene.mp4`.
   - It should start on something that grabs attention (the first half second shows before the
     title card) and end a second or two after the line.
   - The line times come from subtitles and can be a few tenths off. Fix `--line-start` and
     `--line-end` if the line is clipped.
   - The context sentence (`--clip-context`) is a guess from the subtitles. Correct it from what
     you see: who says it to whom, and what's happening. The script is written from it, so only
     facts you're sure of.
   - Don't burn in subtitles yourself.

4. **Run it** from `video/`:
   ```
   npm run lesson -- ../output/<id>/metadata.json \
     --clip clips/<slug>/scene.mp4 --clip-start 1.0 --clip-end 16.0 \
     --line-start 12.2 --line-end 14.1 --clip-subs clips/<slug>/scene.en.srt \
     --clip-context "Il-nam says it to Gi-hun during the marble game, where they have to play against each other"
   ```
   `npm run clips -- take` prints this command with the times filled in. Leave `--publish` off the first time. (`--gameplay <path under video/public/>` overrides the gameplay video.)
   - The title card's lesson number is the count of lesson videos in hanbok-outbox plus one. If
     that's wrong (a video was posted without the outbox), pass `--number N`.
   - The script writer is GPT-6.1 Sol (James's pick), so `OPENAI_API_KEY` must be set. `WRITER_MODEL`
     overrides it (e.g. `gemini-3.8-flash` with `GEMINI_API_KEY`).
   - Output: `out/<id>/video.mp4`, `thumbnail.jpg`, `caption.txt`, `post.json`, `scene.json`.

5. **Check it before publishing.** Watch the whole video. Reject it and re-run step 4 (the script
   is rewritten each run) if any line sounds forced, states something about the show you can't
   confirm, the line's pause or replay is cut mid-word (fix `--line-start`/`--line-end`), the
   setup gives the answer away before the poll, or the poll's marked answer is wrong. Look at
   `thumbnail.jpg` too. To change only the dialogue, edit the beat texts in
   `out/<id>/scene.json` and run `npm run narrate -- out/<id>/scene.json` then
   `npm run render -- out/<id>/scene.json out/<id>/video.mp4`.

6. **Publish**: `node scripts/publish.mjs out/<id>`. It pushes the video, thumbnail, caption and post.json to
   hanbok-outbox and lists it in `index.json`. It refuses videos with the placeholder gameplay or
   character art.

## Finding the line and clip

James doesn't find clips. You do, with `npm run clips` (`scripts/find-clips.mjs`): it reads the
Korean subtitles of YouTube videos, picks the lines worth a lesson, and downloads the scene with
its timings. It needs `yt-dlp` and `ffmpeg` on this machine and `GEMINI_API_KEY`. Its working
files go in `video/clips/` (git-ignored), including `used.json`, the lines already posted, which it
won't pick again.

1. **Mine candidates**:
   `npm run clips -- mine "넷플릭스 명장면" --max 12`
   It searches YouTube, reads up to 12 videos' Korean subtitles, and prints a ranked list
   (also saved to `clips/candidates.json`): the line, why it's worth a lesson, the context, and a
   link to the moment. Searches that work, rotated so the feed doesn't repeat itself:
   - `"<show> 명장면"` or `"<show> 명대사"` for a show that's trending now (check what's in
     Netflix Korea's top 10 and on TikTok), e.g. `"폭싹 속았수다 명장면"`.
   - `"드라마 명대사 모음"`, `"영화 명대사"`, `"넷플릭스 명장면"`, `"tvN 드라마 명장면"`,
     `"JTBC 드라마 명장면"`: compilations give many lines per video.
   - A channel or playlist URL works too, e.g. an official drama channel's clips playlist.
   - For `kpop`: idols' variety and live-stream moments (`"<group> 예능 레전드"`), not lyrics.
   Prefer official channels' clips (broadcaster, Netflix Korea): their subtitles are the show's own
   and the picture is clean.

2. **Pick one** from the list yourself. The miner already follows the rules below; skip any
   candidate where the moment isn't clear from the scene alone, then
   `npm run clips -- take <number>`. It downloads the scene (plus English subtitles when the video
   has them) into `clips/<slug>/`, marks the line as used, and prints the breakdown request and the
   `npm run lesson` command with every time filled in.

3. Already know the line you want? `npm run clips -- line "우리는 깐부잖아" --show "Squid Game"`
   finds a video where it's said, then `take` as above.

If YouTube refuses yt-dlp ("Sign in to confirm you're not a bot"), export cookies from a browser
signed in to YouTube and set `YTDLP_ARGS="--cookies /path/to/cookies.txt"`. If this machine can't
reach YouTube at all, tell James once that it needs YouTube access; don't ask him for clips.

What makes a good line (the miner uses the same rules, in `LINE_RULES` in `scripts/find-clips.mjs`):
- A moment people quote or react to: a confession, a threat, a betrayal, a comeback, a running
  joke, a line that went viral.
- Something the English subtitle misses: an ending that changes the meaning (잖아, 거든, 네, 군,
  더라, 걸), a switch between 반말 and 존댓말, a title used as a weapon or a flirt (형, 누나, 선배,
  아저씨), slang or a newer coinage, an idiom, wordplay, or a cultural idea (눈치, 정, 한, 체면).
- Short (about 3 to 15 syllables), said clearly by one speaker, and it makes sense from the scene
  alone.
- Never a beginner word or stock phrase on its own: 오빠, 사랑해, 안녕하세요, 감사합니다, 대박,
  진짜, 아이고, 화이팅, 미안해, 괜찮아. Everyone learning Korean already knows them, so they don't
  stop the scroll.

## Posting from the outbox

Follow `POSTING.md` in the repo root (the same file is hanbok-outbox's `README.md`). It
says which platforms get each post, what text and link to use on each, and how to log posts in
`metrics/posts.csv`. The slideshow made from the same breakdown goes out too; see `AGENTS.md` at the
repo root.
