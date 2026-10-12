import React from 'react';
import type { LineBreakdownData } from './lineBreakdown';

// The 2026-10 carousel style. Every slide is a solid, high-contrast layout (no text over
// photos), one idea per slide, telling the same story every time:
//
//   hook -> guess (comment A/B/C) -> reveal -> one slide per piece -> use it -> cheat sheet -> CTA
//
// The guess slide is what earns comments; the cheat sheet is what earns saves.
// Slides are 1080x1350. TikTok covers the bottom ~270px (caption, sound) and the right ~150px
// (buttons), so anything that must be read stays inside SAFE. Decoration may run under them.

// James picked this Bright Path quiz look on 2026-10-11 over a KakaoTalk chat style and a
// webtoon comic style. The comic is becoming its own pipeline with custom manga art.
export type CarouselStyle = 'quiz';
export const CAROUSEL_STYLES: CarouselStyle[] = ['quiz'];

export type CarouselSlide =
  | { kind: 'hook'; hook: string }
  | { kind: 'quiz' }
  | { kind: 'reveal' }
  | { kind: 'part'; index: number }
  | { kind: 'use' }
  | { kind: 'recap' }
  | { kind: 'cta' };

// Images as data URIs: flat Bright Path stickers keyed like "tiger-teach".
export interface CarouselArt {
  mascot: Record<string, string>;
}

export const CAROUSEL_FONTS: Record<CarouselStyle, string[]> = {
  quiz: ['Montserrat', 'NotoKR', 'LilitaOne']
};

export function carouselSlides(hook: string, partCount: number): CarouselSlide[] {
  return [
    { kind: 'hook', hook },
    { kind: 'quiz' },
    { kind: 'reveal' },
    ...Array.from({ length: partCount }, (_, index) => ({ kind: 'part' as const, index })),
    { kind: 'use' },
    { kind: 'recap' },
    { kind: 'cta' }
  ];
}

export const W = 1080;
export const H = 1350;
export const SAFE = { top: 140, right: 150, bottom: 270, left: 72 };
export const SANS = 'Montserrat, NotoKR, sans-serif';
export const KR = 'NotoKR, Montserrat, sans-serif';
export const DISPLAY = 'LilitaOne, NotoKR, sans-serif';
export const LETTERS = ['A', 'B', 'C', 'D'];

// Bright Path stage colors (design/bright-path.md).
export const BP = {
  blue: '#3D64E8', blueDark: '#2645B8',
  teal: '#13B5A6', tealDark: '#0B8C80',
  amber: '#FFB020', amberDark: '#D18700', amberInk: '#3A2600',
  coral: '#FF5A5F', coralDark: '#D63A40',
  orange: '#FF8A00', orangeDark: '#C96A00',
  purple: '#8E6CF0', purpleDark: '#6B4BD0',
  pink: '#F06CB4', pinkDark: '#C94C90',
  ink: '#1B1F3B', muted: '#6A6F88', line: '#DCDFEA', paper: '#F6F7FB'
};

/* ------------------------------------------------------------------ */
/* Shared data helpers                                                 */
/* ------------------------------------------------------------------ */

// Breakdowns made before the quiz existed still render: fall back to the real meaning
// against the subtitle reading.
function quizOf(data: LineBreakdownData): { options: string[]; answer: number } {
  const q = data.quiz;
  if (q && Array.isArray(q.options) && q.options.length >= 2 && q.answer >= 0 && q.answer < q.options.length) {
    return { options: q.options.slice(0, 4), answer: q.answer };
  }
  return { options: [data.line.common_translation, data.line.natural], answer: 1 };
}

// The index of the quiz option that matches the flattened subtitle, if any (shown struck out).
function subtitleOption(data: LineBreakdownData, options: string[], answer: number): number {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
  const sub = norm(data.line.common_translation);
  const i = options.findIndex((o, k) => k !== answer && (norm(o) === sub || sub.includes(norm(o)) || norm(o).includes(sub)));
  return i;
}

