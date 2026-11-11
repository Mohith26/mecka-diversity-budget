import { PRESETS, decodeFamilies, buildCut, TAU } from '../src/diversity.js';

const $ = (s, r = document) => r.querySelector(s);
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = (n) => Number(n).toLocaleString('en-US');
const pretty = (s) => String(s || '').replaceAll('_', ' ');
const dur = (sec) => { sec = Math.round(sec); const m = Math.floor(sec / 60), s = sec % 60; return m ? `${m}m ${String(s).padStart(2, '0')}s` : `${s}s`; };
const hm = (sec) => { const m = Math.round(sec / 60); return `${Math.floor(m / 60)}h ${m % 60}m`; };
const pct = (x, d = 1) => (100 * x).toFixed(d) + '%';
const demo = (op) => 'D-' + String(op + 1).padStart(4, '0');
const PAGE = 18;
const BUDGETS = [1, 2, 4, 8];
const HOLDS = [0, 2, 4];
const SAVED_KEY = 'mecka.egoverse.cuts.v1';
const STATE_KEY = 'mecka.egoverse.state.v1';

const I = {
  database: '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5V19A9 3 0 0 0 21 19V5"/><path d="M3 12A9 3 0 0 0 21 12"/>',
  clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16.5 12"/>',
  sparkles: '<path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/><path d="M20 3v4"/><path d="M22 5h-4"/><path d="M4 17v2"/><path d="M5 18H3"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  search: '<path d="m21 21-4.34-4.34"/><circle cx="11" cy="11" r="8"/>',
  moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>',
  download: '<path d="M12 15V3"/><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/>',
  bookmark: '<path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/>',
  link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
  layers: '<path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"/><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"/>',
  table: '<path d="M12 3v18"/><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M3 15h18"/>',
  video: '<path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5"/><rect x="2" y="6" width="14" height="12" rx="2"/>',
  shield: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>',
  x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  keyboard: '<path d="M10 8h.01"/><path d="M12 12h.01"/><path d="M14 8h.01"/><path d="M16 12h.01"/><path d="M18 8h.01"/><path d="M6 8h.01"/><path d="M7 16h10"/><path d="M8 12h.01"/><rect width="20" height="16" x="2" y="4" rx="2"/>',
  map: '<path d="M14.106 5.553a2 2 0 0 0 1.788 0l3.659-1.83A1 1 0 0 1 21 4.619v12.764a1 1 0 0 1-.553.894l-4.553 2.277a2 2 0 0 1-1.788 0l-4.212-2.106a2 2 0 0 0-1.788 0l-3.659 1.83A1 1 0 0 1 3 19.381V6.618a1 1 0 0 1 .553-.894l4.553-2.277a2 2 0 0 1 1.788 0z"/><path d="M15 5.764v15"/><path d="M9 3.236v15"/>',
};
const icon = (n, s = 18) => `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${I[n]}</svg>`;

let DATA = null, FAMS = null;
const details = new Map();
let cut = null, cutKey = '', autoEp = '';
const st = { family: 'packag', h: 2, obj: 'balanced', hold: 0, view: 'cut', ep: '', page: 0, q: '' };

// ---------- state <-> URL / storage ----------
function readHash() {
  const p = new URLSearchParams(location.hash.slice(1));
  if (![...p.keys()].length) { try { Object.assign(st, JSON.parse(localStorage.getItem(STATE_KEY) || '{}')); } catch {} return; }
  if (p.get('family')) st.family = p.get('family');
  if (p.get('h')) st.h = +p.get('h');
  if (p.get('obj') && PRESETS[p.get('obj')]) st.obj = p.get('obj');
  if (p.get('hold')) st.hold = +p.get('hold');
  if (p.get('view')) st.view = p.get('view') === 'browse' ? 'browse' : 'cut';
  st.ep = p.get('ep') || '';
  st.q = p.get('q') || '';
  st.page = +(p.get('page') || 0);
}
function writeHash() {
  const p = new URLSearchParams({ family: st.family, h: st.h, obj: st.obj, hold: st.hold, view: st.view });
  if (st.ep) p.set('ep', st.ep);
  if (st.q) p.set('q', st.q);
  if (st.page) p.set('page', st.page);
  history.replaceState(null, '', '#' + p.toString());
  try { localStorage.setItem(STATE_KEY, JSON.stringify({ family: st.family, h: st.h, obj: st.obj, hold: st.hold, view: st.view })); } catch {}
}
const saved = () => { try { const v = JSON.parse(localStorage.getItem(SAVED_KEY) || '[]'); return Array.isArray(v) ? v : []; } catch { return []; } };
const setSaved = (v) => localStorage.setItem(SAVED_KEY, JSON.stringify(v));

function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 2600); }

// ---------- data ----------
const fam = () => FAMS.find((F) => F.key === st.family) || FAMS[0];
const famSec = (F) => F.eps.reduce((a, e) => a + e.sec, 0);
const budgetsFor = (F) => BUDGETS.filter((b) => b * 3600 <= famSec(F) / 2);

