// A skit is a short 4koma-style episode of "Sora in Seoul": a list of shots cut together hard,
// with subtitled lines and sound effects, ending on a four-photo strip. The B version adds a
// lesson tail where Sora explains one line from the skit. Times are in seconds.
//
// No imports, so node scripts can load it directly (node --experimental-strip-types).

export interface SkitShot {
  id: string;
  seconds: number;
  /** Clip or start frame, relative to public/. Images get a slow push-in. Without one, the
   *  shot renders as a storyboard panel (bg + sprite + note), which makes an animatic. */
  src?: string;
  /** Seconds into the clip to start from. */
  trimStart?: number;
  /** Playback rate for clips, e.g. 0.8 to stretch a reaction. */
  speed?: number;
  /** Quick zoom-in at the start of the shot, for emphasis. */
  punchIn?: boolean;
  /** Storyboard panel only: CSS background, a Sora expression to stand in, and what the shot is. */
  bg?: string;
  sprite?: string;
  note?: string;
  snow?: boolean;
}

export interface SkitLine {
  shot: string;
  /** Seconds into that shot. */
  at: number;
  seconds: number;
  ko: string;
  en: string;
  /** Voice clip relative to public/. */
  audio?: string;
}

export interface SkitSfx {
  shot: string;
  at: number;
  /** Sound file relative to public/. Leave it out until the sound exists; the label still shows on the animatic. */
  src?: string;
  volume?: number;
  label: string;
}

export interface LessonBeat {
  expression: string;
  text: string;
  seconds: number;
  audio?: string;
}

export interface Skit {
  id: string;
  episode: number;
  title: { ko: string; en: string };
  shots: SkitShot[];
  lines: SkitLine[];
  sfx?: SkitSfx[];
  music?: { src: string; volume?: number };
  /** Four shot ids for the end card; each contributes its last frame. */
  strip: string[];
  /** The B version's tail: Sora explains the line. */
  lesson?: {
    card: { native: string; romanization: string; meaning: string; note?: string };
    beats: LessonBeat[];
  };
}

export const SERIES = { ko: '소라의 서울살이', en: 'Sora in Seoul' };
export const STRIP_SECONDS = 2.6;

export function shotStarts(skit: Skit): Record<string, number> {
  const starts: Record<string, number> = {};
  let t = 0;
  for (const s of skit.shots) {
    starts[s.id] = t;
    t += s.seconds;
  }
  return starts;
}

export function shotsDuration(skit: Skit): number {
  return skit.shots.reduce((n, s) => n + s.seconds, 0);
}

export function lessonDuration(skit: Skit): number {
  return skit.lesson ? skit.lesson.beats.reduce((n, b) => n + b.seconds, 0) + 0.8 : 0;
}

export function skitDuration(skit: Skit, withLesson: boolean): number {
  return shotsDuration(skit) + STRIP_SECONDS + (withLesson ? lessonDuration(skit) : 0);
}
