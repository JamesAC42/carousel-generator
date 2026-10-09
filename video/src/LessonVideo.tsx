import React, { useEffect, useState } from 'react';
import {
  AbsoluteFill, Audio, Freeze, Img, OffthreadVideo, Sequence, continueRender, delayRender,
  spring, staticFile, useCurrentFrame, useVideoConfig
} from 'remotion';
import { Beat, Clip, FOLLOW_TEXT, IntroSegment, Scene, Speaker, clipTimeAt, ctaStart, introDuration, introSegments } from './scene';
import { CARD, SlideCard } from './Slides';

// 1080x1920 layout, top to bottom: slide card, characters, dialogue box, gameplay.
// TikTok covers the top ~130px, the bottom ~300px and the right ~150px with its UI,
// so all text stays in the scene above the gameplay band.
const SCENE_H = 1250;
const FLOOR = 1140;
const SPRITE_H = 530;
const HANGUL = /[㄰-㆏가-힯]/;

const FONTS: [string, string][] = [
  ['TikTokSans', 'fonts/TikTokSans.ttf'],
  ['Jua', 'fonts/Jua.ttf'],
  ['LilitaOne', 'fonts/LilitaOne.ttf']
];

export function useFonts() {
  const [handle] = useState(() => delayRender('Loading fonts'));
  useEffect(() => {
    Promise.all(FONTS.map(([family, file]) => new FontFace(family, `url(${staticFile(file)})`).load().then(f => document.fonts.add(f))))
      .then(() => continueRender(handle))
      .catch(err => { console.error(err); continueRender(handle); });
  }, [handle]);
}

function beatAt(beats: Beat[], t: number): Beat | undefined {
  // Hold the previous beat during the short gaps so the screen never goes empty.
  let current: Beat | undefined;
  for (const b of beats) if (b.start <= t) current = b;
  return current ?? beats[0];
}

// The mouth opens once per line and stays open until the line ends: closed for a moment
// first, open from just after the first sound to the last, then closed again.
const MOUTH_LEAD = 0.08;
function mouthWindow(beat: Beat): [number, number] {
  const spans = beat.talk?.length ? beat.talk : [[beat.start, beat.end] as [number, number]];
  return [spans[0][0] + MOUTH_LEAD, spans[spans.length - 1][1]];
}

// A small hop each time the mouth opens or closes, so the swap reads as a reaction.
const BOUNCE_S = 0.18;
const BOUNCE_PX = 8;
function bounce(t: number, at: number[]): number {
  for (const a of at) {
    const p = (t - a) / BOUNCE_S;
    if (p >= 0 && p <= 1) return Math.sin(Math.PI * p) * BOUNCE_PX;
  }
  return 0;
}

const Backdrop: React.FC<{ src?: string }> = ({ src }) => (
  <AbsoluteFill style={{ height: SCENE_H, overflow: 'hidden', background: 'linear-gradient(#2B2F55, #6D4C6F)' }}>
    {src && <Img src={staticFile(src)} style={{ position: 'absolute', width: '100%', height: '100%', objectFit: 'cover', filter: 'blur(6px) brightness(0.75)', transform: 'scale(1.05)' }} />}
  </AbsoluteFill>
);

const CharacterSprite: React.FC<{ scene: Scene; who: Speaker; beat?: Beat; t: number }> = ({ scene, who, beat, t }) => {
  const character = scene.characters[who];
  const active = beat?.speaker === who;
  const [open, close] = active && beat ? mouthWindow(beat) : [Infinity, Infinity];
  const mouthOpen = t >= open && t < close;
  const expression = active ? beat!.expression : 'neutral';
  const base = character.expressions[expression] || character.expressions.neutral || Object.values(character.expressions)[0];
  const talkFrame = character.expressions[`${expression}_talk`];
  const src = mouthOpen && talkFrame ? talkFrame : base;
  const bob = bounce(t, [open, close]);
  return (
    <Img src={staticFile(src)} style={{
      position: 'absolute', top: FLOOR - SPRITE_H - bob, // The tutor stays clear of TikTok's like/comment buttons down the right edge.
      [character.side]: character.side === 'left' ? 0 : 140,
      height: SPRITE_H, filter: `drop-shadow(0 12px 20px rgba(0,0,0,0.45)) brightness(${active ? 1 : 0.6})`,
      transform: `scale(${active ? 1.04 : 0.94})`, transformOrigin: 'bottom center'
    }} />
  );
};

// Words appear as they're spoken (from the narration timestamps when there are any).
function shownText(beat: Beat, t: number): string {
  if (beat.words?.length) return beat.words.filter(w => w.start <= t).map(w => w.text).join(' ');
  const progress = Math.min(1, Math.max(0, (t - beat.start) / (beat.end - beat.start)));
  const chars = [...beat.text];
  return chars.slice(0, Math.ceil(chars.length * progress)).join('');
}