function ensureValid() {
  if (!FAMS.some((F) => F.key === st.family)) st.family = 'packag';
  const bs = budgetsFor(fam());
  if (!bs.includes(st.h)) st.h = bs.includes(2) ? 2 : bs[bs.length - 1];
  if (!HOLDS.includes(st.hold)) st.hold = 0;
}

function compute() {
  const key = [st.family, st.h, st.obj, st.hold].join('|');
  if (key === cutKey && cut) return;
  const F = fam();
  const t0 = performance.now();
  cut = buildCut(F, { budgetH: st.h, preset: st.obj, holdK: st.hold });
  cut.ms = performance.now() - t0;
  cut.F = F;
  cut.order = new Map(cut.optimal.idx.map((j, k) => [j, k]));
  cut.gain = new Map(cut.optimal.steps.map((s) => [s.j, s.gain]));
  cutKey = key;
}

async function loadDetails(F) {
  if (details.has(F.key)) return details.get(F.key);
  const p = fetch(`data/details/${F.key}.json`).then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); });
  details.set(F.key, p);
  try { return await p; } catch (e) { details.delete(F.key); throw e; }
}

// ---------- rendering ----------
function renderStats() {
  const F = fam();
  const ops = new Set(F.eps.map((e) => e.op)).size;
  const cards = [
    ['database', fmt(F.eps.length), 'Filtered episodes'],
    ['clock', hm(famSec(F)), 'Filtered duration'],
    ['sparkles', fmt(F.taskLabels), 'Tasks represented'],
    ['users', fmt(ops), 'Demonstrators'],
  ];
  $('#stats').innerHTML = cards.map(([i, v, l]) => `<div class="eg-explorerStatCard">${icon(i)}<strong>${v}</strong><span>${l}</span></div>`).join('');
}

function sel(id, label, opts, value, extra = '') {
  return `<label class="eg-filterField" for="${id}"><span class="eg-filterLabel">${label}</span><select id="${id}" class="eg-filterSelect" ${extra}>${opts.map(([v, t, dis]) => `<option value="${esc(v)}" ${String(v) === String(value) ? 'selected' : ''} ${dis ? 'disabled' : ''}>${esc(t)}</option>`).join('')}</select></label>`;
}

function renderFilters() {
  const F = fam();
  const bs = budgetsFor(F);
  $('#filters').innerHTML = `<div class="eg-filterGrid">
    <label class="eg-filterField eg-filterFieldWide" for="eg-search"><div class="eg-searchField">${icon('search', 14)}<input id="eg-search" class="eg-searchInput" placeholder="Search episodes..." value="${esc(st.q)}" aria-label="Search episodes by task or scene"></div></label>
    ${sel('eg-lab', 'Lab', [['mecka', 'mecka']], 'mecka', 'aria-label="Lab"')}
    ${sel('eg-task', 'Task', FAMS.map((G) => [G.key, `${G.label} · ${hm(famSec(G))}`]), st.family)}
    ${sel('eg-budget', 'Budget', BUDGETS.map((b) => [b, `${b}h of footage`, !bs.includes(b)]), st.h)}
    ${sel('eg-obj', 'Optimize for', Object.entries(PRESETS).map(([k, p]) => [k, p.label]), st.obj)}
    ${sel('eg-hold', 'Eval hold-out', HOLDS.map((k) => [k, k ? `${k} demonstrators` : 'None']), st.hold)}
    <div class="eg-filterField"><button type="button" class="eg-primaryAction" id="eg-build" title="Build cut (B)">Build cut</button></div>
  </div>
  <div class="eg-filterFooter"><div class="eg-filterTokens">
    <span class="eg-filterToken">Lab: mecka</span>
    <span class="eg-filterToken">Task: ${esc(F.label)} · ${fmt(F.taskLabels)} labels merged</span>
    <span class="eg-filterToken">Budget: ${st.h}h</span>
    <span class="eg-filterToken">${esc(PRESETS[st.obj].label)}</span>
    ${st.hold ? `<span class="eg-filterToken">Hold-out: ${st.hold} demonstrators</span>` : ''}
  </div><span class="eg-filterHint">Scenes and demonstrators weighted per the EgoVerse diversity study</span></div>`;
}

function renderModes() {
  const n = saved().length;
  $('#modes').innerHTML = `<div class="eg-modeSwitch" role="tablist" aria-label="Explorer view">
      <button role="tab" type="button" class="eg-modeTab ${st.view === 'browse' ? 'is-active' : ''}" data-view="browse" aria-selected="${st.view === 'browse'}">${icon('table', 15)}Browse episodes</button>
      <button role="tab" type="button" class="eg-modeTab ${st.view === 'cut' ? 'is-active' : ''}" data-view="cut" aria-selected="${st.view === 'cut'}">${icon('layers', 15)}Diversity budget<span class="eg-newChip">New</span></button>
    </div>
    <div class="eg-modeMeta">${cut ? `<span>Built in ${Math.max(1, Math.round(cut.ms))} ms in your browser</span><span class="eg-dot"></span>` : ''}<button type="button" class="eg-linkButton" id="eg-saved">${icon('bookmark', 14)}Saved cuts <b>${n}</b></button><button type="button" class="eg-linkButton" id="eg-help" title="Keyboard shortcuts (?)">${icon('keyboard', 14)}Shortcuts</button></div>`;
}

