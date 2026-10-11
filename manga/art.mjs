// Panel art from GPT Image, using the model sheets as references. Shared by the variants command
// and the picker page.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import '../video/scripts/env.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const MODELS = [process.env.IMAGE_MODEL || 'gpt-image-2.5-flare', 'gpt-image-2.5-sunburst'];
const SIZES = { tall: '1024x1536', half: '1536x1024', strip: '1536x1024' };
const ORDINAL = ['first', 'second', 'third'];

export function panelsOf(ep) {
  return ep.slides.flatMap((s) => (s.panels || []).map((p) => ({ ...p, slide: s.n })));
}

// The full prompt for a panel, as sent to GPT Image or pasted into ComfyUI.
export function fullPrompt(ep, p, { ordinals = true } = {}) {
  const text = ordinals ? p.prompt.replace(/<image(\d)>/g, (_, n) => `the ${ORDINAL[n - 1]} reference image`) : p.prompt;
  return p.refs?.length
    ? `${ep.style_prefix} Draw it in exactly the same drawing style and character designs as the reference images.\n\n${text}`
    : `${ep.style_prefix}\n\n${text}`;
}

async function request(ep, p, model) {
  const refs = (p.refs || []).map((r) => path.join(here, ep.refs[r]));
  const prompt = fullPrompt(ep, p);
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

// One take of a panel as PNG bytes. The image endpoint often answers 502 under load, so this
// retries and alternates models.
export async function generatePanel(ep, p) {
  let last;
  for (let attempt = 0; attempt < 6; attempt++) {
    const model = MODELS[attempt % MODELS.length];
    try {
      return await request(ep, p, model);
    } catch (e) {
      last = e;
      console.warn(`${p.id}: ${model} failed: ${e.message}`);
      await new Promise((r) => setTimeout(r, 5000));
    }
  }
  throw last;
}

// Saves bytes as the next free variants/<panel id>/vN.<ext> and returns that file name.
export function saveVariant(epDir, id, bytes, ext = 'png') {
  const dir = path.join(epDir, 'variants', id);
  fs.mkdirSync(dir, { recursive: true });
  const taken = fs.readdirSync(dir).map((f) => Number(f.match(/^v(\d+)\./)?.[1] || 0));
  const name = `v${Math.max(0, ...taken) + 1}.${ext}`;
  fs.writeFileSync(path.join(dir, name), bytes);
  return name;
}

export function variantsOf(epDir, id) {
  const dir = path.join(epDir, 'variants', id);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter((f) => /^v\d+\.(png|jpe?g|webp)$/i.test(f))
    .sort((a, b) => Number(a.match(/\d+/)[0]) - Number(b.match(/\d+/)[0]));
}
