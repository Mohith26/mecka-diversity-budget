// Recompute every number the README and the page headline quote, from data/episodes.json,
// with the same module the page uses. Writes results/results.json.
// Usage: node scripts/report.mjs
import fs from 'node:fs';
import { decodeFamilies, buildCut, PRESETS } from '../src/diversity.js';

const data = JSON.parse(fs.readFileSync(new URL('../data/episodes.json', import.meta.url), 'utf8'));
const fams = decodeFamilies(data);
const BUDGETS = [1, 2, 4, 8];
const pick = (m) => ({ episodes: m.episodes, hours: +(m.sec / 3600).toFixed(3), demonstrators: m.demonstrators, effDemonstrators: +m.effDemonstrators.toFixed(1), maxShare: +m.maxShare.toFixed(4), scenes: m.scenes, effScenes: +m.effScenes.toFixed(1), pairs: m.pairs, tasks: m.tasks, f: +m.f.toFixed(2) });
const rows = [];
const t0 = Date.now();
for (const F of fams) {
  const famHours = F.eps.reduce((a, e) => a + e.sec, 0) / 3600;
  for (const b of BUDGETS) {
    if (b > famHours / 2) continue; // a cut should be a real selection, not the whole family
    for (const preset of Object.keys(PRESETS)) {
      const r = buildCut(F, { budgetH: b, preset, holdK: 0 });
      rows.push({ family: F.key, label: F.label, budgetH: b, preset, familyHours: +famHours.toFixed(2), newest: pick(r.newest.m), random: pick(r.random.mean), randomP95: { scenes: r.random.hi.scenes, effDemonstrators: +r.random.hi.effDemonstrators.toFixed(1) }, optimal: pick(r.optimal.m), ub: +r.optimal.ub.toFixed(2), gapPct: +(100 * r.optimal.gap).toFixed(2), exhaustedScenes: r.plan.exhaustedCount });
    }
  }
}
const at = (fam, b, p) => rows.find((r) => r.family === fam && r.budgetH === b && r.preset === p);
const bal2 = rows.filter((r) => r.budgetH === 2 && r.preset === 'balanced' && r.optimal.scenes > 0);
const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
const headline = at('packag', 2, 'balanced');
const summary = {
  families: fams.length,
  configurations: rows.length,
  balanced2h: {
    families: bal2.length,
    scenesRandom: +mean(bal2.map((r) => r.random.scenes)).toFixed(1),
    scenesOptimal: +mean(bal2.map((r) => r.optimal.scenes)).toFixed(1),
    effDemRandom: +mean(bal2.map((r) => r.random.effDemonstrators)).toFixed(1),
    effDemOptimal: +mean(bal2.map((r) => r.optimal.effDemonstrators)).toFixed(1),
    scenesRatio: +(mean(bal2.map((r) => r.optimal.scenes / r.random.scenes))).toFixed(2),
    maxGapPct: Math.max(...bal2.map((r) => r.gapPct)),
    medianGapPct: [...bal2.map((r) => r.gapPct)].sort((a, b) => a - b)[bal2.length >> 1],
    optimalBeatsRandomP95Scenes: bal2.filter((r) => r.optimal.scenes > r.randomP95.scenes).length,
  },
  maxGapPctAll: Math.max(...rows.map((r) => r.gapPct)),
  headline: { family: headline.label, budgetH: 2, preset: 'balanced', scenesRandom: headline.random.scenes, scenesOptimal: headline.optimal.scenes, scenesNewest: headline.newest.scenes, effDemRandom: headline.random.effDemonstrators, effDemOptimal: headline.optimal.effDemonstrators, gapPct: headline.gapPct },
};
fs.mkdirSync(new URL('../results/', import.meta.url), { recursive: true });
fs.writeFileSync(new URL('../results/results.json', import.meta.url), JSON.stringify({ generatedFrom: 'data/episodes.json (' + data.fetchedAt + ')', summary, rows }, null, 1));
console.log(JSON.stringify(summary, null, 1));
console.log(`${rows.length} configurations in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
