# Lesson videos

Narrated visual-novel lessons: the tutor explains a line to the learner over the
lesson slides, with gameplay in the bottom band. Built with Remotion.

```
npm install
# 1. Line breakdown (carousel generator output) -> scene with slides + dialogue (Gemini)
npm run script -- ../output/<id>/metadata.json out/<name>.json [--hook N]
# 2. Voice every line with ElevenLabs; writes real timings into the scene
cp voices.example.json voices.json   # then fill in the two voice ids
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