// Font size for Korean/Japanese text so it fits `width` px in at most `lines` lines.
// Hangul and kana are about 1em wide; spaces and Latin punctuation about a third to half.
export function fit(text: string, max: number, width: number, lines = 1): number {
  let units = 0;
  for (const ch of text) units += /\s/.test(ch) ? 0.3 : /[\x00-\x7F]/.test(ch) ? 0.5 : 1;
  units = Math.max(units, 1);
  // One line when it still reads big; otherwise wrap (at spaces, keep-all), leaving slack.
  const one = Math.floor((width * 0.96) / units);
  if (lines === 1 || one >= max * 0.55) return Math.max(36, Math.min(max, one));
  return Math.max(36, Math.min(max, Math.floor((width * lines * 0.8) / units)));
}

// Font size for English text that has to fit a fixed box.
export function fitEn(text: string, base: number, roomy = 28): number {
  const len = text.length;
  if (len <= roomy) return base;
  if (len <= roomy * 1.6) return Math.round(base * 0.82);
  if (len <= roomy * 2.4) return Math.round(base * 0.68);
  return Math.round(base * 0.58);
}

// Font size for a quiz answer: big when short, wraps to two lines when long.
function answerSize(text: string): number {
  return text.length <= 26 ? 48 : text.length <= 52 ? 42 : 36;
}

export const Page: React.FC<{ background: string; children: React.ReactNode; font?: string }> = ({ background, children, font = SANS }) => (
  <div style={{
    width: `${W}px`, height: `${H}px`, position: 'relative', overflow: 'hidden', background,
    fontFamily: font, wordBreak: 'keep-all', overflowWrap: 'break-word', color: BP.ink
  }}>
    {children}
  </div>
);

export const Img: React.FC<{ src?: string; style: React.CSSProperties }> = ({ src, style }) =>
  src ? <img src={src} style={{ position: 'absolute', ...style }} /> : null;

/* ------------------------------------------------------------------ */
/* QUIZ: a Bright Path lesson, the way the app looks                    */
/* ------------------------------------------------------------------ */

export const Progress: React.FC<{ step: number; total: number; dark?: boolean }> = ({ step, total, dark }) => (
  <div style={{ position: 'absolute', top: '72px', left: `${SAFE.left}px`, right: `${SAFE.right - 60}px`, display: 'flex', alignItems: 'center', gap: '26px' }}>
    <svg width="34" height="34" viewBox="0 0 34 34"><path d="M5 5 L29 29 M29 5 L5 29" stroke={dark ? '#AEB4C8' : 'rgba(255,255,255,0.75)'} strokeWidth="6" strokeLinecap="round" /></svg>
    <div style={{ flex: 1, height: '26px', borderRadius: '99px', background: dark ? '#E4E7F0' : 'rgba(0,0,0,0.18)', overflow: 'hidden' }}>
      <div style={{ width: `${Math.max(8, (step / total) * 100)}%`, height: '100%', borderRadius: '99px', background: dark ? BP.teal : '#fff', boxShadow: 'inset 0 -7px 0 rgba(0,0,0,0.12)' }} />
    </div>
  </div>
);

export const Pill: React.FC<{ children: React.ReactNode; bg: string; color?: string }> = ({ children, bg, color = '#fff' }) => (
  <span style={{ display: 'inline-block', background: bg, color, fontSize: '32px', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '12px 28px', borderRadius: '99px' }}>{children}</span>
);

export const Card: React.FC<{ children: React.ReactNode; shadow?: string; style?: React.CSSProperties }> = ({ children, shadow = 'rgba(0,0,0,0.22)', style }) => (
  <div style={{ background: '#fff', borderRadius: '36px', padding: '40px 44px', boxShadow: `0 12px 0 ${shadow}`, ...style }}>{children}</div>
);

export const Title: React.FC<{ children: React.ReactNode; size?: number; color?: string }> = ({ children, size = 84, color = '#fff' }) => (
  <div style={{ fontFamily: DISPLAY, fontSize: `${size}px`, lineHeight: 1.08, color }}>{children}</div>
);

