// Puts a finished line-breakdown slideshow (the carousel generator's output/<id>/) in the outbox
// for posting, with per-platform text in post.json like the lesson videos.
//
//   node scripts/publish-slides.mjs ../output/<id> [--learn-url https://hanbokstudy.com/learn/<slug>] [--test]
//
// The outbox id is "<id>-slides", so a video made from the same breakdown keeps its own id.
// --learn-url points the Pinterest pin at a matching Learn guide instead of the home page.
import fs from 'fs';
import path from 'path';
import { pushToOutbox } from './outbox.mjs';
import { platformPosts } from './platforms.mjs';

const args = process.argv.slice(2);
const option = name => {
  const i = args.indexOf(name);
  return i >= 0 ? args.splice(i, 2)[1] : undefined;
};
const learnUrl = option('--learn-url');
const test = args.includes('--test');
const [srcDir] = args.filter(a => !a.startsWith('--'));
if (!srcDir) {
  console.error('usage: publish-slides.mjs ../output/<id> [--learn-url <url>] [--test]');
  process.exit(1);
}

const meta = JSON.parse(fs.readFileSync(path.join(srcDir, 'metadata.json'), 'utf8'));
if (meta.type !== 'line-breakdown' || !meta.slides?.length) {
  console.error(`${srcDir} isn't a line-breakdown slideshow (metadata.json type "${meta.type}").`);
  process.exit(1);
}
// Same id as a video made from this breakdown (make-lesson.mjs), plus "-slides".
const base = path.basename(path.resolve(srcDir)).replace(/[^\w-]/g, '');
const id = /[a-z0-9]/i.test(base) ? `${base}-slides` : `slides-${Date.now()}`;
const account = meta.account || 'main';
const hook = meta.hooks?.[0] || meta.title;
const post = {
  id,
  type: 'slides',
  format: `slides-${meta.style}`,
  account,
  hook,
  caption: meta.caption,
  slides: meta.slides,
  platforms: platformPosts({ kind: 'slides', id, account, hook, caption: meta.caption, title: meta.title, learnUrl, cover: meta.slides[0] }),
  createdAt: new Date().toISOString()
};

const work = fs.mkdtempSync(path.join(path.resolve(srcDir), '.publish-'));
try {
  fs.writeFileSync(path.join(work, 'post.json'), JSON.stringify(post, null, 2));
  fs.writeFileSync(path.join(work, 'caption.txt'), `${meta.caption}\n`);
  pushToOutbox(post, [
    ...meta.slides.map(f => [path.join(srcDir, f), f]),
    [path.join(work, 'caption.txt'), 'caption.txt'],
    [path.join(work, 'post.json'), 'post.json']
  ], { test });
} finally {
  fs.rmSync(work, { recursive: true, force: true });
}
