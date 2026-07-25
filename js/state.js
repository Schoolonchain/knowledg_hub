/* ═══════════════════════════════════════════════════════════════
   STATE
═══════════════════════════════════════════════════════════════ */
let state = {
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
let DB_LIST = [];
let dbCounts = {};
let maxCount = 0;
let ciberCount = 0;
let techCount = 0;
let criptoCount = 0;

function recomputeDerivedData() {
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
   INIT STATIC COUNTS
═══════════════════════════════════════════════════════════════ */
function initCounts() {
  const total      = DATA.length;
  const artCount   = DATA.filter(d => d.db === '✍️ Artículos propios').length;
  const glosCount  = DATA.filter(d => d.db === '🏷️ Glosario de Etiquetas' || d.db === '📖 Glosario TLDR').length;
  const invActive  = INVESTIGATIONS.filter(i => i.status === 'active' || i.status === 'draft').length;

  document.getElementById('h-total').textContent    = total;
  document.getElementById('exp-total').textContent  = total;
  document.getElementById('nc-total').textContent   = total;
  document.getElementById('nc-ciber').textContent   = ciberCount;
  document.getElementById('nc-tech').textContent    = techCount;
  document.getElementById('nc-cripto').textContent  = criptoCount;
  document.getElementById('a-ciber').textContent    = ciberCount + ' entradas';
  document.getElementById('a-tech').textContent     = techCount  + ' entradas';
  document.getElementById('a-cripto').textContent   = criptoCount + ' entradas';
  document.getElementById('nc-inv').textContent     = invActive || INVESTIGATIONS.length;

  // Badge de integridad — ejecutar auditoría en boot para mostrar estado en sidebar
  const _bootAudit = runIntegrityAudit();
  const _intBadgeEl = document.getElementById('nc-integrity');
  if (_intBadgeEl) {
    if (_bootAudit.status === 'HEALTHY') {
      _intBadgeEl.textContent = '✅';
      _intBadgeEl.style.color = '#5ba85b';
    } else if (_bootAudit.status === 'WARNING') {
      _intBadgeEl.textContent = '⚠️ ' + _bootAudit._counts.warning;
    } else {
      _intBadgeEl.textContent = '🔴 ' + _bootAudit._counts.critical;
    }
  }

  // Stats dinámicos
  const statArtEl   = document.getElementById('h-art');
  const statGlosEl  = document.getElementById('h-glos');
  const expArtEl    = document.getElementById('exp-art');
  const expGlosEl   = document.getElementById('exp-glos');
  if (statArtEl)  statArtEl.textContent  = artCount;
  if (statGlosEl) statGlosEl.textContent = glosCount;
  if (expArtEl)   expArtEl.textContent   = artCount;
  if (expGlosEl)  expGlosEl.textContent  = glosCount;
}

/* ═══════════════════════════════════════════════════════════════
   VIEW SWITCHING
═══════════════════════════════════════════════════════════════ */
function switchView(v) {
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

  if (v === 'explore')       renderTable();
  if (v === 'intelligence')  renderIntelligence();
  if (v === 'investigations') renderInvestigations();
  if (v === 'integrity')     renderIntegrity();
}

function clearSearch() {
  state.query = '';
  const searchEl = document.getElementById('search');
  if (searchEl) searchEl.value = '';
}

// Navegación desde fuera del Explore (sidebar, home cards, pilares)
// → limpia búsqueda activa para no confundir
function goExploreArea(area) {
  if (state.view !== 'explore') clearSearch();
  state.activeArea = area;
  state.activeDB   = 'all';
  state.activeTag  = null;
  state.activeSeries = null;
  switchView('explore');
  buildChips();
  renderTable();
}

function goExploreDB(db) {
  if (state.view !== 'explore') clearSearch();
  state.activeDB   = db || 'all';
  state.activeArea = null;
  state.activeTag  = null;
  state.activeSeries = null;
  switchView('explore');
  buildChips();
  renderTable();
}

