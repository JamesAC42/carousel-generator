import React from 'react';
import { Composition } from 'remotion';
import { SkitVideo } from './Skit';
import { Skit, skitDuration } from './skit';
import sample from '../skits/ep01/skit.json';

const FPS = 30;

// A = the skit alone; B (withLesson) = the skit plus Sora explaining the line.
export const SkitRoot: React.FC = () => (
  <Composition
    id="Skit"
    component={SkitVideo}
    width={1080}
    height={1920}
    fps={FPS}
    durationInFrames={FPS * 10}
    defaultProps={{ skit: sample as unknown as Skit, withLesson: false }}
    calculateMetadata={({ props }) => ({ durationInFrames: Math.ceil(skitDuration(props.skit, props.withLesson) * FPS) })}
  />
);
