import React from 'react';

// "What they actually said" carousel: a real line from a show or song, broken down
// one piece per slide. Slides are 1080x1350 (TikTok 4:5). Three visual styles share
// the same slide sequence so they can be A/B tested against each other.
//
// TikTok overlays its own UI on the bottom ~260px (caption, music) and the right
// ~150px (like/comment/share), so every style keeps text inside SAFE.

export type LineBreakdownStyle = 'storybook' | 'variety' | 'notes';
export const LINE_BREAKDOWN_STYLES: LineBreakdownStyle[] = ['storybook', 'variety', 'notes'];

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
  | { kind: 'part'; index: number }
  | { kind: 'meaning' }
  | { kind: 'use' }
  | { kind: 'cta' };

// Images as data URIs, keyed by file name without extension.
export interface LineBreakdownAssets {
  backgrounds: Record<string, string>;
  characters: Record<string, string>;
}

const SAFE = { top: 130, right: 150, bottom: 270, left: 80 };
const W = 1080;
const H = 1350;
const BRAND_RED = '#b91c1c';
const EMOJI = '"Noto Color Emoji"';

export function lineBreakdownSlides(hook: string, partCount: number): LineBreakdownSlide[] {
  return [
    { kind: 'hook', hook },
    { kind: 'line' },
    ...Array.from({ length: partCount }, (_, index) => ({ kind: 'part' as const, index })),
    { kind: 'meaning' },
    { kind: 'use' },
    { kind: 'cta' }
  ];
}

// Shrinks long native-script text so it never wraps into the TikTok UI.
function fit(text: string, base: number): number {
  const len = [...text].length;
  if (len <= 4) return base;
  if (len <= 8) return Math.round(base * 0.8);
  if (len <= 14) return Math.round(base * 0.62);
  if (len <= 22) return Math.round(base * 0.48);
  return Math.round(base * 0.38);
}

function pick<T>(items: T[], i: number): T | undefined {
  return items.length ? items[i % items.length] : undefined;
}

const outline = (stroke: string, width: number): React.CSSProperties => ({
  WebkitTextStroke: `${width}px ${stroke}`,
  paintOrder: 'stroke fill'
});

const Page: React.FC<{ background: string; children: React.ReactNode; font: string }> = ({ background, children, font }) => (
  <div style={{ width: `${W}px`, height: `${H}px`, position: 'relative', overflow: 'hidden', background, fontFamily: font, wordBreak: 'keep-all', overflowWrap: 'break-word' }}>
    {children}
  </div>
);

const Safe: React.FC<{ children: React.ReactNode; align?: 'center' | 'flex-start'; justify?: 'center' | 'flex-start' }> = ({ children, align = 'flex-start', justify = 'center' }) => (
  <div style={{
    position: 'absolute',
    top: `${SAFE.top}px`, right: `${SAFE.right}px`, bottom: `${SAFE.bottom}px`, left: `${SAFE.left}px`,
    display: 'flex', flexDirection: 'column', alignItems: align, justifyContent: justify, gap: '26px'
  }}>
    {children}
  </div>
);

/* ------------------------------------------------------------------ */
/* Storybook: Hanbok's painted art + TikTok-native white text boxes   */
/* ------------------------------------------------------------------ */

const STORY_SANS = 'TikTokSans, Arial, sans-serif';
const STORY_KR = 'Jua, TikTokSans, sans-serif';

const Box: React.FC<{ children: React.ReactNode; size: number; bg?: string; color?: string; font?: string }> = ({ children, size, bg = '#fff', color = '#111', font = STORY_SANS }) => (
  <div style={{ lineHeight: 1.42 }}>
    <span style={{
      background: bg, color, fontFamily: font, fontSize: `${size}px`, fontWeight: 800,
      padding: '6px 22px', borderRadius: '16px',
      WebkitBoxDecorationBreak: 'clone', boxDecorationBreak: 'clone'
    }}>
      {children}
    </span>
  </div>
);

