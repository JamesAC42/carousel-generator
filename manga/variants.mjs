// Makes several takes of each panel with GPT Image, for picking in the picker page.
//
//   npm run manga:variants -- <episode dir> [--n 3] [p03 p05 ...]
//
// Adds to <episode dir>/variants/<panel id>/v1.png, v2.png ... (never overwrites). With no panel
// ids it fills every panel up to --n takes. Needs OPENAI_API_KEY (environment or the repo's .env).
// Takes from ComfyUI can go in the same folders by hand, or be dropped onto the picker page.
import fs from 'node:fs';
import path from 'node:path';
import { generatePanel, panelsOf, saveVariant, variantsOf } from './art.mjs';

const args = process.argv.slice(2);
const i = args.indexOf('--n');
const n = i >= 0 ? Number(args.splice(i, 2)[1]) : 3;
const [epDir, ...only] = args;
if (!epDir || !fs.existsSync(path.join(epDir, 'episode.json'))) {
  console.error('usage: npm run manga:variants -- <episode dir> [--n 3] [panel ids...]');
  process.exit(1);
}
const ep = JSON.parse(fs.readFileSync(path.join(epDir, 'episode.json'), 'utf8'));
const jobs = [];
for (const p of panelsOf(ep)) {
  if (only.length && !only.includes(p.id)) continue;
  // Named panels get n more takes; otherwise top every panel up to n.
  const count = only.length ? n : Math.max(0, n - variantsOf(epDir, p.id).length);
  for (let k = 0; k < count; k++) jobs.push(p);
}
console.log(`Making ${jobs.length} takes`);
await Promise.all(Array.from({ length: 4 }, async () => {
  while (jobs.length) {
    const p = jobs.shift();
    try {
      console.log(`${p.id}: ${saveVariant(epDir, p.id, await generatePanel(ep, p))}`);
    } catch (e) {
      console.error(`${p.id}: gave up (${e.message})`);
    }
  }
}));