const ROWS = [
  ['scenes', 'Scenes', (m) => fmt(Math.round(m.scenes))],
  ['effDemonstrators', 'Eff. demonstrators', (m) => m.effDemonstrators.toFixed(1)],
  ['pairs', 'Pairs', (m) => fmt(Math.round(m.pairs))],
  ['maxShare', 'Top share', (m) => pct(m.maxShare)],
];
function renderCompare() {
  if (st.view !== 'cut') { $('#compare').innerHTML = ''; return; }
  const c = cut;
  const cols = [
    ['Newest first', 'What paging the filtered list gives you', c.newest.m, false],
    ['Random draw', `Mean of ${c.random.seeds} seeded draws`, c.random.mean, false],
    ['Diversity budget', `Certified within ${pct(c.optimal.gap)} of the best possible cut`, c.optimal.m, true],
  ];
  $('#compare').innerHTML = `<div class="eg-compareGrid" aria-label="Same budget, three ways to fill it">${cols.map(([t, s, m, hi]) => `
    <div class="eg-compareCard ${hi ? 'is-best' : ''}">
      <div class="eg-compareHead"><span class="eg-compareTitle">${t}</span>${hi ? '<span class="eg-tableBadgeEval">Selected</span>' : ''}</div>
      <p class="eg-compareSub">${esc(s)}</p>
      <dl>${ROWS.map(([k, l, f]) => `<div><dt>${l}</dt><dd>${f(m)}</dd></div>`).join('')}</dl>
    </div>`).join('')}</div>`;
}

function filteredIdx() {
  const F = cut.F;
  const base = st.view === 'cut' ? cut.optimal.idx : F.newestOrder;
  const q = st.q.trim().toLowerCase();
  if (!q) return base;
  return base.filter((j) => { const e = F.eps[j]; return pretty(DATA.tasks[e.task]).includes(q) || (e.scene >= 0 && pretty(DATA.scenes[e.scene]).includes(q)) || e.h.toLowerCase().startsWith(q) || demo(e.op).toLowerCase() === q; });
}

function renderLayout() {
  const F = cut.F, idx = filteredIdx();
  const pages = Math.max(1, Math.ceil(idx.length / PAGE));
  if (st.page >= pages) st.page = pages - 1;
  const rows = idx.slice(st.page * PAGE, st.page * PAGE + PAGE);
  const isCut = st.view === 'cut';
  // Like the production explorer, Browse opens with the first row of the page selected.
  autoEp = !isCut && !st.ep && rows.length ? F.eps[rows[0]].h : '';
  const selH = st.ep || autoEp;
  const visSec = rows.reduce((a, j) => a + F.eps[j].sec, 0);
  const summary = isCut
    ? `<div><strong>${fmt(idx.length)}</strong><span> episodes in cut${st.q ? ' matching search' : ''} · ${st.hold ? `${st.hold} demonstrators held out` : 'no hold-out'}</span></div><div><strong>${hm(cut.optimal.m.sec)}</strong><span> of ${st.h}h budget</span></div>`
    : `<div><strong>${rows.length}</strong><span> visible on this page of ${fmt(idx.length)}</span></div><div><strong>${dur(visSec).replace(/ \d+s$/, '')}</strong><span> visible duration</span></div>`;
  let table;
  if (!rows.length) {
    table = `<div class="eg-emptyInline"><h3>No episodes match “${esc(st.q)}”</h3><p>Try a task word like “screws” or a scene like “workshop”.</p><button type="button" class="eg-secondaryAction" id="eg-clearq">Clear search</button></div>`;
  } else if (isCut) {
    const maxG = Math.max(...cut.optimal.steps.map((s) => s.gain));
    table = `<table class="eg-explorerTable eg-cutTable"><thead><tr><th>#</th><th>Task</th><th>Demonstrator</th><th>Duration</th><th><abbr title="Marginal diversity gain when the episode was added">Gain</abbr></th></tr></thead><tbody>${rows.map((j) => {
      const e = F.eps[j], g = cut.gain.get(j) || 0;
      return `<tr data-j="${j}" tabindex="0" aria-selected="${st.ep === e.h}" class="${st.ep === e.h ? 'eg-tableRowSelected' : ''}"><td class="eg-num">${cut.order.get(j) + 1}</td><td class="eg-taskCell"><strong>${esc(pretty(DATA.tasks[e.task]))}</strong><span>${e.scene >= 0 ? esc(pretty(DATA.scenes[e.scene])) : 'Scene pending'}</span></td><td class="eg-mono">${demo(e.op)}</td><td>${dur(e.sec)}</td><td><div class="eg-gain"><b><i style="width:${(100 * g) / maxG}%"></i></b><span>${g.toFixed(2)}</span></div></td></tr>`;
    }).join('')}</tbody></table>`;
  } else {
    const inCut = new Set(cut.optimal.idx), held = new Set(cut.holdOut.ops);
    table = `<table class="eg-explorerTable"><thead><tr><th>Task</th><th>Lab</th><th>Operator</th><th>Frames</th><th>Duration</th><th></th></tr></thead><tbody>${rows.map((j) => {
      const e = F.eps[j];
      const badge = held.has(e.op) ? '<span class="eg-tableBadgeTrain">Eval</span>' : inCut.has(j) ? '<span class="eg-tableBadgeEval">In cut</span>' : '';
      return `<tr data-j="${j}" tabindex="0" aria-selected="${selH === e.h}" class="${selH === e.h ? 'eg-tableRowSelected' : ''}"><td class="eg-taskCell"><strong>${esc(pretty(DATA.tasks[e.task]))}</strong><span>${e.scene >= 0 ? esc(pretty(DATA.scenes[e.scene])) : 'Scene pending'}</span></td><td>mecka</td><td>${demo(e.op)}</td><td>${fmt(e.frames)}</td><td>${dur(e.sec)}</td><td>${badge}</td></tr>`;
    }).join('')}</tbody></table>`;
  }
  $('#layout').innerHTML = `<div class="eg-tablePane">
      <div class="eg-tableSummary">${summary}</div>
      <div class="eg-tableScroller">${table}</div>
      <div class="eg-paginationBar"><span class="eg-paginationText">Page ${st.page + 1} of ${pages}</span><span class="eg-kbdHint"><kbd>j</kbd><kbd>k</kbd> move · <kbd>Enter</kbd> open · <kbd>Esc</kbd> summary</span><div class="eg-paginationActions"><button type="button" class="${st.page ? 'eg-paginationLink' : 'eg-paginationLinkDisabled'}" id="eg-prev" ${st.page ? '' : 'disabled'}>Previous</button><button type="button" class="${st.page < pages - 1 ? 'eg-paginationLink' : 'eg-paginationLinkDisabled'}" id="eg-next" ${st.page < pages - 1 ? '' : 'disabled'}>Next</button></div></div>
    </div>
    <aside class="eg-detailPane" id="detail" aria-live="polite"></aside>`;
  renderDetail();
}

