// Turns a line breakdown (the carousel generator's output/<id>/metadata.json) into a
// video scene: the video's own slides plus a tutor/learner dialogue written by Gemini.
//
//   node --experimental-strip-types scripts/write-script.mjs <metadata.json> [out/scene.json] [--hook N]
//
// Needs GEMINI_API_KEY (in cloud sessions the proxy injects it).
import fs from 'fs';
import path from 'path';
import { slidesFromBreakdown } from '../src/scene.ts';

const MODEL = process.env.GEMINI_MODEL || 'gemini-3.8-flash';

const args = process.argv.slice(2);
const hookFlag = args.indexOf('--hook');
const hookIndex = hookFlag >= 0 ? Number(args.splice(hookFlag, 2)[1]) : 0;
const [inFile, outFile = 'out/scene.json'] = args;
if (!inFile) {
  console.error('usage: write-script.mjs <metadata.json> [out/scene.json] [--hook N]');
  process.exit(1);
}

const breakdown = JSON.parse(fs.readFileSync(inFile, 'utf8'));
const cast = JSON.parse(fs.readFileSync(new URL('../src/cast.json', import.meta.url), 'utf8'));
const slides = slidesFromBreakdown(breakdown, hookIndex);

function describeSlide(s, i) {
  switch (s.kind) {
    case 'hook': return `${i}. HOOK title card: "${s.text}"`;
    case 'line': return `${i}. THE LINE: ${s.native} (${s.romanization}). Subtitles say: "${s.translation}"`;
    case 'part': return `${i}. PART: ${s.native} (${s.romanization}) = ${s.meaning}${s.note ? `. Note: ${s.note}` : ''}`;
    case 'nuance': return `${i}. WHAT IT REALLY MEANS: literal "${s.literal}", natural "${s.natural}". ${s.nuance}`;
    case 'use': return `${i}. USE IT: ${s.native} (${s.romanization}) = ${s.english}`;
    case 'cta': return `${i}. CTA: ${s.text}`;
  }
}

const tutor = cast.tutor;
const learner = cast.learner;
const prompt = `You write the script for a 30 to 45 second vertical TikTok lesson in visual-novel style.
Two characters talk over lesson slides. ${tutor.name} is the tutor: warm, a little smug, explains fast.
${learner.name} is the learner: a relatable English-speaking ${breakdown.source ? `${breakdown.source} fan` : 'K-content fan'} who is learning Korean.

The lesson is about one Korean line${breakdown.source ? ` from ${breakdown.source}` : ''}. The slides, in order:
${slides.map(describeSlide).join('\n')}

Write the dialogue as beats. Each beat is one character saying one short line while one slide is on screen.

RULES
- The first beat is ${learner.name}'s hook: a funny, specific everyday situation where the line confused or burned them, said in under 2 seconds of speech. It plays over slide 0. Make people want to hear the answer.
- Then walk through every slide in order. Slide numbers never go backwards. Every slide gets at least one beat.
- ${tutor.name} does the teaching. ${learner.name} reacts, asks the question a viewer would ask, or gets it wrong once in a funny way.
- Each beat is at most 16 words. Total 9 to 14 beats. Spoken English, contractions, no lecture tone.
- Write Korean words in Hangul exactly as on the slides, never romanized (the voice reads Hangul). Use at most one Korean phrase per beat.
- No emoji, no stage directions in the text, no hashtags.
- The last beat plays over the CTA slide and tells people to paste any line into Hanbok for a breakdown like this. Keep it casual.
- "expression" must be one of: ${tutor.name} (tutor): ${Object.keys(tutor.expressions).join(', ')}; ${learner.name} (learner): ${Object.keys(learner.expressions).join(', ')}.
- "delivery" is one short emotion word for the voice (e.g. excited, sighing, teasing, curious).`;

const schema = {
  type: 'object',
  properties: {
    beats: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          speaker: { type: 'string', enum: ['tutor', 'learner'] },
          slide: { type: 'integer' },
          expression: { type: 'string' },
          delivery: { type: 'string' },
          text: { type: 'string' }
        },
        required: ['speaker', 'slide', 'expression', 'text']
      }
    }
  },
  required: ['beats']
};

const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY || 'placeholder' },
  body: JSON.stringify({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { responseMimeType: 'application/json', responseSchema: schema, temperature: 1 }
  })
});
if (!res.ok) throw new Error(`Gemini ${res.status}: ${await res.text()}`);
const data = await res.json();
const text = data.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('');
const { beats } = JSON.parse(text);

// Keep the model honest: clamp slides to range and never let them go backwards,
// and fall back to neutral for an expression the cast doesn't have.
let lastSlide = 0;
for (const beat of beats) {
  beat.slide = Math.min(slides.length - 1, Math.max(lastSlide, beat.slide | 0));
  lastSlide = beat.slide;
  if (!(beat.expression in cast[beat.speaker].expressions)) beat.expression = 'neutral';
}
const missing = slides.map((_, i) => i).filter(i => !beats.some(b => b.slide === i));
if (missing.length) console.warn(`Warning: no beat for slide(s) ${missing.join(', ')}; they won't be shown.`);

const base = path.basename(inFile) === 'metadata.json' ? path.basename(path.dirname(path.resolve(inFile))) : path.basename(inFile, '.json');
const id = base.replace(/[^\w-]/g, '') || `scene-${Date.now()}`;
const scene = { id, hook: slides[0].text, slides, characters: cast, background: 'art/palace.jpg', beats };
fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, JSON.stringify(scene, null, 2));
console.log(beats.map(b => `[${b.slide}] ${cast[b.speaker].name} (${b.expression}): ${b.text}`).join('\n'));
console.log(`\nWrote ${outFile}`);
