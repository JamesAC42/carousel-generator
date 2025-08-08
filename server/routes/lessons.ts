import express from 'express';
import fs from 'fs';
import path from 'path';

const router = express.Router();

router.get('/', (req, res) => {
  console.log('[SERVER] 📚 GET /api/lessons - Fetching lessons list');
  const lessons = fs.readdirSync('output').map(id => {
    const metadataPath = path.join('output', id, 'metadata.json');
    if (!fs.existsSync(metadataPath)) return null;
    
    const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
    return {
      id,
      topic: metadata.originalTopic || metadata.title, // Use original topic for polling, fallback to title
      title: metadata.title, // Keep the LLM-generated title for display
      slides: metadata.slides.length,
      language: metadata.language || 'korean', // Include language, default to korean for legacy lessons
      episodeNumber: metadata.episodeNumber || 1, // Include episode number, default to 1 for legacy lessons
      type: metadata.type || 'lesson', // Include type, default to 'lesson' for legacy lessons
      createdAt: metadata.createdAt
    };
  }).filter(Boolean).sort((a, b) => {
    // Sort by newest first (latest createdAt first)
    return new Date(b!.createdAt).getTime() - new Date(a!.createdAt).getTime();
  });
  
  //console.log(`[SERVER] 📚 Returning ${lessons.length} lessons (sorted newest first):`, lessons.map(l => `${l?.topic} (${l?.type})`));
  res.json(lessons);
});

router.get('/:id', (req, res) => {
  const { id } = req.params;
  const metadataPath = path.join('output', id, 'metadata.json');
  
  if (!fs.existsSync(metadataPath)) {
    return res.status(404).json({ error: 'Lesson not found' });
  }
  
  const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
  const slides = metadata.slides.map((_: any, i: number) => `/output/${id}/slide-${i+1}.png`);
  
  res.json({
    id,
    topic: metadata.originalTopic || metadata.title,
    title: metadata.title,
    language: metadata.language || 'korean',
    episodeNumber: metadata.episodeNumber || 1,
    type: metadata.type || 'lesson',
    slides,
    assets: metadata.assets || []
  });
});

export default router;