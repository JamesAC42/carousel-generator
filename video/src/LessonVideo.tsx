import React, { useEffect, useState } from 'react';
import {
  AbsoluteFill, Audio, Img, OffthreadVideo, Sequence, continueRender, delayRender,
  staticFile, useCurrentFrame, useVideoConfig
} from 'remotion';
import { Beat, Scene, Speaker, ctaStart } from './scene';
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

function useFonts() {
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
  </div>
);

// Cold open: the show's own clip, with the line subtitled underneath, before anyone talks.
const ColdOpen: React.FC<{ clip: NonNullable<Scene['clip']> }> = ({ clip }) => (
  <AbsoluteFill style={{ height: SCENE_H }}>
    {clip.label && (
      <div style={{ position: 'absolute', top: 150, left: 40, background: '#E0313B', color: '#fff', fontFamily: 'LilitaOne', fontSize: 40, padding: '6px 24px', borderRadius: 14 }}>{clip.label}</div>
    )}
    <div style={{ position: 'absolute', top: 230, left: 0, right: 0, aspectRatio: '16 / 9', background: '#000' }}>
      <OffthreadVideo src={staticFile(clip.src)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
    </div>
    <div style={{ position: 'absolute', top: 230 + 1080 * 9 / 16 + 40, left: 40, right: 170, textAlign: 'center' }}>
      <div style={{ fontFamily: 'Jua', fontSize: 84, color: '#FFE14D', lineHeight: 1.1, textShadow: '0 4px 16px rgba(0,0,0,0.6)' }}>{clip.line}</div>
      {clip.translation && (
        <div style={{ fontFamily: 'TikTokSans', fontWeight: 800, fontSize: 46, color: '#fff', marginTop: 12, textShadow: '0 4px 16px rgba(0,0,0,0.6)' }}>{clip.translation}</div>
      )}
    </div>
  </AbsoluteFill>
);

export const LessonVideo: React.FC<{ scene: Scene }> = ({ scene }) => {
  useFonts();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const beat = beatAt(scene.beats, t);
  const slideIndex = Math.min(beat?.slide ?? 0, scene.slides.length - 1);
  const slideSince = t - (scene.beats.find(b => b.slide === beat?.slide)?.start ?? 0);
  const inColdOpen = !!scene.clip && t < scene.clip.seconds;
  const brollStart = ctaStart(scene);
  const broll = brollStart !== undefined ? scene.ctaBroll : undefined;

  return (
    <AbsoluteFill style={{ background: '#000' }}>
      <Backdrop src={scene.background} />
      {inColdOpen ? <ColdOpen clip={scene.clip!} /> : <>
        {broll && t >= brollStart! ? (
          <Sequence from={Math.round(brollStart! * fps)} layout="none"><CtaBroll src={broll.src} /></Sequence>
        ) : scene.slides[slideIndex] && <SlideCard key={slideIndex} slide={scene.slides[slideIndex]} since={slideSince} fps={fps} />}
        <CharacterSprite scene={scene} who="learner" beat={beat} t={t} />
        <CharacterSprite scene={scene} who="tutor" beat={beat} t={t} />
        {beat && <DialogueBox beat={beat} t={t} />}
      </>}
      <Gameplay src={scene.gameplay} start={scene.gameplayStart} fps={fps} t={t} />
      {scene.dialogueAudio && (
        <Sequence from={Math.round(scene.dialogueAudio.start * fps)} layout="none">
          <Audio src={staticFile(scene.dialogueAudio.src)} />
        </Sequence>
      )}
      {scene.beats.map((b, i) => b.audio && (
        <Sequence key={i} from={Math.round(b.start * fps)} layout="none">
          <Audio src={staticFile(b.audio)} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
