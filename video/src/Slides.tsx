import React, { useLayoutEffect, useRef, useState } from 'react';
import { Img, continueRender, delayRender, interpolate, spring, staticFile } from 'remotion';
import { Slide, VideoSlide } from './scene';

// The slide card sits in the top of the frame, clear of TikTok's top tabs, its right-hand
// buttons, and the characters standing below it.
// maxHeight keeps the card's bottom (590px) above the characters' heads (sprites start at 610px).
export const CARD = { top: 150, left: 40, right: 170, maxHeight: 440 };

const HANGUL = /[㄰-㆏가-힯]/;
const INK = '#16182B';
const YELLOW = '#FFE14D';

const Box: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <div style={{ background: '#fff', color: INK, borderRadius: 26, padding: '22px 30px', boxShadow: '0 10px 30px rgba(0,0,0,0.35)', ...style }}>{children}</div>
);

const Chip: React.FC<{ children: React.ReactNode; color?: string }> = ({ children, color = '#E0313B' }) => (
  <div style={{ alignSelf: 'flex-start', background: color, color: '#fff', fontFamily: 'LilitaOne', fontSize: 34, padding: '4px 20px', borderRadius: 14 }}>{children}</div>
);

const Romanization: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ fontFamily: 'TikTokSans', fontSize: 36, color: '#6B6F85', fontWeight: 600, marginTop: 4 }}>{children}</div>
);

// Hangul runs in Jua, the rest in TikTok Sans.
const Mixed: React.FC<{ text: string }> = ({ text }) => (
  <>{text.split(/(\S+)/).map((part, i) => <span key={i} style={HANGUL.test(part) ? { fontFamily: 'Jua' } : undefined}>{part}</span>)}</>
);

const Column: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>{children}</div>
);

function renderSlide(s: VideoSlide, revealed: boolean) {
  switch (s.kind) {
    case 'hook':
      return (
        <Column>
          {s.source && <Chip>{s.source}</Chip>}
          <Box style={{ fontFamily: 'TikTokSans', fontWeight: 800, fontSize: 70, lineHeight: 1.12 }}><Mixed text={s.text} /></Box>
        </Column>
      );
    case 'line':
      return (
        <Column>
          {s.source && <Chip>{s.source}</Chip>}
          <Box>
            <div style={{ fontFamily: 'Jua', fontSize: 104, lineHeight: 1.1 }}>{s.native}</div>
            <Romanization>{s.romanization}</Romanization>
          </Box>
          <Box style={{ fontFamily: 'TikTokSans', fontSize: 42, fontWeight: 700 }}>
            <span style={{ color: '#6B6F85' }}>Subtitles: </span>“{s.translation}”
          </Box>
        </Column>
      );
    case 'part': {
      const at = s.line.indexOf(s.native);
      const before = at >= 0 ? s.line.slice(0, at) : '';
      const after = at >= 0 ? s.line.slice(at + s.native.length) : '';
      return (
        <Column>
          <Box style={{ fontFamily: 'Jua', fontSize: 64, color: '#A3A6B8' }}>
            {at >= 0 ? <>{before}<span style={{ color: INK, background: YELLOW, borderRadius: 10, padding: '0 6px' }}>{s.native}</span>{after}</> : s.line}
          </Box>
          <Box>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 24, flexWrap: 'wrap' }}>
              <div style={{ fontFamily: 'Jua', fontSize: 96 }}>{s.native}</div>
              <div style={{ fontFamily: 'TikTokSans', fontSize: 52, fontWeight: 800 }}>= {s.meaning}</div>
            </div>
            <Romanization>{s.romanization}</Romanization>
            {s.note && <div style={{ fontFamily: 'TikTokSans', fontSize: 38, fontWeight: 600, marginTop: 12 }}><Mixed text={s.note} /></div>}
          </Box>
        </Column>
      );
    }
    case 'nuance':
      return (
        <Column>
          <Box style={{ fontFamily: 'Jua', fontSize: 72 }}>{s.native}</Box>
          <Box style={{ fontFamily: 'TikTokSans', fontSize: 40, fontWeight: 700, lineHeight: 1.25 }}>
            <div><span style={{ color: '#6B6F85' }}>Literally: </span><Mixed text={s.literal} /></div>
            <div style={{ marginTop: 10 }}><span style={{ color: '#E0313B' }}>Really: </span><Mixed text={s.natural} /></div>
          </Box>
          <Box style={{ fontFamily: 'TikTokSans', fontSize: 38, fontWeight: 600, background: YELLOW }}><Mixed text={s.nuance} /></Box>
        </Column>
      );
    case 'use':
      return (
        <Column>
          <Chip color="#3D64E8">Use it</Chip>
          <Box>
            <div style={{ fontFamily: 'Jua', fontSize: 88, lineHeight: 1.1 }}>{s.native}</div>
            <Romanization>{s.romanization}</Romanization>
            <div style={{ fontFamily: 'TikTokSans', fontSize: 46, fontWeight: 800, marginTop: 12 }}>{s.english}</div>
          </Box>
        </Column>
      );
    case 'quiz':
      if (!s.question) return null;
      return (
        <Column>
          <Chip color="#3D64E8">Guess</Chip>
          <Box style={{ fontFamily: 'TikTokSans', fontWeight: 800, fontSize: 58, lineHeight: 1.15 }}><Mixed text={s.question} /></Box>
          {s.options.map((option, i) => {
            const right = revealed && i === s.answer;
            const wrong = revealed && i !== s.answer;
            return (
              <Box key={i} style={{
                display: 'flex', alignItems: 'center', gap: 22, fontFamily: 'TikTokSans', fontWeight: 800, fontSize: 50,
                background: right ? '#2BB673' : '#fff', color: right ? '#fff' : INK, opacity: wrong ? 0.45 : 1,
                transform: right ? 'scale(1.03)' : undefined
              }}>
                <span style={{ fontFamily: 'LilitaOne', fontSize: 56, color: right ? '#fff' : '#E0313B' }}>{right ? '✓' : 'AB'[i]}</span>
                <span><Mixed text={option} /></span>
              </Box>
            );
          })}
          {!revealed && (
            <div style={{ alignSelf: 'flex-start', background: '#E0313B', color: '#fff', fontFamily: 'LilitaOne', fontSize: 48, padding: '6px 26px', borderRadius: 16 }}>Comment your guess ↓</div>
          )}
        </Column>
      );
    case 'cta':
      return (
        <Column>
          <Box style={{ fontFamily: 'TikTokSans', fontWeight: 800, fontSize: 64, lineHeight: 1.12 }}>{s.text}</Box>
          <Chip color="#3D64E8">hanbokstudy.com</Chip>
        </Column>
      );
  }
}

