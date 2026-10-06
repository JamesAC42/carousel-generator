// Lists the ElevenLabs voices on the account and voices short samples for picking
// the tutor and learner.
//
//   node scripts/voices.mjs                      list voices
//   node scripts/voices.mjs --sample <id> [<id>...] [--model eleven_v3]
//                                                write out/voice-samples/<name>-<role>.mp3
//
// Each sampled voice reads one tutor line and one learner line, so it can be judged in
// either role. Needs ELEVENLABS_API_KEY (in cloud sessions the proxy injects it).
import fs from 'fs';
import path from 'path';

const headers = { 'Content-Type': 'application/json', 'xi-api-key': process.env.ELEVENLABS_API_KEY || 'placeholder' };
const args = process.argv.slice(2);
const modelFlag = args.indexOf('--model');
const model = modelFlag >= 0 ? args.splice(modelFlag, 2)[1] : 'eleven_v3';

const LINES = {
  tutor: 'Ah. You got 깐부\'d. 잖아 means "you know". It reminds you of a promise.',
  learner: 'Wait, so 우리는 깐부잖아 was a guilt trip this whole time?!'
};

async function api(url, init) {
  const res = await fetch(`https://api.elevenlabs.io${url}`, { headers, ...init });
  if (!res.ok) throw new Error(`ElevenLabs ${res.status}: ${await res.text()}`);
  return res;
}

const { voices } = await (await api('/v2/voices?page_size=100')).json();
const byId = Object.fromEntries(voices.map(v => [v.voice_id, v]));

const sampleFlag = args.indexOf('--sample');
if (sampleFlag < 0) {
  for (const v of voices) {
    const l = v.labels || {};
    console.log(`${v.voice_id}  ${v.name}  [${v.category}] ${[l.gender, l.age, l.accent, l.descriptive || l.description, l.use_case].filter(Boolean).join(', ')}`);
  }
  process.exit(0);
}

const dir = path.join('out', 'voice-samples');
fs.mkdirSync(dir, { recursive: true });
for (const id of args.slice(sampleFlag + 1)) {
  const name = (byId[id]?.name || id).replace(/[^\w-]+/g, '_');
  for (const [role, text] of Object.entries(LINES)) {
    const res = await api(`/v1/text-to-speech/${id}?output_format=mp3_44100_128`, {
      method: 'POST', body: JSON.stringify({ text, model_id: model })
    });
    const file = path.join(dir, `${name}-${role}.mp3`);
    fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
    console.log(`Wrote ${file}`);
  }
}
