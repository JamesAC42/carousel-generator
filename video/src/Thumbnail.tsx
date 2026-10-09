import React from 'react';
import { AbsoluteFill, Freeze, OffthreadVideo, staticFile, useVideoConfig } from 'remotion';
import { Scene } from './scene';
import { useFonts } from './LessonVideo';

// The cover image for the posts: a frame of the show from when the line is said, full bleed, with
// the lesson number, the line and the hook. Everything sits in the middle 3:4 that profile grids
// show, and above the bottom band TikTok covers with the caption.
export const Thumbnail: React.FC<{ scene: Scene }> = ({ scene }) => {
  useFonts();
  const { fps } = useVideoConfig();
  const clip = scene.clip;
  const line = scene.slides.find(s => typeof s !== 'string' && s.kind === 'line');
  const native = clip?.line ?? (line && typeof line !== 'string' && line.kind === 'line' ? line.native : '');
  const shadow = '0 6px 24px rgba(0,0,0,0.8)';
  return (
    <AbsoluteFill style={{ background: 'linear-gradient(#2B2F55, #6D4C6F)' }}>
      {clip && (
        <Freeze frame={Math.round(((clip.lineStart ?? 0) + 0.3) * fps)}>
          <OffthreadVideo src={staticFile(clip.src)} muted style={{ position: 'absolute', width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(0.8)' }} />
        </Freeze>
      )}
      <AbsoluteFill style={{ background: 'linear-gradient(rgba(0,0,0,0.15) 15%, rgba(0,0,0,0.7) 45%, rgba(0,0,0,0.7) 75%, rgba(0,0,0,0.2))' }} />
      <div style={{ position: 'absolute', top: 560, left: 70, right: 70, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 28 }}>
        <div style={{ background: '#E0313B', color: '#fff', fontFamily: 'LilitaOne', fontSize: 64, padding: '6px 32px', borderRadius: 20, boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}>
          Korean Lesson{clip?.number ? ` #${clip.number}` : ''}
        </div>
        <div style={{ fontFamily: 'Jua', fontSize: 150, lineHeight: 1.05, color: '#FFE14D', textShadow: shadow }}>{native}</div>
        <div style={{ fontFamily: 'TikTokSans', fontWeight: 800, fontSize: 70, lineHeight: 1.1, color: '#fff', textShadow: shadow }}>{scene.hook}</div>
        {clip?.label && <div style={{ fontFamily: 'TikTokSans', fontWeight: 700, fontSize: 44, color: 'rgba(255,255,255,0.85)', textShadow: shadow }}>{clip.label}</div>}
      </div>
    </AbsoluteFill>
  );
};
