// Re-renders a finished line breakdown or topic lesson (after a template change, or a line
// breakdown in another style) without calling the LLM again.
//   npm run slides -- output/<id> [--style quiz] [--out <dir>]
// Writes slide-N.png and cover-alt-N.png to --out (default: the same folder) and, when
// rendering in place, updates metadata.json's style.
import fs from 'fs';
import path from 'path';
import { renderLineBreakdownToHTML } from './utils/template';
import { renderHTMLToPNG } from './utils/render';
import { CAROUSEL_STYLES } from '../shared/templates/carouselStyles';
import { LINE_BREAKDOWN_STYLES } from '../shared/templates/lineBreakdown';
import { renderLessonSlides } from './utils/lessonJob';

const args = process.argv.slice(2);
const flag = (name: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const dir = args.find(a => !a.startsWith('--') && !args[args.indexOf(a) - 1]?.startsWith('--'));
if (!dir || !fs.existsSync(path.join(dir, 'metadata.json'))) {
  console.error('Usage: npm run slides -- output/<id> [--style quiz] [--out <dir>]');
  process.exit(1);
}

const metadata = JSON.parse(fs.readFileSync(path.join(dir, 'metadata.json'), 'utf8'));

if (metadata.type === 'lesson') {
  const out = flag('out') || dir;
  fs.mkdirSync(out, { recursive: true });
  // metadata.type is "lesson"; the lesson's own type (vs, phrase) is kept in lessonType.
  const files = await renderLessonSlides({ ...metadata, type: metadata.lessonType }, out);
  if (path.resolve(out) === path.resolve(dir)) {
    fs.writeFileSync(path.join(dir, 'metadata.json'), JSON.stringify({ ...metadata, ...files }, null, 2));
  }
  console.log(`Rendered ${files.slides.length} ${metadata.lessonType} slides to ${out}`);
  process.exit(0);
}
const styles: string[] = [...CAROUSEL_STYLES, ...LINE_BREAKDOWN_STYLES];
const style = flag('style') || metadata.style;
if (!styles.includes(style)) {
  console.error(`Unknown style "${style}". Use one of: ${styles.join(', ')}`);
  process.exit(1);
}
const out = flag('out') || dir;
fs.mkdirSync(out, { recursive: true });

const { slides, altCovers } = renderLineBreakdownToHTML(metadata, metadata.hooks, style as any);
for (const f of fs.readdirSync(out)) {
  if (/^(slide|cover-alt)-\d+\.png$/.test(f)) fs.unlinkSync(path.join(out, f));
}
for (let i = 0; i < slides.length; i++) await renderHTMLToPNG(slides[i], path.join(out, `slide-${i + 1}.png`));
for (let i = 0; i < altCovers.length; i++) await renderHTMLToPNG(altCovers[i], path.join(out, `cover-alt-${i + 1}.png`));

if (path.resolve(out) === path.resolve(dir)) {
  metadata.style = style;
  metadata.slides = slides.map((_, i) => `slide-${i + 1}.png`);
  metadata.altCovers = altCovers.map((_, i) => `cover-alt-${i + 1}.png`);
  fs.writeFileSync(path.join(dir, 'metadata.json'), JSON.stringify(metadata, null, 2));
}
console.log(`Rendered ${slides.length} ${style} slides to ${out}`);
