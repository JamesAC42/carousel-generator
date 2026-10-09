// Renders a lesson video: node render.mjs [scene.json] [out.mp4]
// and, for a scene with a show clip, its cover image next to it (thumbnail.jpg).
// Uses CHROME_PATH if set (e.g. a preinstalled Chromium), otherwise Remotion's own.
import { bundle } from '@remotion/bundler';
import { renderMedia, renderStill, selectComposition } from '@remotion/renderer';
import fs from 'fs';
import path from 'path';

const [sceneFile, outFile = 'out/lesson.mp4'] = process.argv.slice(2);
const inputProps = sceneFile ? { scene: JSON.parse(fs.readFileSync(sceneFile, 'utf8')) } : undefined;
const browserExecutable = process.env.CHROME_PATH || null;

const serveUrl = await bundle({ entryPoint: path.resolve('src/index.ts') });
const composition = await selectComposition({ serveUrl, id: 'LessonVideo', inputProps, browserExecutable });
fs.mkdirSync(path.dirname(outFile), { recursive: true });
await renderMedia({
  composition, serveUrl, codec: 'h264', outputLocation: outFile, inputProps, browserExecutable,
  onProgress: ({ progress }) => process.stdout.write(`\rRendering ${Math.round(progress * 100)}%`)
});
console.log(`\nWrote ${outFile}`);

if (inputProps?.scene.clip) {
  const thumb = await selectComposition({ serveUrl, id: 'Thumbnail', inputProps, browserExecutable });
  const thumbFile = path.join(path.dirname(outFile), 'thumbnail.jpg');
  await renderStill({ composition: thumb, serveUrl, output: thumbFile, inputProps, browserExecutable, imageFormat: 'jpeg', jpegQuality: 90 });
  console.log(`Wrote ${thumbFile}`);
}
