import express from 'express';
import fs from 'fs';
import path from 'path';
import { generateCheatSheet } from '../utils/llm';
import { renderCheatSheetToHTML } from '../utils/template';
import { renderHTMLToPNG } from '../utils/render';

const router = express.Router();

// Function to sanitize topic names for safe folder names
function sanitizeFolderName(topic: string): string {
  console.log(`[DEBUG] Sanitizing cheat sheet topic: "${topic}"`);
  
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
    sanitized = `cheat-sheet-${timestamp}`;
    console.log(`[DEBUG] Generated fallback ID: ${sanitized}`);
  } else {
    // Add cheat-sheet prefix and limit length to prevent filesystem issues
    sanitized = `cheat-sheet-${sanitized}`;
    if (sanitized.length > 50) {
      sanitized = sanitized.substring(0, 50).replace(/-+$/, '');
    }
    console.log(`[DEBUG] Sanitized to: "${sanitized}"`);
  }
  
  return sanitized;
}

router.post('/', async (req, res) => {
  console.log('[SERVER] 🎯 POST /api/cheat-sheet - Cheat sheet generation request received');
  const { topic } = req.body;
  console.log(`[SERVER] Starting cheat sheet generation for topic: ${topic}`);
  const id = sanitizeFolderName(topic);
  console.log(`[SERVER] Generated ID: ${id}`);
  
  res.status(202).json({ id, status: 'processing' });
  
  try {
    console.log(`[SERVER] Generating cheat sheet for topic: ${topic}`);
    const cheatSheet = await generateCheatSheet(topic);
    
    const outputDir = path.join('output', id);
    console.log(`[SERVER] Creating output directory: ${outputDir}`);
    fs.mkdirSync(outputDir, { recursive: true });
    
    console.log('[SERVER] Rendering cheat sheet slides to HTML...');
    const slidesHTML = renderCheatSheetToHTML(cheatSheet.slides);
    console.log(`[SERVER] Generated ${slidesHTML.length} cheat sheet slides`);
    
    console.log('[SERVER] Converting HTML slides to PNG...');
    for (let i = 0; i < slidesHTML.length; i++) {
      console.log(`[SERVER] Rendering slide ${i+1}/${slidesHTML.length}`);
      await renderHTMLToPNG(slidesHTML[i], path.join(outputDir, `slide-${i+1}.png`));
    }
    
    console.log('[SERVER] Writing metadata...');
    fs.writeFileSync(
      path.join(outputDir, 'metadata.json'),
      JSON.stringify({ 
        ...cheatSheet, 
        originalTopic: topic, // Store the original user input
        language: 'korean', // Cheat sheets are Korean only for now
        type: 'cheat-sheet', // Mark as cheat sheet type
        createdAt: new Date().toISOString() 
      }, null, 2)
    );
    
    console.log(`[SERVER] ✅ Cheat sheet generation completed for topic: ${topic}`);
    
  } catch (error) {
    console.error('[SERVER] ❌ Cheat sheet generation failed:', error);
  }
});

export default router; 