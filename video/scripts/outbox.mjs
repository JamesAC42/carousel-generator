// Pushes one finished post to the outbox repo the posting agent reads (private:
// JamesAC42/hanbok-outbox). Used by publish.mjs (lesson videos) and publish-slides.mjs (slideshows).
//
// Layout of the outbox repo (main branch):
//   index.json                 newest first: [{ id, type, account, hook, folder, createdAt, test? }]
//   posts/<date>-<id>/         the post's files and post.json
// OUTBOX_REPO overrides the repo URL.
import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

const REPO = process.env.OUTBOX_REPO || 'https://github.com/JamesAC42/hanbok-outbox';
const git = (cwd, ...a) => execFileSync('git', a, { cwd, encoding: 'utf8' }).trim();

// files: [sourcePath, nameInTheFolder] pairs. test marks the entry for the posting agent to skip.
export function pushToOutbox(post, files, { test = false } = {}) {
  const work = fs.mkdtempSync(path.join(os.tmpdir(), 'outbox-'));
  try {
    // Shallow, so the clone stays small however many posts the outbox holds.
    git(work, 'clone', '--depth', '1', REPO, '.');
    const folder = path.posix.join('posts', `${post.createdAt.slice(0, 10)}-${post.id}`);
    if (fs.existsSync(path.join(work, folder))) {
      console.error(`${folder} is already in the outbox; not publishing it twice.`);
      process.exit(1);
    }
    fs.mkdirSync(path.join(work, folder), { recursive: true });
    for (const [src, name] of files) fs.copyFileSync(src, path.join(work, folder, name));
    // Keep the outbox README (the posting runbook) in step with this repo's version of the format.
    fs.copyFileSync(new URL('../../POSTING.md', import.meta.url), path.join(work, 'README.md'));

    const indexFile = path.join(work, 'index.json');
    const index = fs.existsSync(indexFile) ? JSON.parse(fs.readFileSync(indexFile, 'utf8')) : [];
    const entry = { id: post.id, type: post.type, account: post.account, hook: post.hook, folder, createdAt: post.createdAt, ...(test ? { test: true } : {}) };
    fs.writeFileSync(indexFile, JSON.stringify([entry, ...index.filter(e => e.id !== post.id)], null, 2) + '\n');

    git(work, 'add', '-A');
    git(work, 'commit', '-m', `${test ? 'Test post' : 'Post'}: ${post.id}`);
    git(work, 'push', 'origin', 'HEAD:main');
    console.log(`Published ${folder}${test ? ' (test)' : ''}`);
  } finally {
    fs.rmSync(work, { recursive: true, force: true });
  }
}

// The next lesson video's number for its title card: lesson videos already in the outbox, plus one.
// Returns undefined (no number on the card) if the outbox can't be read.
export function nextLessonNumber() {
  const work = fs.mkdtempSync(path.join(os.tmpdir(), 'outbox-'));
  try {
    git(work, 'clone', '-q', '--depth', '1', REPO, '.');
    const index = JSON.parse(fs.readFileSync(path.join(work, 'index.json'), 'utf8'));
    return index.filter(e => e.type === 'lesson-video' && !e.test).length + 1;
  } catch (err) {
    console.warn(`Couldn't read the outbox for the lesson number (${err.message.split('\n')[0]}); pass --number N.`);
    return undefined;
  } finally {
    fs.rmSync(work, { recursive: true, force: true });
  }
}
