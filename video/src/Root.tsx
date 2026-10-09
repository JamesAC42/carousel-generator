import React from 'react';
import { Composition } from 'remotion';
import { LessonVideo } from './LessonVideo';
import { Thumbnail } from './Thumbnail';
import { Scene, dialogueStart, estimateTimings, sceneDuration } from './scene';
import sample from './sample-scene.json';

const FPS = 30;

export const Root: React.FC = () => (<>
  <Composition
    id="LessonVideo"
    component={LessonVideo}
    width={1080}
    height={1920}
    fps={FPS}
    durationInFrames={FPS * 10}
    defaultProps={{ scene: sample as unknown as Scene }}
    calculateMetadata={({ props }) => {
      // Scenes without narration have no timings yet; estimate them from text length.
      const beats = props.scene.beats.every(b => typeof b.start === 'number')
        ? props.scene.beats
        : estimateTimings(props.scene.beats, dialogueStart(props.scene));
      const scene = { ...props.scene, beats };
      return { durationInFrames: Math.ceil(sceneDuration(scene) * FPS), props: { scene } };
    }}
  />
  <Composition id="Thumbnail" component={Thumbnail} width={1080} height={1920} fps={FPS} durationInFrames={1}
    defaultProps={{ scene: sample as unknown as Scene }} />
</>);
