/* ═══════════════════════════════════════════════════════════════
   BOOT
═══════════════════════════════════════════════════════════════ */
// ── Descarga del index ───────────────────────────────────────
// Fetch the original file from the server instead of using outerHTML,
// which would persist any DOM-injected content (XSS payloads included).
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

// ── Sidebar toggle ───────────────────────────────────────────────────────────
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

document.getElementById('pillar-fuentes').addEventListener('click', () => {
  state.activeDB = 'all'; state.activeArea = null;
  switchView('explore'); buildChips(); renderTable();
});
document.getElementById('pillar-produccion').addEventListener('click', () => goExploreDB('✍️ Artículos propios'));
document.getElementById('pillar-conocimiento').addEventListener('click', () => goExploreDB('📚 Biblioteca'));

// Capture static HTML counter values before boot overwrites them (C-1 audit)
var _staticCounters = {};
['nc-total','h-total','exp-total','nc-ciber','nc-tech','nc-cripto','nc-inv'].forEach(function(id) {
  var el = document.getElementById(id);
  if (el) _staticCounters[id] = el.textContent.trim();
});

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
    DATA = contentPayload.content;
    INVESTIGATIONS = investigationsPayload.investigations;
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
