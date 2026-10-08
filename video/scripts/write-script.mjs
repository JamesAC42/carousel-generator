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
import './env.mjs';
import { AUDIO_TAGS, DEFAULT_CTA_BROLL, slidesFromBreakdown } from '../src/scene.ts';

const MODEL = process.env.WRITER_MODEL || process.env.GEMINI_MODEL || 'gpt-6.1-sol';

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
    case 'quiz': return `${i}. GUESS: a two-option quiz you write in "quiz" (see below), shown before the answer`;
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

// The shape we want, on 우리는 깐부잖아 (after a clip of the scene). Shown to the writer for rhythm only.
const SHAPE_EXAMPLE = `[1] TUTOR: Netflix says "we're friends." That's not what he's saying.
[2] SORA: Then what is 깐부?
[2] TUTOR: Comment your guess. Friend, or marble partner?
[2] TUTOR: Marble partner. You share everything you win.
[3] TUTOR: And 잖아 means "you know." He's reminding Gi-hun of a promise.
[4] SORA: So it's pressure, not friendship.
[5] TUTOR: The other ways people use 잖아 are on Hanbok. Link in bio.`;

const prompt = `You're writing the dialogue for a 20 to 30 second vertical TikTok about one Korean line. The goal is engagement, not teaching: viewers should watch to the end, comment, and tap the link in bio, where the full lesson is. Two characters stand over the slides:
- ${tutor.name} (tutor): a Korean friend who knows the language cold. Confident, a little dry.
- ${learner.name} (learner): a countryside girl from her grandmother's mountain village in Gangwon who just moved to Seoul. Sincere, unbothered, a little old-fashioned; she knows proper Korean but not Seoul slang, shows or memes, which is why she asks. She says what the viewer is thinking, in as few words as possible. Don't make her backstory the topic; at most one short nod to it per video.

The line${source ? ` is from ${source}` : ''}. ${opening}

The slides, in order:
${slides.map(describeSlide).join('\n')}

Rules (follow strictly):
1. The first beat is a hook: a specific, surprising claim that makes viewers need the answer, e.g. that the subtitle got it wrong or that it means something darker. Say it in under 12 words. Don't answer it yet.
2. The GUESS slide: write "quiz" as a short question about the one word or ending that carries the meaning, with two short options (under 6 words each), one correct and one the usual wrong reading. It gets exactly two beats: the first asks viewers to comment their guess and names both options; the second reveals the answer in a few words.
3. After the reveal, one or two beats on why it matters in the scene. Skip any slide you don't need; skipped slides aren't shown. Slide numbers never go backwards.
4. The last beat plays over the CTA slide: a tease of something the video didn't cover (other ways to use it, what it says about the speaker), then "link in bio". Never "paste any line".
5. 6 to 9 beats in total, each at most 12 words. Contractions, fragments are fine. No lists, no colons.
6. Only true, specific claims. Never invent a personal anecdote or a plot detail you're unsure of. Never claim anything about subtitles or official translations beyond what's in the slides.
7. No meme phrases or hype words (literally, totally, mind-blown, vibe, bestie, slay, plot twist, "wait, what", "whoa"). Exclamation marks on at most one beat.
8. ${learner.name} speaks at most a third of the beats, and never just to hand ${tutor.name} his next line.
9. Korean in Hangul exactly as on the slides (the voice reads Hangul), never romanized. At most one Korean phrase per beat.
- "expression" must be one of: ${tutor.name} (tutor): ${moods(tutor).join(', ')}; ${learner.name} (learner): ${moods(learner).join(', ')}.
- "delivery" is a voice direction, read by the voice model and never shown. Give one to about half the beats, where it fits the line: "curious" for a real question, "thoughtful" for reasoning, "sarcastic" for a dry aside, "surprised" for a reveal. Leave it "" on plain lines and the CTA. Choose only from: ${AUDIO_TAGS.join(', ')}. It is not the expression; never put an expression name here.

This example for a different line has the shape and pace we want (slide numbers in brackets). Don't copy its wording or facts:
${SHAPE_EXAMPLE}`;

const schema = {
  type: 'object',
  properties: {
    quiz: {
      type: 'object',
      properties: {
        question: { type: 'string' },
        options: { type: 'array', items: { type: 'string' } },
        answer: { type: 'integer' }
      },
      required: ['question', 'options', 'answer']
    },
    beats: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          speaker: { type: 'string', enum: ['tutor', 'learner'] },
          slide: { type: 'integer' },
          expression: { type: 'string' },
          delivery: { type: 'string', enum: ['', ...AUDIO_TAGS] },
          text: { type: 'string' }
        },
        required: ['speaker', 'slide', 'expression', 'text']
      }
    }
  },
  required: ['quiz', 'beats']
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
const { beats, quiz } = JSON.parse(text);
// Fill in the quiz slide; drop it if the model's quiz is unusable.
const quizIndex = slides.findIndex(sl => sl.kind === 'quiz');
if (quizIndex >= 0) {
  if (quiz?.question && quiz.options?.length === 2 && (quiz.answer === 0 || quiz.answer === 1)) {
    slides[quizIndex] = { kind: 'quiz', question: quiz.question, options: quiz.options, answer: quiz.answer };
  } else {
    console.warn('Warning: the writer returned no usable quiz; the guess slide is left out.');
  }
}

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
  if (!AUDIO_TAGS.includes(beat.delivery)) delete beat.delivery;
}
const missing = slides.map((_, i) => i).filter(i => !beats.some(b => b.slide === i));
if (missing.length) console.warn(`Warning: no beat for slide(s) ${missing.join(', ')}; they won't be shown.`);

const base = path.basename(inFile) === 'metadata.json' ? path.basename(path.dirname(path.resolve(inFile))) : path.basename(inFile, '.json');
const id = base.replace(/[^\w-]/g, '') || `scene-${Date.now()}`;
const clip = clipSrc
  ? { src: clipSrc, seconds: clipSeconds, line: breakdown.line.native, translation: breakdown.line.common_translation, label: source }
  : undefined;
const scene = { id, quiz: slides.find(sl => sl.kind === 'quiz' && sl.question), hook: breakdown.hooks?.[hookIndex] || breakdown.title, slides, characters: cast, background: 'art/palace.jpg', ctaBroll: DEFAULT_CTA_BROLL, clip, beats };
fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, JSON.stringify(scene, null, 2));
console.log(beats.map(b => `[${b.slide}] ${cast[b.speaker].name} (${b.expression}): ${b.text}`).join('\n'));
console.log(`\nWrote ${outFile}`);
