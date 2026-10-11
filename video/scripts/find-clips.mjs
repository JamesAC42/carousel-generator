// Finds lesson clips without anyone hunting for them: it reads the Korean subtitles of YouTube
// videos (official scene clips, "명대사" compilations), has an LLM pick the lines worth a lesson,
// and downloads the chosen scene with its timings, ready for `npm run lesson`.
//
//   node scripts/find-clips.mjs mine "<search words or a channel/playlist/video URL>" [--max 12]
//   node scripts/find-clips.mjs line "<Korean line>" [--show "Squid Game"] [--max 8]
//   node scripts/find-clips.mjs take <candidate number>
//   node scripts/find-clips.mjs used "<Korean line>"
//
// mine: lists up to --max videos, reads their Korean subtitles (the show's own, else YouTube's
//   automatic ones) and asks MINER_MODEL for the best lines by LINE_RULES below. The ranked list
//   goes to clips/candidates.json and is printed.
// line: looks for a video where a given line is said (when you already know the line you want).
// take: downloads candidate N's scene (about 8 to 20 seconds around the line, plus English
//   subtitles when the video has them) into clips/<slug>/ and prints the next two commands.
// used: marks a line as posted, so mine and line skip it from then on (take does this too).
//
// --subs-dir <dir> mines .vtt files you already have instead of searching YouTube (one file per
// video, named <video id>.ko.vtt, with <video id>.en.vtt alongside when there is one).
//
// Needs yt-dlp and ffmpeg on the PATH, and GEMINI_API_KEY (MINER_MODEL defaults to
// gemini-3.8-flash). If YouTube asks yt-dlp to sign in ("confirm you're not a bot"), put extra yt-dlp
// arguments such as `--cookies /path/to/cookies.txt` in YTDLP_ARGS.
import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { pathToFileURL } from 'url';
import './env.mjs';

const MODEL = process.env.MINER_MODEL || 'gemini-3.8-flash';
const DIR = 'clips';
const CANDIDATES = path.join(DIR, 'candidates.json');
const USED = path.join(DIR, 'used.json');
const EXTRA = (process.env.YTDLP_ARGS || '').split(/\s+/).filter(Boolean);

// What makes a line worth a video. Shared with video/AGENTS.md; keep the two in step.
export const LINE_RULES = `A good line:
- Is a memorable moment people quote or react to: a confession, a threat, a betrayal, a comeback, a running joke, a line that went viral.
- Has something the English subtitle misses: an ending that changes the meaning (잖아, 거든, 네, 군, 더라, 걸), a switch between 반말 and 존댓말, a title used as a weapon or a flirt (형, 누나, 선배, 아저씨 in a non-literal way), slang or a newer coinage, an idiom, wordplay, or a cultural idea (눈치, 정, 한, 체면, 빨리빨리).
- Is short: about 3 to 15 syllables, said clearly by one speaker, not talked over.
- Makes sense from the scene alone, without having seen the show.
Never pick:
- Beginner words or stock phrases on their own: 오빠, 사랑해, 안녕하세요, 감사합니다, 대박, 진짜, 아이고, 화이팅, 미안해, 괜찮아, 맛있다, 뭐야, 어떡해, 잠깐만. They're fine only inside a line where something else carries the lesson.
- Song lyrics sung over music, narration, or anything mumbled or overlapped.`;

const [command, ...rest] = process.argv.slice(2);
const option = (name, fallback) => {
  const i = rest.indexOf(name);
  return i >= 0 ? rest.splice(i, 2)[1] : fallback;
};

fs.mkdirSync(DIR, { recursive: true });
const readJson = (file, fallback) => (fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : fallback);
const normalize = text => text.replace(/[^\p{L}\p{N}]/gu, '');
const usedLines = () => new Set(readJson(USED, []).map(u => normalize(u.line)));

