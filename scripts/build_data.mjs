// Build the compact snapshot the page loads, from the raw pages written by scripts/fetch.mjs.
// Usage: node scripts/build_data.mjs
// Output: data/episodes.json (all families, columnar) and data/details/<family>.json
// (descriptions, objects and subtask segments, loaded lazily for the episode drawer).
import fs from 'node:fs';
import path from 'node:path';
import { stem } from '../src/taxonomy.js';

const RAW = 'data/raw';
const files = fs.readdirSync(RAW).filter((f) => f.endsWith('.json')).sort();
const raw = [];
for (const f of files) raw.push(...JSON.parse(fs.readFileSync(path.join(RAW, f), 'utf8')).episodes);
const seen = new Set();
const E = raw.filter((e) => !seen.has(e.episode_hash) && seen.add(e.episode_hash) && !e.is_deleted && e.num_frames > 0);

// Pseudonymize operator ids (opaque upload ids) to D-0001.. in sorted order.
const opIds = [...new Set(E.map((e) => e.operator))].sort();
const opIndex = new Map(opIds.map((o, i) => [o, i]));
const scenes = [...new Set(E.map((e) => e.scene).filter(Boolean))].sort();
const sceneIndex = new Map(scenes.map((s, i) => [s, i]));
const tasks = [...new Set(E.map((e) => e.task))].sort();
const taskIndex = new Map(tasks.map((t, i) => [t, i]));
const byNewest = E.map((e, i) => i).sort((a, b) => (E[b].created_at || '').localeCompare(E[a].created_at || '') || E[a].episode_hash.localeCompare(E[b].episode_hash));
const rank = new Array(E.length);
byNewest.forEach((r, k) => { rank[r] = k; });

const fam = new Map();
E.forEach((e, i) => { const k = stem(e.task); if (!fam.has(k)) fam.set(k, []); fam.get(k).push(i); });
const famRows = [...fam].map(([k, rows]) => {
  const sec = rows.reduce((a, r) => a + E[r].num_frames / 30, 0);
  const tok = new Map();
  for (const r of rows) { const t = E[r].task.toLowerCase().split(/[_\s-]+/)[0]; tok.set(t, (tok.get(t) || 0) + 1); }
  const ing = [...tok].sort((a, b) => b[1] - a[1]).map(([t]) => t);
  const word = ing.find((t) => t.endsWith('ing')) || ing[0];
  let label = word.charAt(0).toUpperCase() + word.slice(1);
  if (k === 'cup') label = 'Cup on saucer';
  return { key: k, label, rows, sec, ops: new Set(rows.map((r) => E[r].operator)).size };
}).filter((F) => F.sec >= 4 * 3600 && F.ops >= 20).sort((a, b) => b.sec - a.sec).slice(0, 24);

const keepRows = [...new Set(famRows.flatMap((F) => F.rows))].sort((a, b) => a - b);
const pos = new Map(keepRows.map((r, k) => [r, k]));
const out = {
  source: 'EgoVerse PostgreSQL via the public read-only EgoVerse research workbench API, lab = mecka',
  fetchedAt: fs.readFileSync('data/FETCHED_AT', 'utf8').trim(),
  labTotals: { episodes: E.length, hours: E.reduce((a, e) => a + e.num_frames, 0) / 108000, demonstrators: opIds.length, scenes: scenes.length, tasks: tasks.length },
  scenes, tasks,
  eps: { h: [], o: [], s: [], t: [], f: [], c: [] },
  families: famRows.map((F) => ({ key: F.key, label: F.label, rows: F.rows.map((r) => pos.get(r)).sort((a, b) => a - b), taskLabels: new Set(F.rows.map((r) => E[r].task)).size })),
};
for (const r of keepRows) {
  const e = E[r];
  out.eps.h.push(e.episode_hash); out.eps.o.push(opIndex.get(e.operator)); out.eps.s.push(e.scene ? sceneIndex.get(e.scene) : -1);
  out.eps.t.push(taskIndex.get(e.task)); out.eps.f.push(e.num_frames); out.eps.c.push(rank[r]);
}
fs.writeFileSync('data/episodes.json', JSON.stringify(out));
fs.mkdirSync('data/details', { recursive: true });
for (const F of famRows) {
  const d = {};
  for (const r of F.rows) {
    const e = E[r];
    let objs = [];
    try { objs = JSON.parse(e.objects || '[]'); } catch { objs = String(e.objects || '').replace(/[{}"]/g, '').split(',').filter(Boolean); }
    d[e.episode_hash] = {
      d: (e.task_description || '').slice(0, 240),
      o: Array.isArray(objs) ? objs.slice(0, 8) : [],
      g: (Array.isArray(e.segments) ? e.segments : []).slice(0, 12).map((s) => [Math.round(s.start_seconds * 10) / 10, Math.round(s.end_seconds * 10) / 10, String(s.label || '').slice(0, 110)]),
      a: e.created_at,
    };
  }
  fs.writeFileSync(`data/details/${F.key}.json`, JSON.stringify(d));
}
console.log(`episodes ${E.length}, kept ${keepRows.length} in ${famRows.length} families`);
console.log(famRows.map((F) => `${F.label} ${(F.sec / 3600).toFixed(1)}h ${F.ops} demonstrators`).join('\n'));
