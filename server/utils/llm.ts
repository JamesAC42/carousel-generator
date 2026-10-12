import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Ensure .env is loaded BEFORE reading process.env, even when this file is imported early
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

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
1. **HOOK (slide 1)** – ≤12 words, rhetorical Q / contrast / “Stop saying X” Must prepend with "💡 1-Minute Korean:".  
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
    model: "gpt-5",
    messages: [{ role: "user", content: prompt }],
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


export async function generateSentenceAnalysis(sentence: string) {
  const prompt = `You are a Korean linguistics tutor who produces rigorous sentence breakdowns for beginners.

CRITICAL OUTPUT RULES:
- Return ONLY valid JSON. No markdown, no comments, no code fences.
- Follow the schema exactly. Keys must exist and be lowercase as shown.
- Provide concise, accurate romanization (Revised Romanization).

INPUT SENTENCE:
${sentence}

REQUIRED JSON SCHEMA:
{
  "version": "1.0",
  "id": "a-kebab-case-id-based-on-english-translation-or-topic",
  "language": "korean",
  "topic": "A short concept label (e.g., connector, tense, particle focus)",
  "sentence": {
    "hangul": "<original sentence>",
    "romanization": "<romanization>",
    "translation": {
      "natural_en": "<natural English>",
      "literal_en": "<literal gloss order>"
    }
  },
  "tokens": [
    {
      "surface": "<orthographic form>",
      "romanization": "<romanized>",
      "lemma": "<dictionary form>",
      "pos": "<UPOS or simple POS>",
      "role": "<semantic/syntactic role>",
      "morphology": {"...": "optional details"},
      "gloss_en": "<short gloss>",
      "notes": "<optional teaching note>"
    }
  ],
  "chunks": [
    {
      "label": "<short-label>",
      "hangul": "<substring>",
      "romanization": "<romanized>",
      "function": "<clause function>",
      "translation_en": "<english>"
    }
  ],
  "quiz": {
    "prompt_en": "<fill-in-blank or short Q>",
    "answer_hangul": "<answer>",
    "answer_romanization": "<romanized>",
    "explanation_en": "<short why>"
  },
  "slides": [
    {"type": "translation", "text": "<natural_en>", "highlight": {"chunk": "<chunk label>"}},
    {"type": "analysis", "text": "<point>", "highlight": {"token_index": 0}},
    {"type": "quiz", "text": "<prompt>", "answer": "<short answer>", "cta": "Full breakdown on Hanbok"}
  ],
  "render_hints": {
    "theme": "notebook_dark_overlay",
    "primary_color": "#F2C14E",
    "secondary_color": "#8FA3BF",
    "font_scale": 1.0,
    "highlight_map": {
      "subject": "#F2C14E",
      "connector": "#7AD3A8",
      "destination": "#8FA3BF",
      "verb": "#E58888"
    }
  },
  "created_at": "<ISO timestamp>"
}

Ensure tokens and chunks correspond to the input sentence. Keep explanations short and beginner-friendly.`;

  console.log('[DEBUG] Sending sentence analysis request to OpenAI...');
  const completion = await openai.chat.completions.create({
    model: "gpt-5",
    messages: [{ role: "user", content: prompt }],
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) throw new Error("No response from LLM");

  const jsonString = extractJsonFromResponse(content);

  try {
    const parsed = JSON.parse(jsonString);
    console.log('[DEBUG] Successfully parsed sentence analysis JSON:', parsed);
    return parsed;
  } catch (parseError) {
    console.error('[DEBUG] JSON parse error (sentence analysis):', parseError);
    console.error('[DEBUG] Attempted to parse:', jsonString);
    const errorMessage = parseError instanceof Error ? parseError.message : String(parseError);
    throw new Error(`Invalid JSON response from LLM: ${errorMessage}`);
  }
}
export interface LineBreakdown {
  title: string;
  hooks: string[];
  line: {
    native: string;
    romanization: string;
    common_translation: string;
    literal: string;
    natural: string;
  };
  parts: { native: string; romanization: string; meaning: string; note?: string }[];
  nuance: string;
  use_it: { native: string; romanization: string; english: string };
  quiz?: { options: string[]; answer: number };
  context?: string;
  caption: string;
  hashtags: string[];
}

export async function generateLineBreakdown(line: string, source: string, language: string = 'korean'): Promise<LineBreakdown> {
  const languageName = language === 'japanese' ? 'Japanese' : 'Korean';
  const romanizationName = language === 'japanese' ? 'Hepburn romaji' : 'Revised Romanization';

  const prompt = `You write "what they actually said" TikTok carousels: one real ${languageName} line from a show, song or meme, broken down so an English-speaking learner understands every part.

LINE: ${line}
SOURCE: ${source || 'unknown'}

RULES
- Return ONLY valid JSON matching the schema. No markdown, no code fences.
- Be accurate. If you are unsure of the source context, describe the line generically instead of inventing plot details.
- "common_translation" is the short, flattened English a subtitle would typically give. Do not claim it is the official subtitle.
- "nuance" explains what that translation loses (tone, politeness level, slang, wordplay). If nothing is lost, explain the most interesting grammar instead. Max 14 words, conversational.
- "context": the everyday situation someone says this in, max 9 words, no plot details (e.g. "When a friend keeps making excuses").
- "parts" splits the line, in order, into 2 or 3 meaningful chunks (word + particle or ending together). Together they must cover the whole line. Each part becomes its own slide.
- Romanization uses ${romanizationName}.
- "hooks": 3 different first-slide hooks, each at most 7 words, each a different angle. Wrap the one or two words that matter most in *asterisks* (they get highlighted):
  1. the translation misses something ("Subtitles got this line *wrong*")
  2. curiosity about the source ("What [character/artist] really said here")
  3. a learner pain ("You've heard this 100 times. Here's what it means")
  Mention the source by name when known. No emoji. No clickbait about drama/plot spoilers.
- "use_it": one everyday sentence that reuses the line's key word or pattern.
- "quiz": a guess-the-meaning poll for slide 2. "options" are exactly 3 short English answers (max 7 words each): the real meaning, the flattened subtitle-style reading, and one funny but plausible wrong guess, in a shuffled order. "answer" is the index of the real meaning, which must say the same thing as "line.natural".
- "caption": at most 150 characters, ends with a question that invites comments (e.g. which line to break down next).
- "hashtags": 3 to 5 specific tags about the source (e.g. the show or group name), no generic ones.

SCHEMA
{
  "title": "<short English title>",
  "hooks": ["<hook 1>", "<hook 2>", "<hook 3>"],
  "line": {
    "native": "<the line in ${languageName} script>",
    "romanization": "<romanization>",
    "common_translation": "<flattened subtitle-style English>",
    "literal": "<word-by-word gloss>",
    "natural": "<what it really conveys, natural English>"
  },
  "parts": [
    { "native": "<chunk>", "romanization": "<romanized>", "meaning": "<short gloss, max 4 words>", "note": "<optional, max 8 words, casual tone>" }
  ],
  "nuance": "<max 14 words>",
  "context": "<max 9 words>",
  "use_it": { "native": "<sentence>", "romanization": "<romanized>", "english": "<english>" },
  "quiz": { "options": ["<a>", "<b>", "<c>"], "answer": <0-2> },
  "caption": "<caption>",
  "hashtags": ["#tag"]
}`;

  const completion = await openai.chat.completions.create({
    model: "gpt-5",
    messages: [{ role: "user", content: prompt }],
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) throw new Error("No response from LLM");

  const parsed = JSON.parse(extractJsonFromResponse(content));
  if (!parsed?.line?.native || !Array.isArray(parsed.parts) || !Array.isArray(parsed.hooks) || parsed.hooks.length === 0) {
    throw new Error('Line breakdown JSON is missing required fields');
  }
  return parsed;
}

// Topic lessons for the Bright Path carousels (shared/templates/lessonCarousel.tsx).
// Korean only for now: the hooks, quizzes and politeness levels are written for Korean.
const LESSON_COMMON = `RULES FOR EVERY FIELD
- Return ONLY valid JSON matching the schema. No markdown, no code fences.
- Each slide is read in about two seconds, so obey every word limit. Plain English, no grammar jargon (say "talking about someone else", not "third-person desiderative").
- Korean must be natural, everyday and correct. Romanization uses Revised Romanization.
- "hooks": 3 cover hooks, each at most 7 words, each a different angle (given below). Wrap the one or two words that matter most in *asterisks*; they get highlighted. No emoji.
- "caption": at most 150 characters, ends with a question that invites comments.
- "hashtags": 3 to 5 specific tags (e.g. #koreangrammar, #learnkorean), lowercase.`;

const VS_PROMPT = (topic: string) => `You write "don't confuse these two" TikTok carousels for English-speaking beginners learning Korean.

TOPIC: ${topic}

The topic names two Korean words, endings or expressions that learners mix up. If it names only one, pair it with the one learners most often confuse it with. "a" and "b" are those two, in the order the topic gives them.

${LESSON_COMMON}
- "native" is the form learners look up (e.g. "-고 싶다", "은/는", "알다"), "meaning" at most 5 words, "when" at most 10 words saying when you use it, "emoji" one emoji for the idea.
- "example": an everyday sentence of at most 7 Korean words that uses it, with natural English.
- "rule": the one-line trick that tells them apart, at most 12 words.
- "quiz": a situation where only one of the two fits. "situation" at most 9 English words (e.g. "Texting your best friend after a month apart"). "sentence" is the Korean sentence with the word replaced by "___" (at most 7 words); "fill" is exactly the text that goes in the blank, conjugated as in the full sentence (e.g. sentence "영화 ___." and fill "보고 싶어요"); "english" is what it means; "answer" is 0 for a, 1 for b; "why" at most 14 words.
- "round2": another situation, where the OTHER one fits (its answer differs from quiz.answer). Same fields, no "why".
- Check both blanks: sentence with fill must be a correct, natural Korean sentence.
- Hook angles: 1. the mistake ("Stop mixing up *these two*"), 2. sounding fluent ("This is how Koreans *spot a beginner*"), 3. curiosity ("They look the same. *They're not.*").
- The caption asks which pair to do next.

SCHEMA
{
  "title": "<short English title>",
  "hooks": ["<hook 1>", "<hook 2>", "<hook 3>"],
  "a": { "native": "", "romanization": "", "meaning": "", "when": "", "emoji": "", "example": { "native": "", "romanization": "", "english": "" } },
  "b": { "native": "", "romanization": "", "meaning": "", "when": "", "emoji": "", "example": { "native": "", "romanization": "", "english": "" } },
  "rule": "",
  "quiz": { "situation": "", "sentence": "", "fill": "", "english": "", "answer": 0, "why": "" },
  "round2": { "situation": "", "sentence": "", "fill": "", "english": "", "answer": 1 },
  "caption": "",
  "hashtags": ["#tag"]
}`;

const PHRASE_PROMPT = (topic: string) => `You write "how to say it in Korean" TikTok carousels for English-speaking beginners.

TOPIC: ${topic}

The topic is an everyday English phrase or situation (e.g. "I'm full", "Let's eat", "Excuse me" to get a waiter's attention), or a Korean phrase to explain.

${LESSON_COMMON}
- "english": the English phrase, at most 5 words.
- "phrase": how Koreans actually say it day to day, in polite 해요 speech unless the phrase is inherently casual. "literal" is a word-for-word gloss, at most 8 words.
- "quiz": the slide asks "How do Koreans say '<english>'?". "options" are exactly 3 Korean answers: the natural phrase, a stiff word-for-word translation learners would make, and a real Korean phrase that means something funny and different. Shuffle them. "answer" is the index of the natural one. "why" at most 14 words.
- "parts": 2 or 3 chunks that together make up the phrase, each "meaning" at most 4 words.
- "levels": exactly 3 versions by who you're talking to, in this order: "Friends", "Most people", "Boss or elders". One of them must be exactly phrase.native.
- "chat": a tiny everyday exchange, at most 7 Korean words each: "them" says something, "you" answer with the phrase.
- Hook angles: 1. the real version ("How Koreans *actually* say 'I'm full'"), 2. the mistake ("Don't say 'I'm full' *like a textbook*"), 3. usefulness ("You'll say this *every day* in Korea").
- The caption asks which phrase to teach next.

SCHEMA
{
  "title": "<short English title>",
  "hooks": ["<hook 1>", "<hook 2>", "<hook 3>"],
  "english": "",
  "phrase": { "native": "", "romanization": "", "literal": "" },
  "quiz": { "options": [{ "native": "", "romanization": "" }], "answer": 0, "why": "" },
  "parts": [{ "native": "", "romanization": "", "meaning": "" }],
  "levels": [{ "who": "Friends", "native": "", "romanization": "" }],
  "chat": { "them": { "native": "", "romanization": "", "english": "" }, "you": { "native": "", "romanization": "", "english": "" } },
  "caption": "",
  "hashtags": ["#tag"]
}`;

export async function generateTopicLesson(type: 'vs' | 'phrase', topic: string): Promise<any> {
  const completion = await openai.chat.completions.create({
    model: "gpt-5",
    messages: [{ role: "user", content: type === 'vs' ? VS_PROMPT(topic) : PHRASE_PROMPT(topic) }],
  });
  const content = completion.choices[0]?.message?.content;
  if (!content) throw new Error("No response from LLM");

  const parsed = JSON.parse(extractJsonFromResponse(content));
  const ok = Array.isArray(parsed?.hooks) && parsed.hooks.length > 0 && parsed.quiz && (type === 'vs'
    ? parsed.a?.native && parsed.b?.native && parsed.round2 && /_{2,}/.test(parsed.quiz.sentence || '') && /_{2,}/.test(parsed.round2.sentence || '')
    : parsed.phrase?.native && Array.isArray(parsed.quiz.options) && parsed.quiz.options.length >= 2 && Array.isArray(parsed.parts) && Array.isArray(parsed.levels) && parsed.chat?.you);
  if (!ok) throw new Error(`${type} lesson JSON is missing required fields`);
  return { ...parsed, type };
}
