import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || ''
});

function extractJsonFromResponse(content: string): string {
  console.log('[DEBUG] Raw LLM response:', content);
  
  // Try to extract JSON from markdown code blocks
  const jsonMatch = content.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
  if (jsonMatch) {
    console.log('[DEBUG] Found JSON in code blocks');
    return jsonMatch[1];
  }
  
  // Try to find JSON object directly
  const directJsonMatch = content.match(/\{[\s\S]*\}/);
  if (directJsonMatch) {
    console.log('[DEBUG] Found direct JSON');
    return directJsonMatch[0];
  }
  
  console.log('[DEBUG] No JSON found, returning original content');
  return content;
}

export async function generateLesson(topic: string, character: string, language: string = 'korean') {
  const isKorean = language === 'korean';
  const languageName = isKorean ? 'Korean' : 'Japanese';
  const languageNative = isKorean ? '한국어' : '日本語';
  
  const prompt = `SYSTEM
You are a ${languageName} micro-lesson writer for English-speaking beginners.

TASK
Create a self-contained slideshow that teaches ONE clear concept about “${topic}”.

OUTPUT RULES
• Return ONLY valid JSON: no markdown, no comments, no code fences.  
• 5–12 slides total, each 10–20 words max.  
• Final slide is always: “Need more? Use HanbokStudy for vocab and grammar breakdowns!”  
• No slide may repeat information from a previous slide.  
• Do NOT output the words “Concept”, “Example”, or any markdown symbols (* _ # \`).  
• Teach a fact **before** you quiz it.  
• Use 2–3 ${languageName} words with romanization in ( ).  
• Highlight differences in meaning or usage if relevant.

SLIDE TYPES  
1. **HOOK (slide 1)** – ≤12 words, rhetorical Q / contrast / “Stop saying X” Must prepend with "💡 1-Minute Korean: always".  
2. **CONTENT (slides 2-n)** – each introduces exactly one new point (definition, example, nuance).  
3. **QUIZ (optional)** – one fill-in-blank question that tests the point taught **immediately before it**. Follow with an ANSWER slide.  
4. **CTA (final)** – the fixed HanbokStudy line.

JSON SCHEMA  
{
  "title": "<English lesson title>",
  "slides": [
    { "text": "<Hook>" },
    …
    { "text": "Need more? Use HanbokStudy for vocab and grammar breakdowns!" }
  ]
}

THINKING (INTERNAL ONLY)
First craft an outline to ensure logical flow:  
Hook → Point 1 → Point 2 → (Quiz?) → Answer → CTA.  
Then convert to JSON.  
Do NOT reveal the outline or this thought process—only output the JSON.
`;

  console.log('[DEBUG] Sending request to OpenAI...');
  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.7,
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) throw new Error("No response from LLM");
  
  const jsonString = extractJsonFromResponse(content);
  
  try {
    const parsed = JSON.parse(jsonString);
    console.log('[DEBUG] Successfully parsed JSON:', parsed);
    return parsed;
  } catch (parseError) {
    console.error('[DEBUG] JSON parse error:', parseError);
    console.error('[DEBUG] Attempted to parse:', jsonString);
    const errorMessage = parseError instanceof Error ? parseError.message : String(parseError);
    throw new Error(`Invalid JSON response from LLM: ${errorMessage}`);
  }
}

