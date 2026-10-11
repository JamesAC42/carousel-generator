import express from 'express';
import { buildLineBreakdown, makeLineBreakdownId } from '../utils/lineBreakdownJob';

const router = express.Router();

router.post('/', async (req, res) => {
  const { line, source, language, account, style } = req.body || {};
  if (!line || typeof line !== 'string') {
    return res.status(400).json({ error: 'Missing line' });
  }

  const id = makeLineBreakdownId(line);
  res.status(202).json({ id, status: 'processing' });

  try {
    await buildLineBreakdown(id, { line, source, language, account, style });
    console.log(`[SERVER] ✅ Line breakdown generated: ${id}`);
  } catch (error) {
    console.error('[SERVER] ❌ Line breakdown generation failed:', error);
  }
});

export default router;
