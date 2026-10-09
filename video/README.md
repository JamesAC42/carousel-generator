# Lesson videos

Agents making videos end to end: read AGENTS.md.

Narrated visual-novel lessons: the tutor explains a line to the learner over the
lesson slides, with gameplay in the bottom band. Built with Remotion.

```
npm install
# All of it in one go: writes out/<id>/video.mp4, caption.txt and post.json
npm run lesson -- ../output/<id>/metadata.json [--hook N] [--gameplay <path in public/>] \
  [--clip <file> --clip-start s --clip-end s --clip-context "who says it to whom"]

# Or step by step:
# 1. Line breakdown (carousel generator output) -> scene with slides + dialogue (Gemini)
npm run script -- ../output/<id>/metadata.json out/<name>.json [--hook N]
# 2. Voice the conversation in one take (ElevenLabs dialogue); writes real timings into the scene
# voices.json: tutor = KKC HQ, learner (Sora) = Jessica, model eleven_v4
# --per-line voices each line separately instead (sounds stitched; only for re-voicing one line cheaply)
npm run narrate -- out/<name>.json
# 3. Render
npm run render -- out/<name>.json out/<name>.mp4
```

- `npm run voices` lists the account's voices; `npm run voices -- --sample <id> <id>` writes
  short tutor and learner samples to `out/voice-samples/` for picking.
- Without step 2 the video still renders, with timings estimated from text length and no audio.
- Narration timestamps drive the typed dialogue, the mouth flaps (pauses close the mouth) and
  slide changes. A character's `"<expression>_talk"` image in `src/cast.json` is used as the
  mouth-open frame; without one the sprite bobs instead.
- Put a gameplay clip in `public/` and set `"gameplay": "<path>"` in the scene.
- Keys: `ELEVENLABS_API_KEY` and the writer's key (`OPENAI_API_KEY`, or `GEMINI_API_KEY`), from the
  environment or the repo root's `.env`. In a cloud session behind the agent proxy,
  run node with `NODE_USE_ENV_PROXY=1` so `fetch` goes through it, and
  `CHROME_PATH=<headless_shell>` for rendering.

## Publishing to the outbox

`npm run lesson -- <metadata.json> --gameplay <clip> --publish` (or `node scripts/publish.mjs out/<id>`)
pushes `video.mp4`, `caption.txt` and `post.json` to `posts/<date>-<id>/` in the private repo
JamesAC42/hanbok-outbox and adds the post to its `index.json`, newest first. Slideshows go there too,
with `node scripts/publish-slides.mjs ../output/<id>`. `post.json` carries ready-to-use text for each
platform (`scripts/platforms.mjs`). Publishing also copies `POSTING.md` (repo root), the posting
runbook, to the outbox's README. Publishing refuses videos that still use the
placeholder gameplay or art; `--test` marks an entry for the agent to skip.

## Sora in Seoul skits

Short 4koma-style episodes (series bible: `/mnt/project-files/social/sora-shorts/`). Each one is
`skits/<ep>/skit.json`: hard-cut shots, subtitled lines, sound effects, a four-photo end strip,
and an optional lesson tail where Sora explains the line.

- `npm run skit -- skits/ep01/skit.json` renders `out/<id>/a.mp4` (the skit) and `b.mp4` (skit + lesson).
- Clips, start frames and sounds go in `public/skits/<ep>/` (git-ignored) and are referenced as
  `skits/<ep>/S1.mp4` etc. A shot with no `src` renders as a storyboard panel, so a skit
  without any media is an animatic. An image `src` (a start frame) gets a slow push-in.
- `npm run skit:studio` opens it in Remotion Studio.