function ytdlp(args, opts = {}) {
  return execFileSync('yt-dlp', [...EXTRA, ...args], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'], ...opts });
}

// ---- subtitles ----

function seconds(stamp) {
  return stamp.replace(',', '.').split(':').reduce((total, part) => total * 60 + Number(part), 0);
}

// Cues from a WebVTT file. YouTube's automatic captions repeat each line as it scrolls up, with
// word timing tags; this keeps each piece of text once, timed from when it first appears.
export function parseVtt(text) {
  const cues = [];
  for (const block of text.replace(/\r/g, '').split(/\n\n+/)) {
    const lines = block.split('\n');
    const at = lines.findIndex(l => l.includes('-->'));
    if (at < 0) continue;
    const [start, end] = lines[at].split('-->').map(s => seconds(s.trim().split(/\s+/)[0]));
    const body = lines.slice(at + 1).map(l => l.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').trim()).filter(Boolean);
    if (!body.length) continue;
    for (const line of body) {
      const last = cues[cues.length - 1];
      if (last && last.text === line) { last.end = Math.max(last.end, end); continue; }
      if (cues.slice(-3).some(c => c.text === line)) continue;
      cues.push({ start, end, text: line });
    }
  }
  // Rolling captions overlap; end each cue no later than the next one starts (but keep it visible).
  cues.forEach((c, i) => { const next = cues[i + 1]; if (next && next.start > c.start) c.end = Math.min(c.end, Math.max(next.start, c.start + 0.8)); });
  return cues;
}

export function toSrt(cues, offset, until) {
  const stamp = s => {
    const ms = Math.max(0, Math.round(s * 1000));
    const pad = (n, w = 2) => String(n).padStart(w, '0');
    return `${pad(Math.floor(ms / 3600000))}:${pad(Math.floor(ms / 60000) % 60)}:${pad(Math.floor(ms / 1000) % 60)},${pad(ms % 1000, 3)}`;
  };
  return cues.filter(c => c.end > offset && c.start < until)
    .map((c, i) => `${i + 1}\n${stamp(c.start - offset)} --> ${stamp(Math.min(c.end, until) - offset)}\n${c.text}\n`).join('\n');
}

// Downloads a video's Korean and English subtitles into dir; returns their paths (or undefined).
function fetchSubs(url, id, dir) {
  try {
    ytdlp(['--skip-download', '--write-subs', '--write-auto-subs', '--sub-langs', 'ko,en', '--sub-format', 'vtt', '-o', path.join(dir, '%(id)s.%(ext)s'), url]);
  } catch (err) {
    console.warn(`  no subtitles for ${id}: ${String(err.stderr || err.message).trim().split('\n').pop()}`);
  }
  const file = lang => fs.readdirSync(dir).map(f => path.join(dir, f)).find(f => path.basename(f).startsWith(`${id}.${lang}`) && f.endsWith('.vtt'));
  return { ko: file('ko'), en: file('en') };
}

// ---- finding videos ----

function listVideos(source, max) {
  const target = /^https?:\/\//.test(source) ? source : `ytsearch${max}:${source}`;
  const out = JSON.parse(ytdlp(['--flat-playlist', '-J', '--playlist-end', String(max), target]));
  const entries = out.entries ?? [out];
  return entries.filter(e => e?.id && (!e.duration || (e.duration >= 20 && e.duration <= 1800)))
    .map(e => ({ id: e.id, title: e.title || '', channel: e.channel || e.uploader || '', url: e.url?.startsWith('http') ? e.url : `https://www.youtube.com/watch?v=${e.id}` }));
}

function videosFromSubsDir(dir) {
  return fs.readdirSync(dir).filter(f => /\.ko[^.]*\.vtt$/.test(f)).map(f => {
    const id = f.split('.')[0];
    const en = fs.readdirSync(dir).find(g => g.startsWith(`${id}.en`) && g.endsWith('.vtt'));
    return { id, title: id, channel: '', url: `https://www.youtube.com/watch?v=${id}`, subs: { ko: path.join(dir, f), en: en && path.join(dir, en) } };
  });
}

// ---- the LLM ----

async function ask(prompt, schema) {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY || 'placeholder' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json', responseSchema: schema, temperature: 0.4 }
    })
  });
  if (!res.ok) throw new Error(`${MODEL} ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return JSON.parse(data.candidates?.[0]?.content?.parts?.filter(p => !p.thought).map(p => p.text || '').join('') || '{}');
}

const PICK_SCHEMA = {
  type: 'object',
  properties: {
    picks: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          video: { type: 'integer' },
          lineFrom: { type: 'integer' },
          lineTo: { type: 'integer' },
          contextFrom: { type: 'integer' },
          line: { type: 'string' },
          source: { type: 'string' },
          context: { type: 'string' },
          why: { type: 'string' },
          score: { type: 'integer' }
        },
        required: ['video', 'lineFrom', 'lineTo', 'contextFrom', 'line', 'source', 'context', 'why', 'score']
      }
    }
  },
  required: ['picks']
};

async function pickLines(videos, wanted) {
  const used = usedLines();
  const transcripts = videos.map((v, i) => `### VIDEO ${i}: "${v.title}" (channel: ${v.channel || 'unknown'})\n` +
    v.cues.map((c, j) => `[${j}] ${c.start.toFixed(1)}s ${c.text}`).join('\n')).join('\n\n');
  const prompt = `You pick Korean lines for short "learn Korean from shows" videos. Each video is the show's own scene (8 to 20 seconds of context ending on the line), then a 30-second explanation of the line. The goal is views and comments, so the line has to be a moment people care about.

${LINE_RULES}

Below are Korean subtitle transcripts, one per YouTube video, as numbered cues with start times. Pick up to ${wanted} lines across all of them, best first. For each:
- video: the VIDEO number.
- lineFrom, lineTo: the first and last cue number of the line itself (often the same cue).
- contextFrom: the cue where the clip should start: a natural start of the exchange, 8 to 20 seconds before the line's end. Never earlier than 20 seconds before it.
- line: the line exactly as in those cues, fixing only obvious automatic-caption spelling mistakes.
- source: the show, film or program in English, only if the video title or channel says which it is; otherwise "".
- context: one sentence of who says it to whom and what's happening, using only what the transcript and title show. Don't guess plot details.
- why: one short sentence on what the lesson would be (what the subtitle misses).
- score: 1 to 10, how well it fits the rules above.
Skip these lines, already posted: ${[...used].slice(-200).join(', ') || 'none'}.
If nothing fits, return no picks rather than a weak one.

${transcripts}`;
  const { picks = [] } = await ask(prompt, PICK_SCHEMA);
  return picks
    .filter(p => videos[p.video]?.cues[p.lineFrom] && videos[p.video].cues[p.lineTo] && !used.has(normalize(p.line)))
    .map(p => {
      const v = videos[p.video];
      const lineStart = v.cues[p.lineFrom].start;
      const lineEnd = v.cues[Math.max(p.lineFrom, p.lineTo)].end;
      const contextStart = v.cues[Math.min(p.contextFrom, p.lineFrom)]?.start ?? lineStart;
      return {
        url: v.url, title: v.title, channel: v.channel, line: p.line, source: p.source, context: p.context, why: p.why, score: p.score,
        // Clamp the context to 8 to 20 seconds before the line ends, and run on a little after it.
        clipStart: Math.max(0, Math.min(lineEnd - 8, Math.max(contextStart, lineEnd - 20)) - 0.3),
        clipEnd: lineEnd + 2,
        lineStart: Math.max(0, lineStart - 0.2),
        lineEnd: lineEnd + 0.2,
        subs: v.subs
      };
    })
    .sort((a, b) => b.score - a.score);
}

