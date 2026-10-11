// Assembles a manga episode's panel art into 1080x1920 slides.
//
//   npm run manga:slides -- <episode dir> [--out <dir>]
//
// The episode dir holds episode.json and the art (.png, .webp or .jpg): panels/<panel id>.png (James's art) wins over
// test-panels/<panel id>.png (GPT Image stand-ins). Stock art for the lesson and CTA slides
// (horang-explaining, sora-horang-cta) is looked up the same way, then in manga/stock/.
// A panel with no art at all renders as a grey "missing" box so nothing ships with a hole.
// Writes slide-N.png and metadata.json (type "manga") to --out, default <episode dir>/slides.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const option = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args.splice(i, 2)[1] : undefined;
};
const outOpt = option('--out');
const [epDir] = args;
if (!epDir || !fs.existsSync(path.join(epDir, 'episode.json'))) {
  console.error('usage: npm run manga:slides -- <episode dir> [--out <dir>]');
  process.exit(1);
}
const outDir = outOpt || path.join(epDir, 'slides');
const ep = JSON.parse(fs.readFileSync(path.join(epDir, 'episode.json'), 'utf8'));
const fonts = path.join(here, '..', 'assets', 'fonts');
fs.mkdirSync(outDir, { recursive: true });

// Page geometry. Text stays inside TikTok/Reels safe zones: nothing under the top bar
// (110px) or the caption and buttons at the bottom (220px).
const W = 1080, H = 1920, M = 48, TOP = 110, BOTTOM = 220, GUT = 28;
const areaH = H - TOP - BOTTOM;
const missing = [];
const art = (id) => {
  const found = [path.join(epDir, 'panels'), path.join(epDir, 'test-panels'), path.join(here, 'stock')]
    .flatMap((d) => ['png', 'webp', 'jpg'].map((ext) => path.join(d, `${id}.${ext}`)))
    .find((f) => fs.existsSync(f));
  if (!found) missing.push(id);
  return found ? pathToFileURL(path.resolve(found)).href : '';
};

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const pos = (at) => ({
  tl: 'top:22px;left:22px', tr: 'top:22px;right:22px',
  bl: 'bottom:22px;left:22px', br: 'bottom:22px;right:22px',
}[at || 'tl']);

function overlays(s, pid) {
  const t = s.text || {};
  let h = '';
  for (const c of (t.captions || []).filter((x) => x.panel === pid))
    h += `<div class="cap" style="${pos(c.at)}">${esc(c.en)}</div>`;
  for (const b of (t.balloons || []).filter((x) => x.panel === pid))
    h += `<div class="bal ${b.at || 'tl'}" style="${pos(b.at)}"><div class="ko">${esc(b.ko)}</div><div class="en">${esc(b.en)}</div></div>`;
  for (const f of (t.sfx || []).filter((x) => x.panel === pid))
    h += `<div class="sfx" style="${pos(f.at)}">${esc(f.ko)}<small>${esc(f.en)}</small></div>`;
  return h;
}

function panel(s, p, x, y, w, h, focus = 'center') {
  return `<div class="panel" style="left:${x}px;top:${y}px;width:${w}px;height:${h}px">
    <img src="${art(p.id)}" alt="panel ${p.id} missing" style="object-position:${focus}">${overlays(s, p.id)}</div>`;
}

function stack(s, n) {
  const h = (areaH - GUT * (n - 1)) / n;
  return s.panels.map((p, i) => panel(s, p, M, TOP + i * (h + GUT), W - 2 * M, h)).join('');
}

const pageNo = (s) => `<div class="pg">${esc(ep.series)} #${ep.episode} · ${s.n}/${ep.slides.length}</div>`;

function body(s) {
  const t = s.text || {};
  switch (s.layout) {
    case 'cover':
      return `<div class="coverart"><img src="${art(s.panels[0].id)}"></div>` +
        `<div class="title"><div class="sub">${esc(t.subtitle)}</div><div class="ko">${esc(t.title)}</div><div class="en">${esc(ep.title_en)}</div></div>
         <div class="hook">${esc(t.hook)}</div>`;
    case 'splash':
      return panel(s, s.panels[0], M, TOP, W - 2 * M, areaH) + pageNo(s);
    case 'two': return stack(s, 2) + pageNo(s);
    case 'three': return stack(s, 3) + pageNo(s);
    case 'lesson':
      return `<img class="stock" src="${art(s.stock)}">
        <div class="lesson"><div class="kick">${esc(t.kicker)}</div>
        <div class="line"><div class="ko">${esc(t.line.ko)}</div><div class="rom">${esc(t.line.romaja)}</div><div class="en">${esc(t.line.en)}</div></div>
        ${t.pieces.map((p) => `<div class="piece"><b>${esc(p.ko)}</b><span>${esc(p.en)}</span></div>`).join('')}
        <div class="kick small">How to answer</div>
        ${t.answers.map((p) => `<div class="piece ans"><b>${esc(p.ko)}</b><span>${esc(p.en)}</span></div>`).join('')}
        </div>`;
    case 'cta':
      return `<img class="stock" src="${art(s.stock)}">
        <div class="ctabox"><div class="ask">${esc(t.ask)}</div><div class="cta">${esc(t.cta)}</div><div class="url">${esc(t.url)}</div></div>`;
  }
  return '';
}

