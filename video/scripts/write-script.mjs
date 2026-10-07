// Turns a line breakdown (the carousel generator's output/<id>/metadata.json) into a
// video scene: the video's own slides plus a tutor/learner dialogue written by an LLM.
//
//   node --experimental-strip-types scripts/write-script.mjs <metadata.json> [out/scene.json] [--hook N]
//     [--clip <path in public/> --clip-seconds N --clip-context "who says it to whom, what's happening"]
//
// WRITER_MODEL picks the writer: a gemini-* model (GEMINI_API_KEY) or an OpenAI one such as
// gpt-6.1-sol (OPENAI_API_KEY). In cloud sessions the proxy injects both keys.
import fs from 'fs';
import path from 'path';
import { DEFAULT_CTA_BROLL, slidesFromBreakdown } from '../src/scene.ts';

const MODEL = process.env.WRITER_MODEL || process.env.GEMINI_MODEL || 'gemini-3.8-flash';

const args = process.argv.slice(2);
const option = name => {
  const i = args.indexOf(name);
  return i >= 0 ? args.splice(i, 2)[1] : undefined;
};
const hookIndex = Number(option('--hook') ?? 0);
const clipSrc = option('--clip');
const clipSeconds = Number(option('--clip-seconds') ?? 0);
const clipContext = option('--clip-context');
const [inFile, outFile = 'out/scene.json'] = args;
if (!inFile) {
  console.error('usage: write-script.mjs <metadata.json> [out/scene.json] [--hook N]');
  process.exit(1);
}

const breakdown = JSON.parse(fs.readFileSync(inFile, 'utf8'));
const cast = JSON.parse(fs.readFileSync(new URL('../src/cast.json', import.meta.url), 'utf8'));
// With a clip of the show, the clip is the hook, so the hook title card goes.
const slides = slidesFromBreakdown(breakdown, hookIndex).slice(clipSrc ? 1 : 0);

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

// Expression names the writer can pick ("<name>_talk" images are mouth-open frames, not moods).
const moods = character => Object.keys(character.expressions).filter(name => !name.endsWith('_talk'));
const tutor = cast.tutor;
const learner = cast.learner;
const source = breakdown.source;
const opening = clipSrc
  ? `The video opens with a ${clipSeconds.toFixed(0)}-second clip from ${source || 'the show'} where the line is said, subtitled on screen.${clipContext ? ` In the clip: ${clipContext}.` : ''} Viewers have just heard it. The first beat comes right after the clip and reacts to what they just heard, so it can say "that" or "he" without setting the scene up again.`
  : `There's no clip of the show, so the first beat has to say plainly who says the line, to whom, and when${source ? ` in ${source}` : ''}.`;

const prompt = `You're writing the dialogue for a 35 to 50 second vertical TikTok Korean lesson. Two characters stand over lesson slides:
- ${tutor.name} (tutor): a Korean friend who knows the language cold. Calm, confident, a little dry. Talks like a friend explaining something over coffee, never like a teacher or a YouTuber.
- ${learner.name} (learner): a smart, sincere fan of Korean shows. She says what the viewer is thinking in as few words as possible. She's never a comedy prop.

The lesson is about one Korean line${source ? ` from ${source}` : ''}. ${opening}

The slides, in order:
${slides.map(describeSlide).join('\n')}

What makes these good (follow strictly):
1. The first beat is a true, specific, slightly surprising claim about the line, said plainly. Never invent a personal anecdote ("I said this to my roommate and..."). Never claim anything about subtitles or official translations beyond what's in the slides.
2. Ground it in the actual scene using only what's above or common knowledge about the show. If you're unsure of a plot detail, leave it out.
3. One insight per video. You don't have to narrate every slide: a slide can get a single short beat. Slide numbers never go backwards and every slide gets at least one beat.
4. Humor, if any, comes from specifics and understatement. No hyperbole, internet-speak or meme phrases. Banned: ride-or-die, blood pact, hostage, literally, totally, game-changer, mind-blown, vibe, bestie, slay, plot twist, guilt trip, "wait, what", "whoa", "ouch". Exclamation marks on at most two beats.
5. Short beats that sound good out loud: contractions, fragments are fine, at most 16 words, no lists, no colons. 8 to 13 beats.
6. ${learner.name} speaks at most a third of the beats. She never repeats or paraphrases ${tutor.name} as a question, and never asks a question just to hand him his next line.
7. The last beat plays over the CTA slide: one short, natural line about pasting any line into Hanbok for a breakdown like this. No hype.
8. Korean in Hangul exactly as on the slides (the voice reads Hangul), never romanized. At most one Korean phrase per beat.
- "expression" must be one of: ${tutor.name} (tutor): ${moods(tutor).join(', ')}; ${learner.name} (learner): ${moods(learner).join(', ')}.
- "delivery" is one plain word for the voice's tone (e.g. dry, curious, amused, matter-of-fact).`;

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

async function write() {
  if (MODEL.startsWith('gemini')) {
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
    return data.candidates?.[0]?.content?.parts?.filter(p => !p.thought).map(p => p.text || '').join('');
  }
  const res = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENAI_API_KEY || 'placeholder'}` },
    body: JSON.stringify({
      model: MODEL,
      input: prompt,
      text: { format: { type: 'json_schema', name: 'script', strict: true, schema: strictSchema(schema) } }
    })
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.output.filter(o => o.type === 'message').flatMap(o => o.content).filter(c => c.type === 'output_text').map(c => c.text).join('');
}

// OpenAI's strict mode wants every property required and no extra properties allowed.
function strictSchema(node) {
  if (node.type === 'object') {
    return { ...node, additionalProperties: false, required: Object.keys(node.properties),
      properties: Object.fromEntries(Object.entries(node.properties).map(([k, v]) => [k, strictSchema(v)])) };
  }
  if (node.type === 'array') return { ...node, items: strictSchema(node.items) };
  return node;
}

const text = await write();
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
  if (!moods(cast[beat.speaker]).includes(beat.expression)) beat.expression = 'neutral';
  beat.text = contract(beat.text);
}
const missing = slides.map((_, i) => i).filter(i => !beats.some(b => b.slide === i));
if (missing.length) console.warn(`Warning: no beat for slide(s) ${missing.join(', ')}; they won't be shown.`);

const base = path.basename(inFile) === 'metadata.json' ? path.basename(path.dirname(path.resolve(inFile))) : path.basename(inFile, '.json');
const id = base.replace(/[^\w-]/g, '') || `scene-${Date.now()}`;
const clip = clipSrc
  ? { src: clipSrc, seconds: clipSeconds, line: breakdown.line.native, translation: breakdown.line.common_translation, label: source }
  : undefined;
const scene = { id, hook: breakdown.hooks?.[hookIndex] || breakdown.title, slides, characters: cast, background: 'art/palace.jpg', ctaBroll: DEFAULT_CTA_BROLL, clip, beats };
fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, JSON.stringify(scene, null, 2));
console.log(beats.map(b => `[${b.slide}] ${cast[b.speaker].name} (${b.expression}): ${b.text}`).join('\n'));
console.log(`\nWrote ${outFile}`);
