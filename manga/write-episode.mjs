// Writes a manga episode (episode.json) from a gag premise: the slides, a layout per slide, one
// art prompt per panel, and every balloon, caption and sound effect. The art comes later (James's
// ComfyUI, or GPT Image takes from the picker page), then render.mjs assembles the slides.
//
//   npm run manga:episode -- "<premise: the four beats, or a series bible episode>" --line "<Korean line>" [--id ep02-name] [--episode 2]
//
// Writes output/manga/<id>/episode.json. WRITER_MODEL picks the model (default gpt-6.1-sol,
// OPENAI_API_KEY from the environment or the repo's .env).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import '../video/scripts/env.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const MODEL = process.env.WRITER_MODEL || 'gpt-6.1-sol';

const args = process.argv.slice(2);
const option = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args.splice(i, 2)[1] : undefined;
};
const line = option('--line');
const episodeNo = Number(option('--episode') ?? 0);
let id = option('--id');
const premise = args.join(' ').trim();
if (!premise || !line) {
  console.error('usage: npm run manga:episode -- "<premise>" --line "<Korean line>" [--id ep02-name] [--episode N]');
  process.exit(1);
}
id ||= `manga-${Date.now()}`;

const example = fs.readFileSync(path.join(here, 'examples', 'ep01-bongtu', 'episode.json'), 'utf8');
const LAYOUTS = { cover: 1, splash: 1, two: 2, three: 3 };
const SHAPES = { cover: 'tall', splash: 'tall', two: 'half', three: 'strip' };

const prompt = `You write episodes of "Sora in Seoul", a black-and-white manga posted as a 9:16 photo slideshow (TikTok, Reels) by Hanbok, a Korean-learning site.

Cast:
- Sora: a sincere, deadpan country girl from a Gangwon mountain village, new to Seoul, always in hanbok. She treats trivial modern things with ceremonial seriousness. She never panics; she stares.
- Kkachi: a round black-and-white magpie, the silent straight man. He never talks. His side-eye is the laugh track.
- Horang: a tiger-eared Korean teacher. He appears ONLY on the lesson and CTA slides (stock art), never in the story.
- Background strangers (cashiers, office workers) are deadpan and treat everything as normal.

How the comedy works: four beats (setup, development, twist, punchline). Visual gag first: the joke must read with ZERO knowledge of Korean culture. The punchline lands on a silent deadpan face and Kkachi's side-eye. Never explain the joke. The Korean line is what the reader learns, not what they need to get the joke.

Write the episode for this premise:
${premise}

The Korean line to teach: ${line}

Output ONE JSON object in exactly the same format as this example episode (same keys, same style_prefix, same stock_panels, same refs object):
${example}

Rules:
- id "${id}", episode ${episodeNo || 'number from the premise if any, else 0'}, series "Sora in Seoul".
- Exactly 8 slides: n=1 layout "cover" (1 panel, shape "tall"; text.title = the Korean line or its key word, text.subtitle "Sora in Seoul · #N", text.hook = a short curiosity hook in English); n=2..6 the story, each layout "two" (2 panels, shape "half"), "three" (3 panels, shape "strip") or "splash" (1 panel, shape "tall"), with at least one splash for the big moment; n=7 layout "lesson" with stock "horang-explaining"; n=8 layout "cta" with stock "sora-horang-cta" and an "ask" that invites comments about the gag.
- Panel ids p01, p02, ... in order. refs lists which characters are in the panel, in the order the prompt names them as <image1>, <image2>. Strangers need no ref.
- Every panel prompt describes ONE image: shot size, who, action, expression, setting, and where the empty space for text is ("Empty space in the upper left"). Art never contains text, letters, signs or speech bubbles.
- text.balloons: {panel, speaker, ko, en, at}; text.captions: {panel, en, at}; text.sfx: {panel, ko, en, at}. "at" is tl, tr, bl or br and must match the empty space named in that panel's prompt. Spoken lines are in Korean with an English translation; narration captions are short English. At most one balloon per panel.
- The lesson slide: kicker (e.g. "Wait, what did he ask?"), the line with romaja and English, 2 or 3 pieces, and 2 natural answers or variations.
- caption: 2 to 4 short lines for TikTok (hook, the line = meaning, how to answer), then "Sora is an AI-drawn character by Hanbok." then 5 or 6 hashtags including #learnkorean.
- The art is black and white: no gag may depend on a color.
- The big moment (usually the splash) carries the key spoken line in a balloon or a sound effect; a silent page is fine only for the final deadpan beat.
- The Korean must be natural and correct. Romaja in Revised Romanization.`;

