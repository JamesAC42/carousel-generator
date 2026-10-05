import express from 'express';
import fs from 'fs';
import path from 'path';
import { generateLineBreakdown } from '../utils/llm';
import { renderLineBreakdownToHTML } from '../utils/template';
import { renderHTMLToPNG } from '../utils/render';
import { getAccount, bioLink } from '../../shared/accounts';
import { LINE_BREAKDOWN_STYLES, LineBreakdownStyle } from '../../shared/templates/lineBreakdown';

const router = express.Router();

function makeId(line: string): string {
  const slug = line
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w㄰-㆏가-힯぀-ゟ゠-ヿ一-龯\-]/g, '')
    .slice(0, 30)
    .replace(/^-+|-+$/g, '');
  return `line-${slug || 'x'}-${Date.now()}`;
}

// "rotate" picks the style used least so far, so an A/B test across styles stays even.
function leastUsedStyle(): LineBreakdownStyle {
  const counts = Object.fromEntries(LINE_BREAKDOWN_STYLES.map(s => [s, 0])) as Record<LineBreakdownStyle, number>;
  if (fs.existsSync('output')) {
    for (const dir of fs.readdirSync('output')) {
      const metadataPath = path.join('output', dir, 'metadata.json');
      if (!fs.existsSync(metadataPath)) continue;
      try {
        const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
        if (metadata.type === 'line-breakdown' && metadata.style in counts) counts[metadata.style as LineBreakdownStyle]++;
      } catch {}
    }
  }
  return LINE_BREAKDOWN_STYLES.reduce((min, s) => (counts[s] < counts[min] ? s : min));
}

router.post('/', async (req, res) => {
  const { line, source = '', language = 'korean', account: accountId, style: requestedStyle } = req.body || {};
  if (!line || typeof line !== 'string') {
    return res.status(400).json({ error: 'Missing line' });
  }

  const style: LineBreakdownStyle = LINE_BREAKDOWN_STYLES.includes(requestedStyle) ? requestedStyle : leastUsedStyle();
  const id = makeId(line);
  res.status(202).json({ id, status: 'processing' });

  try {
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
    console.log(`[SERVER] ✅ Line breakdown generated: ${id}`);
  } catch (error) {
    console.error('[SERVER] ❌ Line breakdown generation failed:', error);
  }
});

export default router;