function storybook(slide: LineBreakdownSlide, data: LineBreakdownData, assets: LineBreakdownAssets, n: number) {
  const bgs = ['palace-dusk', 'meadow', 'mountain', 'bookshelf', 'palace-night'].map(k => assets.backgrounds[k]).filter(Boolean);
  const bg = slide.kind === 'hook' ? assets.backgrounds['palace-dusk'] : pick(bgs, n);
  const background = bg ? `center / cover no-repeat url(${bg})` : '#3b4a6b';
  const character = (name: string, height: number, side: 'left' | 'right' = 'right') =>
    assets.characters[name] && (
      <img src={assets.characters[name]} style={{ position: 'absolute', bottom: '0px', [side]: side === 'right' ? `${SAFE.right - 20}px` : '40px', height: `${height}px`, filter: 'drop-shadow(0 10px 18px rgba(0,0,0,0.35))' }} />
    );
  const { line } = data;

  let body: React.ReactNode;
  switch (slide.kind) {
    case 'hook':
      body = (
        <>
          <Safe justify="flex-start">
            <Box size={36} bg={BRAND_RED} color="#fff">{data.source || 'Korean'}</Box>
            <Box size={92}>{slide.hook}</Box>
            <Box size={fit(line.native, 150)} font={STORY_KR}>{line.native}</Box>
          </Safe>
          {character('thinking', 430)}
        </>
      );
      break;
    case 'line':
      body = (
        <Safe>
          <Box size={fit(line.native, 150)} font={STORY_KR}>{line.native}</Box>
          <Box size={44} bg="rgba(255,255,255,0.85)">{line.romanization}</Box>
          <div style={{ height: '30px' }} />
          <Box size={58}>Subtitles: "{line.common_translation}"</Box>
          <Box size={62} bg={BRAND_RED} color="#fff">Not quite <span style={{ fontFamily: EMOJI }}>👀</span></Box>
        </Safe>
      );
      break;
    case 'part': {
      const part = data.parts[slide.index];
      body = (
        <Safe>
          <Box size={38} bg={BRAND_RED} color="#fff">{`Piece ${slide.index + 1} of ${data.parts.length}`}</Box>
          <Box size={fit(part.native, 210)} font={STORY_KR}>{part.native}</Box>
          <Box size={44} bg="rgba(255,255,255,0.85)">{part.romanization}</Box>
          <Box size={76}>= {part.meaning}</Box>
          {part.note && <Box size={50} bg="rgba(255,255,255,0.88)">{part.note}</Box>}
        </Safe>
      );
      break;
    }
    case 'meaning':
      body = (
        <Safe>
          <Box size={40} bg={BRAND_RED} color="#fff">What it really means</Box>
          <Box size={84}>"{line.natural}"</Box>
          <Box size={50} bg="rgba(255,255,255,0.88)">{data.nuance}</Box>
        </Safe>
      );
      break;
    case 'use':
      body = (
        <Safe>
          <Box size={40} bg={BRAND_RED} color="#fff">Now you try</Box>
          <Box size={fit(data.use_it.native, 130)} font={STORY_KR}>{data.use_it.native}</Box>
          <Box size={44} bg="rgba(255,255,255,0.85)">{data.use_it.romanization}</Box>
          <Box size={66}>{data.use_it.english}</Box>
          <Box size={48} bg="#ffe066">Save this for later <span style={{ fontFamily: EMOJI }}>📌</span></Box>
        </Safe>
      );
      break;
    case 'cta':
      body = (
        <>
          <Safe justify="flex-start">
            <Box size={84}>I paste every line I don't get into Hanbok</Box>
            <Box size={50} bg="rgba(255,255,255,0.9)">It breaks it down like this in seconds</Box>
            <Box size={46} bg={BRAND_RED} color="#fff">hanbokstudy.com · link in bio</Box>
            <Box size={46} bg="#ffe066">Which line next? Comment it <span style={{ fontFamily: EMOJI }}>👇</span></Box>
          </Safe>
          {character('music', 440)}
        </>
      );
      break;
  }

  return (
    <Page background={background} font={STORY_SANS}>
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.0) 40%, rgba(0,0,0,0.35) 100%)' }} />
      {body}
    </Page>
  );
}

/* ------------------------------------------------------------------ */
/* Variety: Korean variety-show captions (예능 자막) over the art       */
/* ------------------------------------------------------------------ */

const VAR_KR = 'BlackHanSans, Jua, sans-serif';
const VAR_EN = 'LilitaOne, TikTokSans, sans-serif';

const Caption: React.FC<{ children: React.ReactNode; size: number; color?: string; font?: string; tilt?: number }> = ({ children, size, color = '#fff', font = VAR_EN, tilt = 0 }) => (
  <div style={{
    fontFamily: font, fontSize: `${size}px`, color, lineHeight: 1.12,
    ...outline('#161616', Math.max(8, Math.round(size / 7))),
    textShadow: `0 ${Math.round(size / 14)}px 0 #161616`,
    transform: tilt ? `rotate(${tilt}deg)` : undefined
  }}>
    {children}
  </div>
);

