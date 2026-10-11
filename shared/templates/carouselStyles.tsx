import React from 'react';
import type { LineBreakdownData } from './lineBreakdown';

// The 2026-10 carousel styles. Every slide is a solid, high-contrast layout (no text over
// photos), one idea per slide, and the same story in every style:
//
//   hook -> guess (comment A/B/C) -> reveal -> one slide per piece -> use it -> cheat sheet -> CTA
//
// The guess slide is what earns comments; the cheat sheet is what earns saves.
// Slides are 1080x1350. TikTok covers the bottom ~270px (caption, sound) and the right ~150px
// (buttons), so anything that must be read stays inside SAFE. Decoration may run under them.

export type CarouselStyle = 'chat' | 'quiz' | 'comic';
export const CAROUSEL_STYLES: CarouselStyle[] = ['chat', 'quiz', 'comic'];

export type CarouselSlide =
  | { kind: 'hook'; hook: string }
  | { kind: 'quiz' }
  | { kind: 'reveal' }
  | { kind: 'part'; index: number }
  | { kind: 'use' }
  | { kind: 'recap' }
  | { kind: 'cta' };

// Images as data URIs. mascot: flat Bright Path stickers keyed like "tiger-teach";
// sora / tutor: the lesson-video VN sprites keyed by expression.
export interface CarouselArt {
  mascot: Record<string, string>;
  sora: Record<string, string>;
  tutor: Record<string, string>;
}

export const CAROUSEL_FONTS: Record<CarouselStyle, string[]> = {
  chat: ['Montserrat', 'NotoKR', 'LilitaOne'],
  quiz: ['Montserrat', 'NotoKR', 'LilitaOne'],
  comic: ['Montserrat', 'NotoKR', 'LilitaOne', 'BlackHanSans']
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

const W = 1080;
const H = 1350;
const SAFE = { top: 140, right: 150, bottom: 270, left: 72 };
const SANS = 'Montserrat, NotoKR, sans-serif';
const KR = 'NotoKR, Montserrat, sans-serif';
const DISPLAY = 'LilitaOne, NotoKR, sans-serif';
const LETTERS = ['A', 'B', 'C', 'D'];

// Bright Path stage colors (design/bright-path.md).
const BP = {
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

// Breakdowns made before quiz/chat existed still render: fall back to the real meaning
// against the subtitle reading.
export function quizOf(data: LineBreakdownData): { options: string[]; answer: number } {
  const q = data.quiz;
  if (q && Array.isArray(q.options) && q.options.length >= 2 && q.answer >= 0 && q.answer < q.options.length) {
    return { options: q.options.slice(0, 4), answer: q.answer };
  }
  return { options: [data.line.common_translation, data.line.natural], answer: 1 };
}

export function chatOf(data: LineBreakdownData): { from: 'sora' | 'horang'; text: string }[] {
  const chat = (data.chat || []).filter(m => m && (m.from === 'sora' || m.from === 'horang') && m.text);
  if (chat.length >= 3) return chat.slice(0, 6);
  return [
    { from: 'sora', text: `what does "${data.line.native}" actually mean??` },
    { from: 'sora', text: `subtitles said "${data.line.common_translation}" but that can't be it` },
    { from: 'horang', text: 'Ha. Guess first.' }
  ];
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
function fit(text: string, max: number, width: number, lines = 1): number {
  let units = 0;
  for (const ch of text) units += /\s/.test(ch) ? 0.3 : /[\x00-\x7F]/.test(ch) ? 0.5 : 1;
  units = Math.max(units, 1);
  // One line when it still reads big; otherwise wrap (at spaces, keep-all), leaving slack.
  const one = Math.floor((width * 0.96) / units);
  if (lines === 1 || one >= max * 0.55) return Math.max(36, Math.min(max, one));
  return Math.max(36, Math.min(max, Math.floor((width * lines * 0.8) / units)));
}

// Font size for English text that has to fit a fixed box.
function fitEn(text: string, base: number, roomy = 28): number {
  const len = text.length;
  if (len <= roomy) return base;
  if (len <= roomy * 1.6) return Math.round(base * 0.82);
  if (len <= roomy * 2.4) return Math.round(base * 0.68);
  return Math.round(base * 0.58);
}

// Ends a phrase with a period unless it already ends in punctuation.
function sentence(text: string): string {
  return /[.!?…]$/.test(text.trim()) ? text.trim() : `${text.trim()}.`;
}

// Font size for a quiz answer: big when short, wraps to two lines when long.
function answerSize(text: string): number {
  return text.length <= 26 ? 48 : text.length <= 52 ? 42 : 36;
}

// Wraps the breakdown's Korean line (when it appears in a message) in a bigger bold span.
function withLine(text: string, line: string, style: React.CSSProperties): React.ReactNode {
  const at = text.indexOf(line);
  if (at < 0) return text;
  return (
    <>
      {text.slice(0, at)}
      <span style={style}>{line}</span>
      {text.slice(at + line.length)}
    </>
  );
}

const Page: React.FC<{ background: string; children: React.ReactNode; font?: string }> = ({ background, children, font = SANS }) => (
  <div style={{
    width: `${W}px`, height: `${H}px`, position: 'relative', overflow: 'hidden', background,
    fontFamily: font, wordBreak: 'keep-all', overflowWrap: 'break-word', color: BP.ink
  }}>
    {children}
  </div>
);

const Img: React.FC<{ src?: string; style: React.CSSProperties }> = ({ src, style }) =>
  src ? <img src={src} style={{ position: 'absolute', ...style }} /> : null;

/* ------------------------------------------------------------------ */
/* CHAT: Sora texts Horang in a KakaoTalk-style chat                   */
/* ------------------------------------------------------------------ */

const KAKAO = { bg: '#BACEE0', header: '#B1C6D9', yellow: '#FEE500', time: '#5A6B7B' };

const Avatar: React.FC<{ src?: string }> = ({ src }) => (
  <div style={{ width: '108px', height: '108px', borderRadius: '40px', background: '#FFE7C2', flex: '0 0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
    {src && <img src={src} style={{ width: '92px' }} />}
  </div>
);

const Time: React.FC<{ unread?: boolean }> = ({ unread }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: unread ? 'flex-end' : 'flex-start', fontSize: '24px', color: KAKAO.time, fontWeight: 600, lineHeight: 1.2, flex: '0 0 auto' }}>
    {unread && <span style={{ color: '#E8B400', fontWeight: 800 }}>1</span>}
    <span>9:41 PM</span>
  </div>
);

// One message from Horang (left, white, with avatar) or Sora (right, yellow).
const ChatMsg: React.FC<{ from: 'sora' | 'horang'; art: CarouselArt; children: React.ReactNode; first?: boolean; size?: number }> = ({ from, art, children, first = true, size = 46 }) => {
  const bubble: React.CSSProperties = {
    background: from === 'sora' ? KAKAO.yellow : '#fff',
    borderRadius: '30px', padding: '22px 30px', fontSize: `${size}px`, fontWeight: 600, lineHeight: 1.3,
    maxWidth: '660px', color: '#111'
  };
  if (from === 'sora') {
    return (
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'flex-end', gap: '12px' }}>
        <Time unread />
        <div style={bubble}>{children}</div>
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '18px' }}>
      {first ? <Avatar src={art.mascot['tiger-head-1']} /> : <div style={{ width: '108px', flex: '0 0 auto' }} />}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {first && <div style={{ fontSize: '30px', fontWeight: 700, color: '#2C3A47' }}>Horang 선생님</div>}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px' }}>
          <div style={bubble}>{children}</div>
          <Time />
        </div>
      </div>
    </div>
  );
};

