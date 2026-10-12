import fs from 'fs';
import path from 'path';
import { generateTopicLesson } from './llm';
import { renderLessonToHTML } from './template';
import { renderHTMLToPNG } from './render';
import { getAccount, bioLink } from '../../shared/accounts';
import { Lesson, LessonType } from '../../shared/templates/lessonCarousel';

// Makes one topic lesson carousel (X vs Y, or how to say a phrase): the LLM call, the slides,
// alternative covers, caption.txt and metadata.json in output/<id>/. Used by `npm run carousel`.

export function makeLessonId(type: LessonType, topic: string): string {
  const slug = topic
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w㄰-㆏가-힯\-]/g, '')
    .slice(0, 30)
    .replace(/^-+|-+$/g, '');
  return `${type}-${slug || 'x'}-${Date.now()}`;
}

// Writes the PNGs for a lesson (fresh or from metadata.json) to outputDir and returns their names.
export async function renderLessonSlides(lesson: Lesson, outputDir: string) {
  const { slides, altCovers } = renderLessonToHTML(lesson);
  for (const f of fs.readdirSync(outputDir)) {
    if (/^(slide|cover-alt)-\d+\.png$/.test(f)) fs.unlinkSync(path.join(outputDir, f));
  }
  const slideFiles = slides.map((_, i) => `slide-${i + 1}.png`);
  const altCoverFiles = altCovers.map((_, i) => `cover-alt-${i + 1}.png`);
  for (let i = 0; i < slides.length; i++) await renderHTMLToPNG(slides[i], path.join(outputDir, slideFiles[i]));
  for (let i = 0; i < altCovers.length; i++) await renderHTMLToPNG(altCovers[i], path.join(outputDir, altCoverFiles[i]));
  return { slides: slideFiles, altCovers: altCoverFiles };
}

export async function buildLesson(id: string, type: LessonType, topic: string, accountId?: string): Promise<string> {
  const lesson: Lesson = await generateTopicLesson(type, topic);
  const account = getAccount(accountId);
  const outputDir = path.join('output', id);
  fs.mkdirSync(outputDir, { recursive: true });
  const files = await renderLessonSlides(lesson, outputDir);

  const hooks = lesson.hooks.map(h => h.replace(/\*/g, ''));
  const hashtags = [...new Set([...(lesson.hashtags || []), ...account.hashtags])];
  const caption = `${lesson.caption}\n\n${hashtags.join(' ')}`;
  fs.writeFileSync(
    path.join(outputDir, 'caption.txt'),
    `${caption}\n\n---\nAccount: ${account.label}\nLesson: ${type}\nBio link: ${bioLink(account)}\nHooks:\n${hooks.map((h, i) => `${i + 1}. ${h}`).join('\n')}\n`
  );
  fs.writeFileSync(
    path.join(outputDir, 'metadata.json'),
    JSON.stringify({
      ...lesson,
      originalTopic: topic,
      ...files,
      caption,
      account: account.id,
      style: type,
      bioLink: bioLink(account),
      language: 'korean',
      type: 'lesson',
      lessonType: type,
      createdAt: new Date().toISOString()
    }, null, 2)
  );
  return outputDir;
}
