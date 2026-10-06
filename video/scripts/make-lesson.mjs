// One command from a line breakdown to a finished, postable lesson video:
// script (Gemini) -> narration (ElevenLabs) -> render -> out/<id>/ with video.mp4 + caption.txt,
// and with --publish, a push to the outbox branch for posting.
//
//   node scripts/make-lesson.mjs <metadata.json> [--hook N] [--gameplay <path in public/>] [--publish]
//
// Needs GEMINI_API_KEY and ELEVENLABS_API_KEY. In a cloud session run with NODE_USE_ENV_PROXY=1
// and CHROME_PATH=<headless_shell>.
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
const [inFile] = args;
if (!inFile) {
  console.error('usage: make-lesson.mjs <metadata.json> [--hook N] [--gameplay <path>] [--publish]');
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

run('scripts/write-script.mjs', inFile, sceneFile, ...(hook ? ['--hook', hook] : []));
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
