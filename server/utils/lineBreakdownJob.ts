import fs from 'fs';
import path from 'path';
import { generateLineBreakdown } from './llm';
import { renderLineBreakdownToHTML } from './template';
import { renderHTMLToPNG } from './render';
import { getAccount, bioLink } from '../../shared/accounts';
import { LINE_BREAKDOWN_STYLES, LineBreakdownStyle } from '../../shared/templates/lineBreakdown';
import { CAROUSEL_STYLES, CarouselStyle } from '../../shared/templates/carouselStyles';

// Makes one line breakdown: the LLM call, the slides, caption.txt and metadata.json in
// output/<id>/. Used by POST /api/line-breakdown and by `npm run breakdown`.

type Style = CarouselStyle | LineBreakdownStyle;
// New posts use the Bright Path quiz style. The older storybook / variety / notes styles
// still render when asked for by name.
const ALL_STYLES: Style[] = [...CAROUSEL_STYLES, ...LINE_BREAKDOWN_STYLES];

export interface LineBreakdownRequest {
  line: string;
  source?: string;
  language?: string;
  account?: string;
  style?: string;
}

export function makeLineBreakdownId(line: string): string {
  const slug = line
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w㄰-㆏가-힯぀-ゟ゠-ヿ一-龯\-]/g, '')
    .slice(0, 30)
    .replace(/^-+|-+$/g, '');
  return `line-${slug || 'x'}-${Date.now()}`;
}

export async function buildLineBreakdown(id: string, request: LineBreakdownRequest): Promise<string> {
  const { line, source = '', language = 'korean', account: accountId } = request;
  const style: Style = (ALL_STYLES as string[]).includes(request.style || '') ? (request.style as Style) : 'quiz';
  const breakdown = await generateLineBreakdown(line, source, language);
  const account = getAccount(accountId);
  const data = { ...breakdown, source: source.trim() };
  const { slides, altCovers } = renderLineBreakdownToHTML(data, breakdown.hooks, style);

  const outputDir = path.join('output', id);
  fs.mkdirSync(outputDir, { recursive: true });
  for (let i = 0; i < slides.length; i++) {
    await renderHTMLToPNG(slides[i], path.join(outputDir, `slide-${i + 1}.png`));
  }
  const altCoverFiles: string[] = [];
  for (let i = 0; i < altCovers.length; i++) {
    const file = `cover-alt-${i + 1}.png`;
    await renderHTMLToPNG(altCovers[i], path.join(outputDir, file));
    altCoverFiles.push(file);
  }

  const hashtags = [...new Set([...(breakdown.hashtags || []), ...account.hashtags])];
  const caption = `${breakdown.caption}\n\n${hashtags.join(' ')}`;
  fs.writeFileSync(
    path.join(outputDir, 'caption.txt'),
    `${caption}\n\n---\nAccount: ${account.label}\nStyle: ${style}\nBio link: ${bioLink(account)}\nHooks:\n${breakdown.hooks.map((h, i) => `${i + 1}. ${h}`).join('\n')}\n`
  );

  fs.writeFileSync(
    path.join(outputDir, 'metadata.json'),
    JSON.stringify({
      ...breakdown,
      source: data.source,
      originalTopic: line,
      slides: slides.map((_, i) => `slide-${i + 1}.png`),
      altCovers: altCoverFiles,
      caption,
      account: account.id,
      style,
      bioLink: bioLink(account),
      language,
      type: 'line-breakdown',
      createdAt: new Date().toISOString()
    }, null, 2)
  );
  return outputDir;
}
