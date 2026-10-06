import React, { useEffect, useState } from 'react';
import {
  AbsoluteFill, Audio, Img, OffthreadVideo, continueRender, delayRender,
  staticFile, useCurrentFrame, useVideoConfig
} from 'remotion';
import { Beat, Scene, Speaker } from './scene';

// 1080x1920 layout. TikTok covers the bottom ~300px and the right ~150px with its UI,
// so all text lives in the scene; gameplay fills the bottom.
const H = 1920;
const SCENE_H = 1250;
const GAMEPLAY_TOP = SCENE_H;
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
  return current;
}

const SlideBackdrop: React.FC<{ src: string }> = ({ src }) => (
  <AbsoluteFill style={{ height: SCENE_H, overflow: 'hidden' }}>
    <Img src={staticFile(src)} style={{ position: 'absolute', width: '100%', height: '100%', objectFit: 'cover', filter: 'blur(28px) brightness(0.7)', transform: 'scale(1.1)' }} />
    <Img src={staticFile(src)} style={{ position: 'absolute', left: '50%', top: 0, height: SCENE_H, transform: 'translateX(-50%)', boxShadow: '0 0 60px rgba(0,0,0,0.5)' }} />
  </AbsoluteFill>
);

const CharacterSprite: React.FC<{ scene: Scene; who: Speaker; beat?: Beat; t: number }> = ({ scene, who, beat, t }) => {
  const character = scene.characters[who];
  const speaking = !!beat && beat.speaker === who && t <= beat.end;
  const expression = beat?.speaker === who ? beat.expression : 'neutral';
  const src = character.expressions[expression] || character.expressions.neutral || Object.values(character.expressions)[0];
  // Placeholder lip-sync: a quick bob while talking. Real mouth-open/closed frames replace this.
  const bob = speaking ? Math.abs(Math.sin(t * 14)) * 10 : 0;
  return (
    <Img src={staticFile(src)} style={{
      position: 'absolute', bottom: H - SCENE_H + 140 + bob, [character.side]: character.side === 'left' ? 0 : 120,
      height: 470, filter: `drop-shadow(0 12px 20px rgba(0,0,0,0.45)) brightness(${speaking ? 1 : 0.6})`,
      transform: `scale(${speaking ? 1.04 : 0.94})`, transformOrigin: 'bottom center', transition: 'none'
    }} />
  );
};

const DialogueBox: React.FC<{ scene: Scene; beat: Beat; t: number }> = ({ scene, beat, t }) => {
  const progress = Math.min(1, Math.max(0, (t - beat.start) / (beat.end - beat.start)));
  const chars = [...beat.text];
  const shown = chars.slice(0, Math.ceil(chars.length * progress)).join('');
  const name = scene.characters[beat.speaker].name;
  return (
    <div style={{ position: 'absolute', left: 30, right: 160, top: SCENE_H - 270, height: 240 }}>
      <div style={{ position: 'absolute', top: -34, left: 30, background: beat.speaker === 'tutor' ? '#FF8A00' : '#3D64E8', color: '#fff', fontFamily: 'LilitaOne', fontSize: 40, padding: '6px 26px', borderRadius: 16, zIndex: 2 }}>{name}</div>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(15,18,35,0.82)', border: '4px solid rgba(255,255,255,0.85)', borderRadius: 28, padding: '40px 36px 24px', color: '#fff', fontFamily: 'TikTokSans, Jua', fontSize: 54, lineHeight: 1.22, fontWeight: 700 }}>
        {shown.split(/(\S+)/).map((part, i) => (
          <span key={i} style={HANGUL.test(part) ? { color: '#FFE14D', fontFamily: 'Jua, TikTokSans' } : undefined}>{part}</span>
        ))}
      </div>
    </div>
  );
};

const Gameplay: React.FC<{ src?: string; t: number }> = ({ src, t }) => (
  <div style={{ position: 'absolute', top: GAMEPLAY_TOP, left: 0, right: 0, bottom: 0, overflow: 'hidden', background: '#222' }}>
    {src ? (
      <OffthreadVideo src={staticFile(src)} muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
    ) : (
      <div style={{ width: '100%', height: '100%', background: `repeating-linear-gradient(${110 + t * 10}deg, #3a7d2c 0 60px, #4f9a3b 60px 120px)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.75)', fontFamily: 'LilitaOne', fontSize: 52 }}>
        gameplay goes here
      </div>
    )}
  </div>
);

export const LessonVideo: React.FC<{ scene: Scene }> = ({ scene }) => {
  useFonts();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const beat = beatAt(scene.beats, t);
  const slide = scene.slides[Math.min(beat?.slide ?? 0, scene.slides.length - 1)];

  return (
    <AbsoluteFill style={{ background: '#000' }}>
      {slide && <SlideBackdrop src={slide} />}
      <CharacterSprite scene={scene} who="learner" beat={beat} t={t} />
      <CharacterSprite scene={scene} who="tutor" beat={beat} t={t} />
      {beat && <DialogueBox scene={scene} beat={beat} t={t} />}
      <Gameplay src={scene.gameplay} t={t} />
      {scene.audio && <Audio src={staticFile(scene.audio)} />}
    </AbsoluteFill>
  );
};
