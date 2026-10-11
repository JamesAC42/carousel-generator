// A local page for finishing a manga episode: every panel's takes side by side, click the best
// one, ask for more takes, drop in your own art (from ComfyUI or anywhere), then render the slides
// and send them to the outbox.
//
//   npm run manga:pick -- <episode dir> [--port 4321]
//
// Then open http://localhost:4321. Takes live in <episode dir>/variants/<panel id>/, the picked
// take is copied to <episode dir>/panels/<panel id>.<ext>, and slides render to <episode dir>/slides/.
// "More takes" needs OPENAI_API_KEY (environment or the repo's .env).
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { fullPrompt, generatePanel, panelsOf, saveVariant, variantsOf } from './art.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const pi = args.indexOf('--port');
const port = pi >= 0 ? Number(args.splice(pi, 2)[1]) : 4321;
const epDir = path.resolve(args[0] || '');
const epFile = path.join(epDir, 'episode.json');
if (!args[0] || !fs.existsSync(epFile)) {
  console.error('usage: npm run manga:pick -- <episode dir> [--port 4321]');
  process.exit(1);
}
const readEp = () => JSON.parse(fs.readFileSync(epFile, 'utf8'));

// Takes being generated, per panel, and the last error for each.
const pending = {};
const errors = {};
const log = [];

function picked(id) {
  const dir = path.join(epDir, 'panels');
  if (!fs.existsSync(dir)) return null;
  const f = fs.readdirSync(dir).find((x) => x.replace(/\.[^.]+$/, '') === id);
  if (!f) return null;
  // Which take it came from, if it's byte-identical to one.
  const bytes = fs.readFileSync(path.join(dir, f));
  const from = variantsOf(epDir, id).find((v) => fs.readFileSync(path.join(epDir, 'variants', id, v)).equals(bytes));
  return { file: f, from: from || null };
}

function state() {
  const ep = readEp();
  const slidesDir = path.join(epDir, 'slides');
  const slides = fs.existsSync(slidesDir) ? fs.readdirSync(slidesDir).filter((f) => /^slide-\d+\.png$/.test(f))
    .sort((a, b) => Number(a.match(/\d+/)[0]) - Number(b.match(/\d+/)[0])) : [];
  return {
    title: `${ep.title_ko} (${ep.title_en})`,
    panels: panelsOf(ep).map((p) => ({
      id: p.id, slide: p.slide, shape: p.shape, refs: p.refs || [], prompt: p.prompt,
      comfyPrompt: fullPrompt(ep, p, { ordinals: false }),
      variants: variantsOf(epDir, p.id), picked: picked(p.id),
      pending: pending[p.id] || 0, error: errors[p.id] || null,
    })),
    slides, slidesAt: slides.length ? fs.statSync(path.join(slidesDir, slides[0])).mtimeMs : 0,
    log: log.slice(-12),
  };
}

function generate(id, n) {
  const ep = readEp();
  const p = panelsOf(ep).find((x) => x.id === id);
  if (!p) return;
  for (let k = 0; k < n; k++) {
    pending[id] = (pending[id] || 0) + 1;
    generatePanel(ep, p)
      .then((bytes) => { saveVariant(epDir, id, bytes); delete errors[id]; })
      .catch((e) => { errors[id] = e.message; })
      .finally(() => { pending[id]--; });
  }
}

function run(script, scriptArgs) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [script, ...scriptArgs], { cwd: path.join(here, '..') });
    let out = '';
    child.stdout.on('data', (d) => (out += d));
    child.stderr.on('data', (d) => (out += d));
    child.on('close', (code) => {
      log.push(`${path.basename(script)}: ${code === 0 ? 'ok' : `failed (${code})`}\n${out.trim()}`);
      resolve({ ok: code === 0, out });
    });
  });
}

const readBody = (req) => new Promise((resolve) => {
  const chunks = [];
  req.on('data', (c) => chunks.push(c));
  req.on('end', () => resolve(Buffer.concat(chunks)));
});