// A KakaoTalk emoticon: a big sticker with no bubble.
const ChatSticker: React.FC<{ src?: string; height?: number }> = ({ src, height = 280 }) => (
  <div style={{ display: 'flex', gap: '18px' }}>
    <div style={{ width: '108px', flex: '0 0 auto' }} />
    {src && <img src={src} style={{ height: `${height}px` }} />}
  </div>
);

// A rich card inside Horang's bubble (flashcard, poll, cheat sheet).
const ChatCard: React.FC<{ label: string; color: string; children: React.ReactNode; width?: number }> = ({ label, color, children, width = 700 }) => (
  <div style={{ width: `${width}px`, background: '#fff', borderRadius: '30px', overflow: 'hidden' }}>
    <div style={{ background: color, color: '#fff', fontSize: '30px', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '18px 30px' }}>{label}</div>
    <div style={{ padding: '26px 30px 30px' }}>{children}</div>
  </div>
);

const ChatScreen: React.FC<{ children: React.ReactNode; top?: React.ReactNode }> = ({ children, top }) => (
  <Page background={KAKAO.bg}>
    {/* Header: sits under TikTok's own top tabs, so it is decoration only */}
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '118px', background: KAKAO.header, display: 'flex', alignItems: 'center', padding: '0 40px', gap: '26px', fontSize: '38px', fontWeight: 700, color: '#1d2a36' }}>
      <svg width="30" height="48" viewBox="0 0 30 48"><path d="M24 4 L6 24 L24 44" stroke="#1d2a36" strokeWidth="6" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
      <span>Horang 선생님</span>
      <span style={{ fontSize: '30px', color: '#4E6274', fontWeight: 600 }}>2</span>
      <div style={{ flex: 1 }} />
      <svg width="44" height="44" viewBox="0 0 44 44"><circle cx="19" cy="19" r="13" stroke="#1d2a36" strokeWidth="5" fill="none" /><path d="M29 29 L40 40" stroke="#1d2a36" strokeWidth="5" strokeLinecap="round" /></svg>
      <svg width="44" height="44" viewBox="0 0 44 44"><path d="M6 10 H38 M6 22 H38 M6 34 H38" stroke="#1d2a36" strokeWidth="5" strokeLinecap="round" /></svg>
    </div>
    {top}
    <div style={{ position: 'absolute', top: `${SAFE.top + 10}px`, left: '40px', right: `${SAFE.right - 70}px`, bottom: `${SAFE.bottom - 40}px`, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: '22px' }}>
      {children}
    </div>
    {/* Input bar: under TikTok's caption, decoration only */}
    <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '120px', background: '#fff', display: 'flex', alignItems: 'center', padding: '0 36px', gap: '24px' }}>
      <div style={{ width: '50px', height: '50px', borderRadius: '12px', border: '4px solid #9aa4ad' }} />
      <div style={{ flex: 1, height: '64px', borderRadius: '32px', background: '#F2F3F5' }} />
      <div style={{ width: '90px', height: '64px', borderRadius: '16px', background: KAKAO.yellow }} />
    </div>
  </Page>
);

