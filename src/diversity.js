// Diversity budget: pick the most diverse set of episodes that fits an hour budget.
// Pure ES module, no dependencies; used by the page (browser) and the tests/report (node).
//
// Objective (monotone submodular):
//   f(S) = sum_g w_g * sum_{k in groups_g} log(1 + T_k(S) / tau)
// where g ranges over {demonstrator, scene, demonstrator-scene pair, task label} and
// T_k(S) is the seconds of footage in S that belong to group k. A concave function of a
// modular function is submodular, and a non-negative sum of submodular functions is
// submodular, so lazy (CELF) cost-benefit greedy applies and every marginal gain we have
// ever computed is an upper bound on the current one.
//
// Certificate: for any feasible set O (cost <= B), f(O) <= f(S) + sum_{e in O} delta_e(S)
// <= f(S) + FK(S), where FK is the fractional-knapsack optimum of the marginal gains under
// budget B. Stale (lazy) gains are upper bounds, so FK computed on them is still valid.
// We report the tightest bound seen across greedy iterations: gap = 1 - f(S) / UB.

export const PRESETS = {
  demonstrators: { label: 'Unseen demonstrators', w: { op: 1, scene: 0.25, pair: 0.5, task: 0.25 } },
  balanced: { label: 'Balanced', w: { op: 1, scene: 1, pair: 0.5, task: 0.25 } },
  scenes: { label: 'Novel environments', w: { op: 0.25, scene: 1, pair: 0.5, task: 0.25 } },
};
export const FPS = 30;
export const TAU = 60; // seconds; log(1 + T/60): the first minute of a new group counts most

const phi = (x, tau) => Math.log1p(x / tau);

// Episode shape: { i, op, scene (-1 = unlabeled), task, sec }
function keysOf(e) {
  const k = [['op', 'o' + e.op], ['task', 't' + e.task]];
  if (e.scene >= 0) k.push(['scene', 's' + e.scene], ['pair', 'p' + e.op + ':' + e.scene]);
  return k;
}

export function objective(eps, w, tau = TAU) {
  const T = new Map();
  for (const e of eps) for (const [g, k] of keysOf(e)) T.set(g + '|' + k, (T.get(g + '|' + k) || 0) + e.sec);
  let f = 0;
  for (const [gk, t] of T) f += w[gk.split('|')[0]] * phi(t, tau);
  return f;
}

function gainOf(e, T, w, tau) {
  let d = 0;
  for (const [g, k] of keysOf(e)) {
    const wg = w[g];
    if (!wg) continue;
    const t = T.get(k) || 0;
    d += wg * (phi(t + e.sec, tau) - phi(t, tau));
  }
  return d;
}

// Fractional knapsack upper bound on sum of gains of any feasible set.
export function fracKnap(items, budget) {
  // items: [{g, c}] with g >= 0, c > 0
  const s = items.filter((x) => x.g > 0 && x.c > 0).sort((a, b) => b.g / b.c - a.g / a.c);
  let left = budget, v = 0;
  for (const x of s) {
    if (left <= 0) break;
    if (x.c <= left) { v += x.g; left -= x.c; } else { v += (x.g * left) / x.c; left = 0; }
  }
  return v;
}

// Max-heap keyed by ratio.
class Heap {
  constructor() { this.a = []; }
  get size() { return this.a.length; }
  push(x) { const a = this.a; a.push(x); let i = a.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (a[p].r >= a[i].r) break; [a[p], a[i]] = [a[i], a[p]]; i = p; } }
  pop() { const a = this.a, top = a[0], last = a.pop(); if (a.length) { a[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < a.length && a[l].r > a[m].r) m = l; if (r < a.length && a[r].r > a[m].r) m = r; if (m === i) break; [a[m], a[i]] = [a[i], a[m]]; i = m; } } return top; }
}

/**
 * Lazy cost-benefit greedy with knapsack budget and a data-dependent optimality certificate.
 * @param {Array} eps candidate episodes
 * @param {number} budgetSec
 * @param {object} w group weights
 * @returns {{picked:number[], f:number, ub:number, gap:number, used:number, steps:Array, evals:number}}
 */