function coverageSvg() {
  // minutes per demonstrator, sorted, for the cut and one representative random draw (seed 1)
  const F = cut.F;
  const per = (idx) => { const m = new Map(); for (const j of idx) m.set(F.eps[j].op, (m.get(F.eps[j].op) || 0) + F.eps[j].sec / 60); return [...m.values()].sort((a, b) => b - a); };
  const a = per(cut.optimal.idx), b = per(cut.newest.idx);
  const n = Math.max(a.length, b.length), mx = Math.max(a[0] || 0, b[0] || 0) || 1;
  const W = 300, H = 112, bw = W / n;
  const bars = (arr, cls) => arr.map((v, i) => `<rect class="${cls}" x="${(i * bw).toFixed(2)}" y="${(H - (H * v) / mx).toFixed(2)}" width="${Math.max(0.6, bw - 0.4).toFixed(2)}" height="${((H * v) / mx).toFixed(2)}"/>`).join('');
  return `<svg class="eg-coverage" viewBox="0 0 ${W} ${H + 18}" role="img" aria-label="Minutes per demonstrator, sorted: ${a.length} demonstrators in the cut versus ${b.length} in newest-first">
    <line x1="0" x2="${W}" y1="${H}" y2="${H}" class="eg-axis"/>${bars(b, 'eg-barMuted')}${bars(a, 'eg-barAccent')}
    <text x="0" y="${H + 14}">${mx.toFixed(1)} min max</text><text x="${W}" y="${H + 14}" text-anchor="end">${n} demonstrators</text></svg>
    <div class="eg-legend"><span><i class="a"></i>Diversity budget · ${a.length}</span><span><i class="m"></i>Newest first · ${b.length}</span></div>`;
}