const TYPES = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' };
const json = (res, data, code = 200) => {
  res.writeHead(code, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
};
const validId = (id) => panelsOf(readEp()).some((p) => p.id === id);

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  try {
    if (req.method === 'GET' && url.pathname === '/') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(PAGE);
    }
    if (req.method === 'GET' && url.pathname === '/api/state') return json(res, state());
    if (req.method === 'GET' && url.pathname.startsWith('/files/')) {
      // Only images inside the episode folder.
      const file = path.resolve(epDir, decodeURIComponent(url.pathname.slice(7)));
      if (!file.startsWith(epDir + path.sep) || !TYPES[path.extname(file).toLowerCase()] || !fs.existsSync(file)) {
        res.writeHead(404);
        return res.end();
      }
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(file).toLowerCase()], 'Cache-Control': 'no-store' });
      return fs.createReadStream(file).pipe(res);
    }
    if (req.method !== 'POST') {
      res.writeHead(404);
      return res.end();
    }
    if (url.pathname === '/api/upload') {
      const id = url.searchParams.get('panel');
      const ext = (url.searchParams.get('ext') || 'png').toLowerCase().replace('jpeg', 'jpg');
      if (!validId(id) || !['png', 'jpg', 'webp'].includes(ext)) return json(res, { error: 'bad upload' }, 400);
      return json(res, { file: saveVariant(epDir, id, await readBody(req), ext) });
    }
    const body = JSON.parse((await readBody(req)).toString() || '{}');
    if (url.pathname === '/api/generate') {
      const ids = body.panel ? [body.panel] : panelsOf(readEp()).filter((p) => !variantsOf(epDir, p.id).length).map((p) => p.id);
      for (const id of ids) if (validId(id)) generate(id, Math.min(Number(body.n) || 2, 6));
      return json(res, { ok: true });
    }
    if (url.pathname === '/api/pick') {
      const { panel, file } = body;
      if (!validId(panel) || !variantsOf(epDir, panel).includes(file)) return json(res, { error: 'bad pick' }, 400);
      const dir = path.join(epDir, 'panels');
      fs.mkdirSync(dir, { recursive: true });
      for (const f of fs.readdirSync(dir)) if (f.replace(/\.[^.]+$/, '') === panel) fs.unlinkSync(path.join(dir, f));
      fs.copyFileSync(path.join(epDir, 'variants', panel, file), path.join(dir, `${panel}${path.extname(file)}`));
      return json(res, { ok: true });
    }
    if (url.pathname === '/api/prompt') {
      const ep = readEp();
      const p = ep.slides.flatMap((s) => s.panels || []).find((x) => x.id === body.panel);
      if (!p || typeof body.prompt !== 'string') return json(res, { error: 'bad prompt' }, 400);
      p.prompt = body.prompt;
      fs.writeFileSync(epFile, JSON.stringify(ep, null, 2));
      return json(res, { ok: true });
    }
    if (url.pathname === '/api/render') return json(res, await run(path.join(here, 'render.mjs'), [epDir]));
    if (url.pathname === '/api/publish') {
      const flags = body.test ? ['--test'] : [];
      return json(res, await run(path.join(here, '..', 'video', 'scripts', 'publish-slides.mjs'), [path.join(epDir, 'slides'), ...flags]));
    }
    res.writeHead(404);
    res.end();
  } catch (e) {
    json(res, { error: e.message }, 500);
  }
});
server.listen(port, '127.0.0.1', () => console.log(`Panel picker for ${readEp().id}: http://localhost:${port}`));