function greedyPass(eps, budgetSec, w, tau, byRatio) {
  const T = new Map();
  const h = new Heap();
  let evals = 0;
  const stale = new Float64Array(eps.length);
  for (let j = 0; j < eps.length; j++) {
    const e = eps[j];
    if (e.sec <= 0 || e.sec > budgetSec) continue;
    const g = gainOf(e, T, w, tau); evals++;
    stale[j] = g;
    h.push({ j, g, r: byRatio ? g / e.sec : g, round: 0 });
  }
  const picked = [], steps = [];
  let used = 0, f = 0, round = 0;
  const isPicked = new Uint8Array(eps.length);
  // Every non-picked element that fits the full budget could be in an optimal set, including
  // ones the greedy already discarded for not fitting the remaining budget. Stale gains are
  // upper bounds on current gains (submodularity), so the bound stays valid.
  const boundItems = () => { const out = []; for (let j = 0; j < eps.length; j++) if (!isPicked[j] && eps[j].sec <= budgetSec && eps[j].sec > 0) out.push({ g: stale[j], c: eps[j].sec }); return out; };
  let ub = f + fracKnap(boundItems(), budgetSec);
  while (h.size) {
    const top = h.pop();
    const e = eps[top.j];
    if (used + e.sec > budgetSec) continue; // never fits again (budget only shrinks)
    if (top.round !== round) {
      const g = gainOf(e, T, w, tau); evals++;
      stale[top.j] = g;
      top.g = g; top.r = byRatio ? g / e.sec : g; top.round = round;
      h.push(top);
      continue;
    }
    // accept
    for (const [g, k] of keysOf(e)) T.set(k, (T.get(k) || 0) + e.sec);
    used += e.sec; f += top.g; picked.push(top.j); isPicked[top.j] = 1; round++;
    steps.push({ j: top.j, gain: top.g, ratio: top.r });
    if (round % 16 === 0) ub = Math.min(ub, f + fracKnap(boundItems(), budgetSec));
  }
  // Best single element (classic fix for knapsack greedy); the cost-benefit pass almost always wins.
  let bestSingle = -1, bestSingleF = -1;
  for (let j = 0; j < eps.length; j++) {
    if (eps[j].sec > budgetSec) continue;
    const v = gainOf(eps[j], new Map(), w, tau);
    if (v > bestSingleF) { bestSingleF = v; bestSingle = j; }
  }
  let final = picked;
  if (bestSingleF > f) {
    final = [bestSingle]; f = bestSingleF; used = eps[bestSingle].sec;
    T.clear(); for (const [, k] of keysOf(eps[bestSingle])) T.set(k, eps[bestSingle].sec);
  }
  // Exact final certificate on fresh gains.
  const fresh = [];
  const pickedSet = new Set(final);
  for (let j = 0; j < eps.length; j++) {
    if (pickedSet.has(j) || eps[j].sec > budgetSec || eps[j].sec <= 0) continue;
    fresh.push({ g: gainOf(eps[j], T, w, tau), c: eps[j].sec });
  }
  ub = Math.min(ub, f + fracKnap(fresh, budgetSec));
  return { picked: final, f, ub, gap: ub > 0 ? 1 - f / ub : 0, used, steps, evals };
}



// Remove-one / add-one swap search with greedy refill. Only accepts strict improvements, so it
// terminates; candidate adds are limited to the best `width` outside elements by current gain.
function improve(eps, picked, budgetSec, w, tau, maxRounds = 6, width = 160) {
  let S = new Set(picked);
  const totals = (set) => { const T = new Map(); for (const j of set) for (const [, k] of keysOf(eps[j])) T.set(k, (T.get(k) || 0) + eps[j].sec); return T; };
  const lossOf = (j, T) => { let d = 0; for (const [g, k] of keysOf(eps[j])) { const wg = w[g]; if (!wg) continue; const t = T.get(k) || 0; d += wg * (phi(t, tau) - phi(t - eps[j].sec, tau)); } return d; };
  let used = 0; for (const j of S) used += eps[j].sec;
  let evals = 0;
  for (let round = 0; round < maxRounds; round++) {
    let T = totals(S), improved = false;
    const out = [];
    for (let j = 0; j < eps.length; j++) if (!S.has(j) && eps[j].sec <= budgetSec) { out.push([gainOf(eps[j], T, w, tau), j]); evals++; }
    out.sort((a, b) => b[0] - a[0]);
    const cand = out.slice(0, width).map((x) => x[1]);
    const ins = [...S].map((i) => [lossOf(i, T), i]).sort((a, b) => a[0] - b[0]).slice(0, width);
    for (const [loss, i] of ins) {
      if (!S.has(i)) continue;
      // remove i, then try the best single add that fits
      for (const [, k] of keysOf(eps[i])) T.set(k, T.get(k) - eps[i].sec);
      const slack = budgetSec - (used - eps[i].sec);
      let best = -1, bestG = loss + 1e-9;
      for (const j of cand) { if (S.has(j) || j === i || eps[j].sec > slack) continue; const g = gainOf(eps[j], T, w, tau); evals++; if (g > bestG) { bestG = g; best = j; } }
      if (best >= 0) {
        S.delete(i); S.add(best); used += eps[best].sec - eps[i].sec; improved = true;
        for (const [, k] of keysOf(eps[best])) T.set(k, (T.get(k) || 0) + eps[best].sec);
      } else {
        for (const [, k] of keysOf(eps[i])) T.set(k, (T.get(k) || 0) + eps[i].sec);
      }
    }
    // refill any slack greedily
    for (const [, j] of out) { if (!S.has(j) && used + eps[j].sec <= budgetSec) { const g = gainOf(eps[j], T, w, tau); if (g > 0) { S.add(j); used += eps[j].sec; for (const [, k] of keysOf(eps[j])) T.set(k, (T.get(k) || 0) + eps[j].sec); improved = true; } } }
    if (!improved) break;
  }
  return { picked: [...S], evals };
}

