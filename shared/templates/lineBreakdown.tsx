import React from 'react';

// "What they actually said" carousel: a real line from a show or song,
// broken down the way Hanbok shows it. Slides are 1080x1350 (TikTok 4:5).

export interface LineBreakdownData {
  source: string;
  line: {
    native: string;
    romanization: string;
    common_translation: string;
    literal: string;
    natural: string;
  };
  parts: { native: string; romanization: string; meaning: string; note?: string }[];
  nuance: string;
  use_it: { native: string; romanization: string; english: string };
}

export type LineBreakdownSlide =
  | { kind: 'hook'; hook: string }
  | { kind: 'line' }
  | { kind: 'parts' }
  | { kind: 'meaning' }
  | { kind: 'use' }
  | { kind: 'cta' };

const BG = '#14161f';
const PANEL = '#1f2230';
const TEXT = '#f5f3ee';
const MUTED = 'rgba(245, 243, 238, 0.62)';
const ACCENT = '#f2c14e';
const PART_COLORS = ['#f2c14e', '#7ad3a8', '#8fb3ff', '#e58888', '#c9a0f2'];

const SANS = 'TikTokSans, Arial, Helvetica, sans-serif';
const NATIVE = 'Hahmlet, "Noto Serif KR", "Noto Sans JP", serif';

const pill = (bg: string, color = BG): React.CSSProperties => ({
  display: 'inline-block',
  background: bg,
  color,
  borderRadius: '999px',
  padding: '12px 28px',
  fontSize: '30px',
  fontWeight: 700,
  letterSpacing: '0.02em'
});

const label: React.CSSProperties = {
  fontSize: '30px',
  fontWeight: 700,
  color: ACCENT,
  textTransform: 'uppercase',
  letterSpacing: '0.12em',
  margin: '0 0 28px 0'
};

function nativeSize(text: string, base: number): string {
  const len = [...text].length;
  if (len <= 8) return `${base}px`;
  if (len <= 16) return `${Math.round(base * 0.78)}px`;
  if (len <= 28) return `${Math.round(base * 0.6)}px`;
  return `${Math.round(base * 0.46)}px`;
}

const Frame: React.FC<{ index: number; total: number; source: string; children: React.ReactNode }> = ({ index, total, source, children }) => (
  <div style={{
    width: '1080px',
    height: '1350px',
    background: BG,
    color: TEXT,
    fontFamily: SANS,
    position: 'relative',
    overflow: 'hidden',
    boxSizing: 'border-box',
    padding: '110px 90px 140px'
  }}>
    <div style={{ position: 'absolute', top: '56px', left: '90px', right: '90px', display: 'flex', justifyContent: 'space-between', fontSize: '28px', color: MUTED }}>
      <span>{source}</span>
      <span>{index + 1}/{total}</span>
    </div>
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      {children}
    </div>
    <div style={{ position: 'absolute', bottom: '56px', left: '90px', fontSize: '28px', fontWeight: 700, color: MUTED }}>
      hanbokstudy.com
    </div>
  </div>
);