// ---- commands ----

async function gather(videos, work) {
  const withSubs = [];
  for (const v of videos) {
    const subs = v.subs ?? fetchSubs(v.url, v.id, work);
    if (!subs.ko) continue;
    const cues = parseVtt(fs.readFileSync(subs.ko, 'utf8'));
    if (cues.length < 3) continue;
    // Keep the subtitle files with the candidates, so take can cut English subtitles later.
    const keep = Object.fromEntries(Object.entries(subs).filter(([, f]) => f).map(([lang, f]) => {
      const to = path.join(DIR, 'subs', path.basename(f));
      fs.mkdirSync(path.dirname(to), { recursive: true });
      if (path.resolve(f) !== path.resolve(to)) fs.copyFileSync(f, to);
      return [lang, to];
    }));
    withSubs.push({ ...v, subs: keep, cues });
    console.log(`  ${v.id}  ${cues.length} cues  ${v.title}`);
  }
  return withSubs;
}

function show(candidates) {
  candidates.forEach((c, i) => {
    console.log(`\n${i + 1}. ${c.line}   (${c.score}/10${c.source ? `, ${c.source}` : ''})`);
    console.log(`   ${c.why}`);
    console.log(`   ${c.context}`);
    console.log(`   ${c.url}&t=${Math.floor(c.lineStart)}  line at ${c.lineStart.toFixed(1)}s, clip ${c.clipStart.toFixed(1)} to ${c.clipEnd.toFixed(1)}s`);
  });
  console.log(`\nSaved ${CANDIDATES}. Download one with: node scripts/find-clips.mjs take <number>`);
}

function markUsed(line, url) {
  const used = readJson(USED, []);
  if (!used.some(u => normalize(u.line) === normalize(line))) used.push({ line, url, at: new Date().toISOString() });
  fs.writeFileSync(USED, JSON.stringify(used, null, 2));
}