const Tag: React.FC<{ children: React.ReactNode; bg: string }> = ({ children, bg }) => (
  <span style={{
    display: 'inline-block', background: bg, color: '#fff', fontFamily: VAR_EN, fontSize: '40px',
    padding: '10px 26px', borderRadius: '999px', border: '5px solid #161616', boxShadow: '0 6px 0 #161616'
  }}>
    {children}
  </span>
);

const Sticker: React.FC<{ emoji: string; top: number; left: number; size?: number; tilt?: number }> = ({ emoji, top, left, size = 110, tilt = -12 }) => (
  <div style={{ position: 'absolute', top: `${top}px`, left: `${left}px`, fontFamily: EMOJI, fontSize: `${size}px`, transform: `rotate(${tilt}deg)`, filter: 'drop-shadow(0 6px 0 rgba(0,0,0,0.35))' }}>{emoji}</div>
);

function variety(slide: LineBreakdownSlide, data: LineBreakdownData, assets: LineBreakdownAssets, n: number) {
  const bgs = ['palace-night', 'palace-dusk', 'mountain', 'meadow', 'bookshelf'].map(k => assets.backgrounds[k]).filter(Boolean);
  const bg = pick(bgs, n);
  const background = bg ? `center / cover no-repeat url(${bg})` : '#1d2340';
  const { line } = data;
  const YELLOW = '#ffe14d';
  const PINK = '#ff5c8a';
  const BLUE = '#3d7cff';

  let body: React.ReactNode;
  switch (slide.kind) {
    case 'hook':
      body = (
        <>
          <Safe justify="flex-start">
            <Tag bg={PINK}>{data.source || 'Korean'}</Tag>
            <Caption size={98}>{slide.hook}</Caption>
            <div style={{ height: '20px' }} />
            <Caption size={fit(line.native, 150)} color={YELLOW} font={VAR_KR} tilt={-3}>"{line.native}"</Caption>
          </Safe>
          <Sticker emoji="❓" top={1020} left={420} />
          {assets.characters.thinking && <img src={assets.characters.thinking} style={{ position: 'absolute', bottom: '0px', left: '40px', height: '420px' }} />}
        </>
      );
      break;
    case 'line':
      body = (
        <Safe>
          <Tag bg={BLUE}>The line</Tag>
          <Caption size={fit(line.native, 190)} color={YELLOW} font={VAR_KR}>{line.native}</Caption>
          <Caption size={54}>{line.romanization}</Caption>
          <div style={{ height: '30px' }} />
          <Caption size={60}>Subtitles: "{line.common_translation}"</Caption>
          <Caption size={78} color={PINK} tilt={-4}>Not even close</Caption>
        </Safe>
      );
      break;
    case 'part': {
      const part = data.parts[slide.index];
      const colors = [YELLOW, '#7dffb0', '#7fd3ff', '#ffb36b'];
      body = (
        <Safe>
          <Tag bg={PINK}>{`${slide.index + 1} / ${data.parts.length}`}</Tag>
          <Caption size={fit(part.native, 260)} color={colors[slide.index % colors.length]} font={VAR_KR}>{part.native}</Caption>
          <Caption size={54}>{part.romanization}</Caption>
          <Caption size={88}>{part.meaning}</Caption>
          {part.note && (
            <div style={{ background: '#fff', border: '5px solid #161616', borderRadius: '28px', padding: '22px 30px', fontFamily: VAR_EN, fontSize: '50px', color: '#161616', boxShadow: '0 8px 0 #161616', maxWidth: '780px' }}>
              {part.note}
            </div>
          )}
        </Safe>
      );
      break;
    }
    case 'meaning':
      body = (
        <Safe>
          <Tag bg={BLUE}>What it really means</Tag>
          <Caption size={96} color={YELLOW}>"{line.natural}"</Caption>
          <div style={{ background: '#fff', border: '5px solid #161616', borderRadius: '28px', padding: '26px 32px', fontFamily: VAR_EN, fontSize: '52px', color: '#161616', boxShadow: '0 8px 0 #161616' }}>
            {data.nuance}
          </div>
        </Safe>
      );
      break;
    case 'use':
      body = (
        <>
          <Safe>
            <Tag bg={PINK}>Your turn</Tag>
            <Caption size={fit(data.use_it.native, 150)} color={YELLOW} font={VAR_KR}>{data.use_it.native}</Caption>
            <Caption size={52}>{data.use_it.romanization}</Caption>
            <Caption size={74}>{data.use_it.english}</Caption>
          </Safe>
          <Sticker emoji="📌" top={170} left={760} />
        </>
      );
      break;
    case 'cta':
      body = (
        <>
          <Safe justify="flex-start">
            <Caption size={96}>Paste any line into <span style={{ color: YELLOW }}>Hanbok</span></Caption>
            <Caption size={60}>Get this breakdown in seconds</Caption>
            <Tag bg={BRAND_RED}>hanbokstudy.com · link in bio</Tag>
            <Caption size={58} color="#7dffb0">Comment the next line!</Caption>
          </Safe>
          {assets.characters.music && <img src={assets.characters.music} style={{ position: 'absolute', bottom: '0px', right: `${SAFE.right - 30}px`, height: '440px' }} />}
        </>
      );
      break;
  }

  return (
    <Page background={background} font={VAR_EN}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(10,12,30,0.45)' }} />
      {body}
    </Page>
  );
}

