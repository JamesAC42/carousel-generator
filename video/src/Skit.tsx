import React, { useEffect, useState } from 'react';
import {
  AbsoluteFill, Audio, Freeze, Img, OffthreadVideo, Sequence, continueRender, delayRender,
  interpolate, staticFile, useCurrentFrame, useVideoConfig
} from 'remotion';
import { LessonBeat, SERIES, STRIP_SECONDS, Skit, SkitShot, shotStarts, shotsDuration } from './skit';
import cast from './cast.json';

// Full-bleed 1080x1920. TikTok covers the top ~130px, the bottom ~300px and the right ~150px,
// so the title tag, subtitles and lesson text stay inside those margins.
const W = 1080;
const H = 1920;
const SAFE = { top: 140, right: 160, bottom: 320, left: 50 };
const SORA = cast.learner.expressions as Record<string, string>;

const FONTS: [string, string][] = [
  ['TikTokSans', 'fonts/TikTokSans.ttf'],
  ['Jua', 'fonts/Jua.ttf'],
  ['LilitaOne', 'fonts/LilitaOne.ttf']
];

function useFonts() {
  const [handle] = useState(() => delayRender('Loading fonts'));
  useEffect(() => {
    Promise.all(FONTS.map(([family, file]) => new FontFace(family, `url(${staticFile(file)})`).load().then(f => document.fonts.add(f))))
      .then(() => continueRender(handle))
      .catch(err => { console.error(err); continueRender(handle); });
  }, [handle]);
}

const isImage = (src: string) => /\.(png|jpe?g|webp)$/i.test(src);

// Deterministic snowfall for the storyboard panels.
const Snow: React.FC<{ t: number }> = ({ t }) => (
  <AbsoluteFill>
    {Array.from({ length: 60 }, (_, i) => {
      const x = (i * 137.5) % W;
      const speed = 90 + (i % 7) * 25;
      const y = ((i * 211) % H + t * speed) % H;
      const r = 4 + (i % 4) * 2;
      return <div key={i} style={{ position: 'absolute', left: x + Math.sin(t * 1.3 + i) * 18, top: y, width: r, height: r, borderRadius: r, background: 'rgba(255,255,255,0.85)' }} />;
    })}
  </AbsoluteFill>
);

// A shot with no clip yet: background, a Sora stand-in and a note saying what the shot is.
const StoryboardPanel: React.FC<{ shot: SkitShot; t: number; sfx: string[] }> = ({ shot, t, sfx }) => (
  <AbsoluteFill style={{ background: shot.bg || 'linear-gradient(#cfd8e3, #8a9bb0)' }}>
    {shot.snow && <Snow t={t} />}
    {shot.sprite && SORA[shot.sprite] && (
      <Img src={staticFile(SORA[shot.sprite])} style={{ position: 'absolute', bottom: 0, left: '50%', height: 1150, transform: 'translateX(-50%)' }} />
    )}
    {shot.note && (
      <div style={{ position: 'absolute', top: 470, left: SAFE.left, right: SAFE.right, background: 'rgba(20,22,40,0.78)', color: '#fff', borderRadius: 22, padding: '20px 28px', fontFamily: 'TikTokSans', fontWeight: 700, fontSize: 40, lineHeight: 1.25 }}>
        <span style={{ color: '#FFE14D', fontFamily: 'LilitaOne', marginRight: 14 }}>{shot.id}</span>{shot.note}
        {sfx.length > 0 && <div style={{ marginTop: 10, fontSize: 32, color: '#9fd3ff' }}>♪ {sfx.join(' · ')}</div>}
      </div>
    )}
    <div style={{ position: 'absolute', right: SAFE.right, top: SAFE.top, fontFamily: 'LilitaOne', fontSize: 30, color: 'rgba(255,255,255,0.8)', background: 'rgba(0,0,0,0.35)', padding: '4px 14px', borderRadius: 10 }}>ANIMATIC</div>
  </AbsoluteFill>
);