async function main() {
  const work = fs.mkdtempSync(path.join(os.tmpdir(), 'clips-'));
  try {
    if (command === 'mine') {
      const max = Number(option('--max', 12));
      const subsDir = option('--subs-dir');
      const [source] = rest;
      if (!source && !subsDir) throw new Error('usage: find-clips.mjs mine "<search words or URL>" [--max 12] [--subs-dir dir]');
      const videos = subsDir ? videosFromSubsDir(subsDir) : listVideos(source, max);
      if (!videos.length) throw new Error('yt-dlp found no videos. Check that this machine can reach YouTube (if it asks for a sign-in, pass cookies through YTDLP_ARGS).');
      console.log(`Reading subtitles of ${videos.length} videos...`);
      const ready = await gather(videos, work);
      if (!ready.length) throw new Error('None of those videos has Korean subtitles. Try other search words (add 명장면 or 명대사).');
      // Long compilations can be big; keep the prompt to a sane size by mining in batches.
      let candidates = [];
      for (let i = 0; i < ready.length; i += 6) candidates.push(...await pickLines(ready.slice(i, i + 6), 8));
      candidates = candidates.sort((a, b) => b.score - a.score).slice(0, 15);
      fs.writeFileSync(CANDIDATES, JSON.stringify(candidates, null, 2));
      show(candidates);
    } else if (command === 'line') {
      const show_ = option('--show', '');
      const max = Number(option('--max', 8));
      const [line] = rest;
      if (!line) throw new Error('usage: find-clips.mjs line "<Korean line>" [--show name]');
      const ready = await gather(listVideos(`${show_} ${line}`.trim(), max), work);
      const target = normalize(line);
      const candidates = [];
      for (const v of ready) {
        // The line can span two cues; look in each cue joined with the next.
        v.cues.forEach((c, j) => {
          const next = v.cues[j + 1];
          const joined = normalize(c.text + (next?.text ?? ''));
          if (!joined.includes(target) && !normalize(c.text).includes(target)) return;
          const inOne = normalize(c.text).includes(target);
          const lineEnd = inOne ? c.end : next.end;
          candidates.push({
            url: v.url, title: v.title, channel: v.channel, line, source: show_, context: '', why: 'Matched the line in the subtitles.', score: inOne ? 10 : 8,
            clipStart: Math.max(0, lineEnd - 15), clipEnd: lineEnd + 2, lineStart: Math.max(0, c.start - 0.2), lineEnd: lineEnd + 0.2, subs: v.subs
          });
        });
      }
      if (!candidates.length) throw new Error(`No video with "${line}" in its Korean subtitles. Try mine with the show's name instead.`);
      fs.writeFileSync(CANDIDATES, JSON.stringify(candidates.slice(0, 15), null, 2));
      show(candidates.slice(0, 15));
    } else if (command === 'take') {
      const n = Number(rest[0]);
      const c = readJson(CANDIDATES, [])[n - 1];
      if (!c) throw new Error(`No candidate ${rest[0]} in ${CANDIDATES}. Run mine or line first.`);
      const slug = `${new Date().toISOString().slice(0, 10)}-${normalize(c.line).slice(0, 12) || 'clip'}`;
      const out = path.join(DIR, slug);
      fs.mkdirSync(out, { recursive: true });
      const from = Math.max(0, c.clipStart - 1);
      const to = c.clipEnd + 1;
      const video = path.join(out, 'scene.mp4');
      ytdlp(['-f', 'bv*[height<=1080][ext=mp4]+ba[ext=m4a]/b[ext=mp4]/bv*+ba/b', '--merge-output-format', 'mp4',
        '--download-sections', `*${from.toFixed(2)}-${to.toFixed(2)}`, '--force-keyframes-at-cuts', '-o', video, c.url], { stdio: 'inherit' });
      // Times in the downloaded file start at `from`.
      const rel = s => (s - from).toFixed(2);
      let subsArg = '';
      if (c.subs?.en && fs.existsSync(c.subs.en)) {
        fs.writeFileSync(path.join(out, 'scene.en.srt'), toSrt(parseVtt(fs.readFileSync(c.subs.en, 'utf8')), from, to));
        subsArg = ` --clip-subs ${path.join('clips', slug, 'scene.en.srt')}`;
      }
      fs.writeFileSync(path.join(out, 'clip.json'), JSON.stringify({ ...c, downloadedFrom: from }, null, 2));
      markUsed(c.line, c.url);
      const q = s => JSON.stringify(s);
      console.log(`\nSaved ${out}/. Next:
1. Make the breakdown, from the repo root:
   npm run breakdown -- ${q(c.line)}${c.source ? ` --source ${q(c.source)}` : ''} --account kdrama
   (account: kdrama, kpop or main, whichever fits.) It prints output/<id> when it's done.
2. Make the video, from video/:
   npm run lesson -- ../output/<id>/metadata.json --clip ${path.join('clips', slug, 'scene.mp4')} \\
     --clip-start ${rel(c.clipStart)} --clip-end ${rel(c.clipEnd)} --line-start ${rel(c.lineStart)} --line-end ${rel(c.lineEnd)}${subsArg} \\
     --clip-context ${q(c.context || 'WRITE: who says it to whom, and what is happening')}
Watch the clip first: the line times come from subtitles and can be a few tenths off.`);
    } else if (command === 'used') {
      if (!rest[0]) throw new Error('usage: find-clips.mjs used "<Korean line>"');
      markUsed(rest[0], '');
      console.log(`Marked as used: ${rest[0]}`);
    } else {
      console.error('usage: find-clips.mjs mine|line|take|used ... (see the top of this file)');
      process.exit(1);
    }
  } finally {
    fs.rmSync(work, { recursive: true, force: true });
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) main().catch(err => { console.error(err.message); process.exit(1); });
