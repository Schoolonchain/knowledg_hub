/* ═══════════════════════════════════════════════════════════════
   BOOT — Entry point module
═══════════════════════════════════════════════════════════════ */
import { DATA, INVESTIGATIONS, setDATA, setINVESTIGATIONS } from './data.js';
import { state, switchView, registerRenderer, recomputeDerivedData, ciberCount, techCount, criptoCount } from './state.js';
import { buildHomeDBGrid, buildHomeRecent } from './home.js';
import { buildChips, renderTable, goExploreDB, goExploreArea, filterByTag } from './explore.js';
import { buildDonut, buildDist } from './charts.js';
import { openDetailByIdx, closeDetail } from './detail.js';
import { renderIntegrity, runIntegrityAudit } from './integrity.js';
import { renderIntelligence } from './intelligence.js';
import { renderInvestigations, toggleOppEntries, suggestInvestigation, openNewInvestigationForm, selectInv, transitionInv, closeProposalForm, saveProposalAsInvestigation } from './investigations.js';

// ── Register view renderers ─────────────────────────────────
registerRenderer('intelligence', renderIntelligence);
registerRenderer('investigations', renderInvestigations);
registerRenderer('integrity', renderIntegrity);

// ── Descarga del index ───────────────────────────────────────
document.getElementById('dl-index').addEventListener('click', function() {
  fetch('index.html').then(function(r) { return r.blob(); }).then(function(blob) {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'knowledge-hub-index.html';
    a.click();
    URL.revokeObjectURL(a.href);
  });
});

document.getElementById('home-btn').style.display = 'none';

// ── Sidebar toggle ───────────────────────────────────────────
(function() {
  var sidebar = document.querySelector('.sidebar');
  var main    = document.getElementById('main');
  var btn     = document.getElementById('toggle-sidebar-btn');
  var open    = true;

  btn.addEventListener('click', function() {
    open = !open;
    if (open) {
      sidebar.classList.remove('collapsed');
      main.classList.remove('sidebar-collapsed');
      btn.textContent = '☰';
      btn.title = 'Ocultar menú';
    } else {
      sidebar.classList.add('collapsed');
      main.classList.add('sidebar-collapsed');
      btn.textContent = '☰';
      btn.title = 'Mostrar menú';
    }
  });
})();

// ── Pillar navigation ────────────────────────────────────────
document.getElementById('pillar-fuentes').addEventListener('click', () => {
  state.activeDB = 'all'; state.activeArea = null;
  switchView('explore'); buildChips(); renderTable();
});
document.getElementById('pillar-produccion').addEventListener('click', () => goExploreDB('✍️ Artículos propios'));
document.getElementById('pillar-conocimiento').addEventListener('click', () => goExploreDB('📚 Biblioteca'));

// ── Global event delegation ──────────────────────────────────
document.addEventListener('click', function(e) {
  var el = e.target.closest('[data-action]');
  if (!el) return;
  var action = el.dataset.action;

  switch (action) {
    case 'switch-view':
      switchView(el.dataset.view);
      break;
    case 'explore-area':
      goExploreArea(el.dataset.area);
      break;
    case 'explore-db':
      goExploreDB(el.dataset.db);
      break;
    case 'filter-tag':
      filterByTag(el.dataset.tag);
      break;
    case 'open-detail':
      openDetailByIdx(parseInt(el.dataset.idx, 10));
      break;
    case 'close-detail':
      closeDetail();
      break;
    case 'toggle-opp-entries':
      toggleOppEntries(el.dataset.oppId, JSON.parse(el.dataset.indices), el.dataset.tag, el.dataset.rule);
      break;
    case 'suggest-investigation':
      suggestInvestigation(el.dataset.tag, el.dataset.oppId);
      break;
    case 'new-investigation':
      openNewInvestigationForm();
      break;
    case 'select-inv':
      selectInv(el.dataset.invId);
      break;
    case 'transition-inv':
      transitionInv(el.dataset.invId, el.dataset.nextState);
      break;
    case 'close-proposal-form':
      closeProposalForm();
      break;
    case 'save-proposal':
      saveProposalAsInvestigation();
      break;
  }
});

// ── initCounts ───────────────────────────────────────────────
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
  const _bootAudit = runIntegrityAudit();
  const _intBadgeEl = document.getElementById('nc-integrity');
  if (_intBadgeEl) {
    if (_bootAudit.status === 'HEALTHY') {
      _intBadgeEl.textContent = '✅'; _intBadgeEl.style.color = '#5ba85b';
    } else if (_bootAudit.status === 'WARNING') {
      _intBadgeEl.textContent = '⚠️ ' + _bootAudit._counts.warning;
    } else {
      _intBadgeEl.textContent = '🔴 ' + _bootAudit._counts.critical;
    }
  }
  const statArtEl = document.getElementById('h-art');
  const statGlosEl = document.getElementById('h-glos');
  const expArtEl = document.getElementById('exp-art');
  const expGlosEl = document.getElementById('exp-glos');
  if (statArtEl) statArtEl.textContent = artCount;
  if (statGlosEl) statGlosEl.textContent = glosCount;
  if (expArtEl) expArtEl.textContent = artCount;
  if (expGlosEl) expGlosEl.textContent = glosCount;
}

// ── Boot ─────────────────────────────────────────────────────
async function bootKnowledgeHub() {
  let loadError = null;
  try {
    const [contentResponse, investigationsResponse] = await Promise.all([
      fetch('./data/content.json', { cache: 'no-store' }),
      fetch('./data/investigations.json', { cache: 'no-store' }),
    ]);
    if (!contentResponse.ok) throw new Error('content.json HTTP ' + contentResponse.status);
    if (!investigationsResponse.ok) throw new Error('investigations.json HTTP ' + investigationsResponse.status);
    const contentPayload = await contentResponse.json();
    const investigationsPayload = await investigationsResponse.json();
    if (!Array.isArray(contentPayload.content)) throw new Error('content.json inválido');
    if (!Array.isArray(investigationsPayload.investigations)) throw new Error('investigations.json inválido');
    setDATA(contentPayload.content);
    setINVESTIGATIONS(investigationsPayload.investigations);
  } catch (error) {
    loadError = error;
    console.error('No se pudo cargar la sincronización JSON del Knowledge Hub.', error);
  }

  recomputeDerivedData();
  initCounts();
  buildHomeDBGrid();
  buildHomeRecent();
  buildChips();
  buildDonut();
  buildDist();
  renderTable();
  renderIntegrity();
  if (loadError) {
    document.getElementById('topbar-sub').textContent =
      'Error al cargar los datos sincronizados · vuelve a intentarlo en unos minutos';
    const integrityBadge = document.getElementById('nc-integrity');
    if (integrityBadge) {
      integrityBadge.textContent = '🔴 JSON';
      integrityBadge.style.color = '#c45a5a';
    }
  }
}

bootKnowledgeHub();
