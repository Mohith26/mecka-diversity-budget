import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  PRESETS, objective, selectDiverse, relaxationBound, fracKnap, hill1, metrics, fillInOrder,
  shuffled, mulberry32, holdOut, capturePlan, buildCut, decodeFamilies, TAU,
} from '../src/diversity.js';
import { stem } from '../src/taxonomy.js';

const data = JSON.parse(fs.readFileSync(new URL('../data/episodes.json', import.meta.url), 'utf8'));
const results = JSON.parse(fs.readFileSync(new URL('../results/results.json', import.meta.url), 'utf8'));
const fams = decodeFamilies(data);
const fam = (k) => fams.find((F) => F.key === k);
const W = PRESETS.balanced.w;

function randomInstance(seed, n) {
  const r = mulberry32(seed);
  return Array.from({ length: n }, () => ({ op: Math.floor(r() * 5), scene: Math.floor(r() * 4) - 1, task: Math.floor(r() * 3), sec: 20 + Math.floor(r() * 160) }));
}
function bruteForceOpt(eps, B, w) {
  let best = 0;
  for (let mask = 0; mask < 1 << eps.length; mask++) {
    let c = 0; const S = [];
    for (let j = 0; j < eps.length; j++) if (mask & (1 << j)) { c += eps[j].sec; S.push(eps[j]); }
    if (c <= B) best = Math.max(best, objective(S, w));
  }
  return best;
}

test('stemming merges label variants into one family', () => {
  assert.equal(stem('folding_clothes'), stem('fold_clothes'));
  assert.equal(stem('cutting_vegetables'), 'cut');
  assert.equal(stem('cleaning shoes'), 'clean');
  assert.ok(fam('fold').taskLabels > 1);
});

test('snapshot decodes: 24 families, every episode positive length, ids in range', () => {
  assert.equal(fams.length, 24);
  for (const F of fams) for (const e of F.eps) {
    assert.ok(e.sec > 0);
    assert.ok(e.op >= 0 && e.op < data.labTotals.demonstrators);
    assert.ok(e.scene >= -1 && e.scene < data.scenes.length);
  }
  assert.equal(data.labTotals.episodes, 41617);
});

test('greedy never exceeds the budget and its f equals the sum of accepted gains', () => {
  for (const F of fams.slice(0, 6)) {
    const sel = selectDiverse(F.eps, 3600, W);
    const used = sel.picked.reduce((a, j) => a + F.eps[j].sec, 0);
    assert.ok(used <= 3600 + 1e-9);
    const f = objective(sel.picked.map((j) => F.eps[j]), W);
    assert.ok(Math.abs(f - sel.f) < 1e-6, `${F.key}: ${f} vs ${sel.f}`);
    assert.ok(Math.abs(sel.steps.reduce((a, s) => a + s.gain, 0) - f) < 1e-6);
  }
});

test('property: certified bounds hold against brute force on 150 coarse random instances', () => {
  for (let seed = 1; seed <= 150; seed++) {
    const eps = randomInstance(seed, 12);
    const B = 200 + (seed % 5) * 90;
    for (const p of Object.values(PRESETS)) {
      const sel = selectDiverse(eps, B, p.w);
      const rel = relaxationBound(eps, B, p.w, TAU, 300, sel.picked);
      const opt = bruteForceOpt(eps, B, p.w);
      assert.ok(sel.f <= opt + 1e-9, `greedy above optimum, seed ${seed}`);
      assert.ok(opt <= sel.ub + 1e-6, `greedy-path bound violated, seed ${seed}: ${opt} > ${sel.ub}`);
      assert.ok(opt <= rel.ub + 1e-6, `relaxation bound violated, seed ${seed}: ${opt} > ${rel.ub}`);
    }
  }
});

test('property: with many episodes per budget (the real regime) the cut is within 1% of optimal on average', () => {
  const ratios = [];
  for (let seed = 1; seed <= 40; seed++) {
    const r = mulberry32(seed);
    const eps = Array.from({ length: 16 }, () => ({ op: Math.floor(r() * 6), scene: Math.floor(r() * 5) - 1, task: Math.floor(r() * 3), sec: 40 + Math.floor(r() * 60) }));
    for (const p of Object.values(PRESETS)) ratios.push(selectDiverse(eps, 900, p.w).f / bruteForceOpt(eps, 900, p.w));
  }
  const mean = ratios.reduce((a, b) => a + b, 0) / ratios.length;
  assert.ok(mean >= 0.99, `mean ratio ${mean}`);
  assert.ok(Math.min(...ratios) >= 0.95, `worst ratio ${Math.min(...ratios)}`);
});