function summaryPane() {
  const c = cut, o = c.optimal, F = c.F;
  const plan = c.plan;
  const list = saved();
  return `<div class="eg-detailHeader"><p class="eg-detailEyebrow">Diversity budget</p><h3>${esc(F.label)} · ${st.h}h cut</h3><p>${fmt(o.m.episodes)} episodes chosen from ${fmt(F.eps.length)} to maximize coverage of demonstrators and scenes.</p></div>
    <div class="eg-certificate">${icon('shield', 16)}<div><strong>Certified within ${pct(o.gap)} of the best possible cut</strong><span>Objective ${o.m.f.toFixed(1)} · upper bound ${o.ub.toFixed(1)} from a convex relaxation</span></div></div>
    <div class="eg-detailMetaGrid">
      <div><span>Scenes</span><strong>${o.m.scenes} <em>vs ${c.random.mean.scenes.toFixed(0)} random</em></strong></div>
      <div><span>Demonstrators</span><strong>${o.m.demonstrators} <em>vs ${c.random.mean.demonstrators.toFixed(0)} random</em></strong></div>
      <div><span>Footage used</span><strong>${hm(o.m.sec)}</strong></div>
      <div><span>Task labels</span><strong>${o.m.tasks} <em>of ${F.taskLabels}</em></strong></div>
    </div>
    <div class="eg-detailBlock"><span class="eg-detailBlockLabel">Minutes per demonstrator</span>${coverageSvg()}</div>
    <div class="eg-detailBlock"><span class="eg-detailBlockLabel">Capture next</span>
      <p class="eg-blockNote">${plan.exhaustedCount} of ${plan.scenes} labeled scenes are fully used by this cut. New footage there from a new demonstrator adds the most diversity per minute.</p>
      <div class="eg-planHead"><span>Scene</span><span>Diversity per new minute</span></div><ol class="eg-planList">${plan.rows.slice(0, 5).map((r) => `<li><span>${esc(pretty(DATA.scenes[r.scene]))}</span>${r.exhausted ? '<span class="eg-statusChip">Exhausted</span>' : ''}<b>${r.perMin.toFixed(2)}</b></li>`).join('')}</ol>
    </div>
    <div class="eg-actionRow">
      <button type="button" class="eg-primaryAction" id="eg-save">${icon('bookmark', 16)}Save cut</button>
      <button type="button" class="eg-secondaryAction" id="eg-csv">${icon('download', 16)}CSV</button>
      <button type="button" class="eg-secondaryAction" id="eg-json">${icon('download', 16)}Manifest</button>
      <button type="button" class="eg-secondaryAction eg-iconOnly" id="eg-copy" aria-label="Copy link" title="Copy link">${icon('link', 16)}</button>
    </div>
    ${list.length ? `<div class="eg-detailBlock" id="eg-savedList"><span class="eg-detailBlockLabel">Saved cuts</span><ul class="eg-savedList">${list.slice(0, 6).map((s, i) => `<li><button type="button" class="eg-savedLoad" data-i="${i}"><strong>${esc(s.name)}</strong><span>${esc(s.when)} · ${s.scenes} scenes · within ${s.gap}</span></button><button type="button" class="eg-savedDel" data-i="${i}" aria-label="Delete saved cut">${icon('x', 14)}</button></li>`).join('')}</ul></div>` : ''}`;
}

function why(j) {
  // decompose the gain at the moment of selection: recompute group totals from earlier picks
  const F = cut.F, w = cut.w, k = cut.order.get(j);
  if (k === undefined) return '';
  const T = new Map();
  const add = (e) => { for (const key of ['o' + e.op, 't' + e.task, ...(e.scene >= 0 ? ['s' + e.scene, 'p' + e.op + ':' + e.scene] : [])]) T.set(key, (T.get(key) || 0) + e.sec); };
  for (let i = 0; i < k; i++) add(F.eps[cut.optimal.idx[i]]);
  const e = F.eps[j], ph = (x) => Math.log1p(x / TAU);
  const part = (wt, key) => { const t = T.get(key) || 0; return { v: wt * (ph(t + e.sec) - ph(t)), fresh: !t, prior: t }; };
  const parts = [
    ['Demonstrator', demo(e.op), part(w.op, 'o' + e.op)],
    ['Scene', e.scene >= 0 ? pretty(DATA.scenes[e.scene]) : 'unlabeled', e.scene >= 0 ? part(w.scene, 's' + e.scene) : { v: 0, fresh: false, prior: 0 }],
    ['Pair', 'demonstrator × scene', e.scene >= 0 ? part(w.pair, 'p' + e.op + ':' + e.scene) : { v: 0, fresh: false, prior: 0 }],
    ['Task label', pretty(DATA.tasks[e.task]), part(w.task, 't' + e.task)],
  ];
  const tot = parts.reduce((a, p) => a + p[2].v, 0) || 1;
  return `<div class="eg-detailBlock"><span class="eg-detailBlockLabel">Why it is in the cut · pick ${k + 1}</span>
    <ul class="eg-whyList">${parts.map(([l, n, p]) => `<li><div><strong>${l}</strong><span>${esc(n)} · ${p.fresh ? 'new to the cut' : p.prior ? `${dur(p.prior)} already in cut` : 'not counted'}</span></div><div class="eg-gain"><b><i style="width:${(100 * p.v) / tot}%"></i></b><span>+${p.v.toFixed(2)}</span></div></li>`).join('')}</ul></div>`;
}