/**
 * Best of cost-benefit and plain-gain lazy greedy, then swap search. The data-dependent
 * certificate from the cost-benefit pass stays valid for any feasible set.
 */
export function selectDiverse(eps, budgetSec, w, tau = TAU) {
  const a = greedyPass(eps, budgetSec, w, tau, true);
  const b = greedyPass(eps, budgetSec, w, tau, false);
  let base = b.f > a.f ? b : a;
  const imp = improve(eps, base.picked, budgetSec, w, tau);
  const sel = imp.picked.map((j) => eps[j]);
  const f = objective(sel, w, tau);
  let picked = base.picked, steps = base.steps;
  if (f > base.f + 1e-12) {
    // re-derive the order and per-step gains of the improved set (greedy order within S)
    const order = greedyPass(imp.picked.map((j) => eps[j]), Infinity, w, tau, false);
    picked = order.picked.map((k) => imp.picked[k]);
    steps = order.steps.map((s) => ({ ...s, j: imp.picked[s.j] }));
  }
  const fFinal = Math.max(f, base.f);
  const ub = Math.min(a.ub, b.ub); // each is a valid bound on the optimum of any feasible set
  return { picked, f: fFinal, ub, gap: ub > 0 ? 1 - fFinal / ub : 0, used: picked.reduce((x, j) => x + eps[j].sec, 0), steps, evals: a.evals + b.evals + imp.evals };
}

// Convex-relaxation certificate (Frank-Wolfe) --------------------------------
// f(S) = sum_k w_k phi(T_k(S)), phi(t) = log(1 + t/tau). An episode is atomic, so every group
// total T_k is either 0 or at least m_k (the shortest episode in group k). Replace phi on
// [0, m_k] by its chord: psi_k(t) = t * phi(m_k)/m_k for t < m_k, phi(t) otherwise. psi_k is
// concave (chord slope >= phi'(m_k)) and equals phi at every reachable integral total, so
//   F(x) = sum_k w_k psi_k(sum_{e in k} x_e c_e)
// is concave on [0,1]^n and agrees with f on integral x. Hence the best integral cut is
// <= max F over the relaxed polytope {x in [0,1]^n : sum x_e c_e <= B}. Frank-Wolfe's
// duality gap bounds that maximum: max F <= F(x) + max_s grad F(x).(s - x), where the linear
// step is a fractional knapsack (sort by gradient per second). Exact line search; we keep
// the smallest bound seen. Without the chord the relaxation splits episodes into slivers
// and the bound is 15-25% looser.
export function relaxationBound(eps, budgetSec, w, tau = TAU, iters = 400, x0 = null) {
  const n = eps.length;
  const gid = new Map(); const gw = []; const gm = []; const mem = [];
  for (let j = 0; j < n; j++) {
    const ids = [];
    for (const [g, k] of keysOf(eps[j])) {
      if (!w[g]) continue;
      let id = gid.get(k);
      if (id === undefined) { id = gw.length; gid.set(k, id); gw.push(w[g]); gm.push(Infinity); }
      if (eps[j].sec > 0 && eps[j].sec <= budgetSec) gm[id] = Math.min(gm[id], eps[j].sec);
      ids.push(id);
    }
    mem.push(ids);
  }
  const G = gw.length, c = eps.map((e) => e.sec);
  const slope0 = gm.map((m) => (Number.isFinite(m) ? Math.log1p(m / tau) / m : 1 / tau));
  const psi = (i, t) => (t < gm[i] ? t * slope0[i] : Math.log1p(t / tau));
  const dpsi = (i, t) => (t < gm[i] ? slope0[i] : 1 / (tau + t));
  const x = new Float64Array(n);
  if (x0) for (const j of x0) x[j] = 1;
  const T = new Float64Array(G);
  for (let j = 0; j < n; j++) if (x[j]) for (const id of mem[j]) T[id] += x[j] * c[j];
  const F = (TT) => { let v = 0; for (let i = 0; i < G; i++) v += gw[i] * psi(i, TT[i]); return v; };
  const order = Array.from({ length: n }, (_, j) => j);
  const ratio = new Float64Array(n), s = new Float64Array(n), D = new Float64Array(G);
  let best = Infinity, Fx = F(T), it = 0;
  for (; it < iters; it++) {
    for (let j = 0; j < n; j++) { let r = 0; for (const id of mem[j]) r += gw[id] * dpsi(id, T[id]); ratio[j] = r; }
    order.sort((a, b) => ratio[b] - ratio[a]);
    s.fill(0);
    let left = budgetSec;
    for (const j of order) { if (left <= 0) break; if (c[j] > budgetSec || c[j] <= 0) continue; const t = Math.min(1, left / c[j]); s[j] = t; left -= t * c[j]; }
    let gap = 0;
    for (let j = 0; j < n; j++) gap += ratio[j] * c[j] * (s[j] - x[j]);
    best = Math.min(best, Fx + Math.max(0, gap));
    if (gap < 1e-7 * Math.max(1, Fx)) break;
    D.fill(0);
    for (let j = 0; j < n; j++) { const dj = (s[j] - x[j]) * c[j]; if (dj) for (const id of mem[j]) D[id] += dj; }
    const dF = (g) => { let v = 0; for (let i = 0; i < G; i++) if (D[i]) v += gw[i] * D[i] * dpsi(i, T[i] + g * D[i]); return v; };
    let lo = 0, hi = 1, step;
    if (dF(1) >= 0) step = 1; else { for (let k = 0; k < 40; k++) { const mid = (lo + hi) / 2; if (dF(mid) > 0) lo = mid; else hi = mid; } step = lo; }
    if (step === 0) step = 1e-6;
    for (let j = 0; j < n; j++) x[j] += step * (s[j] - x[j]);
    for (let i = 0; i < G; i++) T[i] += step * D[i];
    Fx = F(T);
  }
  return { ub: best, relaxed: Fx, iters: it };
}

