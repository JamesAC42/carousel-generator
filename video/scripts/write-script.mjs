// Turns a line breakdown (the carousel generator's output/<id>/metadata.json) into a
// video scene: the video's own slides plus a tutor/learner dialogue written by Gemini.
//
//   node --experimental-strip-types scripts/write-script.mjs <metadata.json> [out/scene.json] [--hook N]
//
// Needs GEMINI_API_KEY (in cloud sessions the proxy injects it).
import fs from 'fs';
import path from 'path';
import { DEFAULT_CTA_BROLL, slidesFromBreakdown } from '../src/scene.ts';

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
- ${tutor.name} does the teaching. ${learner.name} only speaks when she adds something: a real reaction with a feeling or opinion ("Ouch. That's brutal."), a confident wrong guess that ${tutor.name} corrects, or tying it back to her hook situation. She never repeats or paraphrases what ${tutor.name} just said as a question ("Wait, so they share everything?"), and never asks a question just to hand ${tutor.name} his next line. If a learner line could be deleted without losing anything, delete it.
- Each beat is at most 16 words. Total 9 to 14 beats.
- Write it the way people talk out loud: always contract (it's, that's, you're, don't, can't, isn't, we're), short sentences, fragments are fine, casual openers like "wait", "okay so", "hold on" where they fit. Never "it is", "do not" or "you cannot" where a person would contract. No lecture tone or textbook phrasing.
- ${learner.name} sounds like a real young person talking to a friend, not a narrator.
- Write Korean words in Hangul exactly as on the slides, never romanized (the voice reads Hangul). Use at most one Korean phrase per beat.
- No emoji, no stage directions in the text, no hashtags.
- The ending lands the story before it sells anything. Just before the CTA slide, ${learner.name} pays off her hook (what she'll say to that person now, or what she finally gets). Then the CTA comes out of that moment as the obvious next step, not as an ad read. The CTA beat plays over the CTA slide and mentions pasting any line into Hanbok to get it broken down like this, in words that follow from the line before it. Good: Sora "Okay, I owe my roommate an apology." / ${tutor.name} "Or just paste the next line into Hanbok before you quote it." Bad: a sudden "Paste any line into Hanbok for a breakdown like this!" after an unrelated line.
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

// TTS reads exactly what's written, and "it is" for "it's" sounds stiff out loud, so contract
// anything the model left uncontracted. Only before another word: "that's what it is" stays.
const CONTRACTIONS = [
  [/\b(it|that|what|there|here|he|she|who|where|how) is (?=[a-z가-힯])/gi, "$1's "],
  [/\b(you|we|they) are (?=[a-z가-힯])/gi, "$1're "],
  [/\bI am (?=[a-z가-힯])/g, "I'm "],
  [/\b(I|you|we|they|it|that) will (?=[a-z가-힯])/gi, "$1'll "],
  [/\b(I|you|we|they) have (?=been|never|already|just|heard|seen)/gi, "$1've "],
  [/\blet us\b/gi, "let's"],
  [/\b(do|does|did|is|are|was|were|has|have|had|would|should|could) not\b/gi, "$1n't"],
  [/\b(c)an ?not\b/gi, "$1an't"],
  [/\b(w)ill not\b/gi, "$1on't"]
];
function contract(text) {
  return CONTRACTIONS.reduce((out, [re, to]) => out.replace(re, to), text);
}

// Keep the model honest: clamp slides to range and never let them go backwards,
// and fall back to neutral for an expression the cast doesn't have.
let lastSlide = 0;
for (const beat of beats) {
  beat.slide = Math.min(slides.length - 1, Math.max(lastSlide, beat.slide | 0));
  lastSlide = beat.slide;
  if (!(beat.expression in cast[beat.speaker].expressions)) beat.expression = 'neutral';
  beat.text = contract(beat.text);
}
const missing = slides.map((_, i) => i).filter(i => !beats.some(b => b.slide === i));
if (missing.length) console.warn(`Warning: no beat for slide(s) ${missing.join(', ')}; they won't be shown.`);

const base = path.basename(inFile) === 'metadata.json' ? path.basename(path.dirname(path.resolve(inFile))) : path.basename(inFile, '.json');
const id = base.replace(/[^\w-]/g, '') || `scene-${Date.now()}`;
const scene = { id, hook: slides[0].text, slides, characters: cast, background: 'art/palace.jpg', ctaBroll: DEFAULT_CTA_BROLL, beats };
fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, JSON.stringify(scene, null, 2));
console.log(beats.map(b => `[${b.slide}] ${cast[b.speaker].name} (${b.expression}): ${b.text}`).join('\n'));
console.log(`\nWrote ${outFile}`);
