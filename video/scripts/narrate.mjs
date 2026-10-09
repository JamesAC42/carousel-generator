// Voices a scene with ElevenLabs and writes the real timings back into it:
// beat start/end, word timings (typed dialogue) and talking spans (mouth flaps).
//
//   node --experimental-strip-types scripts/narrate.mjs <scene.json> [--voices voices.json] [--per-line]
//
// By default the whole conversation is voiced in one take with ElevenLabs dialogue
// (/v1/text-to-dialogue), so the two voices react to each other; it sounds much less stitched
// than voicing line by line. --per-line voices each beat separately (the old way; editing one
// line then only re-voices that line). Audio goes to public/scenes/<scene id>/ and is cached by
// its text. Needs ELEVENLABS_API_KEY: in the environment, in the repo root's .env, or injected by a
// proxy (then run node with NODE_USE_ENV_PROXY=1).
import { execFileSync } from 'child_process';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import './env.mjs';
import { AUDIO_TAGS, THINK_SECONDS, dialogueStart, timingsFromAlignment } from '../src/scene.ts';

const args = process.argv.slice(2);
const voicesFlag = args.indexOf('--voices');
const voicesFile = voicesFlag >= 0 ? args.splice(voicesFlag, 2)[1] : 'voices.json';
const perLineFlag = args.indexOf('--per-line');
const perLine = perLineFlag >= 0 && !!args.splice(perLineFlag, 1);
const [sceneFile] = args;
if (!sceneFile) {
  console.error('usage: narrate.mjs <scene.json> [--voices voices.json]');
  process.exit(1);
}

// { "model": "eleven_v4", "tutor": "<voice id>", "learner": "<voice id>" }
const voices = JSON.parse(fs.readFileSync(voicesFile, 'utf8'));
const model = voices.model || 'eleven_v4';
// The one-take dialogue is sped up by this factor (ffmpeg atempo keeps the pitch); short-form
// videos hold attention better a little faster than the voices' natural pace.
const speed = voices.speed || 1;
// v3-style models take inline audio tags like [excited] and don't accept previous/next text.
const usesTags = /eleven_v[3-9]/.test(model);
// The [tag] said before a beat, if it has a real one.
const tagFor = beat => (usesTags && AUDIO_TAGS.includes(beat.delivery) ? `[${beat.delivery}] ` : '');

const scene = JSON.parse(fs.readFileSync(sceneFile, 'utf8'));
delete scene.think;

// After the quiz question, hold for THINK_SECONDS (the video shows a countdown) before the reveal:
// every beat from the reveal on moves later, and the one-take audio gets a matching pause.
function addThinkPause() {
  const quizSlide = scene.slides.findIndex(s => typeof s !== 'string' && s.kind === 'quiz' && s.question);
  const onQuiz = scene.beats.filter(b => b.slide === quizSlide);
  if (onQuiz.length < 2) return;
  const [ask, reveal] = onQuiz;
  const at = (ask.end + reveal.start) / 2;
  for (const b of scene.beats.slice(scene.beats.indexOf(reveal))) {
    b.start += THINK_SECONDS;
    b.end += THINK_SECONDS;
    b.words = b.words?.map(w => ({ ...w, start: w.start + THINK_SECONDS, end: w.end + THINK_SECONDS }));
    b.talk = b.talk?.map(([s, e]) => [s + THINK_SECONDS, e + THINK_SECONDS]);
  }
  if (scene.dialogueAudio) scene.dialogueAudio.pauses = [{ at: at - scene.dialogueAudio.start, seconds: THINK_SECONDS }];
  scene.think = { start: at, seconds: THINK_SECONDS };
}
const id = scene.id || path.basename(sceneFile, '.json');
const dir = path.join('public', 'scenes', id);
fs.mkdirSync(dir, { recursive: true });