async function renderDetail() {
  const pane = $('#detail');
  if (!pane) return;
  const F = cut.F;
  const want = st.ep || (st.view === 'browse' ? autoEp : '');
  const j = want ? F.eps.findIndex((e) => e.h === want) : -1;
  if (j < 0) { pane.innerHTML = st.view === 'cut' ? summaryPane() : browseSummary(); return; }
  const e = F.eps[j];
  const head = `<div class="eg-detailVideoFrame"><video class="eg-detailVideo" muted loop playsinline preload="metadata" autoplay src="https://partners.mecka.ai/api/egoverse/uploads/${encodeURIComponent(e.h)}/video?redirect=1"></video><div class="eg-detailVideoFallback" hidden>${icon('video', 20)}<span>Preview unavailable</span></div></div>
    <div class="eg-detailHeader"><p class="eg-detailEyebrow">Episode detail</p><h3>${esc(pretty(DATA.tasks[e.task]))}</h3><p>${esc(e.h)}</p></div>
    <div class="eg-detailMetaGrid"><div><span>Duration</span><strong>${dur(e.sec)}</strong></div><div><span>Frames</span><strong>${fmt(e.frames)}</strong></div><div><span>Lab</span><strong>mecka</strong></div><div><span>Scene</span><strong>${e.scene >= 0 ? esc(pretty(DATA.scenes[e.scene])) : 'Unknown'}</strong></div><div><span>Operator</span><strong>${demo(e.op)}</strong></div><div><span>In cut</span><strong>${cut.order.has(j) ? 'Yes, pick ' + (cut.order.get(j) + 1) : cut.holdOut.ops.includes(e.op) ? 'Held out (eval)' : 'No'}</strong></div></div>
    ${why(j)}<div id="eg-more"><div class="eg-detailBlock"><span class="eg-detailBlockLabel">Description</span><p class="eg-skeleton">Loading annotations…</p></div></div>
    ${st.ep ? `<button type="button" class="eg-secondaryAction eg-back" id="eg-back">${icon('x', 15)}${st.view === 'cut' ? 'Back to cut summary' : 'Close episode'}</button>` : ''}`;
  pane.innerHTML = head;
  const v = pane.querySelector('video');
  v.addEventListener('error', () => { v.remove(); pane.querySelector('.eg-detailVideoFallback').hidden = false; }, { once: true });
  try {
    const d = (await loadDetails(F))[e.h];
    if ((st.ep || autoEp) !== e.h || !$('#eg-more')) return;
    const segs = d?.g || [];
    const total = segs.length ? Math.max(e.sec, segs[segs.length - 1][1]) : e.sec;
    $('#eg-more').innerHTML = `<div class="eg-detailBlock"><span class="eg-detailBlockLabel">Description</span><p>${esc(d?.d || 'No description recorded for this episode.')}</p></div>
      <div class="eg-detailBlock"><span class="eg-detailBlockLabel">Objects</span>${d?.o?.length ? `<div class="eg-objectChips">${d.o.map((o) => `<span class="eg-objectChip">${esc(pretty(o))}</span>`).join('')}</div>` : '<p class="eg-detailFallbackText">No object labels recorded for this episode.</p>'}</div>
      <div class="eg-detailBlock"><span class="eg-detailBlockLabel">Subtask segments · ${segs.length}</span>${segs.length ? `<div class="eg-segBar">${segs.map((s, i) => `<i style="left:${(100 * s[0]) / total}%;width:${(100 * (s[1] - s[0])) / total}%" class="c${i % 4}" title="${esc(s[2])}"></i>`).join('')}</div><ol class="eg-segList">${segs.map((s, i) => `<li><span class="c${i % 4}"></span><em>${dur(s[0])}</em>${esc(s[2])}</li>`).join('')}</ol>` : '<p class="eg-detailFallbackText">Not annotated yet.</p>'}</div>`;
  } catch {
    if ($('#eg-more')) $('#eg-more').innerHTML = `<div class="eg-warningBlock"><strong>Couldn’t load annotations.</strong> <button type="button" class="eg-linkButton" id="eg-retry">Retry</button></div>`;
  }
}

function browseSummary() {
  const F = cut.F;
  const ops = new Set(F.eps.map((e) => e.op)).size, sc = new Set(F.eps.filter((e) => e.scene >= 0).map((e) => e.scene)).size;
  return `<div class="eg-detailVideoFrame"><div class="eg-detailVideoFallback">${icon('video', 20)}<span>Select an episode to preview its clip</span></div></div>
  <div class="eg-detailHeader"><p class="eg-detailEyebrow">${esc(F.label)}</p><h3>${fmt(F.eps.length)} episodes</h3><p>Newest first. Rows marked In cut are in the current ${st.h}h diversity budget.</p></div>
  <div class="eg-detailMetaGrid"><div><span>Duration</span><strong>${hm(famSec(F))}</strong></div><div><span>Task labels</span><strong>${fmt(F.taskLabels)}</strong></div><div><span>Demonstrators</span><strong>${fmt(ops)}</strong></div><div><span>Scenes</span><strong>${fmt(sc)}</strong></div></div>`;
}

function renderAll() {
  ensureValid();
  compute();
  renderStats(); renderFilters(); renderModes(); renderCompare(); renderLayout();
  writeHash();
}