// One shot at local time t. `freeze` holds a clip on that frame (used by the end strip).
const ShotView: React.FC<{ shot: SkitShot; t: number; fps: number; sfx?: string[]; freeze?: boolean }> = ({ shot, t, fps, sfx = [], freeze }) => {
  const punch = shot.punchIn ? 1 + 0.12 * Math.min(1, t / 0.15) : 1;
  let body: React.ReactNode;
  if (!shot.src) {
    body = <StoryboardPanel shot={shot} t={t} sfx={sfx} />;
  } else if (isImage(shot.src)) {
    // A start frame with no motion yet: slow push-in so it doesn't sit dead.
    const push = 1 + 0.05 * (t / shot.seconds);
    body = <Img src={staticFile(shot.src)} style={{ width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${push})` }} />;
  } else {
    const video = (
      <OffthreadVideo src={staticFile(shot.src)} trimBefore={Math.round((shot.trimStart || 0) * fps)} playbackRate={shot.speed || 1}
        muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
    );
    body = freeze ? <Freeze frame={Math.round(t * fps)}>{video}</Freeze> : video;
  }
  return <AbsoluteFill style={{ overflow: 'hidden', background: '#000' }}><AbsoluteFill style={{ transform: `scale(${punch})` }}>{body}</AbsoluteFill></AbsoluteFill>;
};

// Manga-panel style tag over the first shot: episode number, the word, its meaning.
const TitleTag: React.FC<{ skit: Skit; t: number }> = ({ skit, t }) => {
  const x = interpolate(t, [0, 0.25, 2.2, 2.5], [-500, 0, 0, -500], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <div style={{ position: 'absolute', top: SAFE.top + 20, left: SAFE.left + x, background: '#fff', border: '6px solid #1d1f33', borderRadius: 16, padding: '10px 26px 14px', boxShadow: '8px 8px 0 #1d1f33' }}>
      <div style={{ fontFamily: 'LilitaOne', fontSize: 30, color: '#3D64E8' }}>{SERIES.en} #{String(skit.episode).padStart(2, '0')}</div>
      <div style={{ fontFamily: 'Jua', fontSize: 92, lineHeight: 1, color: '#1d1f33' }}>{skit.title.ko}</div>
      <div style={{ fontFamily: 'TikTokSans', fontWeight: 800, fontSize: 34, color: '#1d1f33' }}>{skit.title.en}</div>
    </div>
  );
};

const outline = (px: number, color: string) => ({ WebkitTextStroke: `${px}px ${color}`, paintOrder: 'stroke fill' as const });

const Subtitle: React.FC<{ ko: string; en: string }> = ({ ko, en }) => (
  <div style={{ position: 'absolute', left: SAFE.left, right: SAFE.right, bottom: SAFE.bottom + 30, textAlign: 'center' }}>
    <div style={{ fontFamily: 'Jua', fontSize: 84, lineHeight: 1.1, color: '#fff', ...outline(14, '#1d1f33') }}>{ko}</div>
    <div style={{ fontFamily: 'TikTokSans', fontWeight: 800, fontSize: 46, color: '#FFE14D', marginTop: 8, ...outline(10, '#1d1f33') }}>{en}</div>
  </div>
);

// The 인생네컷 end card: four frames from the episode drop into a photo-booth strip.
const EndStrip: React.FC<{ skit: Skit; t: number; fps: number }> = ({ skit, t, fps }) => {
  const shots = skit.strip.map(id => skit.shots.find(s => s.id === id)).filter(Boolean) as SkitShot[];
  const frameW = 400;
  const frameH = Math.round(frameW * 16 / 9 * 0.42); // Cropped to the middle of each shot.
  return (
    <AbsoluteFill style={{ background: 'linear-gradient(#FDF3DC, #F2DFC0)', alignItems: 'center' }}>
      <div style={{ marginTop: 150, background: '#1d1f33', padding: '22px 22px 18px', borderRadius: 10, boxShadow: '0 20px 50px rgba(0,0,0,0.35)', transform: `rotate(-2deg) translateX(-30px)` }}>
        {shots.map((shot, i) => {
          const at = 0.15 + i * 0.32;
          const p = Math.min(1, Math.max(0, (t - at) / 0.12));
          return (
            <div key={shot.id} style={{ width: frameW, height: frameH, marginBottom: 14, overflow: 'hidden', background: '#fff', opacity: p, transform: `scale(${1.15 - 0.15 * p})` }}>
              <div style={{ width: frameW, height: frameW * 16 / 9, marginTop: -(frameW * 16 / 9 - frameH) / 2, position: 'relative' }}>
                <div style={{ width: W, height: H, transform: `scale(${frameW / W})`, transformOrigin: 'top left', position: 'absolute' }}>
                  <ShotView shot={shot} t={Math.max(0, shot.seconds - 0.05)} fps={fps} freeze />
                </div>
              </div>
            </div>
          );
        })}
        <div style={{ color: '#fff', textAlign: 'center', fontFamily: 'Jua', fontSize: 40 }}>{SERIES.ko}</div>
        <div style={{ color: '#9fb4ff', textAlign: 'center', fontFamily: 'LilitaOne', fontSize: 26 }}>#{String(skit.episode).padStart(2, '0')} · {skit.title.ko}</div>
      </div>
    </AbsoluteFill>
  );
};

// Mouth opens once per line and holds, with a small hop on open and close (same as the lesson videos).
function hop(t: number, at: number[]): number {
  for (const a of at) {
    const p = (t - a) / 0.18;
    if (p >= 0 && p <= 1) return Math.sin(Math.PI * p) * 8;
  }
  return 0;
}

const LessonTail: React.FC<{ lesson: NonNullable<Skit['lesson']>; t: number }> = ({ lesson, t }) => {
  let start = 0.4;
  let beat: LessonBeat = lesson.beats[0];
  let beatStart = start;
  for (const b of lesson.beats) {
    if (t >= start) { beat = b; beatStart = start; }
    start += b.seconds;
  }
  const local = t - beatStart;
  const speaking = local >= 0.08 && local < beat.seconds - 0.25;
  const sprite = (speaking && SORA[`${beat.expression}_talk`]) || SORA[beat.expression] || SORA.neutral;
  const chars = [...beat.text];
  const shown = chars.slice(0, Math.ceil(chars.length * Math.min(1, Math.max(0, local) / Math.max(0.5, beat.seconds - 0.6)))).join('');
  const cardIn = interpolate(t, [0, 0.3], [0, 1], { extrapolateRight: 'clamp' });
  const { card } = lesson;
  return (
    <AbsoluteFill style={{ background: 'linear-gradient(#FDF3DC, #F2DFC0)' }}>
      <div style={{ position: 'absolute', top: SAFE.top + 30, left: SAFE.left, right: SAFE.right, background: '#fff', border: '6px solid #1d1f33', borderRadius: 26, boxShadow: '10px 10px 0 #1d1f33', padding: '26px 34px', opacity: cardIn, transform: `translateY(${(1 - cardIn) * -40}px)` }}>
        <div style={{ fontFamily: 'LilitaOne', fontSize: 34, color: '#FF5A5F' }}>Wait, what did she say?</div>
        <div style={{ fontFamily: 'Jua', fontSize: 104, lineHeight: 1.1, color: '#1d1f33' }}>{card.native}</div>
        <div style={{ fontFamily: 'TikTokSans', fontSize: 38, color: '#6b6f86', fontStyle: 'italic' }}>{card.romanization}</div>
        <div style={{ fontFamily: 'TikTokSans', fontWeight: 800, fontSize: 48, color: '#3D64E8', marginTop: 10 }}>{card.meaning}</div>
        {card.note && <div style={{ fontFamily: 'TikTokSans', fontWeight: 600, fontSize: 36, color: '#1d1f33', marginTop: 10 }}>{card.note}</div>}
      </div>
      <Img src={staticFile(sprite)} style={{ position: 'absolute', left: 0, top: 1330 - 640 - hop(local, [0.08, beat.seconds - 0.25]), height: 640, filter: 'drop-shadow(0 12px 20px rgba(0,0,0,0.3))' }} />
      <div style={{ position: 'absolute', left: SAFE.left, right: SAFE.right, top: 1330, height: 250, boxSizing: 'border-box', background: 'rgba(15,18,35,0.9)', border: '6px solid #3D64E8', borderRadius: 28, padding: '18px 30px', color: '#fff', fontFamily: 'TikTokSans, Jua', fontWeight: 700, fontSize: 46, lineHeight: 1.22 }}>
        {shown.split(/(\S+)/).map((part, i) => (
          <span key={i} style={/[가-힯]/.test(part) ? { color: '#FFE14D', fontFamily: 'Jua, TikTokSans' } : undefined}>{part}</span>
        ))}
      </div>
    </AbsoluteFill>
  );
};

export const SkitVideo: React.FC<{ skit: Skit; withLesson: boolean }> = ({ skit, withLesson }) => {
  useFonts();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const starts = shotStarts(skit);
  const shotsEnd = shotsDuration(skit);
  const stripEnd = shotsEnd + STRIP_SECONDS;
  const f = (s: number) => Math.round(s * fps);
  const line = skit.lines.find(l => t >= starts[l.shot] + l.at && t < starts[l.shot] + l.at + l.seconds);

  return (
    <AbsoluteFill style={{ background: '#000' }}>
      {skit.shots.map(shot => (
        <Sequence key={shot.id} from={f(starts[shot.id])} durationInFrames={f(shot.seconds)} layout="none">
          <ShotView shot={shot} t={t - starts[shot.id]} fps={fps}
            sfx={(skit.sfx || []).filter(s => s.shot === shot.id).map(s => s.label)} />
        </Sequence>
      ))}
      {t < 2.6 && <TitleTag skit={skit} t={t} />}
      {line && t < shotsEnd && <Subtitle ko={line.ko} en={line.en} />}
      <Sequence from={f(shotsEnd)} durationInFrames={f(STRIP_SECONDS)} layout="none">
        <EndStrip skit={skit} t={t - shotsEnd} fps={fps} />
      </Sequence>
      {withLesson && skit.lesson && (
        <Sequence from={f(stripEnd)} layout="none">
          <LessonTail lesson={skit.lesson} t={t - stripEnd} />
        </Sequence>
      )}

      {skit.lines.map((l, i) => l.audio && (
        <Sequence key={`line${i}`} from={f(starts[l.shot] + l.at)} layout="none"><Audio src={staticFile(l.audio)} /></Sequence>
      ))}
      {(skit.sfx || []).map((s, i) => s.src && (
        <Sequence key={`sfx${i}`} from={f(starts[s.shot] + s.at)} layout="none"><Audio src={staticFile(s.src)} volume={s.volume ?? 1} /></Sequence>
      ))}
      {skit.music && <Audio src={staticFile(skit.music.src)} volume={skit.music.volume ?? 0.25} />}
      {withLesson && skit.lesson && (() => {
        let at = stripEnd + 0.4;
        return skit.lesson.beats.map((b, i) => {
          const from = at;
          at += b.seconds;
          return b.audio && <Sequence key={`lesson${i}`} from={f(from)} layout="none"><Audio src={staticFile(b.audio)} /></Sequence>;
        });
      })()}
    </AbsoluteFill>
  );
};
