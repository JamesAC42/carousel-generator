// Voices every beat of a scene with ElevenLabs and writes the real timings back into it:
// beat start/end, word timings (typed dialogue) and talking spans (mouth flaps).
//
//   node --experimental-strip-types scripts/narrate.mjs <scene.json> [--voices voices.json]
//
// Audio goes to public/scenes/<scene id>/. Clips are cached by voice + text, so editing
// one line only re-voices that line. Needs ELEVENLABS_API_KEY (in cloud sessions the
// proxy injects it).
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { timingsFromAlignment } from '../src/scene.ts';

const args = process.argv.slice(2);
const voicesFlag = args.indexOf('--voices');
const voicesFile = voicesFlag >= 0 ? args.splice(voicesFlag, 2)[1] : 'voices.json';
const [sceneFile] = args;
if (!sceneFile) {
  console.error('usage: narrate.mjs <scene.json> [--voices voices.json]');
  process.exit(1);
}

// { "model": "eleven_v4", "tutor": "<voice id>", "learner": "<voice id>" }
const voices = JSON.parse(fs.readFileSync(voicesFile, 'utf8'));
const model = voices.model || 'eleven_v4';
// v3-style models take inline audio tags like [excited] and don't accept previous/next text.
const usesTags = /eleven_v[3-9]/.test(model);

const scene = JSON.parse(fs.readFileSync(sceneFile, 'utf8'));
const id = scene.id || path.basename(sceneFile, '.json');
const dir = path.join('public', 'scenes', id);
fs.mkdirSync(dir, { recursive: true });

async function tts(voiceId, body) {
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/with-timestamps?output_format=mp3_44100_128`;
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

let cursor = 0.3;
for (let i = 0; i < scene.beats.length; i++) {
  const beat = scene.beats[i];
  const voiceId = voices[beat.speaker];
  if (!voiceId) throw new Error(`voices.json has no voice for "${beat.speaker}"`);

  const prefix = usesTags && beat.delivery ? `[${beat.delivery}] ` : '';
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

  // Drop the audio tag's characters so the alignment lines up with the displayed text.
  if (prefix && alignment.characters.slice(0, prefix.length).join('') === prefix) {
    alignment = {
      characters: alignment.characters.slice(prefix.length),
      character_start_times_seconds: alignment.character_start_times_seconds.slice(prefix.length),
      character_end_times_seconds: alignment.character_end_times_seconds.slice(prefix.length)
    };
  }

  const { words, talk, end } = timingsFromAlignment(beat.text, alignment, cursor);
  // The clip may run a little past the last character (breath, tag); keep the full clip.
  const clipEnd = cursor + Math.max(...alignment.character_end_times_seconds);
  Object.assign(beat, { start: cursor, end, audio: path.relative('public', `${base}.mp3`), words, talk });
  // A slightly longer pause when the other character answers.
  const next = scene.beats[i + 1];
  cursor = Math.max(end, clipEnd) + (next && next.speaker !== beat.speaker ? 0.3 : 0.15);
  console.log(`${beat.start.toFixed(2)}s  ${scene.characters[beat.speaker].name}: ${beat.text}`);
}

fs.writeFileSync(sceneFile, JSON.stringify(scene, null, 2));
console.log(`\nNarrated ${scene.beats.length} beats, ${cursor.toFixed(1)}s. Updated ${sceneFile}`);