/* ------------------------------------------------------------------ */
/* Notes: a study-notebook page with highlighter and red pen           */
/* ------------------------------------------------------------------ */

const NOTE_KR = 'NanumPenScript, Jua, sans-serif';
const NOTE_EN = 'Caveat, NanumPenScript, sans-serif';
const INK = '#1f2a44';
const RED_PEN = '#d62f2f';
const HIGHLIGHTS = ['rgba(255,226,0,0.65)', 'rgba(255,140,190,0.55)', 'rgba(120,230,160,0.6)', 'rgba(120,190,255,0.55)'];

const Hl: React.FC<{ children: React.ReactNode; color: string }> = ({ children, color }) => (
  <span style={{ background: `linear-gradient(176deg, transparent 52%, ${color} 52%, ${color} 92%, transparent 92%)`, padding: '0 10px', WebkitBoxDecorationBreak: 'clone', boxDecorationBreak: 'clone' }}>{children}</span>
);

const Hand: React.FC<{ children: React.ReactNode; size: number; color?: string; font?: string; tilt?: number }> = ({ children, size, color = INK, font = NOTE_EN, tilt = 0 }) => (
  <div style={{ fontFamily: font, fontSize: `${size}px`, color, lineHeight: 1.08, transform: tilt ? `rotate(${tilt}deg)` : undefined }}>{children}</div>
);