// `sub` is a second, smaller line (romanization when the answer is Korean).
export const Answer: React.FC<{ letter: string; text: string; sub?: string; korean?: boolean; state?: 'right' | 'wrong' | 'idle' | 'dim' }> = ({ letter, text, sub, korean, state = 'idle' }) => {
  const look = {
    idle: { bg: '#fff', border: BP.line, shadow: BP.line, chip: BP.paper, chipText: BP.muted, text: BP.ink },
    dim: { bg: '#fff', border: BP.line, shadow: BP.line, chip: BP.paper, chipText: '#B5BACB', text: '#9AA0B5' },
    right: { bg: '#E3F8F5', border: BP.teal, shadow: BP.tealDark, chip: BP.teal, chipText: '#fff', text: '#0A5F57' },
    wrong: { bg: '#FFECEC', border: BP.coral, shadow: BP.coralDark, chip: BP.coral, chipText: '#fff', text: '#A3262B' }
  }[state];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '26px', background: look.bg, border: `4px solid ${look.border}`, borderRadius: '28px', padding: '22px 28px', boxShadow: `0 8px 0 ${look.shadow}` }}>
      <div style={{ width: '70px', height: '70px', borderRadius: '18px', background: look.chip, color: look.chipText, fontFamily: DISPLAY, fontSize: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' }}>
        {state === 'right' ? '✓' : state === 'wrong' ? '✕' : letter}
      </div>
      <div>
        <div style={{ fontFamily: korean ? KR : SANS, fontSize: `${korean ? fit(text, 60, 640) : answerSize(text)}px`, fontWeight: 800, lineHeight: 1.2, color: look.text, textDecoration: state === 'wrong' ? 'line-through' : 'none', textDecorationThickness: '4px' }}>{text}</div>
        {sub && <div style={{ fontSize: '30px', fontWeight: 700, color: state === 'dim' ? '#B5BACB' : BP.muted, marginTop: '4px' }}>{sub}</div>}
      </div>
    </div>
  );
};