function chat(slide: CarouselSlide, data: LineBreakdownData, art: CarouselArt) {
  const { line } = data;
  const msgs = chatOf(data);
  const quiz = quizOf(data);
  const lineStyle: React.CSSProperties = { fontFamily: KR, fontWeight: 800, fontSize: '1.22em' };
  const msg = (m: { from: 'sora' | 'horang'; text: string }, i: number, list: typeof msgs, extra: Partial<React.ComponentProps<typeof ChatMsg>> = {}) => (
    <ChatMsg key={i} from={m.from} art={art} first={i === 0 || list[i - 1].from !== m.from} {...extra}>
      {withLine(m.text, line.native, lineStyle)}
    </ChatMsg>
  );
  // The chat is split across the first two slides: the cover gets the opening (at most three
  // messages), slide 2 the last message and the poll.
  const split = Math.min(msgs.length - 1, 3);

  switch (slide.kind) {
    case 'hook': {
      const opening = msgs.slice(0, split);
      const hookSize = fitEn(slide.hook, 100, 20);
      return (
        <ChatScreen top={
          <div style={{ position: 'absolute', top: `${SAFE.top + 10}px`, left: `${SAFE.left}px`, right: `${SAFE.right - 40}px`, textAlign: 'center' }}>
            <div style={{ display: 'inline', lineHeight: 1.45, fontSize: `${hookSize}px`, fontWeight: 800 }}>
              <span style={{ background: '#fff', padding: '8px 22px', borderRadius: '18px', WebkitBoxDecorationBreak: 'clone', boxDecorationBreak: 'clone' }}>{slide.hook}</span>
            </div>
          </div>
        }>
          <div style={{ alignSelf: 'center', background: 'rgba(0,0,0,0.12)', color: '#fff', fontSize: '26px', fontWeight: 700, padding: '8px 26px', borderRadius: '999px' }}>Today</div>
          {opening.map((m, i) => msg(m, i, opening))}
        </ChatScreen>
      );
    }
    case 'quiz': {
      const rest = msgs.slice(-1);
      return (
        <ChatScreen>
          {rest.map((m, i) => msg(m, i, rest))}
          <div style={{ display: 'flex', gap: '18px' }}>
            <div style={{ width: '108px', flex: '0 0 auto' }} />
            <ChatCard label="Poll · comment your answer" color="#3B4A59">
              <div style={{ fontSize: '40px', fontWeight: 800, marginBottom: '18px', lineHeight: 1.25 }}>
                What does <span style={{ fontFamily: KR }}>{line.native}</span> really mean?
              </div>
              {quiz.options.map((o, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '20px', padding: '14px 0', borderTop: i ? `2px solid ${BP.line}` : 'none' }}>
                  <div style={{ width: '58px', height: '58px', borderRadius: '50%', border: '4px solid #B7BFC8', flex: '0 0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '30px', fontWeight: 800, color: '#7B8794' }}>{LETTERS[i]}</div>
                  <div style={{ fontSize: `${answerSize(o) - 4}px`, fontWeight: 700, lineHeight: 1.2 }}>{o}</div>
                </div>
              ))}
            </ChatCard>
          </div>
        </ChatScreen>
      );
    }
    case 'reveal': {
      const right = quiz.options[quiz.answer];
      return (
        <ChatScreen>
          <ChatMsg from="sora" art={art}>is it {LETTERS[quiz.answer]}?? 🙏</ChatMsg>
          <ChatMsg from="horang" art={art}>{LETTERS[quiz.answer]}. {sentence(right)}</ChatMsg>
          <ChatMsg from="horang" art={art} first={false} size={40}>
            Subtitles say <span style={{ textDecoration: 'line-through', textDecorationColor: BP.coral, textDecorationThickness: '5px' }}>"{line.common_translation}"</span>
            <div style={{ marginTop: '14px', fontWeight: 700, color: '#333' }}>{data.nuance}</div>
          </ChatMsg>
          <ChatMsg from="sora" art={art} size={58}>WAIT. 😳</ChatMsg>
        </ChatScreen>
      );
    }
    case 'part': {
      const part = data.parts[slide.index];
      const colors = [BP.blue, BP.teal, BP.purple, BP.orange];
      const replies = ['ok ok go on', 'ohhh', 'that makes so much sense', 'noted 📝'];
      return (
        <ChatScreen>
          <ChatMsg from="horang" art={art}>Piece {slide.index + 1} of {data.parts.length} 👇</ChatMsg>
          <div style={{ display: 'flex', gap: '18px' }}>
            <div style={{ width: '108px', flex: '0 0 auto' }} />
            <ChatCard label={`Word ${slide.index + 1} / ${data.parts.length}`} color={colors[slide.index % colors.length]}>
              <div style={{ fontFamily: KR, fontWeight: 800, fontSize: `${fit(part.native, 190, 640)}px`, lineHeight: 1.05 }}>{part.native}</div>
              <div style={{ fontSize: '36px', fontWeight: 600, color: BP.muted, marginTop: '6px' }}>{part.romanization}</div>
              <div style={{ fontSize: `${fitEn(part.meaning, 64, 18)}px`, fontWeight: 800, marginTop: '18px' }}>= {part.meaning}</div>
              {part.note && <div style={{ fontSize: '36px', fontWeight: 600, color: '#4a5260', marginTop: '14px', lineHeight: 1.3 }}>{part.note}</div>}
            </ChatCard>
          </div>
          <ChatMsg from="sora" art={art}>{replies[slide.index % replies.length]}</ChatMsg>
        </ChatScreen>
      );
    }
    case 'use':
      return (
        <ChatScreen>
          <ChatMsg from="horang" art={art}>Now you. Say:</ChatMsg>
          <ChatMsg from="horang" art={art} first={false} size={40}>"{data.use_it.english}"</ChatMsg>
          <ChatMsg from="sora" art={art}>
            <div style={{ fontFamily: KR, fontWeight: 800, fontSize: `${fit(data.use_it.native, 110, 560, 2)}px`, lineHeight: 1.2 }}>{data.use_it.native}</div>
            <div style={{ fontSize: '32px', color: '#5c5200', marginTop: '6px' }}>{data.use_it.romanization}</div>
          </ChatMsg>
          <ChatSticker src={art.mascot['tiger-celebrate']} height={270} />
        </ChatScreen>
      );
    case 'recap':
      return (
        <ChatScreen>
          <div style={{ display: 'flex', gap: '18px' }}>
            <Avatar src={art.mascot['tiger-head-1']} />
            <ChatCard label="Cheat sheet · save this" color={BP.coral} width={720}>
              <div style={{ fontFamily: KR, fontWeight: 800, fontSize: `${fit(line.native, 120, 640, 2)}px`, lineHeight: 1.15 }}>{line.native}</div>
              <div style={{ fontSize: '34px', fontWeight: 700, color: BP.muted, margin: '4px 0 12px' }}>"{line.natural}"</div>
              {data.parts.map((p, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'baseline', gap: '18px', padding: '12px 0', borderTop: `2px solid ${BP.line}` }}>
                  <span style={{ fontFamily: KR, fontWeight: 800, fontSize: '50px', flex: '0 0 auto' }}>{p.native}</span>
                  <span style={{ fontSize: '36px', fontWeight: 700 }}>{p.meaning}</span>
                </div>
              ))}
            </ChatCard>
          </div>
          <ChatMsg from="sora" art={art} size={50}>saved!! 📌</ChatMsg>
        </ChatScreen>
      );
    case 'cta':
      return (
        <ChatScreen>
          <ChatMsg from="sora" art={art}>how do you know all this</ChatMsg>
          <ChatMsg from="horang" art={art}>I paste lines into Hanbok. It breaks them down like this.</ChatMsg>
          <div style={{ display: 'flex', gap: '18px' }}>
            <div style={{ width: '108px', flex: '0 0 auto' }} />
            <div style={{ width: '640px', background: '#fff', borderRadius: '30px', overflow: 'hidden' }}>
              <div style={{ height: '250px', background: BP.blue, position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', left: '34px', top: '40px', color: '#fff', fontFamily: DISPLAY, fontSize: '66px', lineHeight: 1.05, width: '380px' }}>Break down any Korean line</div>
                <Img src={art.mascot['magpie-wave']} style={{ right: '20px', bottom: '-10px', height: '230px' }} />
              </div>
              <div style={{ padding: '20px 30px 24px' }}>
                <div style={{ fontSize: '38px', fontWeight: 800 }}>Hanbok</div>
                <div style={{ fontSize: '30px', fontWeight: 600, color: BP.muted }}>hanbokstudy.com · link in bio</div>
              </div>
            </div>
          </div>
          <ChatMsg from="sora" art={art}>which line next? 👇</ChatMsg>
        </ChatScreen>
      );
  }
}

