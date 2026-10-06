// A lesson video is a list of beats. Each beat is one line of dialogue from one
// character, shown over one lesson slide. Times are in seconds; with real narration
// they come from the TTS timestamps, without it they are estimated from text length.

export type Speaker = 'tutor' | 'learner';

export interface Beat {
  speaker: Speaker;
  expression: string;
  text: string;
  slide: number;
  start: number;
  end: number;
  // Words with their own timings, for captions. Estimated when there is no TTS alignment.
  words?: { text: string; start: number; end: number }[];
}

export interface Character {
  name: string;
  // expression name -> image path relative to public/
  expressions: Record<string, string>;
  side: 'left' | 'right';
}

export interface Scene {
  hook: string;
  beats: Beat[];
  slides: string[];
  characters: Record<Speaker, Character>;
  audio?: string;
  gameplay?: string;
}

const CHARS_PER_SECOND = 14;

// Fills in start/end and word timings from text length when there is no narration yet.
export function estimateTimings(beats: Omit<Beat, 'start' | 'end'>[], gap = 0.25): Beat[] {
  let t = 0.4;
  return beats.map(beat => {
    const duration = Math.max(1.6, [...beat.text].length / CHARS_PER_SECOND);
    const start = t;
    const end = t + duration;
    t = end + gap;
    const tokens = beat.text.split(/\s+/).filter(Boolean);
    const totalChars = tokens.reduce((n, w) => n + [...w].length, 0) || 1;
    let wt = start;
    const words = tokens.map(text => {
      const d = (duration * [...text].length) / totalChars;
      const w = { text, start: wt, end: wt + d };
      wt += d;
      return w;
    });
    return { ...beat, start, end, words };
  });
}

export function sceneDuration(scene: Scene): number {
  const last = scene.beats[scene.beats.length - 1];
  return (last ? last.end : 0) + 1.2;
}