// A cover headline. Words wrapped in *asterisks* get an amber marker highlight, which reads
// on every background color.
export const HookTitle: React.FC<{ text: string; size?: number; color?: string }> = ({ text: raw, size, color = '#fff' }) => {
  // Keep a quoted phrase ('I'm full') on one line.
  const text = raw.replace(/(^|\s)(['"‘“])(.{1,24}?)(['"’”])(?=$|[\s?.!,])/g, (_, s, a, mid, b) => s + a + mid.replace(/ /g, '\u00a0') + b);
  const plain = text.replace(/\*/g, '');
  const px = size || fitEn(plain, 136, 18);
  return (
    <div style={{ fontFamily: DISPLAY, fontSize: `${px}px`, lineHeight: 1.12, color }}>
      {text.split(/(\*[^*]+\*)/).filter(Boolean).map((bit, i) => bit.startsWith('*') && bit.endsWith('*')
        ? <span key={i} style={{ background: BP.amber, color: BP.amberInk, padding: '0 14px', borderRadius: '18px', boxDecorationBreak: 'clone', WebkitBoxDecorationBreak: 'clone' }}>{bit.slice(1, -1)}</span>
        : <span key={i}>{bit}</span>)}
    </div>
  );
};

export const plainHook = (hook: string) => hook.replace(/\*/g, '');

// "Swipe" chip at the bottom of a cover.
export const Swipe: React.FC<{ label?: string; bg?: string; color?: string }> = ({ label = 'Swipe', bg = '#fff', color = BP.ink }) => (
  <div style={{ position: 'absolute', left: `${SAFE.left}px`, bottom: `${SAFE.bottom - 10}px`, display: 'flex', alignItems: 'center', gap: '16px', background: bg, color, borderRadius: '99px', padding: '16px 34px', fontSize: '42px', fontWeight: 800, boxShadow: '0 8px 0 rgba(0,0,0,0.18)' }}>
    {label} <span style={{ fontFamily: DISPLAY, fontSize: '48px' }}>→</span>
  </div>
);

function quizStyle(slide: CarouselSlide, data: LineBreakdownData, art: CarouselArt, n: number, total: number) {
  const { line } = data;
  const quiz = quizOf(data);
  const sub = subtitleOption(data, quiz.options, quiz.answer);
  const m = art.mascot;
  const body = (bg: string, children: React.ReactNode, dark = false) => (
    <Page background={bg}>
      <Progress step={n + 1} total={total} dark={dark} />
      {children}
    </Page>
  );
  // Content is centered between the progress bar and y=950; the sticker sits below and beside it.
  const safe: React.CSSProperties = { position: 'absolute', top: `${SAFE.top}px`, bottom: `${H - 950}px`, left: `${SAFE.left}px`, right: `${SAFE.right - 40}px`, display: 'flex', flexDirection: 'column', justifyContent: 'safe center', gap: '30px' };

  switch (slide.kind) {
    case 'hook':
      // The line, with the flattened subtitle struck out under it: the cover's promise is
      // "you were told the wrong meaning".
      return body(BP.blue, (
        <>
          <div style={{ ...safe, gap: '36px' }}>
            <div><Pill bg="rgba(0,0,0,0.22)">{data.source || 'Korean'}</Pill></div>
            <HookTitle text={slide.hook} size={fitEn(plainHook(slide.hook), 128, 24)} />
            <Card shadow={BP.blueDark} style={{ alignSelf: 'flex-start', maxWidth: '840px', padding: '36px 44px 30px' }}>
              <div style={{ fontFamily: KR, fontWeight: 800, fontSize: `${fit(line.native, 150, 750, 2)}px`, lineHeight: 1.15 }}>{line.native}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '18px', marginTop: '22px' }}>
                <div style={{ width: '54px', height: '54px', flex: '0 0 auto', borderRadius: '14px', background: BP.coral, color: '#fff', fontFamily: DISPLAY, fontSize: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</div>
                <div style={{ background: '#15172A', color: '#fff', borderRadius: '12px', padding: '10px 20px', fontSize: `${fitEn(line.common_translation, 36, 30)}px`, lineHeight: 1.35, fontWeight: 700, textDecoration: 'line-through', textDecorationColor: BP.coral, textDecorationThickness: '5px' }}>{line.common_translation}</div>
              </div>
            </Card>
          </div>
          <Img src={m['tiger-think']} style={{ right: '110px', bottom: '90px', height: '330px' }} />
          <Swipe label="Real meaning" />
        </>
      ));
    case 'quiz':
      return body(BP.paper, (
        <>
          <div style={safe}>
            <Title size={74} color={BP.ink}>What does it really mean?</Title>
            <div style={{ alignSelf: 'flex-start', background: '#fff', border: `4px solid ${BP.line}`, borderRadius: '28px', padding: '16px 30px' }}>
              <div style={{ fontFamily: KR, fontWeight: 800, fontSize: `${fit(line.native, 100, 760)}px` }}>{line.native}</div>
              {data.context && <div style={{ fontSize: '32px', fontWeight: 700, color: BP.muted, marginTop: '6px' }}>🎬 {data.context}</div>}
            </div>
            {quiz.options.map((o, i) => <Answer key={i} letter={LETTERS[i]} text={o} />)}
          </div>
          <Img src={m['magpie-think']} style={{ right: '160px', bottom: '110px', height: '250px' }} />
          <div style={{ position: 'absolute', left: `${SAFE.left}px`, bottom: `${SAFE.bottom - 10}px`, fontSize: '46px', fontWeight: 800, color: BP.blue }}>Comment {quiz.options.map((_, i) => LETTERS[i]).join(', ').replace(/, ([^,]*)$/, ' or $1')} 👇</div>
        </>
      ), true);
    case 'reveal':
      return body(BP.paper, (
        <>
          <div style={{ ...safe, bottom: undefined, justifyContent: 'flex-start', top: `${SAFE.top + 40}px` }}>
            <Title size={74} color={BP.ink}>It's {LETTERS[quiz.answer]}!</Title>
            {quiz.options.map((o, i) => <Answer key={i} letter={LETTERS[i]} text={o} state={i === quiz.answer ? 'right' : i === sub ? 'wrong' : 'dim'} />)}
          </div>
          {/* Duolingo-style result sheet */}
          <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '470px', background: '#D7F5F1', borderTop: `6px solid ${BP.teal}`, padding: `40px ${SAFE.right}px 0 ${SAFE.left}px` }}>
            <div style={{ fontFamily: DISPLAY, fontSize: '56px', color: BP.tealDark }}>{sub >= 0 ? 'Subtitles flatten it' : 'Why it matters'}</div>
            <div style={{ fontSize: '42px', fontWeight: 700, color: '#0A5F57', marginTop: '12px', lineHeight: 1.3, maxWidth: '640px' }}>{data.nuance}</div>
          </div>
          <Img src={m['tiger-celebrate']} style={{ right: '60px', bottom: '300px', height: '300px' }} />
        </>
      ), true);
    case 'part': {
      const part = data.parts[slide.index];
      const palette = [[BP.teal, BP.tealDark], [BP.purple, BP.purpleDark], [BP.orange, BP.orangeDark], [BP.pink, BP.pinkDark]][slide.index % 4];
      return body(palette[0], (
        <>
          <div style={safe}>
            <div><Pill bg="rgba(0,0,0,0.2)">Piece {slide.index + 1} of {data.parts.length}</Pill></div>
            <Card shadow={palette[1]} style={{ padding: '46px 50px' }}>
              <div style={{ fontFamily: KR, fontWeight: 800, fontSize: `${fit(part.native, 260, 800)}px`, lineHeight: 1.05 }}>{part.native}</div>
              <div style={{ fontSize: '42px', fontWeight: 700, color: BP.muted, marginTop: '10px' }}>{part.romanization}</div>
              <div style={{ height: '4px', background: BP.line, borderRadius: '2px', margin: '30px 0' }} />
              <div style={{ fontFamily: DISPLAY, fontSize: `${fitEn(part.meaning, 88, 16)}px`, lineHeight: 1.05, color: palette[1] }}>{part.meaning}</div>
            </Card>
            {part.note && (
              <div style={{ alignSelf: 'flex-start', maxWidth: '560px', background: '#fff', borderRadius: '30px', padding: '24px 32px', fontSize: '40px', fontWeight: 700, lineHeight: 1.3, position: 'relative', boxShadow: `0 8px 0 ${palette[1]}` }}>
                {part.note}
                <div style={{ position: 'absolute', right: '-22px', bottom: '36px', width: 0, height: 0, borderTop: '20px solid transparent', borderBottom: '20px solid transparent', borderLeft: '28px solid #fff' }} />
              </div>
            )}
          </div>
          <Img src={m['tiger-teach']} style={{ right: '160px', bottom: '110px', height: '270px' }} />
        </>
      ));
    }
    case 'use':
      return body(BP.purple, (
        <>
          <div style={safe}>
            <div><Pill bg="rgba(0,0,0,0.2)">Your turn</Pill></div>
            <Title size={80}>Say it out loud</Title>
            <Card shadow={BP.purpleDark}>
              <div style={{ fontFamily: KR, fontWeight: 800, fontSize: `${fit(data.use_it.native, 150, 800, 2)}px`, lineHeight: 1.2 }}>{data.use_it.native}</div>
              <div style={{ fontSize: '38px', fontWeight: 700, color: BP.muted, marginTop: '10px' }}>{data.use_it.romanization}</div>
              <div style={{ fontSize: '46px', fontWeight: 800, marginTop: '22px' }}>{data.use_it.english}</div>
            </Card>
          </div>
          <Img src={m['magpie-speak']} style={{ right: '160px', bottom: '110px', height: '270px' }} />
        </>
      ));
    case 'recap':
      return body(BP.amber, (
        <>
          <div style={safe}>
            <Title size={80} color={BP.amberInk}>Cheat sheet</Title>
            <Card shadow={BP.amberDark} style={{ padding: '34px 40px' }}>
              <div style={{ fontFamily: KR, fontWeight: 800, fontSize: `${fit(line.native, 130, 800, 2)}px`, lineHeight: 1.15 }}>{line.native}</div>
              <div style={{ fontSize: '38px', fontWeight: 800, color: BP.blue, margin: '8px 0 18px' }}>"{line.natural}"</div>
              {data.parts.map((p, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '24px', padding: '14px 0', borderTop: `3px solid ${BP.line}` }}>
                  <span style={{ fontFamily: KR, fontWeight: 800, fontSize: '54px', minWidth: '200px' }}>{p.native}</span>
                  <span style={{ fontSize: '40px', fontWeight: 700 }}>{p.meaning}</span>
                </div>
              ))}
            </Card>
          </div>
          <div style={{ position: 'absolute', left: `${SAFE.left}px`, bottom: `${SAFE.bottom - 10}px`, fontSize: '46px', fontWeight: 800, color: BP.amberInk }}>Save this for later 📌</div>
          <Img src={m['magpie-study']} style={{ right: '160px', bottom: '110px', height: '250px' }} />
        </>
      ));
    case 'cta':
      return body(BP.blue, (
        <>
          <div style={safe}>
            <div style={{ maxWidth: '640px' }}><Title size={92}>Do this with any Korean line</Title></div>
            {/* A mini Hanbok analyze box */}
            <Card shadow={BP.blueDark} style={{ padding: '34px 36px' }}>
              <div style={{ border: `4px solid ${BP.line}`, borderRadius: '22px', padding: '22px 26px', fontFamily: KR, fontWeight: 800, fontSize: `${fit(line.native, 90, 740)}px` }}>{line.native}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', marginTop: '22px' }}>
                {data.parts.map((p, i) => (
                  <span key={i} style={{ background: ['#E3EAFE', '#DDF6F3', '#EEE8FE', '#FFF0DD'][i % 4], borderRadius: '16px', padding: '10px 20px', fontSize: '32px', fontWeight: 800 }}>
                    <span style={{ fontFamily: KR }}>{p.native}</span> · {p.meaning}
                  </span>
                ))}
              </div>
              <div style={{ marginTop: '28px', background: BP.blue, color: '#fff', borderRadius: '20px', padding: '20px', textAlign: 'center', fontSize: '38px', fontWeight: 800, letterSpacing: '0.06em', boxShadow: `0 7px 0 ${BP.blueDark}` }}>BREAK IT DOWN</div>
            </Card>
          </div>
          <div style={{ position: 'absolute', left: `${SAFE.left}px`, bottom: `${SAFE.bottom + 50}px`, color: '#fff', fontSize: '44px', fontWeight: 800 }}>Free at hanbokstudy.com · link in bio</div>
          <Img src={m['magpie-wave']} style={{ right: '70px', top: '150px', height: '230px' }} />
          <div style={{ position: 'absolute', left: `${SAFE.left}px`, bottom: `${SAFE.bottom - 20}px`, color: BP.amber, fontSize: '44px', fontWeight: 800 }}>Which line next? Comment it 👇</div>
        </>
      ));
  }
}

export const CarouselSlideDocument: React.FC<{
  slide: CarouselSlide;
  data: LineBreakdownData;
  art: CarouselArt;
  index: number;
  total: number;
  fontCSS?: string;
}> = ({ slide, data, art, index, total, fontCSS }) => (
  <html>
    <head>
      <meta charSet="utf-8" />
      {fontCSS && <style dangerouslySetInnerHTML={{ __html: fontCSS }} />}
    </head>
    <body style={{ margin: 0, padding: 0 }}>
      {quizStyle(slide, data, art, index, total)}
    </body>
  </html>
);
