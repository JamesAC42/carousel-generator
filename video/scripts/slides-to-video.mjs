// Turns a finished slideshow (output/<id>/slide-*.png) into a 1080x1920 TikTok/Reels/Shorts video:
// each slide sits on its own background colour with a slow push-in, slides swipe left into each
// other like a carousel, and a music bed plays under it. Videos can be scheduled in TikTok Studio
// (photo posts can't) and cross-posted to Reels and Shorts, so this is the weekly format.
//
//   node video/scripts/slides-to-video.mjs output/<id> [--music path.mp3] [--out video.mp4]
//
// Needs ffmpeg and ImageMagick (`magick` or `convert`) on PATH.
import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const args = process.argv.slice(2);
const opt = name => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const dir = args.find((a, i) => !a.startsWith('--') && !args[i - 1]?.startsWith('--'));
if (!dir) {
  console.error('usage: slides-to-video.mjs output/<id> [--music file.mp3] [--out video.mp4]');
  process.exit(1);
}
const music = opt('--music');
const out = opt('--out') || path.join(dir, 'video.mp4');

const slides = fs.readdirSync(dir)
  .filter(f => /^slide-\d+\.png$/.test(f))
  .sort((a, b) => parseInt(a.match(/\d+/)[0]) - parseInt(b.match(/\d+/)[0]))
  .map(f => path.join(dir, f));
if (slides.length < 2) {
  console.error(`No slides in ${dir}`);
  process.exit(1);
}

const W = 1080, H = 1920, SW = 1080, SH = 1350, FPS = 30, SWIPE = 0.35;
// Slide sits a little above centre so TikTok's caption and buttons at the bottom don't cover it.
const TOP = Math.round((H - SH) / 2) - 70;

// Hook short, the quiz long enough to guess, the rest long enough to read.
const durations = slides.map((_, i) => (i === 0 ? 2.6 : i === 1 ? 4.6 : i === slides.length - 1 ? 3.2 : 3.6));

const im = (() => {
  try { execFileSync('magick', ['-version'], { stdio: 'ignore' }); return 'magick'; } catch { return 'convert'; }
})();
// The slide's own background colour (top-left corner) fills the rest of the frame.
const bg = file => execFileSync(im, [file, '-format', '%[hex:p{6,6}]', 'info:'], { encoding: 'utf8' }).trim().slice(0, 6);

const inputs = [];
const filters = [];
slides.forEach((file, i) => {
  const d = durations[i] + (i < slides.length - 1 ? SWIPE : 0);
  inputs.push('-loop', '1', '-framerate', String(FPS), '-t', d.toFixed(2), '-i', file);
  const frames = Math.round(d * FPS);
  // Slow 4% push-in over the slide's time on screen.
  filters.push(
    `color=c=0x${bg(file)}:s=${W}x${H}:r=${FPS}:d=${d.toFixed(2)}[bg${i}]`,
    `[${i}:v]scale=${SW * 2}:${SH * 2},zoompan=z='1+0.04*on/${frames}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:s=${SW}x${SH}:fps=${FPS}[s${i}]`,
    `[bg${i}][s${i}]overlay=0:${TOP}:shortest=1,format=yuv420p,setsar=1[v${i}]`
  );
});
// Chain the slides with a left swipe, like flicking through a carousel.
let last = 'v0';
let offset = 0;
for (let i = 1; i < slides.length; i++) {
  offset += durations[i - 1];
  const label = i === slides.length - 1 ? 'vout' : `x${i}`;
  filters.push(`[${last}][v${i}]xfade=transition=slideleft:duration=${SWIPE}:offset=${offset.toFixed(2)}[${label}]`);
  last = label;
}
const total = durations.reduce((a, b) => a + b, 0);

const ffArgs = ['-y', ...inputs];
if (music) {
  ffArgs.push('-i', music);
  const a = slides.length;
  filters.push(`[${a}:a]atrim=0:${total.toFixed(2)},afade=t=in:d=0.4,afade=t=out:st=${(total - 1.2).toFixed(2)}:d=1.2,volume=0.55[aout]`);
}
ffArgs.push('-filter_complex', filters.join(';'), '-map', '[vout]');
if (music) ffArgs.push('-map', '[aout]', '-c:a', 'aac', '-b:a', '160k');
ffArgs.push('-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-r', String(FPS), '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-t', total.toFixed(2), out);

execFileSync('ffmpeg', ffArgs, { stdio: ['ignore', 'ignore', 'inherit'] });
// A cover frame for schedulers and YouTube: the hook slide.
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-ss', '1.2', '-i', out, '-frames:v', '1', '-q:v', '3', path.join(path.dirname(out), 'thumbnail.jpg')]);
console.log(`${out} (${total.toFixed(1)}s, ${slides.length} slides)`);
