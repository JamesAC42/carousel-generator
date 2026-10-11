// Makes stand-in art for every panel of an episode with GPT Image, using the model sheets as
// references, so an episode can be reviewed as finished slides before James spends GPU time on it.
// James's own art goes in <episode dir>/panels/ and always wins over these.
//
//   npm run manga:test-art -- <episode dir> [p03 p05 ...]
//
// Writes <episode dir>/test-panels/<panel id>.png and skips panels that already have one.
// Needs OPENAI_API_KEY. IMAGE_MODEL picks the model (default gpt-image-2.5-flare).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import '../video/scripts/env.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const MODELS = [process.env.IMAGE_MODEL || 'gpt-image-2.5-flare', 'gpt-image-2.5-sunburst'];
const SIZES = { tall: '1024x1536', half: '1536x1024', strip: '1536x1024' };
const ORDINAL = ['first', 'second', 'third'];

const [epDir, ...only] = process.argv.slice(2);
if (!epDir || !fs.existsSync(path.join(epDir, 'episode.json'))) {
  console.error('usage: npm run manga:test-art -- <episode dir> [panel ids...]');
  process.exit(1);
}
const ep = JSON.parse(fs.readFileSync(path.join(epDir, 'episode.json'), 'utf8'));
const outDir = path.join(epDir, 'test-panels');
fs.mkdirSync(outDir, { recursive: true });

const jobs = [
  ...ep.slides.flatMap((s) => s.panels || []),
  // Stock art ships in manga/stock; only make it when asked for by name.
  ...Object.entries(ep.stock_panels || {}).filter(([k]) => only.includes(k)).map(([k, p]) => ({ ...p, id: k })),
].filter((p) => (only.length ? only.includes(p.id) : true));

async function generate(p, model) {
  const refs = (p.refs || []).map((r) => path.join(here, ep.refs[r]));
  const text = p.prompt.replace(/<image(\d)>/g, (_, n) => `the ${ORDINAL[n - 1]} reference image`);
  const prompt = refs.length
    ? `${ep.style_prefix} Draw it in exactly the same drawing style and character designs as the reference images.\n\n${text}`
    : `${ep.style_prefix}\n\n${text}`;
  const headers = { Authorization: `Bearer ${process.env.OPENAI_API_KEY || 'placeholder'}` };
  let res;
  if (refs.length) {
    const form = new FormData();
    for (const [k, v] of Object.entries({ model, prompt, size: SIZES[p.shape], quality: 'high', n: '1' })) form.append(k, v);
    for (const r of refs) form.append('image[]', new Blob([fs.readFileSync(r)], { type: 'image/png' }), path.basename(r));
    res = await fetch('https://api.openai.com/v1/images/edits', { method: 'POST', headers, body: form });
  } else {
    res = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, prompt, size: SIZES[p.shape], quality: 'high', n: 1 }),
    });
  }
  if (!res.ok) throw new Error(`${res.status} ${(await res.text()).slice(0, 200)}`);
  return Buffer.from((await res.json()).data[0].b64_json, 'base64');
}

async function make(p) {
  const out = path.join(outDir, `${p.id}.png`);
  if (fs.existsSync(out)) return;
  // The image endpoint often answers 502 under load, so retry and alternate models.
  for (let attempt = 0; attempt < 6; attempt++) {
    const model = MODELS[attempt % MODELS.length];
    try {
      fs.writeFileSync(out, await generate(p, model));
      console.log(`${p.id}: done (${model})`);
      return;
    } catch (e) {
      console.warn(`${p.id}: ${model} failed: ${e.message}`);
      await new Promise((r) => setTimeout(r, 5000));
    }
  }
  console.error(`${p.id}: gave up`);
}

// Four at a time.
const queue = [...jobs];
await Promise.all(Array.from({ length: 4 }, async () => {
  while (queue.length) await make(queue.shift());
}));