const Arrow: React.FC<{ width?: number }> = ({ width = 160 }) => (
  <svg width={width} height="90" viewBox="0 0 160 90">
    <path d="M10 10 C 40 70, 100 80, 140 55" stroke={RED_PEN} strokeWidth="7" fill="none" strokeLinecap="round" />
    <path d="M118 40 L 142 55 L 116 72" stroke={RED_PEN} strokeWidth="7" fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const StickyNote: React.FC<{ children: React.ReactNode; tilt?: number; color?: string }> = ({ children, tilt = -2, color = '#fff27a' }) => (
  <div style={{ background: color, padding: '28px 34px', transform: `rotate(${tilt}deg)`, boxShadow: '0 12px 24px rgba(0,0,0,0.12)', fontFamily: NOTE_EN, fontSize: '64px', color: INK, lineHeight: 1.1, maxWidth: '760px' }}>{children}</div>
);

function notes(slide: LineBreakdownSlide, data: LineBreakdownData, assets: LineBreakdownAssets) {
  const paper = 'repeating-linear-gradient(180deg, #fbf7ee 0px, #fbf7ee 70px, #c9daf0 70px, #c9daf0 72px)';
  const sticker = (name: string, height: number) => assets.characters[name] && (
    <img src={assets.characters[name]} style={{
      position: 'absolute', bottom: '30px', right: `${SAFE.right - 40}px`, height: `${height}px`, transform: 'rotate(4deg)',
      filter: 'drop-shadow(5px 0 0 #fff) drop-shadow(-5px 0 0 #fff) drop-shadow(0 5px 0 #fff) drop-shadow(0 -5px 0 #fff) drop-shadow(0 8px 10px rgba(0,0,0,0.2))'
    }} />
  );
  const { line } = data;

  let body: React.ReactNode;
  switch (slide.kind) {
    case 'hook':
      body = (
        <>
          <Safe justify="flex-start">
            <Hand size={56} color={RED_PEN}>{data.source || 'Korean'}</Hand>
            <Hand size={116}>{slide.hook}</Hand>
            <Hand size={fit(line.native, 190)} font={NOTE_KR}><Hl color={HIGHLIGHTS[0]}>{line.native}</Hl></Hand>
          </Safe>
          {sticker('thinking', 400)}
        </>
      );
      break;
    case 'line':
      body = (
        <Safe>
          <Hand size={fit(line.native, 200)} font={NOTE_KR}>
            {data.parts.map((p, i) => <React.Fragment key={i}><Hl color={HIGHLIGHTS[i % HIGHLIGHTS.length]}>{p.native}</Hl> </React.Fragment>)}
          </Hand>
          <Hand size={58} color="#5b6478">{line.romanization}</Hand>
          <div style={{ height: '24px' }} />
          <Hand size={72}>subtitles: <span style={{ textDecoration: `line-through ${RED_PEN} 5px` }}>"{line.common_translation}"</span></Hand>
          <Hand size={86} color={RED_PEN} tilt={-3}>not quite... swipe →</Hand>
        </Safe>
      );
      break;
    case 'part': {
      const part = data.parts[slide.index];
      body = (
        <Safe>
          <Hand size={58} color={RED_PEN}>{`part ${slide.index + 1}/${data.parts.length}`}</Hand>
          <Hand size={fit(part.native, 300)} font={NOTE_KR}><Hl color={HIGHLIGHTS[slide.index % HIGHLIGHTS.length]}>{part.native}</Hl></Hand>
          <Hand size={60} color="#5b6478">{part.romanization}</Hand>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Arrow />
            <Hand size={100}>{part.meaning}</Hand>
          </div>
          {part.note && <StickyNote>{part.note}</StickyNote>}
        </Safe>
      );
      break;
    }
    case 'meaning':
      body = (
        <Safe>
          <Hand size={62} color="#5b6478">word for word: {line.literal}</Hand>
          <Hand size={66} color={RED_PEN}>what it really means:</Hand>
          <Hand size={110}><Hl color={HIGHLIGHTS[0]}>"{line.natural}"</Hl></Hand>
          <div style={{ height: '10px' }} />
          <StickyNote tilt={2} color="#ffd1e3">{data.nuance}</StickyNote>
        </Safe>
      );
      break;
    case 'use':
      body = (
        <Safe>
          <Hand size={66} color={RED_PEN}>use it yourself:</Hand>
          <Hand size={fit(data.use_it.native, 210)} font={NOTE_KR}><Hl color={HIGHLIGHTS[2]}>{data.use_it.native}</Hl></Hand>
          <Hand size={58} color="#5b6478">{data.use_it.romanization}</Hand>
          <Hand size={86}>{data.use_it.english}</Hand>
          <Hand size={64} color={RED_PEN} tilt={-3}>★ save for later</Hand>
        </Safe>
      );
      break;
    case 'cta':
      body = (
        <>
          <Safe justify="flex-start">
            <Hand size={112}>how I break down <Hl color={HIGHLIGHTS[0]}>any</Hl> Korean line:</Hand>
            <Hand size={84}>paste it into <span style={{ color: RED_PEN }}>Hanbok</span></Hand>
            <Hand size={64} color="#5b6478">hanbokstudy.com (link in bio)</Hand>
            <StickyNote tilt={-3}>which line should I do next? comment it ↓</StickyNote>
          </Safe>
          {sticker('reading', 400)}
        </>
      );
      break;
  }

  return (
    <Page background={paper} font={NOTE_EN}>
      <div style={{ position: 'absolute', top: 0, bottom: 0, left: '56px', width: '4px', background: 'rgba(214,47,47,0.45)' }} />
      <div style={{ position: 'absolute', top: '30px', left: '380px', width: '300px', height: '70px', transform: 'rotate(-3deg)', background: 'repeating-linear-gradient(45deg, rgba(255,170,190,0.75) 0 18px, rgba(255,210,220,0.75) 18px 36px)' }} />
      {body}
    </Page>
  );
}

export const LineBreakdownSlideDocument: React.FC<{
  style: LineBreakdownStyle;
  slide: LineBreakdownSlide;
  data: LineBreakdownData;
  assets: LineBreakdownAssets;
  index: number;
  fontCSS?: string;
}> = ({ style, slide, data, assets, index, fontCSS }) => (
  <html>
    <head>
      <meta charSet="utf-8" />
      {fontCSS && <style dangerouslySetInnerHTML={{ __html: fontCSS }} />}
    </head>
    <body style={{ margin: 0, padding: 0 }}>
      {style === 'variety'
        ? variety(slide, data, assets, index)
        : style === 'notes'
          ? notes(slide, data, assets)
          : storybook(slide, data, assets, index)}
    </body>
  </html>
);
