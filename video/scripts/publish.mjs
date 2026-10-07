// Puts a finished lesson (a folder with video.mp4, caption.txt and post.json) in the outbox repo
// the posting agent downloads from (private: JamesAC42/hanbok-outbox).
//
//   node scripts/publish.mjs out/<id> [--allow-placeholders] [--test]
//
// The folder gets video.mp4, caption.txt and post.json. --test marks the entry "test": true so the
// posting agent skips it. Slideshows go out with publish-slides.mjs instead.
import fs from 'fs';
import path from 'path';
import { pushToOutbox } from './outbox.mjs';
import { platformPosts } from './platforms.mjs';

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
// Videos made before per-platform text existed get it now.
if (!post.platforms) {
  post.platforms = platformPosts({ ...post, kind: 'video' });
  fs.writeFileSync(path.join(srcDir, 'post.json'), JSON.stringify(post, null, 2));
}

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

pushToOutbox(post, ['video.mp4', 'caption.txt', 'post.json'].map(f => [path.join(srcDir, f), f]), { test });
