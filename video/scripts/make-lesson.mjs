// One command from a line breakdown to a finished, postable lesson video:
// script (WRITER_MODEL) -> narration (ElevenLabs) -> render -> out/<id>/ with video.mp4 + caption.txt,
// and with --publish, a push to the hanbok-outbox repo for posting.
//
//   node scripts/make-lesson.mjs <metadata.json> [--hook N] [--gameplay <path in public/>, default: the video in public/gameplay/] [--publish]
//     [--clip <video file> --clip-start <s> --clip-end <s> --line-start <s> --line-end <s>
//      --clip-context "who says it to whom, what's happening" [--clip-subs <file.srt>] [--number N]]
//
// --clip cuts the show's clip (any video file) into public/clips/<id>.mp4 and opens the video with it.
// All times are in the source file, in seconds or hh:mm:ss(.ms). The clip is the scene around the
// line (about 8 to 20 seconds); --line-start/--line-end say when the lesson line itself is said, so
// the video can pause there, rewind and play the line again. --clip-subs adds English subtitles for
// the rest of the clip (an .srt timed to the source file). --number is the lesson number on the title
// card; without it, it's the number of lesson videos in the outbox plus one.
//
// Needs ELEVENLABS_API_KEY and the writer model's key (GEMINI_API_KEY or OPENAI_API_KEY).
// In a cloud session run with NODE_USE_ENV_PROXY=1 and CHROME_PATH=<headless_shell>.
import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import './env.mjs';
import { nextLessonNumber } from './outbox.mjs';
import { platformPosts } from './platforms.mjs';

const args = process.argv.slice(2);
const flag = (name, takesValue) => {
  const i = args.indexOf(name);
  if (i < 0) return undefined;
  return takesValue ? args.splice(i, 2)[1] : (args.splice(i, 1), true);
};
const hook = flag('--hook', true);
// Without --gameplay, use a video from public/gameplay/ if there is one.
const gameplayDir = path.join('public', 'gameplay');
const gameplay = flag('--gameplay', true) ?? (fs.existsSync(gameplayDir)
  ? fs.readdirSync(gameplayDir).filter(f => /\.(mp4|webm|mov|mkv)$/i.test(f)).map(f => `gameplay/${f}`)[0]
  : undefined);
const publish = flag('--publish', false);
const clip = flag('--clip', true);
const clipStart = flag('--clip-start', true);
const clipEnd = flag('--clip-end', true);
const clipContext = flag('--clip-context', true);
const lineStart = flag('--line-start', true);
const lineEnd = flag('--line-end', true);
const clipSubs = flag('--clip-subs', true);
const numberFlag = flag('--number', true);
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

// "83.2", "1:23.2" or "0:01:23.200" -> seconds.
function seconds(time) {
  return String(time).replace(',', '.').split(':').reduce((total, part) => total * 60 + Number(part), 0);
}

function parseSrt(text) {
  return text.replace(/\r/g, '').split(/\n\n+/).map(block => {
    const lines = block.trim().split('\n');
    const at = lines.findIndex(l => l.includes('-->'));
    if (at < 0) return null;
    const [start, end] = lines[at].split('-->').map(x => seconds(x.trim().split(' ')[0]));
    return { start, end, text: lines.slice(at + 1).join(' ').replace(/<[^>]+>/g, '').trim() };
  }).filter(c => c && c.text);
}

const run = (script, ...rest) => execFileSync(process.execPath, ['--experimental-strip-types', '--no-warnings', script, ...rest], { stdio: 'inherit' });

const clipArgs = [];
if (clip) {
  if (!clipStart || !clipEnd) throw new Error('--clip needs --clip-start and --clip-end');
  const clipFile = path.join('public', 'clips', `${id}.mp4`);
  fs.mkdirSync(path.dirname(clipFile), { recursive: true });
  // Re-encode so the cut is frame-accurate and the clip plays in the browser renderer.
  execFileSync('ffmpeg', ['-y', '-v', 'error', '-ss', clipStart, '-to', clipEnd, '-i', clip,
    '-vf', 'scale=1280:-2', '-r', '30', '-c:v', 'libx264', '-crf', '20', '-c:a', 'aac', '-movflags', '+faststart', clipFile], { stdio: 'inherit' });
  const seconds = Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', clipFile], { encoding: 'utf8' }));
  clipArgs.push('--clip', path.relative('public', clipFile), '--clip-seconds', seconds.toFixed(2));
  if (clipContext) clipArgs.push('--clip-context', clipContext);
}

run('scripts/write-script.mjs', inFile, sceneFile, ...(hook ? ['--hook', hook] : []), ...clipArgs);
if (clip) {
  const scene = JSON.parse(fs.readFileSync(sceneFile, 'utf8'));
  const offset = seconds(clipStart);
  if (lineStart && lineEnd) Object.assign(scene.clip, { lineStart: seconds(lineStart) - offset, lineEnd: seconds(lineEnd) - offset });
  else console.warn('No --line-start/--line-end: the whole clip is treated as the line.');
  if (clipSubs) scene.clip.subs = parseSrt(fs.readFileSync(clipSubs, 'utf8'))
    .map(c => ({ ...c, start: c.start - offset, end: c.end - offset }))
    .filter(c => c.end > 0 && c.start < scene.clip.seconds);
  scene.clip.number = numberFlag ? Number(numberFlag) : nextLessonNumber();
  fs.writeFileSync(sceneFile, JSON.stringify(scene, null, 2));
}
if (gameplay) {
  const scene = JSON.parse(fs.readFileSync(sceneFile, 'utf8'));
  scene.gameplay = gameplay;
  // Start at a random point (leaving room for a 90s video) so each video shows different footage.
  const seconds = Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', path.join('public', gameplay)], { encoding: 'utf8' }));
  scene.gameplayStart = Math.floor(Math.random() * Math.max(0, seconds - 90));
  fs.writeFileSync(sceneFile, JSON.stringify(scene, null, 2));
}
run('scripts/narrate.mjs', sceneFile);
run('render.mjs', sceneFile, videoFile);

// The carousel generator already wrote a caption with hashtags for this line; reuse it.
const scene = JSON.parse(fs.readFileSync(sceneFile, 'utf8'));
// The caption ends on the video's quiz question, so viewers answer it in the comments.
const baseCaption = breakdown.caption || `${scene.hook}\n\n#learnkorean #korean #hanbokstudy`;
const tagsAt = baseCaption.search(/\n+#/);
const [captionText, captionTags] = tagsAt >= 0 ? [baseCaption.slice(0, tagsAt), baseCaption.slice(tagsAt)] : [baseCaption, ''];
const ask = scene.quiz ? `\n\n${scene.quiz.question} ${scene.quiz.options.map((o, i) => `${'AB'[i]}) ${o}`).join(' or ')}? Comment your guess.` : '';
const caption = `${captionText.trim()}${ask}${captionTags}`;
fs.writeFileSync(path.join(dir, 'caption.txt'), `${caption}\n`);
const account = breakdown.account || 'main';
fs.writeFileSync(path.join(dir, 'post.json'), JSON.stringify({
  id,
  type: 'lesson-video',
  format: 'lesson-video',
  account,
  hook: scene.hook,
  caption,
  platforms: platformPosts({ kind: 'video', id, account, hook: scene.hook, caption }),
  bioLink: breakdown.bioLink,
  durationSeconds: Math.round(scene.beats[scene.beats.length - 1].end),
  createdAt: new Date().toISOString()
}, null, 2));
console.log(`\nFinished ${dir}/`);

if (publish) run('scripts/publish.mjs', dir);
