// Fetch Mecka-lab episode metadata from the public, read-only EgoVerse research workbench API
// (the same EgoVerse PostgreSQL that partners.mecka.ai/egoverse browses). 100 rows per page,
// sequential and rate-limited. Writes data/raw/pNNNN.json (gitignored) and data/FETCHED_AT.
// Usage: node scripts/fetch.mjs
import fs from 'node:fs';

const URL = 'https://egoverse-research-workbench.vercel.app/api/episodes';
const KEEP = ['episode_hash', 'operator', 'task', 'task_description', 'scene', 'objects', 'num_frames', 'created_at', 'is_deleted', 'is_eval', 'embodiment', 'segments'];
fs.mkdirSync('data/raw', { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let total = Infinity;
for (let page = 0; page * 100 < total; page++) {
  const file = `data/raw/p${String(page).padStart(4, '0')}.json`;
  if (fs.existsSync(file)) { total = JSON.parse(fs.readFileSync(file, 'utf8')).total; continue; }
  let d;
  for (let a = 0; a < 4 && !d; a++) {
    try {
      const r = await fetch(URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ filters: { lab: ['mecka'] }, page, limit: 100 }) });
      if (r.ok) d = await r.json(); else await sleep(2000 * (a + 1));
    } catch { await sleep(2000 * (a + 1)); }
  }
  if (!d) throw new Error('failed page ' + page);
  total = d.total;
  fs.writeFileSync(file, JSON.stringify({ total, episodes: d.episodes.map((e) => Object.fromEntries(KEEP.map((k) => [k, e[k]]))) }));
  await sleep(150);
}
fs.writeFileSync('data/FETCHED_AT', new Date().toISOString().slice(0, 10) + '\n');
console.log('done', total);
