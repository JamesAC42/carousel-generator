// Puts a finished lesson (a folder with video.mp4, caption.txt and post.json) in the Google Drive
// outbox the posting agent downloads from.
//
//   node scripts/publish.mjs out/<id> [--allow-placeholders]
//
// Drive layout (the folder is created on first use):
//   Hanbok TikTok outbox/
//     index.json             newest first: [{ id, account, hook, folder, createdAt }]
//     <date>-<id>/video.mp4, caption.txt, post.json
//
// Needs GDRIVE_CLIENT_ID, GDRIVE_CLIENT_SECRET and GDRIVE_REFRESH_TOKEN (an OAuth refresh token
// with the drive.file scope, so this only ever sees files it created). OUTBOX_FOLDER renames the folder.
import fs from 'fs';
import path from 'path';

const args = process.argv.slice(2);
const allowPlaceholders = args.includes('--allow-placeholders');
const [srcDir] = args.filter(a => !a.startsWith('--'));
if (!srcDir) {
  console.error('usage: publish.mjs out/<id> [--allow-placeholders]');
  process.exit(1);
}

const post = JSON.parse(fs.readFileSync(path.join(srcDir, 'post.json'), 'utf8'));
const scene = JSON.parse(fs.readFileSync(path.join(srcDir, 'scene.json'), 'utf8'));

// Don't let a video with the stand-in gameplay band or stand-in characters go out by accident.
const problems = [];
if (!scene.gameplay) problems.push('no gameplay clip (the bottom band is the placeholder)');
if (Object.values(scene.characters).some(c => Object.values(c.expressions).some(src => src.startsWith('sample/')))) {
  problems.push('placeholder character art (sample/characters)');
}
if (problems.length && !allowPlaceholders) {
  console.error(`Not publishing ${post.id}: ${problems.join('; ')}. Pass --allow-placeholders to publish anyway.`);
  process.exit(1);
}

const { GDRIVE_CLIENT_ID, GDRIVE_CLIENT_SECRET, GDRIVE_REFRESH_TOKEN } = process.env;
if (!GDRIVE_CLIENT_ID || !GDRIVE_CLIENT_SECRET || !GDRIVE_REFRESH_TOKEN) {
  console.error('Set GDRIVE_CLIENT_ID, GDRIVE_CLIENT_SECRET and GDRIVE_REFRESH_TOKEN.');
  process.exit(1);
}
const OUTBOX = process.env.OUTBOX_FOLDER || 'Hanbok TikTok outbox';
const FOLDER = 'application/vnd.google-apps.folder';

async function accessToken() {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    body: new URLSearchParams({
      client_id: GDRIVE_CLIENT_ID, client_secret: GDRIVE_CLIENT_SECRET,
      refresh_token: GDRIVE_REFRESH_TOKEN, grant_type: 'refresh_token'
    })
  });
  if (!res.ok) throw new Error(`Google token ${res.status}: ${await res.text()}`);
  return (await res.json()).access_token;
}
const auth = { Authorization: `Bearer ${await accessToken()}` };

async function drive(url, init = {}) {
  const res = await fetch(`https://www.googleapis.com${url}`, { ...init, headers: { ...auth, ...init.headers } });
  if (!res.ok) throw new Error(`Drive ${res.status} ${url}: ${await res.text()}`);
  return res.json();
}

async function find(name, parent, mimeType) {
  const q = [`name = '${name.replace(/'/g, "\\'")}'`, 'trashed = false',
    parent ? `'${parent}' in parents` : null, mimeType ? `mimeType = '${mimeType}'` : null].filter(Boolean).join(' and ');
  const { files } = await drive(`/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id)`);
  return files[0]?.id;
}

async function folder(name, parent) {
  return (await find(name, parent, FOLDER)) || (await drive('/drive/v3/files?fields=id', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, mimeType: FOLDER, parents: parent ? [parent] : undefined })
  })).id;
}

// Resumable upload, so a 20 MB video goes up in one request without the multipart size limit.
// With an existing file id the content is replaced instead.
async function upload(name, parent, body, mimeType, existingId) {
  const init = await fetch(existingId
    ? `https://www.googleapis.com/upload/drive/v3/files/${existingId}?uploadType=resumable`
    : 'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable', {
    method: existingId ? 'PATCH' : 'POST',
    headers: { ...auth, 'Content-Type': 'application/json', 'X-Upload-Content-Type': mimeType },
    body: JSON.stringify(existingId ? {} : { name, parents: [parent] })
  });
  if (!init.ok) throw new Error(`Drive upload ${init.status}: ${await init.text()}`);
  const res = await fetch(init.headers.get('location'), { method: 'PUT', headers: { 'Content-Type': mimeType }, body });
  if (!res.ok) throw new Error(`Drive upload ${res.status}: ${await res.text()}`);
  return (await res.json()).id;
}

const outbox = await folder(OUTBOX);
const name = `${post.createdAt.slice(0, 10)}-${post.id}`;
if (await find(name, outbox, FOLDER)) {
  console.error(`${OUTBOX}/${name} already exists; not uploading it twice.`);
  process.exit(1);
}
const postFolder = await folder(name, outbox);
const types = { 'video.mp4': 'video/mp4', 'caption.txt': 'text/plain', 'post.json': 'application/json' };
for (const [file, type] of Object.entries(types)) {
  await upload(file, postFolder, fs.readFileSync(path.join(srcDir, file)), type);
}

const indexId = await find('index.json', outbox);
const index = indexId ? await drive(`/drive/v3/files/${indexId}?alt=media`) : [];
const entry = { id: post.id, account: post.account, hook: post.hook, folder: name, createdAt: post.createdAt };
const json = JSON.stringify([entry, ...index.filter(e => e.id !== post.id)], null, 2) + '\n';
await upload('index.json', outbox, json, 'application/json', indexId);
console.log(`Published ${OUTBOX}/${name}`);