export async function generateCheatSheet(topic: string) {
  const prompt = `You are a Korean vocabulary cheat sheet generator. Create a comprehensive vocabulary list for "${topic}" for English-speaking Korean beginners.

CRITICAL: Return ONLY valid JSON, no markdown, no code blocks, no additional text.

Create a cheat sheet with the following structure:
- TITLE SLIDE: "Korean Vocab of the Day: [Topic] [Emoji]"
- VOCABULARY SLIDES: Alternating pattern of category introduction → vocabulary list
- MAXIMUM 8 SLIDES TOTAL (including title and CTA)
- Each vocabulary list should contain 8-12 items maximum per slide
- Korean text should use Jua font, English should use Fredoka font
- Include romanization for pronunciation help
- END WITH CTA SLIDE: "Follow for more Korean lessons! 📚"

SLIDE STRUCTURE:
1. Title slide with topic
2. Category introduction (e.g., "Basic Foods" or "Weather Words")  
3. Vocabulary grid for that category
4. [Optional] Next category introduction (only if needed and space allows)
5. [Optional] Next vocabulary grid (only if needed and space allows)
6. CTA slide: "Follow for more Korean lessons! 📚"

VOCABULARY FORMAT:
Each vocabulary item should be: {"korean": "한글", "romanization": "romanized", "english": "English"}

CONTENT GUIDELINES:
- Focus on the most essential vocabulary for the topic
- Group related words into logical categories (max 2-3 categories for space)
- Keep each vocabulary slide to 8-12 items for readability
- Use simple, beginner-friendly English translations
- Include practical, commonly used words
- Use proper Korean romanization (Revised Romanization of Korean)
- TOTAL SLIDES MUST BE 8 OR FEWER

Return this exact JSON structure:
{
  "title": "Korean Vocabulary: [Topic]",
  "slides": [
    { "type": "title", "text": "Korean Vocab of the Day: [Topic] [Emoji]" },
    { "type": "category", "text": "[Category Name] [Emoji]" },
    { 
      "type": "vocabulary", 
      "items": [
        {"korean": "한글", "romanization": "romanized", "english": "English [emoji if applicable]"},
        {"korean": "한글", "romanization": "romanized", "english": "English [emoji if applicable]"},
        ...
      ]
    },
    { "type": "category", "text": "[Next Category Name] [Emoji]" },
    { 
      "type": "vocabulary", 
      "items": [
        {"korean": "한글", "romanization": "romanized", "english": "English [emoji if applicable]"},
        ...
      ]
    },
    { "type": "cta", "text": "Follow for more Korean! 📚" }
  ]
}

Example for "Food" (7 slides total):
{
  "title": "Korean Vocabulary: Food",
  "slides": [
    { "type": "title", "text": "Korean Vocab of the Day: Food 🍜" },
    { "type": "category", "text": "Basic Foods 🍚" },
    { 
      "type": "vocabulary", 
      "items": [
        {"korean": "밥", "romanization": "bap", "english": "rice [emoji if applicable]"},
        {"korean": "김치", "romanization": "gimchi", "english": "kimchi"},
        {"korean": "불고기", "romanization": "bulgogi", "english": "bulgogi"},
        {"korean": "비빔밥", "romanization": "bibimbap", "english": "bibimbap"},
        {"korean": "냉면", "romanization": "naengmyeon", "english": "cold noodles"  },
        {"korean": "떡볶이", "romanization": "tteokbokki", "english": "spicy rice cakes"},
        {"korean": "치킨", "romanization": "chikin", "english": "fried chicken"},
        {"korean": "삼겹살", "romanization": "samgyeopsal", "english": "pork belly"}
      ]
    },
    { "type": "category", "text": "Drinks 🍺" },
    { 
      "type": "vocabulary", 
      "items": [
        {"korean": "물", "romanization": "mul", "english": "water"},
        {"korean": "커피", "romanization": "keopi", "english": "coffee"},
        {"korean": "차", "romanization": "cha", "english": "tea"},
        {"korean": "맥주", "romanization": "maekju", "english": "beer"},
        {"korean": "소주", "romanization": "soju", "english": "soju"},
        {"korean": "우유", "romanization": "uyu", "english": "milk"},
        {"korean": "주스", "romanization": "juseu", "english": "juice"},
        {"korean": "콜라", "romanization": "kolla", "english": "cola"}
      ]
    },
    { "type": "cta", "text": "Follow for more Korean lessons! 📚" }
  ]
}
`;

  console.log('[DEBUG] Sending cheat sheet request to OpenAI...');
  const completion = await openai.chat.completions.create({
    model: "o4-mini",
    messages: [{ role: "user", content: prompt }],
    reasoning_effort: "medium"
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) throw new Error("No response from LLM");
  
  const jsonString = extractJsonFromResponse(content);
  
  try {
    const parsed = JSON.parse(jsonString);
    console.log('[DEBUG] Successfully parsed cheat sheet JSON:', parsed);
    return parsed;
  } catch (parseError) {
    console.error('[DEBUG] JSON parse error:', parseError);
    console.error('[DEBUG] Attempted to parse:', jsonString);
    const errorMessage = parseError instanceof Error ? parseError.message : String(parseError);
    throw new Error(`Invalid JSON response from LLM: ${errorMessage}`);
  }
}