/* ------------------------------------------------------------------ */
/* QUIZ: a Bright Path lesson, the way the app looks                    */
/* ------------------------------------------------------------------ */

const Progress: React.FC<{ step: number; total: number; dark?: boolean }> = ({ step, total, dark }) => (
  <div style={{ position: 'absolute', top: '72px', left: `${SAFE.left}px`, right: `${SAFE.right - 60}px`, display: 'flex', alignItems: 'center', gap: '26px' }}>
    <svg width="34" height="34" viewBox="0 0 34 34"><path d="M5 5 L29 29 M29 5 L5 29" stroke={dark ? '#AEB4C8' : 'rgba(255,255,255,0.75)'} strokeWidth="6" strokeLinecap="round" /></svg>
    <div style={{ flex: 1, height: '26px', borderRadius: '99px', background: dark ? '#E4E7F0' : 'rgba(0,0,0,0.18)', overflow: 'hidden' }}>
      <div style={{ width: `${Math.max(8, (step / total) * 100)}%`, height: '100%', borderRadius: '99px', background: dark ? BP.teal : '#fff', boxShadow: 'inset 0 -7px 0 rgba(0,0,0,0.12)' }} />
    </div>
  </div>
);

const Pill: React.FC<{ children: React.ReactNode; bg: string; color?: string }> = ({ children, bg, color = '#fff' }) => (
  <span style={{ display: 'inline-block', background: bg, color, fontSize: '32px', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '12px 28px', borderRadius: '99px' }}>{children}</span>
);