const PAGE = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Manga panel picker</title>
<style>
:root{--ink:#111;--paper:#fff;--muted:#666;--line:#ddd;--pick:#3D64E8;--bg:#f4f3ef}
*{box-sizing:border-box}body{margin:0;font:15px/1.4 system-ui,sans-serif;background:var(--bg);color:var(--ink)}
header{position:sticky;top:0;z-index:2;background:var(--paper);border-bottom:2px solid var(--ink);padding:12px 20px;display:flex;gap:12px;align-items:center;flex-wrap:wrap}
h1{font-size:18px;margin:0 auto 0 0}
button{font:600 14px system-ui;border:2px solid var(--ink);background:var(--paper);padding:7px 14px;border-radius:8px;cursor:pointer;box-shadow:0 3px 0 var(--ink)}
button:active{transform:translateY(2px);box-shadow:0 1px 0 var(--ink)}button.primary{background:var(--ink);color:#fff}
button:disabled{opacity:.5;cursor:default}
main{padding:20px;max-width:1400px;margin:auto}
.panel{background:var(--paper);border:2px solid var(--ink);border-radius:12px;padding:16px;margin-bottom:18px}
.top{display:flex;gap:10px;align-items:baseline;flex-wrap:wrap}.top b{font-size:17px}.tag{color:var(--muted);font-size:13px}
.ok{color:#13865a;font-weight:700}.warn{color:#b26b00;font-weight:700}.err{color:#c62828;font-size:13px}
.takes{display:flex;gap:12px;overflow-x:auto;padding:12px 0 4px}
.take{flex:0 0 auto;position:relative;border:4px solid transparent;border-radius:8px;cursor:pointer;background:#eee}
.take img{display:block;height:260px;border-radius:4px}.take.on{border-color:var(--pick)}
.take span{position:absolute;left:6px;top:6px;background:#fff;border:1px solid var(--ink);font:700 12px system-ui;padding:1px 6px;border-radius:6px}
.take.on span{background:var(--pick);color:#fff;border-color:var(--pick)}
.slot{flex:0 0 auto;width:180px;height:260px;border:2px dashed #aaa;border-radius:8px;display:grid;place-items:center;text-align:center;color:var(--muted);padding:10px;font-size:13px}
.slot.drag{border-color:var(--pick);color:var(--pick)}
details{margin-top:8px}summary{cursor:pointer;color:var(--muted);font-size:13px}
textarea{width:100%;min-height:90px;font:13px/1.4 ui-monospace,monospace;margin-top:6px;border:1px solid var(--line);border-radius:6px;padding:8px}
.row{display:flex;gap:8px;margin-top:8px;flex-wrap:wrap}
#slides{display:flex;gap:10px;overflow-x:auto;padding:4px 0}#slides img{height:420px;border:1px solid var(--line)}
pre{white-space:pre-wrap;font-size:12px;background:#fff;border:1px solid var(--line);padding:10px;border-radius:8px;max-height:200px;overflow:auto}
</style>
<header><h1 id="title">Manga panel picker</h1><span id="progress" class="tag"></span>
<button onclick="post('/api/generate',{n:3})">Make 3 takes of every empty panel</button>
<button onclick="render()" class="primary" id="renderBtn">Finish slides</button>
<button onclick="publish()" id="pubBtn" disabled>Send to outbox</button></header>
<main><section id="list"></section>
<section class="panel"><div class="top"><b>Finished slides</b><span class="tag">Panels you haven't picked use the test art, or a grey box.</span></div><div id="slides"></div><pre id="log"></pre></section></main>
<script>
let S=null, openPrompts=new Set();
const post=(u,b)=>fetch(u,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(b||{})}).then(r=>r.json()).then(r=>{load();return r});
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
async function load(){S=await (await fetch('/api/state')).json();draw()}
function draw(){
  document.getElementById('title').textContent=S.title;
  const done=S.panels.filter(p=>p.picked).length, busy=S.panels.reduce((a,p)=>a+p.pending,0);
  document.getElementById('progress').textContent=done+' of '+S.panels.length+' panels picked'+(busy?' · making '+busy+' takes…':'');
  const list=document.getElementById('list');
  // Keep prompt edits that are in progress.
  const typing=document.activeElement&&document.activeElement.tagName==='TEXTAREA';
  if(typing) return;
  list.innerHTML=S.panels.map(p=>{
    const takes=p.variants.map(v=>'<div class="take'+(p.picked&&p.picked.from===v?' on':'')+'" onclick="pick(\\''+p.id+'\\',\\''+v+'\\')"><span>'+v.replace(/\\..*/,'')+(p.picked&&p.picked.from===v?' ✓':'')+'</span><img loading="lazy" src="/files/variants/'+p.id+'/'+v+'?'+v+'"></div>').join('');
    const pend=Array.from({length:p.pending},()=>'<div class="slot">Making a take…</div>').join('');
    return '<div class="panel"><div class="top"><b>'+p.id+'</b><span class="tag">slide '+p.slide+' · '+p.shape+(p.refs.length?' · refs: '+p.refs.join(', '):'')+'</span>'+
      (p.picked?'<span class="ok">Picked'+(p.picked.from?' '+p.picked.from.replace(/\\..*/,''):' (your file)')+'</span>':'<span class="warn">Not picked</span>')+'</div>'+
      (p.error?'<div class="err">Last take failed: '+esc(p.error)+'</div>':'')+
      '<div class="takes">'+takes+pend+'<label class="slot" ondragover="event.preventDefault();this.classList.add(\\'drag\\')" ondragleave="this.classList.remove(\\'drag\\')" ondrop="drop(event,\\''+p.id+'\\')">Drop your own image here<br>(ComfyUI etc.)<input type="file" accept="image/*" hidden onchange="upload(\\''+p.id+'\\',this.files[0])"></label></div>'+
      '<div class="row"><button onclick="post(\\'/api/generate\\',{panel:\\''+p.id+'\\',n:2})">+2 takes</button></div>'+
      '<details'+(openPrompts.has(p.id)?' open':'')+' ontoggle="this.open?openPrompts.add(\\''+p.id+'\\'):openPrompts.delete(\\''+p.id+'\\')"><summary>Prompt</summary>'+
      '<textarea id="pr-'+p.id+'">'+esc(p.prompt)+'</textarea><div class="row"><button onclick="savePrompt(\\''+p.id+'\\')">Save prompt</button>'+
      '<button onclick="navigator.clipboard.writeText(S.panels.find(x=>x.id===\\''+p.id+'\\').comfyPrompt)">Copy full prompt for ComfyUI</button></div></details></div>';
  }).join('');
  document.getElementById('slides').innerHTML=S.slides.map(f=>'<img src="/files/slides/'+f+'?'+S.slidesAt+'">').join('');
  document.getElementById('pubBtn').disabled=!S.slides.length;
  document.getElementById('log').textContent=S.log.join('\\n\\n');
}
function pick(id,v){post('/api/pick',{panel:id,file:v})}
function savePrompt(id){document.activeElement.blur();post('/api/prompt',{panel:id,prompt:document.getElementById('pr-'+id).value})}
async function upload(id,f){if(!f)return;const ext=(f.name.split('.').pop()||'png');await fetch('/api/upload?panel='+id+'&ext='+ext,{method:'POST',body:f});load()}
function drop(e,id){e.preventDefault();upload(id,e.dataTransfer.files[0])}
async function render(){const b=document.getElementById('renderBtn');b.disabled=true;b.textContent='Rendering…';await post('/api/render');b.disabled=false;b.textContent='Finish slides';document.getElementById('slides').scrollIntoView({behavior:'smooth'})}
async function publish(){if(!confirm('Send these slides to the outbox? Muse will post them.'))return;const r=await post('/api/publish');alert(r.ok?'Sent to the outbox.':'Publishing failed; see the log under the slides.')}
load();setInterval(()=>{if(S&&S.panels.some(p=>p.pending))load()},2500);
</script>`;