async function write() {
  const res = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENAI_API_KEY || 'placeholder'}` },
    // Streamed so a long think doesn't hit a proxy's idle timeout before the answer starts.
    body: JSON.stringify({ model: MODEL, input: prompt, stream: true, text: { format: { type: 'json_object' } } }),
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${await res.text()}`);
  let out = '';
  let buffer = '';
  for await (const chunk of res.body.pipeThrough(new TextDecoderStream())) {
    buffer += chunk;
    const events = buffer.split('\n\n');
    buffer = events.pop();
    for (const event of events) {
      const data = event.split('\n').find((l) => l.startsWith('data: '))?.slice(6);
      if (!data || data === '[DONE]') continue;
      const e = JSON.parse(data);
      if (e.type === 'response.output_text.delta') out += e.delta;
      if (e.type === 'response.failed' || e.type === 'error') throw new Error(`OpenAI: ${JSON.stringify(e.response?.error || e)}`);
    }
  }
  return out;
}

// Problems a re-run should fix; an empty list means the episode can be rendered.
export function checkEpisode(ep) {
  const errors = [];
  if (ep.slides?.length !== 8) errors.push(`expected 8 slides, got ${ep.slides?.length}`);
  const ids = new Set();
  for (const s of ep.slides || []) {
    if (s.layout === 'lesson' || s.layout === 'cta') {
      if (!s.stock || !ep.stock_panels?.[s.stock]) errors.push(`slide ${s.n}: unknown stock "${s.stock}"`);
      continue;
    }
    const want = LAYOUTS[s.layout];
    if (!want) { errors.push(`slide ${s.n}: unknown layout "${s.layout}"`); continue; }
    if (s.panels?.length !== want) errors.push(`slide ${s.n}: ${s.layout} needs ${want} panels`);
    for (const p of s.panels || []) {
      if (ids.has(p.id)) errors.push(`duplicate panel id ${p.id}`);
      ids.add(p.id);
      if (p.shape !== SHAPES[s.layout]) errors.push(`${p.id}: shape should be ${SHAPES[s.layout]}`);
      for (const r of p.refs || []) if (!ep.refs?.[r]) errors.push(`${p.id}: unknown ref "${r}"`);
      if (!p.prompt) errors.push(`${p.id}: no prompt`);
    }
    for (const kind of ['balloons', 'captions', 'sfx'])
      for (const t of s.text?.[kind] || [])
        if (!s.panels?.some((p) => p.id === t.panel)) errors.push(`slide ${s.n}: ${kind} points at ${t.panel}, not on this slide`);
  }
  if (!ep.caption) errors.push('no caption');
  return errors;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  let ep, errors;
  for (let attempt = 1; attempt <= 2; attempt++) {
    ep = JSON.parse(await write());
    errors = checkEpisode(ep);
    if (!errors.length) break;
    console.warn(`Attempt ${attempt} had problems:\n  ${errors.join('\n  ')}`);
  }
  const outDir = path.join('output', 'manga', id);
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'episode.json'), JSON.stringify(ep, null, 2));
  if (errors.length) {
    console.error(`Wrote ${outDir}/episode.json, but fix these before rendering:\n  ${errors.join('\n  ')}`);
    process.exit(1);
  }
  console.log(`Wrote ${outDir}/episode.json`);
}