// ---------- actions ----------
function exportCSV() {
  const F = cut.F;
  const lines = ['pick,episode_hash,task,scene,demonstrator,seconds,frames,gain'];
  cut.optimal.idx.forEach((j, k) => { const e = F.eps[j]; lines.push([k + 1, e.h, DATA.tasks[e.task], e.scene >= 0 ? DATA.scenes[e.scene] : '', demo(e.op), e.sec.toFixed(2), e.frames, (cut.gain.get(j) || 0).toFixed(4)].map((v) => /[",]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : v).join(',')); });
  download(`egoverse-${F.key}-${st.h}h-${st.obj}.csv`, lines.join('\n'), 'text/csv');
}
function manifest() {
  const F = cut.F, o = cut.optimal;
  return { name: `egoverse-${F.key}-${st.h}h-${st.obj}`, lab: 'mecka', taskFamily: F.label, budgetHours: st.h, objective: { preset: st.obj, weights: cut.w, tauSeconds: TAU, form: 'sum_g w_g * sum_k log(1 + T_k / tau)' }, certificate: { objective: +o.m.f.toFixed(4), upperBound: +o.ub.toFixed(4), gap: +o.gap.toFixed(5) }, metrics: { ...o.m, maxShare: +o.m.maxShare.toFixed(4) }, baselines: { newestFirst: cut.newest.m, randomMean: cut.random.mean }, heldOutDemonstrators: cut.holdOut.ops.map(demo), evalEpisodes: cut.holdOut.eval.map((j) => F.eps[j].h), trainEpisodes: o.idx.map((j) => F.eps[j].h), link: location.href };
}
function download(name, text, type) { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 30000); toast(`Exported ${name}`); }
function saveCut() {
  const F = cut.F, list = saved();
  list.unshift({ name: `${F.label} · ${st.h}h · ${PRESETS[st.obj].label}`, when: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), family: st.family, h: st.h, obj: st.obj, hold: st.hold, scenes: cut.optimal.m.scenes, gap: pct(cut.optimal.gap) });
  setSaved(list.slice(0, 20));
  toast('Cut saved to this browser');
  renderModes(); renderDetail();
}
function openRow(j) { st.ep = cut.F.eps[j].h; writeHash(); document.querySelectorAll('tbody tr').forEach((tr) => { const on = +tr.dataset.j === j; tr.classList.toggle('eg-tableRowSelected', on); tr.setAttribute('aria-selected', on); }); renderDetail(); }
function moveRow(d) {
  const trs = [...document.querySelectorAll('tbody tr[data-j]')];
  if (!trs.length) return;
  let i = trs.findIndex((tr) => tr.classList.contains('eg-tableRowSelected'));
  i = i < 0 ? 0 : Math.min(trs.length - 1, Math.max(0, i + d));
  trs[i].focus(); openRow(+trs[i].dataset.j);
}
function rebuild() {
  const b = $('#eg-build');
  if (b) { b.textContent = 'Building…'; b.disabled = true; }
  $('#layout').classList.add('is-busy');
  setTimeout(() => { st.page = 0; st.ep = ''; renderAll(); $('#layout').classList.remove('is-busy'); toast(`Built ${cut.F.label} · ${st.h}h in ${Math.max(1, Math.round(cut.ms))} ms`); }, 30);
}

function bind() {
  const app = $('#app');
  app.addEventListener('change', (ev) => {
    const id = ev.target.id;
    if (id === 'eg-task') { st.family = ev.target.value; rebuild(); }
    else if (id === 'eg-budget') { st.h = +ev.target.value; rebuild(); }
    else if (id === 'eg-obj') { st.obj = ev.target.value; rebuild(); }
    else if (id === 'eg-hold') { st.hold = +ev.target.value; rebuild(); }
  });
  app.addEventListener('input', (ev) => { if (ev.target.id === 'eg-search') { st.q = ev.target.value; st.page = 0; clearTimeout(bind.t); bind.t = setTimeout(() => { renderLayout(); writeHash(); }, 120); } });
  app.addEventListener('click', (ev) => {
    const t = ev.target.closest('button, tr[data-j]');
    if (!t) return;
    if (t.matches('tr[data-j]')) return openRow(+t.dataset.j);
    const id = t.id;
    if (t.dataset.view) { st.view = t.dataset.view; st.page = 0; st.ep = ''; renderAll(); }
    else if (id === 'eg-build') rebuild();
    else if (id === 'eg-prev') { st.page--; renderLayout(); writeHash(); }
    else if (id === 'eg-next') { st.page++; renderLayout(); writeHash(); }
    else if (id === 'eg-back') { st.ep = ''; writeHash(); renderLayout(); }
    else if (id === 'eg-csv') exportCSV();
    else if (id === 'eg-json') download(`egoverse-${cut.F.key}-${st.h}h-${st.obj}.json`, JSON.stringify(manifest(), null, 2), 'application/json');
    else if (id === 'eg-save') saveCut();
    else if (id === 'eg-copy') { navigator.clipboard?.writeText(location.href).then(() => toast('Link copied'), () => toast('Copy the URL from the address bar')); }
    else if (id === 'eg-clearq') { st.q = ''; renderFilters(); renderLayout(); writeHash(); }
    else if (id === 'eg-retry') renderDetail();
    else if (id === 'eg-saved') { st.view = 'cut'; st.ep = ''; renderAll(); $('#eg-savedList')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); if (!saved().length) toast('No saved cuts yet. Build one and press Save cut.'); }
    else if (id === 'eg-help') toggleKeys();
    else if (id === 'theme') toggleTheme();
    else if (t.classList.contains('eg-savedLoad')) { const s = saved()[+t.dataset.i]; Object.assign(st, { family: s.family, h: s.h, obj: s.obj, hold: s.hold, view: 'cut', ep: '', page: 0 }); rebuild(); }
    else if (t.classList.contains('eg-savedDel')) { const l = saved(); l.splice(+t.dataset.i, 1); setSaved(l); renderModes(); renderDetail(); toast('Saved cut deleted'); }
  });
  document.addEventListener('keydown', (ev) => {
    const tg = ev.target instanceof Element ? ev.target : document.body;
    if (tg.matches('input, select, textarea')) { if (ev.key === 'Escape') tg.blur(); return; }
    if (ev.metaKey || ev.ctrlKey || ev.altKey) return;
    const k = ev.key;
    if (k === 'j' || k === 'ArrowDown') { ev.preventDefault(); moveRow(1); }
    else if (k === 'k' || k === 'ArrowUp') { ev.preventDefault(); moveRow(-1); }
    else if (k === 'Enter' && tg.matches('tr[data-j]')) openRow(+tg.dataset.j);
    else if (k === 'Escape') { if (!$('#keys').hidden) toggleKeys(); else if (st.ep) { st.ep = ''; writeHash(); renderLayout(); } }
    else if (k === '/') { ev.preventDefault(); $('#eg-search')?.focus(); }
    else if (k === 'b') rebuild();
    else if (k === 'e' && st.view === 'cut') exportCSV();
    else if (k === 's' && st.view === 'cut') saveCut();
    else if (k === ']' && $('#eg-next') && !$('#eg-next').disabled) $('#eg-next').click();
    else if (k === '[' && $('#eg-prev') && !$('#eg-prev').disabled) $('#eg-prev').click();
    else if (k === 'v') { st.view = st.view === 'cut' ? 'browse' : 'cut'; st.page = 0; st.ep = ''; renderAll(); }
    else if (k === '?') toggleKeys();
  });
  window.addEventListener('hashchange', () => { const before = location.hash; readHash(); if (before) renderAll(); });
}
function toggleKeys() {
  const k = $('#keys');
  k.hidden = !k.hidden;
  if (!k.hidden) k.innerHTML = `<div class="eg-keysCard" role="dialog" aria-label="Keyboard shortcuts"><div class="eg-detailHeader"><p class="eg-detailEyebrow">Keyboard</p><h3>Shortcuts</h3></div><dl>${[['j / k', 'Next / previous episode'], ['Enter', 'Open episode'], ['Esc', 'Back to cut summary'], ['/', 'Search'], ['b', 'Build cut'], ['v', 'Switch view'], ['e', 'Export CSV'], ['s', 'Save cut'], ['[ / ]', 'Previous / next page']].map(([a, b]) => `<div><dt><kbd>${a}</kbd></dt><dd>${b}</dd></div>`).join('')}</dl><button type="button" class="eg-secondaryAction" id="eg-help">Close</button></div>`;
}
function setThemeIcon() { $('#theme').innerHTML = icon(document.documentElement.classList.contains('dark') ? 'moon' : 'sun', 16); }
function toggleTheme() {
  const r = document.documentElement, dark = r.classList.contains('dark');
  r.classList.replace(dark ? 'dark' : 'light', dark ? 'light' : 'dark');
  try { localStorage.setItem('theme', dark ? 'light' : 'dark'); } catch {}
  setThemeIcon();
}

function skeleton() {
  $('#stats').innerHTML = Array.from({ length: 4 }, () => '<div class="eg-explorerStatCard eg-skel"><i></i><b></b><span></span></div>').join('');
  $('#layout').innerHTML = `<div class="eg-tablePane eg-skelPane">${Array.from({ length: 8 }, () => '<div class="eg-skelRow"></div>').join('')}</div><aside class="eg-detailPane eg-skelPane"><div class="eg-skelBlock"></div></aside>`;
}

async function main() {
  setThemeIcon();
  skeleton();
  readHash();
  bind();
  try {
    const r = await fetch('data/episodes.json');
    if (!r.ok) throw new Error('HTTP ' + r.status);
    DATA = await r.json();
    FAMS = decodeFamilies(DATA);
    $('#snap').textContent = DATA.fetchedAt;
    renderAll();
    $('#app').setAttribute('aria-busy', 'false');
  } catch (e) {
    $('#layout').innerHTML = `<div class="eg-emptyState" style="grid-column:1/-1"><h3>Couldn’t load the EgoVerse snapshot</h3><p>${esc(e.message)}. Check your connection and try again.</p><button type="button" class="eg-primaryAction" onclick="location.reload()">Retry</button></div>`;
  }
}
main();