const Card: React.FC<{ children: React.ReactNode; shadow?: string; style?: React.CSSProperties }> = ({ children, shadow = 'rgba(0,0,0,0.22)', style }) => (
  <div style={{ background: '#fff', borderRadius: '36px', padding: '40px 44px', boxShadow: `0 12px 0 ${shadow}`, ...style }}>{children}</div>
);

const Title: React.FC<{ children: React.ReactNode; size?: number; color?: string }> = ({ children, size = 84, color = '#fff' }) => (
  <div style={{ fontFamily: DISPLAY, fontSize: `${size}px`, lineHeight: 1.08, color }}>{children}</div>
);

const Answer: React.FC<{ letter: string; text: string; state?: 'right' | 'wrong' | 'idle' | 'dim' }> = ({ letter, text, state = 'idle' }) => {
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
      <div style={{ fontSize: `${answerSize(text)}px`, fontWeight: 800, lineHeight: 1.2, color: look.text, textDecoration: state === 'wrong' ? 'line-through' : 'none', textDecorationThickness: '4px' }}>{text}</div>
    </div>
  );
};

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
      return body(BP.blue, (
        <>
          <div style={{ ...safe, gap: '34px' }}>
            <div><Pill bg={BP.amber} color={BP.amberInk}>{data.source || 'Korean'}</Pill></div>
            <Title size={fitEn(slide.hook, 128, 22)}>{slide.hook}</Title>
            <Card shadow={BP.blueDark} style={{ alignSelf: 'flex-start', maxWidth: '820px' }}>
              <div style={{ fontFamily: KR, fontWeight: 800, fontSize: `${fit(line.native, 200, 760, 2)}px`, lineHeight: 1.15 }}>{line.native}</div>
              <div style={{ fontSize: '40px', fontWeight: 700, color: BP.muted, marginTop: '10px' }}>{line.romanization}</div>
            </Card>
          </div>
          <Img src={m['tiger-think']} style={{ right: '160px', bottom: '110px', height: '270px' }} />
          <div style={{ position: 'absolute', left: `${SAFE.left}px`, bottom: `${SAFE.bottom - 10}px`, color: '#fff', fontSize: '44px', fontWeight: 800 }}>Guess the meaning →</div>
        </>
      ));
    case 'quiz':
      return body(BP.paper, (
        <>
          <div style={safe}>
            <Title size={74} color={BP.ink}>What does it really mean?</Title>
            <div style={{ display: 'flex', alignItems: 'center', gap: '22px' }}>
              <div style={{ background: '#fff', border: `4px solid ${BP.line}`, borderRadius: '28px', padding: '16px 30px', fontFamily: KR, fontWeight: 800, fontSize: `${fit(line.native, 100, 760)}px` }}>{line.native}</div>
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

/* ------------------------------------------------------------------ */
/* COMIC: a webtoon page with Sora and Horang                          */
/* ------------------------------------------------------------------ */

const COMIC = { paper: '#FFF7E8', ink: '#141414', yellow: '#FFE14D', dot: 'rgba(20,20,20,0.09)' };

const Panel: React.FC<{ style: React.CSSProperties; bg?: string; children: React.ReactNode }> = ({ style, bg = '#DCEBFF', children }) => (
  <div style={{
    position: 'absolute', border: `8px solid ${COMIC.ink}`, overflow: 'hidden',
    background: `radial-gradient(${COMIC.dot} 22%, transparent 24%) 0 0 / 26px 26px, ${bg}`, ...style
  }}>
    {children}
  </div>
);

// A speech bubble; tail points down-left or down-right toward the speaker.
const Bubble: React.FC<{ style: React.CSSProperties; tail?: 'left' | 'right' | 'none'; size?: number; children: React.ReactNode; shout?: boolean }> = ({ style, tail = 'left', size = 48, children, shout }) => (
  <div style={{ position: 'absolute', ...style }}>
    <div style={{
      background: '#fff', border: `6px solid ${COMIC.ink}`, borderRadius: shout ? '18px' : '60px', padding: '24px 34px',
      fontSize: `${size}px`, fontWeight: 800, lineHeight: 1.22, textAlign: 'center', position: 'relative', zIndex: 2
    }}>
      {children}
    </div>
    {tail !== 'none' && (
      <svg width="90" height="70" viewBox="0 0 90 70" style={{ position: 'absolute', bottom: '-58px', [tail]: '70px', zIndex: 3, transform: tail === 'right' ? 'scaleX(-1)' : undefined }}>
        <path d="M10 0 L30 64 L60 0" fill="#fff" stroke={COMIC.ink} strokeWidth="6" strokeLinejoin="round" />
        <rect x="6" y="0" width="60" height="7" fill="#fff" />
      </svg>
    )}
  </div>
);

const Narration: React.FC<{ style: React.CSSProperties; size?: number; children: React.ReactNode }> = ({ style, size = 44, children }) => (
  <div style={{ position: 'absolute', background: COMIC.yellow, border: `6px solid ${COMIC.ink}`, padding: '16px 26px', fontFamily: DISPLAY, fontSize: `${size}px`, lineHeight: 1.1, boxShadow: `8px 8px 0 ${COMIC.ink}`, zIndex: 4, ...style }}>{children}</div>
);

const Sfx: React.FC<{ style: React.CSSProperties; size?: number; color?: string; children: React.ReactNode }> = ({ style, size = 120, color = '#FF4F6D', children }) => (
  <div style={{ position: 'absolute', fontFamily: 'BlackHanSans, NotoKR, sans-serif', fontSize: `${size}px`, color, WebkitTextStroke: `10px ${COMIC.ink}`, paintOrder: 'stroke fill', zIndex: 5, ...style }}>{children}</div>
);

// VN sprites are 3:4 waist-up with the eyes at 22% height; `face` crops to head and shoulders.
const Sprite: React.FC<{ src?: string; style: React.CSSProperties; face?: boolean; flip?: boolean }> = ({ src, style, face, flip }) =>
  src ? (
    <img src={src} style={{
      position: 'absolute', zIndex: 1,
      ...(face ? { width: style.width, objectFit: 'cover', objectPosition: '50% 0%' } : {}),
      transform: flip ? 'scaleX(-1)' : undefined,
      filter: `drop-shadow(0 0 0 ${COMIC.ink})`, ...style
    }} />
  ) : null;

function comic(slide: CarouselSlide, data: LineBreakdownData, art: CarouselArt) {
  const { line } = data;
  const quiz = quizOf(data);
  const sora = art.sora;
  const tutor = art.tutor;
  const page = (children: React.ReactNode) => (
    <Page background={COMIC.paper}>{children}</Page>
  );
  const kr: React.CSSProperties = { fontFamily: KR, fontWeight: 800 };

  switch (slide.kind) {
    case 'hook':
      return page(
        <>
          <Panel style={{ left: '40px', right: '40px', top: '40px', bottom: '40px' }} bg="#CFE3FF">
            <Sprite src={sora.confused} style={{ left: '-90px', bottom: '-40px', height: '980px' }} />
          </Panel>
          <Narration style={{ left: `${SAFE.left}px`, top: `${SAFE.top + 10}px`, maxWidth: '760px', transform: 'rotate(-1.5deg)' }} size={fitEn(slide.hook, 84, 22)}>{slide.hook}</Narration>
          <Bubble style={{ right: `${SAFE.right - 60}px`, top: '400px', maxWidth: '520px' }} tail="left" size={fit(line.native, 110, 440, 2)}>
            <span style={kr}>{line.native.split(' ').slice(0, -1).join(' ')} <span style={{ whiteSpace: 'nowrap' }}>{line.native.split(' ').slice(-1)[0]}{/[?？]$/.test(line.native) ? '…' : '…?'}</span></span>
          </Bubble>
          <Sfx style={{ right: `${SAFE.right + 20}px`, top: '720px', transform: 'rotate(12deg)' }} size={170} color={COMIC.yellow}>?!</Sfx>
          <Narration style={{ left: `${SAFE.left}px`, bottom: `${SAFE.bottom + 30}px`, background: '#fff' }} size={40}>{data.source || 'Korean'}</Narration>
        </>
      );
    case 'quiz':
      return page(
        <>
          <Panel style={{ left: '40px', right: '40px', top: '40px', height: '520px' }} bg="#FFE3C7">
            <Sprite src={tutor.smug} style={{ right: '60px', top: '30px', width: '420px', height: '560px' }} face />
          </Panel>
          <Bubble style={{ left: `${SAFE.left}px`, top: `${SAFE.top + 30}px`, maxWidth: '520px' }} tail="right" size={50}>
            So, what does <span style={kr}>{line.native}</span> mean?
          </Bubble>
          <Panel style={{ left: '40px', right: '40px', top: '590px', bottom: '40px' }} bg="#E4F2E1">
            <Sprite src={sora.thinking} style={{ right: '-170px', bottom: '-120px', height: '760px' }} />
          </Panel>
          <div style={{ position: 'absolute', left: `${SAFE.left}px`, top: '640px', width: '680px', display: 'flex', flexDirection: 'column', gap: '22px', zIndex: 3 }}>
            {quiz.options.map((o, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '18px', background: '#fff', border: `6px solid ${COMIC.ink}`, borderRadius: '30px', padding: '14px 24px', boxShadow: `6px 6px 0 ${COMIC.ink}` }}>
                <span style={{ fontFamily: DISPLAY, fontSize: '50px', color: '#FF4F6D' }}>{LETTERS[i]}</span>
                <span style={{ fontSize: `${answerSize(o) - 4}px`, fontWeight: 800, lineHeight: 1.15 }}>{o}</span>
              </div>
            ))}
          </div>
          <Narration style={{ left: `${SAFE.left}px`, top: '470px', transform: 'rotate(-2deg)' }} size={44}>Comment your guess!</Narration>
        </>
      );
    case 'reveal':
      return page(
        <>
          <Panel style={{ left: '40px', right: '40px', top: '40px', height: '700px' }} bg="#FFE3C7">
            <Sprite src={tutor.explaining} style={{ left: '-10px', bottom: '-260px', height: '900px' }} />
          </Panel>
          <Bubble style={{ right: `${SAFE.right - 40}px`, top: `${SAFE.top + 20}px`, maxWidth: '560px' }} tail="left" size={fitEn(quiz.options[quiz.answer], 54, 22)}>
            {LETTERS[quiz.answer]}! {sentence(quiz.options[quiz.answer])}
          </Bubble>
          <Narration style={{ right: `${SAFE.right - 40}px`, top: '520px', maxWidth: '560px', background: '#fff', fontFamily: SANS, fontWeight: 700 }} size={34}>{data.nuance}</Narration>
          <Panel style={{ left: '40px', width: '560px', top: '770px', bottom: '40px' }} bg="#FFD6E0">
            <Sprite src={sora.surprised} style={{ left: '40px', top: '20px', width: '480px', height: '640px' }} face />
          </Panel>
          <Panel style={{ left: '630px', right: '40px', top: '770px', bottom: '40px' }} bg={COMIC.yellow}>
            <div />
          </Panel>
          <Sfx style={{ left: '650px', top: '820px', transform: 'rotate(-8deg)' }} size={130}>두둥!</Sfx>
          <Bubble style={{ left: '330px', top: '800px' }} tail="left" size={52} shout>WAIT.</Bubble>
        </>
      );
    case 'part': {
      const part = data.parts[slide.index];
      const bgs = ['#CFE3FF', '#E4F2E1', '#EDE4FF', '#FFE3C7'];
      return page(
        <>
          <Panel style={{ left: '40px', right: '40px', top: '40px', bottom: '40px' }} bg={bgs[slide.index % bgs.length]}>
            <Sprite src={slide.index % 2 ? tutor.happy : tutor.explaining} style={{ right: '-60px', bottom: '-200px', height: '900px' }} />
          </Panel>
          <Narration style={{ left: `${SAFE.left}px`, top: `${SAFE.top}px` }} size={40}>Piece {slide.index + 1} of {data.parts.length}</Narration>
          <Bubble style={{ left: `${SAFE.left}px`, top: `${SAFE.top + 120}px`, width: '600px' }} tail="right" size={44}>
            <div style={{ ...kr, fontSize: `${fit(part.native, 220, 520)}px`, lineHeight: 1.05 }}>{part.native}</div>
            <div style={{ fontSize: '36px', color: BP.muted, marginTop: '8px' }}>{part.romanization}</div>
            <div style={{ fontFamily: DISPLAY, fontWeight: 400, fontSize: `${fitEn(part.meaning, 76, 14)}px`, marginTop: '18px', color: '#E8364F' }}>{part.meaning}</div>
          </Bubble>
          {part.note && <Narration style={{ left: `${SAFE.left}px`, bottom: `${SAFE.bottom + 30}px`, maxWidth: '560px', background: '#fff', fontFamily: SANS, fontWeight: 700 }} size={38}>{part.note}</Narration>}
        </>
      );
    }
    case 'use':
      return page(
        <>
          <Panel style={{ left: '40px', right: '40px', top: '40px', bottom: '40px' }} bg="#FFF0B8">
            <Sprite src={sora.determined} style={{ left: '-40px', bottom: '-160px', height: '880px' }} />
          </Panel>
          <Narration style={{ left: `${SAFE.left}px`, top: `${SAFE.top}px` }} size={44}>Sora tries it:</Narration>
          <Bubble style={{ right: `${SAFE.right - 40}px`, top: `${SAFE.top + 120}px`, maxWidth: '620px' }} tail="left" size={44}>
            <div style={{ ...kr, fontSize: `${fit(data.use_it.native, 130, 540, 2)}px`, lineHeight: 1.15 }}>{data.use_it.native}</div>
            <div style={{ fontSize: '32px', color: BP.muted, marginTop: '8px' }}>{data.use_it.romanization}</div>
          </Bubble>
          <Narration style={{ right: `${SAFE.right - 40}px`, top: '730px', maxWidth: '560px', background: '#fff', fontFamily: SANS, fontWeight: 700 }} size={40}>"{data.use_it.english}"</Narration>
          <Sfx style={{ right: `${SAFE.right + 20}px`, bottom: `${SAFE.bottom + 40}px`, transform: 'rotate(-10deg)' }} size={110} color="#5BD48A">완벽!</Sfx>
        </>
      );
    case 'recap':
      return page(
        <>
          <Panel style={{ left: '40px', right: '40px', top: '40px', bottom: '40px' }} bg="#fff">
            <div style={{ position: 'absolute', inset: 0, background: 'repeating-linear-gradient(180deg, transparent 0 78px, #D8E4F5 78px 81px)' }} />
          </Panel>
          <Narration style={{ left: `${SAFE.left}px`, top: `${SAFE.top}px` }} size={56}>Sora's notes · save these</Narration>
          <div style={{ position: 'absolute', left: `${SAFE.left + 10}px`, right: `${SAFE.right}px`, top: `${SAFE.top + 140}px`, zIndex: 3 }}>
            <div style={{ ...kr, fontSize: `${fit(line.native, 140, 780, 2)}px` }}>{line.native}</div>
            <div style={{ fontSize: '40px', fontWeight: 800, color: '#E8364F', margin: '6px 0 26px' }}>= "{line.natural}"</div>
            {data.parts.map((p, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '24px', marginBottom: '22px' }}>
                <span style={{ ...kr, fontSize: '58px', background: [COMIC.yellow, '#BDEBC9', '#CFE0FF', '#FFD0DA'][i % 4], padding: '2px 18px' }}>{p.native}</span>
                <span style={{ fontSize: '42px', fontWeight: 800 }}>{p.meaning}</span>
              </div>
            ))}
          </div>
          <Sprite src={sora.happy} style={{ right: '50px', bottom: '40px', height: '420px' }} />
        </>
      );
    case 'cta':
      return page(
        <>
          <Panel style={{ left: '40px', right: '40px', top: '40px', bottom: '40px' }} bg="#CFE3FF">
            <Sprite src={sora.happy} style={{ left: '-30px', bottom: '-200px', height: '860px' }} />
            <Sprite src={tutor.proud} style={{ right: '-60px', bottom: '-200px', height: '860px' }} />
          </Panel>
          <Narration style={{ left: `${SAFE.left}px`, top: `${SAFE.top}px`, maxWidth: '800px' }} size={70}>Paste any Korean line into Hanbok</Narration>
          <Bubble style={{ left: `${SAFE.left + 40}px`, top: '420px', maxWidth: '560px' }} tail="left" size={42}>It breaks it down like this, free.</Bubble>
          <Narration style={{ left: `${SAFE.left}px`, bottom: `${SAFE.bottom + 30}px`, background: '#fff' }} size={44}>hanbokstudy.com · link in bio</Narration>
        </>
      );
  }
}

export const CarouselSlideDocument: React.FC<{
  style: CarouselStyle;
  slide: CarouselSlide;
  data: LineBreakdownData;
  art: CarouselArt;
  index: number;
  total: number;
  fontCSS?: string;
}> = ({ style, slide, data, art, index, total, fontCSS }) => (
  <html>
    <head>
      <meta charSet="utf-8" />
      {fontCSS && <style dangerouslySetInnerHTML={{ __html: fontCSS }} />}
    </head>
    <body style={{ margin: 0, padding: 0 }}>
      {style === 'chat'
        ? chat(slide, data, art)
        : style === 'comic'
          ? comic(slide, data, art)
          : quizStyle(slide, data, art, index, total)}
    </body>
  </html>
);