function renderBody(slide: LineBreakdownSlide, data: LineBreakdownData) {
  const { line } = data;
  switch (slide.kind) {
    case 'hook':
      return (
        <>
          <div style={{ fontSize: '96px', fontWeight: 800, lineHeight: 1.08, margin: '0 0 64px 0' }}>{slide.hook}</div>
          <div style={{ fontFamily: NATIVE, fontSize: nativeSize(line.native, 84), color: ACCENT, lineHeight: 1.3 }}>
            "{line.native}"
          </div>
          <div style={{ marginTop: '80px', fontSize: '34px', color: MUTED }}>Swipe for the breakdown →</div>
        </>
      );
    case 'line':
      return (
        <>
          <p style={label}>The line</p>
          <div style={{ fontFamily: NATIVE, fontSize: nativeSize(line.native, 150), lineHeight: 1.25, fontWeight: 700 }}>{line.native}</div>
          <div style={{ fontSize: '40px', color: MUTED, margin: '28px 0 90px 0' }}>{line.romanization}</div>
          <div style={{ background: PANEL, borderRadius: '28px', padding: '40px 44px' }}>
            <div style={{ fontSize: '28px', color: MUTED, marginBottom: '14px' }}>Most translations say</div>
            <div style={{ fontSize: '52px', fontWeight: 700 }}>"{line.common_translation}"</div>
          </div>
          <div style={{ marginTop: '36px', fontSize: '38px', color: ACCENT, fontWeight: 700 }}>But that's not quite it.</div>
        </>
      );
    case 'parts':
      return (
        <>
          <p style={label}>Piece by piece</p>
          <div style={{ fontFamily: NATIVE, fontSize: nativeSize(line.native, 96), lineHeight: 1.4, marginBottom: '56px' }}>
            {data.parts.map((p, i) => (
              <span key={i} style={{ color: PART_COLORS[i % PART_COLORS.length], borderBottom: `6px solid ${PART_COLORS[i % PART_COLORS.length]}`, marginRight: '14px' }}>
                {p.native}
              </span>
            ))}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
            {data.parts.map((p, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '30px', background: PANEL, borderRadius: '24px', padding: '24px 32px', borderLeft: `10px solid ${PART_COLORS[i % PART_COLORS.length]}` }}>
                <div style={{ fontFamily: NATIVE, fontSize: '54px', minWidth: '250px', fontWeight: 700 }}>{p.native}</div>
                <div>
                  <div style={{ fontSize: '40px', fontWeight: 700 }}>{p.meaning}</div>
                  <div style={{ fontSize: '28px', color: MUTED, marginTop: '6px' }}>
                    {p.romanization}{p.note ? ` · ${p.note}` : ''}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      );
    case 'meaning':
      return (
        <>
          <p style={label}>What it actually says</p>
          <div style={{ fontSize: '30px', color: MUTED, marginBottom: '10px' }}>Word for word</div>
          <div style={{ fontSize: '46px', marginBottom: '56px' }}>{line.literal}</div>
          <div style={{ fontSize: '30px', color: MUTED, marginBottom: '10px' }}>What it really means</div>
          <div style={{ fontSize: '66px', fontWeight: 800, color: ACCENT, lineHeight: 1.15, marginBottom: '64px' }}>"{line.natural}"</div>
          <div style={{ background: PANEL, borderRadius: '28px', padding: '40px 44px', fontSize: '40px', lineHeight: 1.35 }}>{data.nuance}</div>
        </>
      );
    case 'use':
      return (
        <>
          <p style={label}>Use it yourself</p>
          <div style={{ fontFamily: NATIVE, fontSize: nativeSize(data.use_it.native, 110), fontWeight: 700, lineHeight: 1.3 }}>{data.use_it.native}</div>
          <div style={{ fontSize: '38px', color: MUTED, margin: '24px 0 40px 0' }}>{data.use_it.romanization}</div>
          <div style={{ fontSize: '54px', fontWeight: 700 }}>{data.use_it.english}</div>
          <div style={{ marginTop: '90px', ...pill(ACCENT) }}>Save this for later</div>
        </>
      );
    case 'cta':
      return (
        <>
          <div style={{ fontSize: '86px', fontWeight: 800, lineHeight: 1.1 }}>
            Paste any line into <span style={{ color: ACCENT }}>Hanbok</span>.
          </div>
          <div style={{ fontSize: '46px', color: MUTED, margin: '40px 0 80px 0', lineHeight: 1.3 }}>
            Get this breakdown for any sentence, lyric or subtitle in seconds.
          </div>
          <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
            <span style={pill(ACCENT)}>hanbokstudy.com</span>
            <span style={pill(PANEL, TEXT)}>Link in bio</span>
          </div>
          <div style={{ marginTop: '110px', fontSize: '40px' }}>Which line should we break down next? Comment it 👇</div>
        </>
      );
  }
}

export const LineBreakdownSlideDocument: React.FC<{
  slide: LineBreakdownSlide;
  data: LineBreakdownData;
  index: number;
  total: number;
  fontCSS?: string;
}> = ({ slide, data, index, total, fontCSS }) => (
  <html>
    <head>
      <meta charSet="utf-8" />
      {fontCSS && <style dangerouslySetInnerHTML={{ __html: fontCSS }} />}
    </head>
    <body style={{ margin: 0, padding: 0 }}>
      <Frame index={index} total={total} source={data.source}>
        {renderBody(slide, data)}
      </Frame>
    </body>
  </html>
);

// Slide order. The hook is first; alternate hooks are rendered separately as covers to A/B test.
export function lineBreakdownSlides(hook: string): LineBreakdownSlide[] {
  return [
    { kind: 'hook', hook },
    { kind: 'line' },
    { kind: 'parts' },
    { kind: 'meaning' },
    { kind: 'use' },
    { kind: 'cta' }
  ];
}
