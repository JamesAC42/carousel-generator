// Puts a finished lesson (a folder with video.mp4, caption.txt and post.json) in the outbox repo
// the posting agent downloads from (private: JamesAC42/hanbok-outbox).
//
//   node scripts/publish.mjs out/<id> [--allow-placeholders] [--test]
//
// Layout of the outbox repo (main branch):
//   index.json                 newest first: [{ id, account, hook, folder, createdAt, test? }]
//   posts/<date>-<id>/video.mp4, caption.txt, post.json
// --test marks the entry "test": true so the posting agent skips it.
// OUTBOX_REPO overrides the repo URL.
import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

const args = process.argv.slice(2);
const allowPlaceholders = args.includes('--allow-placeholders');
const test = args.includes('--test');
const [srcDir] = args.filter(a => !a.startsWith('--'));
if (!srcDir) {
  console.error('usage: publish.mjs out/<id> [--allow-placeholders] [--test]');
  process.exit(1);
}

const post = JSON.parse(fs.readFileSync(path.join(srcDir, 'post.json'), 'utf8'));
const scene = JSON.parse(fs.readFileSync(path.join(srcDir, 'scene.json'), 'utf8'));

// Don't let a video with the stand-in gameplay band or stand-in characters go out by accident.
const problems = [];
if (!scene.gameplay) problems.push('no gameplay clip (the bottom band is the placeholder)');
if (Object.values(scene.characters).some(c => Object.values(c.expressions).some(src => src.startsWith('sample/')))) {
  problems.push('placeholder character art (sample/characters)');
}
if (problems.length && !allowPlaceholders) {
  console.error(`Not publishing ${post.id}: ${problems.join('; ')}. Pass --allow-placeholders to publish anyway.`);
  process.exit(1);
}

const REPO = process.env.OUTBOX_REPO || 'https://github.com/JamesAC42/hanbok-outbox';
const git = (cwd, ...a) => execFileSync('git', a, { cwd, encoding: 'utf8' }).trim();
const work = fs.mkdtempSync(path.join(os.tmpdir(), 'outbox-'));

try {
  // Shallow, so the clone stays small however many videos the outbox holds.
  git(work, 'clone', '--depth', '1', REPO, '.');
  const folder = path.posix.join('posts', `${post.createdAt.slice(0, 10)}-${post.id}`);
  if (fs.existsSync(path.join(work, folder))) {
    console.error(`${folder} is already in the outbox; not publishing it twice.`);
    process.exit(1);
  }
  fs.mkdirSync(path.join(work, folder), { recursive: true });
  for (const f of ['video.mp4', 'caption.txt', 'post.json']) fs.copyFileSync(path.join(srcDir, f), path.join(work, folder, f));
  if (!fs.existsSync(path.join(work, 'README.md'))) {
    fs.copyFileSync(new URL('./OUTBOX_README.md', import.meta.url), path.join(work, 'README.md'));
  }

  const indexFile = path.join(work, 'index.json');
  const index = fs.existsSync(indexFile) ? JSON.parse(fs.readFileSync(indexFile, 'utf8')) : [];
  const entry = { id: post.id, account: post.account, hook: post.hook, folder, createdAt: post.createdAt, ...(test ? { test: true } : {}) };
  fs.writeFileSync(indexFile, JSON.stringify([entry, ...index.filter(e => e.id !== post.id)], null, 2) + '\n');

  git(work, 'add', '-A');
  git(work, 'commit', '-m', `${test ? 'Test post' : 'Post'}: ${post.id}`);
  git(work, 'push', 'origin', 'HEAD:main');
  console.log(`Published ${folder}${test ? ' (test)' : ''}`);
} finally {
  fs.rmSync(work, { recursive: true, force: true });
}
