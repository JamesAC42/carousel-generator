import express from 'express';
import fs from 'fs';
import path from 'path';
import { generateSentenceAnalysis } from '../utils/llm';
import { renderSentenceAnalysisToHTML } from '../utils/template';
import { renderHTMLToPNG } from '../utils/render';

const router = express.Router();

function sanitizeId(input: string): string {
  let sanitized = input
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '')
    .replace(/[^\w\u3130-\u318F\u3200-\u32FF\uAC00-\uD7AF\uFF00-\uFFEF\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (sanitized.length < 2) sanitized = `sentence-${Date.now()}`;
  return `sentence-${sanitized}`;
}

router.post('/', async (req, res) => {
  console.log('[SERVER] 🎯 POST /api/sentence-analysis - Request received');
  const { sentence } = req.body;
  if (!sentence || typeof sentence !== 'string') {
    return res.status(400).json({ error: 'Missing sentence' });
  }

  // Send 202 early with a tentative id derived from sentence start
  const tempId = sanitizeId(sentence.slice(0, 40));
  res.status(202).json({ id: tempId, status: 'processing' });

  try {
    const analysis = await generateSentenceAnalysis(sentence);
    const id = analysis?.id ? sanitizeId(analysis.id) : tempId;
    const outputDir = path.join('output', id);
    fs.mkdirSync(outputDir, { recursive: true });

    console.log(`[SERVER] Analysis has ${analysis?.tokens?.length || 0} tokens`);
    const slidesHTML = renderSentenceAnalysisToHTML(analysis);
    console.log(`[SERVER] Generated ${slidesHTML.length} HTML slides, rendering to PNG...`);
    for (let i = 0; i < slidesHTML.length; i++) {
      console.log(`[SERVER] Rendering slide ${i + 1}/${slidesHTML.length} to PNG`);
      await renderHTMLToPNG(slidesHTML[i], path.join(outputDir, `slide-${i + 1}.png`));
    }

    // Persist metadata. Add type flag for client filtering.
    fs.writeFileSync(
      path.join(outputDir, 'metadata.json'),
      JSON.stringify({
        ...analysis,
        originalTopic: analysis?.sentence?.translation?.natural_en || sentence,
        language: 'korean',
        type: 'sentence-analysis',
        createdAt: new Date().toISOString()
      }, null, 2)
    );

    console.log(`[SERVER] ✅ Sentence analysis generated: ${id}`);
  } catch (error) {
    console.error('[SERVER] ❌ Sentence analysis generation failed:', error);
  }
});

// Live preview: render provided JSON to HTML for a specific slide index
router.post('/preview', async (req, res) => {
  try {
    const { analysis, index } = req.body || {};
    if (!analysis || typeof analysis !== 'object') {
      return res.status(400).json({ error: 'Missing analysis JSON' });
    }
    const htmlSlides = renderSentenceAnalysisToHTML(analysis);
    const i = Math.max(0, Math.min(htmlSlides.length - 1, Number(index) || 0));
    let html = htmlSlides[i] || '<html><body>No slides</body></html>';
    // Inject viewport meta and scaling script to fit inside iframe without scrollbars
    try {
      html = html.replace('<head>', '<head><meta name="viewport" content="width=device-width, initial-scale=1" />');
      const fitScript = `
<script>(function(){
  function fit(){
    var targetW=1080, targetH=1350;
    var el=document.body.querySelector('div');
    if(!el) return;
    var scale=Math.min(window.innerWidth/targetW, window.innerHeight/targetH);
    el.style.transformOrigin='center center';
    el.style.transform='scale('+scale+')';
    el.style.width=targetW+'px';
    el.style.height=targetH+'px';
    document.body.style.margin='0';
    document.body.style.padding='0';
    document.body.style.overflow='hidden';
    document.documentElement.style.overflow='hidden';
    document.body.style.display='flex';
    document.body.style.alignItems='center';
    document.body.style.justifyContent='center';
    document.body.style.background='transparent';
    document.body.style.height='100vh';
  }
  window.addEventListener('resize', fit);
  fit();
})();</script>`;
      html = html.replace('</body>', fitScript + '</body>');
    } catch {}
    res.type('text/html').send(html);
  } catch (e) {
    console.error('[SERVER] ❌ Preview render failed:', e);
    res.status(500).json({ error: 'Failed to render preview' });
  }
});

export default router;

