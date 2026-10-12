// Renders a lesson video: node render.mjs [scene.json] [out.mp4]
// and, for a scene with a show clip, its cover image next to it (thumbnail.jpg).
// Uses CHROME_PATH if set (e.g. a preinstalled Chromium), otherwise Remotion's own.
//
// To keep memory flat on small machines, the picture is rendered in chunks of
// RENDER_CHUNK_SECONDS (default 15), each in a fresh browser, and the sound in one audio-only
// pass; ffmpeg then joins them without re-encoding. RENDER_CHUNK_SECONDS=0 renders in one pass.
// RENDER_CONCURRENCY sets how many frames render at once (default: from free memory, at most half
// the CPU cores). RENDER_VIDEO_CACHE_MB caps Remotion's decoded-video cache (default 512).
import { bundle } from '@remotion/bundler';
import { renderMedia, renderStill, selectComposition } from '@remotion/renderer';
import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

const [sceneFile, outFile = 'out/lesson.mp4'] = process.argv.slice(2);
const inputProps = sceneFile ? { scene: JSON.parse(fs.readFileSync(sceneFile, 'utf8')) } : undefined;
const browserExecutable = process.env.CHROME_PATH || null;

const GB = 1024 ** 3;
// Each concurrent frame is a browser tab holding decoded video; about 1.5 GB each is safe.
const concurrency = Number(process.env.RENDER_CONCURRENCY) ||
  Math.max(1, Math.min(Math.floor(os.cpus().length / 2), Math.floor(os.freemem() / (1.5 * GB))));
const chunkSeconds = Number(process.env.RENDER_CHUNK_SECONDS ?? 15);
const options = {
  inputProps, browserExecutable, concurrency,
  offthreadVideoCacheSizeInBytes: Number(process.env.RENDER_VIDEO_CACHE_MB || 512) * 1024 ** 2
};

const serveUrl = await bundle({ entryPoint: path.resolve('src/index.ts') });
const composition = await selectComposition({ serveUrl, id: 'LessonVideo', inputProps, browserExecutable });
fs.mkdirSync(path.dirname(outFile), { recursive: true });
const total = composition.durationInFrames;
const chunk = Math.round(chunkSeconds * composition.fps);
console.log(`Rendering ${total} frames, ${concurrency} at a time${chunk > 0 && chunk < total ? `, in chunks of ${chunk}` : ''}`);

if (!(chunk > 0 && chunk < total)) {
  await renderMedia({
    ...options, composition, serveUrl, codec: 'h264', outputLocation: outFile,
    onProgress: ({ progress }) => process.stdout.write(`\rRendering ${Math.round(progress * 100)}%`)
  });
} else {
  const work = fs.mkdtempSync(path.join(os.tmpdir(), 'render-'));
  try {
    const parts = [];
    for (let from = 0; from < total; from += chunk) {
      const to = Math.min(total, from + chunk) - 1;
      const part = path.join(work, `part-${String(parts.length).padStart(3, '0')}.mp4`);
      // A fresh browser per chunk (renderMedia opens and closes its own), so memory can't build up.
      await renderMedia({
        ...options, composition, serveUrl, codec: 'h264', muted: true, frameRange: [from, to], outputLocation: part,
        onProgress: ({ progress }) => process.stdout.write(`\rRendering ${Math.round(((from + progress * (to - from + 1)) / total) * 100)}%`)
      });
      parts.push(part);
    }
    const audio = path.join(work, 'audio.m4a');
    await renderMedia({ ...options, composition, serveUrl, codec: 'aac', outputLocation: audio });
    const list = path.join(work, 'parts.txt');
    fs.writeFileSync(list, parts.map(p => `file '${p}'`).join('\n'));
    execFileSync('ffmpeg', ['-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-i', audio,
      '-map', '0:v', '-map', '1:a', '-c', 'copy', '-movflags', '+faststart', outFile], { stdio: 'inherit' });
  } finally {
    fs.rmSync(work, { recursive: true, force: true });
  }
}
console.log(`\nWrote ${outFile}`);

if (inputProps?.scene.clip) {
  const thumb = await selectComposition({ serveUrl, id: 'Thumbnail', inputProps, browserExecutable });
  const thumbFile = path.join(path.dirname(outFile), 'thumbnail.jpg');
  await renderStill({ composition: thumb, serveUrl, output: thumbFile, inputProps, browserExecutable, imageFormat: 'jpeg', jpegQuality: 90 });
  console.log(`Wrote ${thumbFile}`);
}
