// Renders a "Sora in Seoul" skit, plain (A) and with the lesson tail (B):
//   node render-skit.mjs skits/ep01/skit.json [out/ep01]   -> out/ep01/a.mp4, out/ep01/b.mp4
// Clips, start frames and sounds the skit names live under public/ (public/skits/<id>/).
// Uses CHROME_PATH if set, otherwise Remotion's own Chrome.
import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import fs from 'fs';
import path from 'path';

const [skitFile, outDir] = process.argv.slice(2);
if (!skitFile) {
  console.error('Usage: node render-skit.mjs <skit.json> [out dir]');
  process.exit(1);
}
const skit = JSON.parse(fs.readFileSync(skitFile, 'utf8'));
const dir = outDir || path.join('out', skit.id);
const browserExecutable = process.env.CHROME_PATH || null;

const serveUrl = await bundle({ entryPoint: path.resolve('src/skit-index.ts') });
fs.mkdirSync(dir, { recursive: true });
for (const [name, withLesson] of [['a', false], ['b', true]]) {
  if (withLesson && !skit.lesson) continue;
  const inputProps = { skit, withLesson };
  const composition = await selectComposition({ serveUrl, id: 'Skit', inputProps, browserExecutable });
  const outputLocation = path.join(dir, `${name}.mp4`);
  await renderMedia({
    composition, serveUrl, codec: 'h264', outputLocation, inputProps, browserExecutable,
    onProgress: ({ progress }) => process.stdout.write(`\r${name}: ${Math.round(progress * 100)}%`)
  });
  console.log(`\nWrote ${outputLocation}`);
}