const css = `
@font-face{font-family:KR;src:url(${pathToFileURL(path.join(fonts, 'NotoKR.ttf')).href})}
@font-face{font-family:Lilita;src:url(${pathToFileURL(path.join(fonts, 'LilitaOne.ttf')).href})}
@font-face{font-family:Mont;src:url(${pathToFileURL(path.join(fonts, 'Montserrat.ttf')).href})}
*{box-sizing:border-box;margin:0}
body{width:${W}px;height:${H}px;background:#fff;position:relative;overflow:hidden;font-family:Mont,KR,sans-serif}
.panel{position:absolute;border:6px solid #111;overflow:hidden;background:#fff}
.panel img{background:#ddd;font:700 40px Mont;color:#666;text-align:center;width:100%;height:100%;object-fit:cover;display:block;filter:grayscale(1) contrast(1.05)}
.cap{position:absolute;background:#fff;border:4px solid #111;padding:10px 18px;font:700 34px/1.25 Mont;max-width:70%}
.bal{position:absolute;background:#fff;border:5px solid #111;border-radius:50%;padding:34px 56px;text-align:center;max-width:78%}
.bal::after{content:"";position:absolute;bottom:-30px;width:0;height:0;border:22px solid transparent;border-top:34px solid #111}
.bal.tl::after,.bal.bl::after{left:30%}.bal.tr::after,.bal.br::after{right:30%}
.bal .ko{font:900 60px/1.15 KR;letter-spacing:-1px}.bal .en{font:600 30px/1.2 Mont;color:#444;margin-top:6px}
.sfx{position:absolute;font:900 120px/1 KR;color:#fff;-webkit-text-stroke:6px #111;paint-order:stroke;transform:rotate(-12deg)}
.sfx small{display:block;font:800 30px Mont;-webkit-text-stroke:0;color:#111;background:#fff;padding:2px 8px;width:max-content}
.pg{position:absolute;left:${M}px;top:${H - BOTTOM + 18}px;font:700 26px Mont;color:#777}
.title{position:absolute;top:${TOP + 40}px;left:${M}px;right:${M}px;text-align:center}
.title .sub{display:inline-block;background:#111;color:#fff;font:800 32px Mont;padding:8px 20px;letter-spacing:1px}
.title .ko{font:900 128px/1.1 KR;letter-spacing:-3px;margin-top:22px;color:#111;}
.title .en{font:400 56px Lilita;color:#111}
.coverart{position:absolute;left:0;top:640px;width:${W}px;height:${H - 640}px;border-top:6px solid #111;overflow:hidden}
.coverart img{width:100%;height:100%;object-fit:cover;object-position:center top;filter:grayscale(1)}
.hook{position:absolute;top:${TOP + 360}px;left:${M + 40}px;right:${M + 40}px;background:#fff;border:5px solid #111;padding:18px 26px;font:800 44px/1.2 Mont;text-align:center;box-shadow:10px 10px 0 #111}
.stock{position:absolute;left:0;bottom:0;width:${W}px;height:${H}px;object-fit:cover;object-position:center bottom;filter:grayscale(1)}
.lesson{position:absolute;top:${TOP}px;left:${M}px;right:${M}px}
.kick{display:inline-block;background:#111;color:#fff;font:800 36px Mont;padding:8px 20px}
.kick.small{font-size:28px;margin-top:22px}
.line{border:5px solid #111;background:#fff;padding:22px 28px;margin:18px 0 14px;box-shadow:10px 10px 0 #111}
.line .ko{font:900 84px/1.1 KR;letter-spacing:-2px}.line .rom{font:600 30px Mont;color:#666}.line .en{font:800 40px Mont;margin-top:6px}
.piece{display:flex;gap:20px;align-items:baseline;font:600 34px Mont;margin-top:12px}
.piece b{font:900 46px KR;background:#111;color:#fff;padding:2px 14px}
.piece.ans b{background:#fff;color:#111;border:4px solid #111}
.ctabox{position:absolute;top:${TOP + 40}px;left:${M}px;right:${M}px;text-align:center}
.ask{font:400 76px/1.1 Lilita;color:#111}
.cta{display:inline-block;margin-top:34px;background:#111;color:#fff;font:800 40px Mont;padding:16px 28px}
.url{font:800 44px Mont;margin-top:22px;border-bottom:6px solid #111;display:inline-block}
`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: W, height: H } });
const slides = [];
for (const f of fs.readdirSync(outDir)) if (/^slide-\d+\.(png|html)$/.test(f)) fs.unlinkSync(path.join(outDir, f));
for (const s of ep.slides) {
  // Loaded from a file so the page may read the local art and fonts.
  const htmlFile = path.resolve(outDir, `slide-${s.n}.html`);
  fs.writeFileSync(htmlFile, `<!doctype html><meta charset="utf-8"><style>${css}</style><body>${body(s)}</body>`);
  await page.goto(pathToFileURL(htmlFile).href, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  const png = `slide-${s.n}.png`;
  await page.screenshot({ path: path.join(outDir, png) });
  fs.unlinkSync(htmlFile);
  slides.push(png);
}
await browser.close();

fs.writeFileSync(path.join(outDir, 'metadata.json'), JSON.stringify({
  type: 'manga',
  style: 'manga',
  id: ep.id,
  account: ep.account || 'main',
  title: `${ep.title_ko} (${ep.title_en})`,
  hooks: [ep.slides[0]?.text?.hook || ep.title_en],
  caption: ep.caption,
  slides,
}, null, 2));
if (missing.length) console.warn(`No art yet for: ${[...new Set(missing)].join(', ')} (grey boxes on those slides)`);
console.log(`Rendered ${slides.length} manga slides to ${outDir}`);