// The outline's color says who's speaking: orange for the tutor, blue for the learner.
const SPEAKER_COLOR: Record<Speaker, string> = { tutor: '#FF8A00', learner: '#3D64E8' };

const DialogueBox: React.FC<{ beat: Beat; t: number }> = ({ beat, t }) => {
  const shown = shownText(beat, t);
  return (
    <div style={{ position: 'absolute', left: 30, right: 160, top: SCENE_H - 260, height: 236, boxSizing: 'border-box', background: 'rgba(15,18,35,0.86)', border: `6px solid ${SPEAKER_COLOR[beat.speaker]}`, borderRadius: 28, padding: '18px 32px 32px', color: '#fff', fontFamily: 'TikTokSans, Jua', fontSize: 52, lineHeight: 1.22, fontWeight: 700 }}>
      {shown.split(/(\S+)/).map((part, i) => (
        <span key={i} style={HANGUL.test(part) ? { color: '#FFE14D', fontFamily: 'Jua, TikTokSans' } : undefined}>{part}</span>
      ))}
    </div>
  );
};

const Gameplay: React.FC<{ src?: string; start?: number; fps: number; t: number }> = ({ src, start = 0, fps, t }) => (
  <div style={{ position: 'absolute', top: SCENE_H, left: 0, right: 0, bottom: 0, overflow: 'hidden', background: '#222' }}>
    {src ? (
      <OffthreadVideo src={staticFile(src)} trimBefore={Math.round(start * fps)} muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
    ) : (
      <div style={{ width: '100%', height: '100%', background: `repeating-linear-gradient(${110 + t * 10}deg, #3a7d2c 0 60px, #4f9a3b 60px 120px)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.75)', fontFamily: 'LilitaOne', fontSize: 52 }}>
        gameplay goes here
      </div>
    )}
  </div>
);

// The CTA shows the site itself: a screen recording in the slide card, ending on the URL card.
const CtaBroll: React.FC<{ src: string }> = ({ src }) => (
  <div style={{ position: 'absolute', top: CARD.top, left: CARD.left, right: CARD.right, aspectRatio: '16 / 9', borderRadius: 26, overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.35)', background: '#fff' }}>
    <OffthreadVideo src={staticFile(src)} muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
    <div style={{ position: 'absolute', left: 0, right: 0, bottom: 18, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
      <div style={{ background: '#E0313B', color: '#fff', fontFamily: 'LilitaOne', fontSize: 52, padding: '8px 30px', borderRadius: 18, boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}>Full breakdown: link in bio</div>
      <div style={{ background: '#fff', color: '#16182B', fontFamily: 'LilitaOne', fontSize: 40, padding: '6px 26px', borderRadius: 16, boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}>{FOLLOW_TEXT} ＋</div>
    </div>
  </div>
);

// The cold open (see introSegments): the clip centered on a blurred, darkened copy of itself,
// with nothing else on screen.
const CLIP_H = 1080 * 9 / 16;
const CLIP_TOP = (1920 - CLIP_H) / 2;

const ClipFrame: React.FC<{ src: string; frame: number; style: React.CSSProperties }> = ({ src, frame, style }) => (
  <Freeze frame={frame}><OffthreadVideo src={staticFile(src)} muted style={style} /></Freeze>
);

const PauseIcon: React.FC = () => (
  <svg width="190" height="190" viewBox="0 0 100 100"><circle cx="50" cy="50" r="46" fill="rgba(0,0,0,0.45)" stroke="#fff" strokeWidth="4" /><rect x="33" y="28" width="11" height="44" rx="2" fill="#fff" /><rect x="56" y="28" width="11" height="44" rx="2" fill="#fff" /></svg>
);
const RewindIcon: React.FC = () => (
  <svg width="230" height="150" viewBox="0 0 120 70"><path d="M58 8 L14 35 L58 62 Z M110 8 L66 35 L110 62 Z" fill="#fff" stroke="rgba(0,0,0,0.4)" strokeWidth="2" /></svg>
);

const shadow = '0 4px 18px rgba(0,0,0,0.75)';

const ClipIntro: React.FC<{ clip: Clip; t: number; fps: number }> = ({ clip, t, fps }) => {
  const segs = introSegments(clip);
  const seg = segs.find(sg => t >= sg.start && t < sg.end) ?? segs[segs.length - 1];
  const ct = clipTimeAt(seg, t);
  const frame = Math.max(0, Math.round(ct * fps));
  const p = Math.min(1, (t - seg.start) / (seg.end - seg.start));
  const frozen = seg.kind === 'title' || seg.kind === 'pause' || seg.kind === 'rewind';
  const dim = frozen ? Math.min(1, (t - seg.start) / 0.2) * 0.55 : 0;
  const opacity = seg.kind === 'fade' ? 1 - p : 1;
  const lineStart = clip.lineStart ?? 0;
  const lineEnd = (clip.lineEnd ?? clip.seconds) + 0.3;
  const onLine = seg.kind !== 'rewind' && seg.kind !== 'title' && ct >= lineStart && ct <= lineEnd;
  const sub = !onLine && !frozen ? clip.subs?.find(x => ct >= x.start && ct < x.end) : undefined;
  // The rewind shakes a little, like a tape.
  const jitter = seg.kind === 'rewind' ? Math.sin(t * 90) * 6 : 0;
  const pop = spring({ frame: Math.round((t - seg.start) * fps), fps, config: { damping: 12, stiffness: 180 } });
  const titleOut = seg.kind === 'title' ? Math.min(1, (seg.end - t) / 0.2) : 1;
  return (
    <AbsoluteFill style={{ opacity, background: '#000' }}>
      <ClipFrame src={clip.src} frame={frame} style={{ position: 'absolute', width: '100%', height: '100%', objectFit: 'cover', filter: 'blur(28px) brightness(0.35)', transform: 'scale(1.15)' }} />
      <div style={{ position: 'absolute', top: CLIP_TOP, left: jitter, width: 1080, height: CLIP_H, boxShadow: '0 20px 60px rgba(0,0,0,0.6)', overflow: 'hidden' }}>
        <ClipFrame src={clip.src} frame={frame} style={{ width: '100%', height: '100%', objectFit: 'cover', filter: seg.kind === 'rewind' ? 'saturate(0.6) contrast(1.1)' : undefined }} />
        <div style={{ position: 'absolute', inset: 0, background: `rgba(0,0,0,${dim})` }} />
        {seg.kind === 'rewind' && (
          <div style={{ position: 'absolute', inset: 0, background: 'repeating-linear-gradient(0deg, rgba(255,255,255,0.06) 0 3px, transparent 3px 9px)' }} />
        )}
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          {seg.kind === 'title' && (
            <div style={{ textAlign: 'center', opacity: titleOut, transform: `scale(${0.85 + 0.15 * pop})` }}>
              <div style={{ fontFamily: 'LilitaOne', fontSize: 112, color: '#fff', lineHeight: 1, textShadow: shadow }}>Korean Lesson{clip.number ? ` #${clip.number}` : ''}</div>
              {clip.label && <div style={{ fontFamily: 'TikTokSans', fontWeight: 800, fontSize: 60, color: '#FFE14D', marginTop: 18, textShadow: shadow }}>{clip.label}</div>}
            </div>
          )}
          {seg.kind === 'pause' && <div style={{ transform: `scale(${0.8 + 0.2 * pop})` }}><PauseIcon /></div>}
          {seg.kind === 'rewind' && <RewindIcon />}
        </div>
      </div>
      <div style={{ position: 'absolute', top: CLIP_TOP + CLIP_H + 36, left: 60, right: 60, textAlign: 'center' }}>
        {onLine && <>
          <div style={{ fontFamily: 'Jua', fontSize: 92, color: '#FFE14D', lineHeight: 1.1, textShadow: shadow }}>{clip.line}</div>
          {clip.translation && <div style={{ fontFamily: 'TikTokSans', fontWeight: 800, fontSize: 48, color: '#fff', marginTop: 12, textShadow: shadow }}>{clip.translation}</div>}
        </>}
        {sub && <div style={{ fontFamily: 'TikTokSans', fontWeight: 700, fontSize: 46, color: '#fff', lineHeight: 1.2, textShadow: shadow }}>{sub.text}</div>}
      </div>
    </AbsoluteFill>
  );
};

// The clip's own sound while it plays (fading out with the picture), plus the sound effects.
const IntroAudio: React.FC<{ clip: Clip; fps: number }> = ({ clip, fps }) => {
  const f = (s: number) => Math.round(s * fps);
  const sfx = (seg: IntroSegment, name: string, volume = 1) => (
    <Sequence key={`${name}-${seg.start}`} from={f(seg.start)} durationInFrames={Math.max(1, f(seg.end - seg.start) + (name === 'ding' ? f(0.8) : 0))} layout="none">
      <Audio src={staticFile(`sfx/${name}.mp3`)} volume={volume} />
    </Sequence>
  );
  return <>{introSegments(clip).map(seg => {
    if (seg.kind === 'title') return sfx(seg, 'ding', 0.8);
    if (seg.kind === 'pause') return sfx(seg, 'pause');
    if (seg.kind === 'rewind') return sfx(seg, 'rewind', 0.5);
    const length = f(seg.end - seg.start);
    return (
      <Sequence key={seg.start} from={f(seg.start)} durationInFrames={Math.max(1, length)} layout="none">
        <Audio src={staticFile(clip.src)} trimBefore={f(seg.from)} volume={seg.kind === 'fade' ? (fr: number) => 1 - fr / length : 1} />
      </Sequence>
    );
  })}</>;
};

// The thinking time after the quiz question: a 3-2-1 countdown with a tick each second.
const Countdown: React.FC<{ think: NonNullable<Scene['think']>; t: number }> = ({ think, t }) => {
  if (t < think.start || t >= think.start + think.seconds) return null;
  const left = Math.ceil(think.start + think.seconds - t);
  const within = (t - think.start) % 1;
  return (
    <div style={{ position: 'absolute', top: 640, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
      <div style={{ width: 190, height: 190, borderRadius: 95, background: '#E0313B', border: '8px solid #fff', boxShadow: '0 10px 30px rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontFamily: 'LilitaOne', fontSize: 120, transform: `scale(${1.15 - 0.15 * Math.min(1, within * 4)})` }}>{left}</div>
    </div>
  );
};

// The one-take dialogue, split around any pauses (the quiz countdown).
const DialogueAudio: React.FC<{ audio: NonNullable<Scene['dialogueAudio']>; fps: number }> = ({ audio, fps }) => {
  const f = (s: number) => Math.round(s * fps);
  const pauses = audio.pauses ?? [];
  const parts: { from: number; to?: number; shift: number }[] = [];
  let from = 0;
  let shift = 0;
  for (const pz of pauses) {
    parts.push({ from, to: pz.at, shift });
    from = pz.at;
    shift += pz.seconds;
  }
  parts.push({ from, shift });
  return <>{parts.map((pt, i) => (
    <Sequence key={i} from={f(audio.start + pt.from + pt.shift)} durationInFrames={pt.to !== undefined ? f(pt.to - pt.from) : undefined} layout="none">
      <Audio src={staticFile(audio.src)} trimBefore={f(pt.from)} />
    </Sequence>
  ))}</>;
};

export const LessonVideo: React.FC<{ scene: Scene }> = ({ scene }) => {
  useFonts();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const beat = beatAt(scene.beats, t);
  const slideIndex = Math.min(beat?.slide ?? 0, scene.slides.length - 1);
  const firstOnSlide = scene.beats.find(b => b.slide === beat?.slide);
  const slideSince = t - (firstOnSlide?.start ?? 0);
  // A quiz slide reveals its answer from its second beat on.
  const revealed = !!beat && beat !== firstOnSlide;
  const inColdOpen = !!scene.clip && t < introDuration(scene.clip);
  const brollStart = ctaStart(scene);
  const broll = brollStart !== undefined ? scene.ctaBroll : undefined;

  return (
    <AbsoluteFill style={{ background: '#000' }}>
      {inColdOpen ? <ClipIntro clip={scene.clip!} t={t} fps={fps} /> : <>
        <Backdrop src={scene.background} />
        {broll && t >= brollStart! ? (
          <Sequence from={Math.round(brollStart! * fps)} layout="none"><CtaBroll src={broll.src} /></Sequence>
        ) : scene.slides[slideIndex] && <SlideCard key={slideIndex} slide={scene.slides[slideIndex]} since={slideSince} fps={fps} revealed={revealed} />}
        <CharacterSprite scene={scene} who="learner" beat={beat} t={t} />
        <CharacterSprite scene={scene} who="tutor" beat={beat} t={t} />
        {scene.think && <Countdown think={scene.think} t={t} />}
        {beat && <DialogueBox beat={beat} t={t} />}
        <Gameplay src={scene.gameplay} start={scene.gameplayStart} fps={fps} t={t} />
      </>}
      {scene.clip && <IntroAudio clip={scene.clip} fps={fps} />}
      {scene.think && Array.from({ length: scene.think.seconds }, (_, i) => (
        <Sequence key={`tick${i}`} from={Math.round((scene.think!.start + i) * fps)} durationInFrames={Math.round(0.5 * fps)} layout="none">
          <Audio src={staticFile('sfx/tick.mp3')} volume={0.8} />
        </Sequence>
      ))}
      {scene.dialogueAudio && <DialogueAudio audio={scene.dialogueAudio} fps={fps} />}
      {scene.beats.map((b, i) => b.audio && (
        <Sequence key={i} from={Math.round(b.start * fps)} layout="none">
          <Audio src={staticFile(b.audio)} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