// Baselines --------------------------------------------------------------
export function fillInOrder(eps, order, budgetSec) {
  const out = []; let used = 0;
  for (const j of order) { const s = eps[j].sec; if (used + s <= budgetSec) { out.push(j); used += s; } }
  return out;
}

export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
export function shuffled(n, seed) {
  const r = mulberry32(seed), a = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

// Metrics ---------------------------------------------------------------
export function hill1(values) {
  const tot = values.reduce((a, b) => a + b, 0);
  if (!tot) return 0;
  let H = 0;
  for (const v of values) if (v > 0) { const p = v / tot; H -= p * Math.log(p); }
  return Math.exp(H);
}

export function metrics(eps, idx, w, tau = TAU) {
  const op = new Map(), sc = new Map(), pair = new Set(), task = new Set();
  let sec = 0;
  for (const j of idx) {
    const e = eps[j]; sec += e.sec;
    op.set(e.op, (op.get(e.op) || 0) + e.sec);
    if (e.scene >= 0) { sc.set(e.scene, (sc.get(e.scene) || 0) + e.sec); pair.add(e.op + ':' + e.scene); }
    task.add(e.task);
  }
  const opv = [...op.values()];
  return {
    episodes: idx.length,
    sec,
    demonstrators: op.size,
    effDemonstrators: hill1(opv),
    maxShare: sec ? Math.max(0, ...opv) / sec : 0,
    scenes: sc.size,
    effScenes: hill1([...sc.values()]),
    pairs: pair.size,
    tasks: task.size,
    f: objective(idx.map((j) => eps[j]), w, tau),
  };
}

export function randomBaseline(eps, budgetSec, w, seeds = 50, tau = TAU) {
  const runs = [];
  for (let s = 1; s <= seeds; s++) runs.push(metrics(eps, fillInOrder(eps, shuffled(eps.length, 1000 + s), budgetSec), w, tau));
  const keys = Object.keys(runs[0]);
  const mean = {}, lo = {}, hi = {};
  for (const k of keys) {
    const v = runs.map((r) => r[k]).sort((a, b) => a - b);
    mean[k] = v.reduce((a, b) => a + b, 0) / v.length;
    lo[k] = v[Math.floor(0.05 * (v.length - 1))];
    hi[k] = v[Math.ceil(0.95 * (v.length - 1))];
  }
  return { mean, lo, hi, seeds };
}

// Held-out demonstrators for an unseen-demonstrator eval (paper protocol): seeded pick among
// demonstrators with at least minSec of footage; their episodes never enter the training cut.
export function holdOut(eps, k, seed = 7, minSec = 120) {
  if (!k) return { ops: [], eval: [] };
  const tot = new Map();
  for (const e of eps) tot.set(e.op, (tot.get(e.op) || 0) + e.sec);
  const elig = [...tot].filter(([, s]) => s >= minSec).map(([o]) => o).sort((a, b) => a - b);
  const order = shuffled(elig.length, seed);
  const ops = order.slice(0, Math.min(k, elig.length)).map((i) => elig[i]);
  const set = new Set(ops);
  const ev = [];
  eps.forEach((e, j) => { if (set.has(e.op)) ev.push(j); });
  return { ops, eval: ev };
}

// Capture plan: which labeled scenes would add the most diversity per new minute, if a new
// demonstrator recorded there? Value = d/dt of the objective for one median-length episode by
// an unseen demonstrator in that scene, given the current cut. Exhausted = every available
// episode in that scene is already in the cut.
export function capturePlan(eps, idx, w, tau = TAU, top = 8) {
  const inCut = new Set(idx), T = new Map(), avail = new Map(), used = new Map();
  for (const j of idx) for (const [, k] of keysOf(eps[j])) T.set(k, (T.get(k) || 0) + eps[j].sec);
  const secs = eps.map((e) => e.sec).sort((a, b) => a - b);
  const d = secs.length ? secs[secs.length >> 1] : 60;
  for (let j = 0; j < eps.length; j++) {
    const s = eps[j].scene; if (s < 0) continue;
    avail.set(s, (avail.get(s) || 0) + eps[j].sec);
    if (inCut.has(j)) used.set(s, (used.get(s) || 0) + eps[j].sec);
  }
  const rows = [];
  for (const [s, a] of avail) {
    const t = T.get('s' + s) || 0;
    const gain = w.op * phi(d, tau) + w.pair * phi(d, tau) + w.scene * (phi(t + d, tau) - phi(t, tau));
    rows.push({ scene: s, availSec: a, usedSec: used.get(s) || 0, exhausted: (used.get(s) || 0) >= a - 1e-9, perMin: (gain / d) * 60 });
  }
  rows.sort((x, y) => (y.exhausted - x.exhausted) || (y.perMin - x.perMin));
  return { medianSec: d, rows: rows.slice(0, top), exhaustedCount: rows.filter((r) => r.exhausted).length, scenes: rows.length };
}

export function buildCut(fam, opts) {
  const { budgetH, preset, holdK = 0 } = opts;
  const w = PRESETS[preset].w;
  const all = fam.eps;
  const ho = holdOut(all, holdK);
  const hoSet = new Set(ho.ops);
  const pool = []; const map = [];
  all.forEach((e, j) => { if (!hoSet.has(e.op)) { pool.push(e); map.push(j); } });
  const B = budgetH * 3600;
  const sel = selectDiverse(pool, B, w);
  const rel = relaxationBound(pool, B, w, TAU, 400, sel.picked);
  sel.ub = Math.min(sel.ub, rel.ub); sel.gap = sel.ub > 0 ? 1 - sel.f / sel.ub : 0;
  const optIdx = sel.picked.map((j) => map[j]);
  const newest = fillInOrder(all, fam.newestOrder.filter((j) => !hoSet.has(all[j].op)), B);
  const rnd = randomBaseline(pool, B, w);
  return {
    w, B, holdOut: ho,
    optimal: { idx: optIdx, steps: sel.steps.map((s) => ({ j: map[s.j], gain: s.gain, ratio: s.ratio })), m: metrics(all, optIdx, w), ub: sel.ub, gap: sel.gap, evals: sel.evals },
    newest: { idx: newest, m: metrics(all, newest, w) },
    random: rnd,
    plan: capturePlan(pool, sel.picked, w),
    poolSec: pool.reduce((a, e) => a + e.sec, 0),
  };
}

// Data loading helpers (shared by page and tests) -------------------------
export function decodeFamilies(data) {
  // data.eps columns: h (hash), o (op), s (scene or -1), t (task), f (frames), c (created order rank: 0 newest)
  const fams = data.families.map((F) => {
    const eps = F.rows.map((r) => ({ i: r, h: data.eps.h[r], op: data.eps.o[r], scene: data.eps.s[r], task: data.eps.t[r], frames: data.eps.f[r], sec: data.eps.f[r] / FPS, rank: data.eps.c[r] }));
    const newestOrder = eps.map((_, j) => j).sort((a, b) => eps[a].rank - eps[b].rank);
    return { ...F, eps, newestOrder };
  });
  return fams;
}
