/* ═══════════════════════════════════════════════════════════════
   STATE
═══════════════════════════════════════════════════════════════ */
import { DATA, AREA_MAP } from './data.js';

export let state = {
  view: 'home',
  activeArea: null,
  activeDB: 'all',
  activeTag: null,
  activeSeries: null,
  query: '',
  selectedEntry: null,
  selectedInv: null,
  pendingProposal: null,
};

/* ═══════════════════════════════════════════════════════════════
   DERIVED DATA
═══════════════════════════════════════════════════════════════ */
export let DB_LIST = [];
export let dbCounts = {};
export let maxCount = 0;
export let ciberCount = 0;
export let techCount = 0;
export let criptoCount = 0;

export function recomputeDerivedData() {
  DB_LIST = [...new Set(DATA.map(d => d.db))];
  dbCounts = {};
  DB_LIST.forEach(db => dbCounts[db] = DATA.filter(d => d.db === db).length);
  maxCount = Math.max(1, ...Object.values(dbCounts));
  ciberCount = DATA.filter(d => AREA_MAP.ciber.includes(d.db)).length;
  techCount = DATA.filter(d => AREA_MAP.tech.includes(d.db)).length;
  criptoCount = DATA.filter(d => AREA_MAP.cripto.includes(d.db)).length;
}

recomputeDerivedData();

/* ═══════════════════════════════════════════════════════════════
   RENDERER REGISTRY — breaks circular deps with view modules
═══════════════════════════════════════════════════════════════ */
const renderers = {};
export function registerRenderer(view, fn) { renderers[view] = fn; }

/* ═══════════════════════════════════════════════════════════════
   VIEW SWITCHING
═══════════════════════════════════════════════════════════════ */
export function switchView(v) {
  state.view = v;

  document.querySelectorAll('.view').forEach(el => el.classList.remove('active'));
  document.getElementById('view-' + v).classList.add('active');

  document.querySelectorAll('.vtbtn').forEach(b => b.classList.remove('active'));
  const vtEl = document.getElementById('vt-' + v);
  if (vtEl) vtEl.classList.add('active');

  document.querySelectorAll('.nav-item[id]').forEach(b => b.classList.remove('active'));
  const navEl = document.getElementById('nav-' + v);
  if (navEl) navEl.classList.add('active');

  const titles = {
    home: 'Inicio',
    explore: 'Explorar',
    intelligence: 'Intelligence',
    investigations: 'Investigaciones',
    integrity: 'System Integrity'
  };
  const subs = {
    home: 'Todo tu conocimiento. Conectado.',
    explore: 'Índice maestro · ' + DATA.length + ' entradas',
    intelligence: 'Análisis automático de señales y oportunidades',
    investigations: 'Procesos activos de comprensión',
    integrity: 'Auditoría de integridad de identidades · solo lectura'
  };
  document.getElementById('topbar-title').textContent = titles[v] || v;
  document.getElementById('topbar-sub').textContent   = subs[v]   || '';
  document.getElementById('home-btn').style.display = v === 'home' ? 'none' : 'flex';

  if (renderers[v]) renderers[v]();
}

export function clearSearch() {
  state.query = '';
  const searchEl = document.getElementById('search');
  if (searchEl) searchEl.value = '';
}