test('property: objective is submodular (diminishing returns) on random chains', () => {
  const r = mulberry32(99);
  for (let t = 0; t < 300; t++) {
    const eps = randomInstance(500 + t, 10);
    const A = eps.slice(0, 3), Bset = eps.slice(0, 7), e = eps[9];
    const w = Object.values(PRESETS)[Math.floor(r() * 3)].w;
    const dA = objective([...A, e], w) - objective(A, w);
    const dB = objective([...Bset, e], w) - objective(Bset, w);
    assert.ok(dA >= dB - 1e-12);
  }
});

test('fractional knapsack takes items by ratio and splits the last one', () => {
  assert.equal(fracKnap([{ g: 10, c: 5 }, { g: 6, c: 2 }, { g: 1, c: 10 }], 6), 6 + 10 * (4 / 5));
  assert.equal(fracKnap([], 100), 0);
});

test('relaxation agrees with f at integral points (chord only below the shortest episode)', () => {
  const F = fam('iron');
  const sel = selectDiverse(F.eps, 1800, W);
  const rel = relaxationBound(F.eps, 1800, W, TAU, 0, sel.picked); // 0 iterations: F(x0)
  assert.ok(Math.abs(rel.relaxed - sel.f) < 1e-6);
});

test('hill number: uniform over k groups gives k, one group gives 1', () => {
  assert.ok(Math.abs(hill1([5, 5, 5, 5]) - 4) < 1e-12);
  assert.equal(hill1([7]), 1);
  assert.equal(hill1([]), 0);
});

test('shuffle is a seeded permutation and fillInOrder keeps order and budget', () => {
  const a = shuffled(50, 3), b = shuffled(50, 3);
  assert.deepEqual(a, b);
  assert.deepEqual([...a].sort((x, y) => x - y), Array.from({ length: 50 }, (_, i) => i));
  const eps = Array.from({ length: 10 }, () => ({ sec: 30 }));
  assert.deepEqual(fillInOrder(eps, [9, 8, 7, 6, 5], 95), [9, 8, 7]);
});

test('held-out demonstrators never appear in the training cut', () => {
  const F = fam('clean');
  const cut = buildCut(F, { budgetH: 2, preset: 'demonstrators', holdK: 4 });
  const held = new Set(cut.holdOut.ops);
  assert.equal(held.size, 4);
  for (const j of cut.optimal.idx) assert.ok(!held.has(F.eps[j].op));
  for (const j of cut.newest.idx) assert.ok(!held.has(F.eps[j].op));
  assert.ok(cut.holdOut.eval.length > 0);
});

test('capture plan: exhausted scenes are fully used by the cut and ranked first', () => {
  const F = fam('mix');
  const sel = selectDiverse(F.eps, 7200, W);
  const plan = capturePlan(F.eps, sel.picked, W);
  const inCut = new Set(sel.picked);
  for (const row of plan.rows.filter((r) => r.exhausted)) {
    const all = F.eps.map((e, j) => [e, j]).filter(([e]) => e.scene === row.scene);
    assert.ok(all.every(([, j]) => inCut.has(j)));
  }
  const firstLive = plan.rows.findIndex((r) => !r.exhausted);
  if (firstLive >= 0) assert.ok(plan.rows.slice(firstLive).every((r) => !r.exhausted));
});

test('diversity cut beats both baselines on the objective in every committed configuration', () => {
  for (const r of results.rows) {
    assert.ok(r.optimal.f >= r.random.f - 1e-9, `${r.family} ${r.budgetH} ${r.preset}`);
    assert.ok(r.optimal.f >= r.newest.f - 1e-9);
    assert.ok(r.gapPct >= 0 && r.gapPct < 10, `${r.family} ${r.budgetH}h ${r.preset}: gap ${r.gapPct}`);
  }
});

test('headline number: Packaging, 2 h, balanced, recomputed from the snapshot', () => {
  const cut = buildCut(fam('packag'), { budgetH: 2, preset: 'balanced', holdK: 0 });
  const h = results.summary.headline;
  assert.equal(cut.optimal.m.scenes, h.scenesOptimal);
  assert.equal(cut.optimal.m.scenes, 90);
  assert.ok(Math.abs(cut.random.mean.scenes - h.scenesRandom) < 0.01);
  assert.ok(Math.abs(100 * cut.optimal.gap - h.gapPct) < 0.01);
  assert.ok(cut.optimal.m.sec <= 7200);
});

test('metrics: max share and pair counts are consistent with the selected rows', () => {
  const F = fam('sort');
  const sel = selectDiverse(F.eps, 3600, W);
  const m = metrics(F.eps, sel.picked, W);
  const pairs = new Set(sel.picked.filter((j) => F.eps[j].scene >= 0).map((j) => F.eps[j].op + ':' + F.eps[j].scene));
  assert.equal(m.pairs, pairs.size);
  assert.ok(m.maxShare > 0 && m.maxShare <= 1);
  assert.ok(m.effDemonstrators <= m.demonstrators + 1e-9);
});
