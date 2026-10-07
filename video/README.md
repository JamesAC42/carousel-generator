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
# 2. Voice every line with ElevenLabs; writes real timings into the scene
# voices.json: tutor = KKC HQ, learner (Sora) = Jessica, model eleven_v4
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
- Keys: `GEMINI_API_KEY` and `ELEVENLABS_API_KEY`. In a cloud session behind the agent proxy,
  run node with `NODE_USE_ENV_PROXY=1` so `fetch` goes through it, and
  `CHROME_PATH=<headless_shell>` for rendering.

## Publishing to the outbox

`npm run lesson -- <metadata.json> --gameplay <clip> --publish` (or `node scripts/publish.mjs out/<id>`)
pushes `video.mp4`, `caption.txt` and `post.json` to `posts/<date>-<id>/` in the private repo
JamesAC42/hanbok-outbox and adds the post to its `index.json`, newest first. The posting agent pulls
that repo, posts each new folder's video with its caption to the account in `post.json`, and keeps
its own record of posted ids (see the outbox README). Publishing refuses videos that still use the
placeholder gameplay or art; `--test` marks an entry for the agent to skip.