async function tts(voiceId, body) {
  return post(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/with-timestamps?output_format=mp3_44100_128`, body);
}

async function post(url, body) {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'xi-api-key': process.env.ELEVENLABS_API_KEY || 'placeholder' },
      body: JSON.stringify(body)
    });
    if (res.ok) return res.json();
    if (res.status === 429 && attempt < 4) {
      await new Promise(r => setTimeout(r, 2000 * 2 ** attempt));
      continue;
    }
    throw new Error(`ElevenLabs ${res.status}: ${await res.text()}`);
  }
}

const voiceFor = beat => {
  const voiceId = voices[beat.speaker];
  if (!voiceId) throw new Error(`voices.json has no voice for "${beat.speaker}"`);
  return voiceId;
};

// Drops an audio tag's characters so the alignment lines up with the displayed text.
function stripPrefix(alignment, prefix) {
  if (!prefix || alignment.characters.slice(0, prefix.length).join('') !== prefix) return alignment;
  return {
    characters: alignment.characters.slice(prefix.length),
    character_start_times_seconds: alignment.character_start_times_seconds.slice(prefix.length),
    character_end_times_seconds: alignment.character_end_times_seconds.slice(prefix.length)
  };
}

if (!perLine) {
  const start = dialogueStart(scene);
  const inputs = scene.beats.map(b => ({ text: tagFor(b) + b.text, voice_id: voiceFor(b) }));
  const key = crypto.createHash('sha1').update(`${model}|${speed}|${JSON.stringify(inputs)}`).digest('hex').slice(0, 10);
  const base = path.join(dir, `dialogue-${key}`);
  let take;
  if (fs.existsSync(`${base}.json`)) {
    take = JSON.parse(fs.readFileSync(`${base}.json`, 'utf8'));
  } else {
    const out = await post('https://api.elevenlabs.io/v1/text-to-dialogue/with-timestamps?output_format=mp3_44100_128', { model_id: model, inputs });
    take = { alignment: out.alignment, voice_segments: out.voice_segments };
    fs.writeFileSync(`${base}.mp3`, Buffer.from(out.audio_base64, 'base64'));
    if (speed !== 1) {
      fs.renameSync(`${base}.mp3`, `${base}.raw.mp3`);
      execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', `${base}.raw.mp3`, '-filter:a', `atempo=${speed}`, '-b:a', '128k', `${base}.mp3`]);
      fs.rmSync(`${base}.raw.mp3`);
      const scale = t => t / speed;
      take.alignment = {
        ...take.alignment,
        character_start_times_seconds: take.alignment.character_start_times_seconds.map(scale),
        character_end_times_seconds: take.alignment.character_end_times_seconds.map(scale)
      };
      take.voice_segments = take.voice_segments.map(v => ({ ...v, start_time_seconds: scale(v.start_time_seconds), end_time_seconds: scale(v.end_time_seconds) }));
    }
    fs.writeFileSync(`${base}.json`, JSON.stringify(take));
  }

  const a = take.alignment;
  scene.beats.forEach((beat, i) => {
    // A beat can come back as more than one segment; span all of them.
    const segs = take.voice_segments.filter(s => s.dialogue_input_index === i);
    if (!segs.length) throw new Error(`ElevenLabs returned no audio for beat ${i}: ${beat.text}`);
    const from = Math.min(...segs.map(s => s.character_start_index));
    const to = Math.max(...segs.map(s => s.character_end_index));
    const sub = stripPrefix({
      characters: a.characters.slice(from, to),
      character_start_times_seconds: a.character_start_times_seconds.slice(from, to),
      character_end_times_seconds: a.character_end_times_seconds.slice(from, to)
    }, inputs[i].text.slice(0, inputs[i].text.length - beat.text.length));
    const { words, talk, end } = timingsFromAlignment(beat.text, sub, start);
    const beatStart = start + Math.min(...segs.map(s => s.start_time_seconds));
    Object.assign(beat, { start: beatStart, end: Math.max(end, start + Math.max(...segs.map(s => s.end_time_seconds))), words, talk });
    delete beat.audio;
    console.log(`${beat.start.toFixed(2)}s  ${scene.characters[beat.speaker].name}: ${beat.text}`);
  });
  scene.dialogueAudio = { src: path.relative('public', `${base}.mp3`), start };
  addThinkPause();
  fs.writeFileSync(sceneFile, JSON.stringify(scene, null, 2));
  console.log(`\nNarrated ${scene.beats.length} beats in one take, ${scene.beats[scene.beats.length - 1].end.toFixed(1)}s. Updated ${sceneFile}`);
  process.exit(0);
}

delete scene.dialogueAudio;
let cursor = dialogueStart(scene);
for (let i = 0; i < scene.beats.length; i++) {
  const beat = scene.beats[i];
  const voiceId = voiceFor(beat);

  const prefix = tagFor(beat);
  const spoken = prefix + beat.text;
  const key = crypto.createHash('sha1').update(`${model}|${voiceId}|${spoken}`).digest('hex').slice(0, 10);
  const base = path.join(dir, `${String(i).padStart(2, '0')}-${key}`);

  let alignment;
  if (fs.existsSync(`${base}.json`)) {
    alignment = JSON.parse(fs.readFileSync(`${base}.json`, 'utf8'));
  } else {
    const body = { text: spoken, model_id: model };
    if (!usesTags) {
      body.previous_text = scene.beats[i - 1]?.text;
      body.next_text = scene.beats[i + 1]?.text;
    }
    const out = await tts(voiceId, body);
    alignment = out.alignment;
    fs.writeFileSync(`${base}.mp3`, Buffer.from(out.audio_base64, 'base64'));
    fs.writeFileSync(`${base}.json`, JSON.stringify(alignment));
  }

  alignment = stripPrefix(alignment, prefix);

  const { words, talk, end } = timingsFromAlignment(beat.text, alignment, cursor);
  // The clip may run a little past the last character (breath, tag); keep the full clip.
  const clipEnd = cursor + Math.max(...alignment.character_end_times_seconds);
  Object.assign(beat, { start: cursor, end, audio: path.relative('public', `${base}.mp3`), words, talk });
  // A slightly longer pause when the other character answers.
  const next = scene.beats[i + 1];
  cursor = Math.max(end, clipEnd) + (next && next.speaker !== beat.speaker ? 0.3 : 0.15);
  console.log(`${beat.start.toFixed(2)}s  ${scene.characters[beat.speaker].name}: ${beat.text}`);
}

addThinkPause();
fs.writeFileSync(sceneFile, JSON.stringify(scene, null, 2));
console.log(`\nNarrated ${scene.beats.length} beats, ${cursor.toFixed(1)}s. Updated ${sceneFile}`);
