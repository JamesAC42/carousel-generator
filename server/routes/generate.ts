import express from 'express';
import fs from 'fs';
import path from 'path';
import { generateLesson } from '../utils/llm';
import { renderSlidesToHTML } from '../utils/template';
import { renderHTMLToPNG } from '../utils/render';

const router = express.Router();

// Function to sanitize topic names for safe folder names
function sanitizeFolderName(topic: string): string {
  console.log(`[DEBUG] Sanitizing topic: "${topic}"`);
  
  // Remove or replace unsafe characters for filesystem
  let sanitized = topic
    .trim()
    // Replace spaces and common punctuation with hyphens
    .replace(/[\s\-_]+/g, '-')
    // Remove characters that are unsafe for folders
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '')
    // Remove extra punctuation but keep Korean/Japanese/unicode chars
    .replace(/[^\w\u3130-\u318F\u3200-\u32FF\uAC00-\uD7AF\uFF00-\uFFEF\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\-]/g, '')
    // Clean up multiple hyphens
    .replace(/-+/g, '-')
    // Remove leading/trailing hyphens
    .replace(/^-+|-+$/g, '');

  // If the result is empty or too short, generate a fallback
  if (sanitized.length < 2) {
    const timestamp = Date.now();
    sanitized = `lesson-${timestamp}`;
    console.log(`[DEBUG] Generated fallback ID: ${sanitized}`);
  } else {
    // Limit length to prevent filesystem issues
    if (sanitized.length > 50) {
      sanitized = sanitized.substring(0, 50).replace(/-+$/, '');
    }
    console.log(`[DEBUG] Sanitized to: "${sanitized}"`);
  }
  
  return sanitized;
}

// Get available languages
router.get('/languages', (req, res) => {
  console.log('[SERVER] 🌐 GET /api/generate/languages - Fetching available languages');
  try {
    const languages = [
      { id: 'korean', name: 'Korean', flag: '🇰🇷' },
      { id: 'japanese', name: 'Japanese', flag: '🇯🇵' }
    ];
    
    console.log(`[SERVER] 🌐 Available languages:`, languages.map(l => l.name));
    res.json(languages);
  } catch (error) {
    console.error('[SERVER] ❌ Error fetching languages:', error);
    res.status(500).json({ error: 'Failed to fetch languages' });
  }
});

router.post('/', async (req, res) => {
  console.log('[SERVER] 🎯 POST /api/generate - Generation request received');
  const { topic, language = 'korean'} = req.body;
  console.log(`[SERVER] Starting generation for topic: ${topic}, language: ${language}`);
  const id = sanitizeFolderName(topic);
  console.log(`[SERVER] Generated ID: ${id}`);
  
  res.status(202).json({ id, status: 'processing' });
  
  try {
    console.log(`[SERVER] Generating lesson for language: ${language}`);
    const lesson = await generateLesson(topic, '', language); // Empty string for character since we don't use it
    
    const outputDir = path.join('output', id);
    console.log(`[SERVER] Creating output directory: ${outputDir}`);
    fs.mkdirSync(outputDir, { recursive: true });
    
    console.log('[SERVER] Rendering slides to HTML...');
    const slidesHTML = renderSlidesToHTML(lesson.slides);
    console.log(`[SERVER] Generated ${slidesHTML.length} slides`);
    
    console.log('[SERVER] Converting HTML slides to PNG...');
    for (let i = 0; i < slidesHTML.length; i++) {
      console.log(`[SERVER] Rendering slide ${i+1}/${slidesHTML.length}`);
      await renderHTMLToPNG(slidesHTML[i], path.join(outputDir, `slide-${i+1}.png`));
    }
    
    console.log('[SERVER] Writing metadata...');
    fs.writeFileSync(
      path.join(outputDir, 'metadata.json'),
      JSON.stringify({ 
        ...lesson, 
        originalTopic: topic, // Store the original user input
        language: language, // Store the language
        createdAt: new Date().toISOString() 
      }, null, 2)
    );
    
    console.log(`[SERVER] ✅ Generation completed for topic: ${topic}`);
    
  } catch (error) {
    console.error('[SERVER] ❌ Generation failed:', error);
  }
});

export default router;