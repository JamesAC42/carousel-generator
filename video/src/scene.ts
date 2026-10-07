// A lesson video is a list of beats. Each beat is one line of dialogue from one
// character, shown over one lesson slide. Times are in seconds; with real narration
// they come from the TTS timestamps, without it they are estimated from text length.
//
// This file has no imports so the node scripts can load it directly
// (node --experimental-strip-types).

export type Speaker = 'tutor' | 'learner';

export interface Beat {
  speaker: Speaker;
  expression: string;
  text: string;
  slide: number;
  start: number;
  end: number;
  // Optional ElevenLabs audio tag for v3-style models, e.g. "excited". Never shown.
  delivery?: string;
  // Narration clip for this beat, relative to public/.
  audio?: string;
  // Words with their own timings, for the typed dialogue. Estimated when there is no TTS alignment.
  words?: { text: string; start: number; end: number }[];
  // Spans (absolute seconds) where the speaker is actually voicing sound. Drives mouth flaps.
  talk?: [number, number][];
}

export interface Character {
  name: string;
  // expression name -> image path relative to public/. An optional "<expression>_talk"
  // image is the mouth-open frame for that expression.
  expressions: Record<string, string>;
  side: 'left' | 'right';
}

// Slides drawn by the video itself, laid out to sit above the characters.
export type VideoSlide =
  | { kind: 'hook'; text: string; source?: string }
  | { kind: 'line'; native: string; romanization: string; translation: string; source?: string }
  | { kind: 'part'; line: string; native: string; romanization: string; meaning: string; note?: string }
  | { kind: 'nuance'; native: string; literal: string; natural: string; nuance: string }
  | { kind: 'use'; native: string; romanization: string; english: string }
  | { kind: 'cta'; text: string };

// An image path (relative to public/) or a slide the video draws itself.
export type Slide = string | VideoSlide;

export interface Scene {
  id?: string;
  hook: string;
  beats: Beat[];
  slides: Slide[];
  characters: Record<Speaker, Character>;
  background?: string;
  gameplay?: string;
  // Seconds into the gameplay video to start from, so videos don't all show the same stretch.
  gameplayStart?: number;
  /** Screen recording of the site played in the slide card during the CTA, e.g. public/broll/site-cta.mp4. */
  ctaBroll?: { src: string; seconds: number };
  /** Cold open: a short clip of the show saying the line, played before the dialogue starts. */
  clip?: { src: string; seconds: number; line: string; translation?: string; label?: string };
  /** The whole conversation voiced in one take (ElevenLabs dialogue), starting at `start` seconds. */
  dialogueAudio?: { src: string; start: number };
}

/** When the dialogue starts: right away, or just after the cold-open clip. */
export function dialogueStart(scene: Pick<Scene, 'clip'>): number {
  return scene.clip ? scene.clip.seconds + 0.4 : 0.4;
}

export const DEFAULT_CTA_BROLL = { src: 'broll/site-cta.mp4', seconds: 7.7 };

// The line breakdown the carousel generator writes to output/<id>/metadata.json.
export interface LineBreakdown {
  title: string;
  hooks: string[];
  source?: string;
  line: { native: string; romanization: string; common_translation: string; literal: string; natural: string };
  parts: { native: string; romanization: string; meaning: string; note?: string }[];
  nuance: string;
  use_it: { native: string; romanization: string; english: string };
}

export const CTA_TEXT = 'Paste any line into Hanbok for a breakdown like this';

export function slidesFromBreakdown(b: LineBreakdown, hookIndex = 0): VideoSlide[] {
  const source = b.source || undefined;
  return [
    { kind: 'hook', text: b.hooks[hookIndex] || b.hooks[0] || b.title, source },
    { kind: 'line', native: b.line.native, romanization: b.line.romanization, translation: b.line.common_translation, source },
    ...b.parts.map(p => ({ kind: 'part' as const, line: b.line.native, native: p.native, romanization: p.romanization, meaning: p.meaning, note: p.note })),
    { kind: 'nuance', native: b.line.native, literal: b.line.literal, natural: b.line.natural, nuance: b.nuance },
    { kind: 'use', native: b.use_it.native, romanization: b.use_it.romanization, english: b.use_it.english },
    { kind: 'cta', text: CTA_TEXT }
  ];
}

const CHARS_PER_SECOND = 14;
const NON_VOICED = /[\s.,!?;:"'“”‘’()\-–—…~]/;

function wordsFromSpan(text: string, start: number, end: number) {
  const tokens = text.split(/\s+/).filter(Boolean);
  const totalChars = tokens.reduce((n, w) => n + [...w].length, 0) || 1;
  let wt = start;
  return tokens.map(token => {
    const d = ((end - start) * [...token].length) / totalChars;
    const w = { text: token, start: wt, end: wt + d };
    wt += d;
    return w;
  });
}

// Fills in start/end and word timings from text length when there is no narration yet.
export function estimateTimings(beats: Omit<Beat, 'start' | 'end'>[], start = 0.4, gap = 0.25): Beat[] {
  let t = start;
  return beats.map(beat => {
    const duration = Math.max(1.6, [...beat.text].length / CHARS_PER_SECOND);
    const start = t;
    const end = t + duration;
    t = end + gap;
    const words = wordsFromSpan(beat.text, start, end);
    return { ...beat, start, end, words, talk: words.map(w => [w.start, w.end - 0.03] as [number, number]) };
  });
}

// Character-level TTS alignment (ElevenLabs' "alignment" field), offset to the beat's start.
export interface Alignment {
  characters: string[];
  character_start_times_seconds: number[];
  character_end_times_seconds: number[];
}

// Word timings and talking spans from a character alignment of `text`.
export function timingsFromAlignment(text: string, a: Alignment, offset: number) {
  const words: { text: string; start: number; end: number }[] = [];
  const talk: [number, number][] = [];
  let word: { text: string; start: number; end: number } | null = null;
  a.characters.forEach((ch, i) => {
    const s = offset + a.character_start_times_seconds[i];
    const e = offset + a.character_end_times_seconds[i];
    if (/\s/.test(ch)) {
      if (word) words.push(word);
      word = null;
    } else if (word) {
      word.text += ch;
      word.end = e;
    } else {
      word = { text: ch, start: s, end: e };
    }
    if (!NON_VOICED.test(ch)) {
      const last = talk[talk.length - 1];
      // Merge sounds closer than a short pause so the mouth only closes on real breaks.
      if (last && s - last[1] < 0.12) last[1] = e;
      else talk.push([s, e]);
    }
  });
  if (word) words.push(word);
  // The alignment can differ slightly from the display text (normalisation); fall back if so.
  const joined = words.map(w => w.text).join(' ');
  const end = offset + (a.character_end_times_seconds[a.character_end_times_seconds.length - 1] || 0);
  return { words: joined === text.trim().split(/\s+/).join(' ') ? words : wordsFromSpan(text, offset, end), talk, end };
}

export function sceneDuration(scene: Scene): number {
  const last = scene.beats[scene.beats.length - 1];
  const end = (last ? last.end : 0) + 1.2;
  // Let the site b-roll finish (it ends on the hanbokstudy.com card) after the last line.
  const start = ctaStart(scene);
  return scene.ctaBroll && start !== undefined ? Math.max(end, start + scene.ctaBroll.seconds) : end;
}

/** When the CTA slide comes on screen, if the scene has one. */
export function ctaStart(scene: Scene): number | undefined {
  const index = scene.slides.findIndex(s => typeof s !== 'string' && s.kind === 'cta');
  return scene.beats.find(b => b.slide === index)?.start;
}