// `since` is seconds since this slide appeared, for the pop-in.
// `revealed` shows a quiz slide's answer.
export const SlideCard: React.FC<{ slide: Slide; since: number; fps: number; revealed?: boolean }> = ({ slide, since, fps, revealed = false }) => {
  const pop = spring({ frame: Math.round(since * fps), fps, config: { damping: 14, stiffness: 160 } });
  const style: React.CSSProperties = {
    position: 'absolute', top: CARD.top, left: CARD.left, right: CARD.right, maxHeight: CARD.maxHeight,
    transform: `translateY(${interpolate(pop, [0, 1], [-40, 0])}px) scale(${interpolate(pop, [0, 1], [0.92, 1])})`,
    opacity: Math.min(1, pop * 1.5), transformOrigin: 'top center'
  };
  if (typeof slide === 'string') {
    // Image slides (the carousel PNGs) are shown whole inside the card area.
    return <div style={style}><Img src={staticFile(slide)} style={{ width: '100%', maxHeight: CARD.maxHeight, objectFit: 'contain', borderRadius: 26 }} /></div>;
  }
  return <div style={style}><FitToCard>{renderSlide(slide, revealed)}</FitToCard></div>;
};

// Long slide text (a wordy meaning or note) shrinks to fit the card instead of running down
// behind the characters.
const FitToCard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [handle] = useState(() => delayRender('Fitting slide text'));
  useLayoutEffect(() => {
    // Measure once the fonts are in, since the fallback fonts wrap differently.
    document.fonts.ready.then(() => {
      const h = ref.current?.scrollHeight ?? 0;
      if (h > CARD.maxHeight) setZoom(CARD.maxHeight / h);
      continueRender(handle);
    });
  }, [handle]);
  return <div ref={ref} style={{ zoom }}>{children}</div>;
};
