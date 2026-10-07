// One command from a line breakdown to a finished, postable lesson video:
// script (WRITER_MODEL) -> narration (ElevenLabs) -> render -> out/<id>/ with video.mp4 + caption.txt,
// and with --publish, a push to the hanbok-outbox repo for posting.
//
//   node scripts/make-lesson.mjs <metadata.json> [--hook N] [--gameplay <path in public/>] [--publish]
//     [--clip <video file> --clip-start <s> --clip-end <s> --clip-context "who says it to whom, what's happening"]
//
// --clip cuts the show's clip (any video file; start/end in seconds or hh:mm:ss) into
// public/clips/<id>.mp4 and opens the video with it. Keep it to the line itself, 2 to 5 seconds.
//
// Needs ELEVENLABS_API_KEY and the writer model's key (GEMINI_API_KEY or OPENAI_API_KEY).
// In a cloud session run with NODE_USE_ENV_PROXY=1 and CHROME_PATH=<headless_shell>.
import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const args = process.argv.slice(2);
const flag = (name, takesValue) => {
  const i = args.indexOf(name);
  if (i < 0) return undefined;
  return takesValue ? args.splice(i, 2)[1] : (args.splice(i, 1), true);
};
const hook = flag('--hook', true);
const gameplay = flag('--gameplay', true);
const publish = flag('--publish', false);
const clip = flag('--clip', true);
const clipStart = flag('--clip-start', true);
const clipEnd = flag('--clip-end', true);
const clipContext = flag('--clip-context', true);
const [inFile] = args;
if (!inFile) {
  console.error('usage: make-lesson.mjs <metadata.json> [--hook N] [--gameplay <path>] [--publish] [--clip <file> --clip-start s --clip-end s --clip-context text]');
  process.exit(1);
}

const breakdown = JSON.parse(fs.readFileSync(inFile, 'utf8'));
const base = path.basename(inFile) === 'metadata.json' ? path.basename(path.dirname(path.resolve(inFile))) : path.basename(inFile, '.json');
const id = base.replace(/[^\w-]/g, '') || `lesson-${Date.now()}`;
const dir = path.join('out', id);
fs.mkdirSync(dir, { recursive: true });
const sceneFile = path.join(dir, 'scene.json');
const videoFile = path.join(dir, 'video.mp4');

const run = (script, ...rest) => execFileSync(process.execPath, ['--experimental-strip-types', '--no-warnings', script, ...rest], { stdio: 'inherit' });

const clipArgs = [];
if (clip) {
  if (!clipStart || !clipEnd) throw new Error('--clip needs --clip-start and --clip-end');
  const clipFile = path.join('public', 'clips', `${id}.mp4`);
  fs.mkdirSync(path.dirname(clipFile), { recursive: true });
  // Re-encode so the cut is frame-accurate and the clip plays in the browser renderer.
  execFileSync('ffmpeg', ['-y', '-v', 'error', '-ss', clipStart, '-to', clipEnd, '-i', clip,
    '-vf', 'scale=1280:-2', '-c:v', 'libx264', '-crf', '20', '-c:a', 'aac', '-movflags', '+faststart', clipFile], { stdio: 'inherit' });
  const seconds = Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', clipFile], { encoding: 'utf8' }));
  clipArgs.push('--clip', path.relative('public', clipFile), '--clip-seconds', seconds.toFixed(2));
  if (clipContext) clipArgs.push('--clip-context', clipContext);
}

run('scripts/write-script.mjs', inFile, sceneFile, ...(hook ? ['--hook', hook] : []), ...clipArgs);
if (gameplay) {
  const scene = JSON.parse(fs.readFileSync(sceneFile, 'utf8'));
  scene.gameplay = gameplay;
  fs.writeFileSync(sceneFile, JSON.stringify(scene, null, 2));
}
run('scripts/narrate.mjs', sceneFile);
run('render.mjs', sceneFile, videoFile);

// The carousel generator already wrote a caption with hashtags for this line; reuse it.
const scene = JSON.parse(fs.readFileSync(sceneFile, 'utf8'));
const caption = breakdown.caption || `${scene.hook}\n\n#learnkorean #korean #hanbokstudy`;
fs.writeFileSync(path.join(dir, 'caption.txt'), `${caption}\n`);
fs.writeFileSync(path.join(dir, 'post.json'), JSON.stringify({
  id,
  type: 'lesson-video',
  account: breakdown.account || 'main',
  hook: scene.hook,
  caption,
  bioLink: breakdown.bioLink,
  durationSeconds: Math.round(scene.beats[scene.beats.length - 1].end),
  createdAt: new Date().toISOString()
}, null, 2));
console.log(`\nFinished ${dir}/`);

if (publish) run('scripts/publish.mjs', dir);
