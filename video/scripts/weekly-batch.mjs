// Packs a week of finished slideshows into scheduled videos, in two places:
//   1. The outbox (a local checkout of JamesAC42/hanbok-outbox): posts/<date>-<id>/ with video.mp4,
//      thumbnail.jpg, caption.txt and post.json (per-platform text plus "scheduledFor"), and an
//      index.json entry. The outbox's cross-post workflow uploads each one to Instagram Reels and
//      YouTube Shorts on its date, so those platforms need nobody.
//   2. A folder for James (--handoff): numbered videos and SCHEDULE.md with each post's date, time
//      and caption, so he can schedule the whole week in TikTok Studio in one sitting.
//
//   node video/scripts/weekly-batch.mjs <schedule.json> --outbox ../hanbok-outbox [--handoff dir]
//
// schedule.json: [{ "dir": "output/<id>", "id": "good-night", "date": "2026-11-25" }, ...]
// Optional per entry: "time" (HH:MM, US Eastern, default 19:00) and "music" (an mp3; default
// rotates through video/public/music/). Renders video.mp4 with slides-to-video.mjs when missing.
// Doesn't commit or push: review the outbox diff and open a PR.
import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { platformPosts } from './platforms.mjs';

const args = process.argv.slice(2);
const opt = name => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const scheduleFile = args[0];
const outbox = opt('--outbox');
const handoff = opt('--handoff');
if (!scheduleFile || !outbox) {
  console.error('usage: weekly-batch.mjs <schedule.json> --outbox <outbox checkout> [--handoff dir]');
  process.exit(1);
}

const here = path.dirname(new URL(import.meta.url).pathname);
const musicDir = path.join(here, '../public/music');
const beds = fs.existsSync(musicDir) ? fs.readdirSync(musicDir).filter(f => f.endsWith('.mp3')).sort().map(f => path.join(musicDir, f)) : [];
const schedule = JSON.parse(fs.readFileSync(scheduleFile, 'utf8'));

// US Eastern wall time -> ISO with the right offset (EST -05:00 Nov-Mar, EDT -04:00 otherwise).
const eastern = (date, time) => {
  const m = parseInt(date.slice(5, 7));
  const d = parseInt(date.slice(8, 10));
  const dst = (m > 3 && m < 11) || (m === 3 && d >= 8) || (m === 11 && d < 1);
  return `${date}T${time}:00${dst ? '-04:00' : '-05:00'}`;
};

const indexFile = path.join(outbox, 'index.json');
let index = fs.existsSync(indexFile) ? JSON.parse(fs.readFileSync(indexFile, 'utf8')) : [];
const lines = ['# TikTok schedule', '', 'Upload each video in TikTok Studio (tiktokstudio.com, Upload), paste its caption, turn on "Schedule" and pick the date and time below. Comments on. Content disclosure: Your brand.', ''];
if (handoff) fs.mkdirSync(handoff, { recursive: true });

schedule.forEach((entry, n) => {
  const meta = JSON.parse(fs.readFileSync(path.join(entry.dir, 'metadata.json'), 'utf8'));
  const video = path.join(entry.dir, 'video.mp4');
  if (!fs.existsSync(video)) {
    const music = entry.music || beds[n % beds.length];
    execFileSync('node', [path.join(here, 'slides-to-video.mjs'), entry.dir, ...(music ? ['--music', music] : [])], { stdio: 'inherit' });
  }
  // "Stop mixing up these two" says nothing on YouTube, so name the pair from the title ("Go vs Come: 가다 vs 오다").
  const pair = meta.title.includes(':') ? meta.title.split(':').pop().trim() : null;
  const hook = (meta.hooks?.[0] || meta.title).replace(/\*/g, '').replace('these two', pair || 'these two');
  const caption = meta.caption;
  const scheduledFor = eastern(entry.date, entry.time || '19:00');
  const post = {
    id: entry.id,
    type: 'lesson-video',
    format: `slides-video-${meta.style || 'quiz'}`,
    account: meta.account || 'main',
    hook,
    caption,
    scheduledFor,
    platforms: platformPosts({ kind: 'video', id: entry.id, account: meta.account || 'main', hook, caption }),
    createdAt: new Date().toISOString()
  };
  const folder = path.posix.join('posts', `${entry.date}-${entry.id}`);
  const dest = path.join(outbox, folder);
  fs.mkdirSync(dest, { recursive: true });
  fs.copyFileSync(video, path.join(dest, 'video.mp4'));
  const thumb = path.join(entry.dir, 'thumbnail.jpg');
  if (fs.existsSync(thumb)) fs.copyFileSync(thumb, path.join(dest, 'thumbnail.jpg'));
  fs.writeFileSync(path.join(dest, 'caption.txt'), caption + '\n');
  fs.writeFileSync(path.join(dest, 'post.json'), JSON.stringify(post, null, 2) + '\n');
  index = [{ id: post.id, type: post.type, account: post.account, hook, folder, createdAt: post.createdAt, scheduledFor }, ...index.filter(e => e.id !== post.id)];

  const day = new Date(`${entry.date}T12:00:00Z`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' });
  const name = `${String(n + 1).padStart(2, '0')}-${entry.id}.mp4`;
  if (handoff) fs.copyFileSync(video, path.join(handoff, name));
  lines.push(`## ${n + 1}. ${day}, ${entry.time || '19:00'} ET: ${name}`, '', '```', caption, '```', '');
  console.log(`${folder} (${scheduledFor})`);
});

fs.writeFileSync(indexFile, JSON.stringify(index, null, 2) + '\n');
if (handoff) fs.writeFileSync(path.join(handoff, 'SCHEDULE.md'), lines.join('\n'));
