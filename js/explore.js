/* ═══════════════════════════════════════════════════════════════
   EXPLORE — CHIPS
═══════════════════════════════════════════════════════════════ */
function buildChips() {
  // Area chips
  const areaEl = document.getElementById('area-chips');
  areaEl.innerHTML = '';
  const allArea = chip('Todo', state.activeArea === null && state.activeDB === 'all', () => {
    state.activeArea = null; state.activeDB = 'all'; state.activeTag = null; state.activeSeries = null; buildChips(); renderTable();
  });
  areaEl.appendChild(allArea);
  Object.entries(AREA_META).forEach(([key, meta]) => {
    const c = chip(meta.icon + ' ' + meta.label, state.activeArea === key, () => {
      state.activeArea = key; state.activeDB = 'all'; state.activeTag = null; state.activeSeries = null; buildChips(); renderTable();
    }, state.activeArea === key ? meta.color : null);
    areaEl.appendChild(c);
  });

  // DB chips
  const dbEl = document.getElementById('db-chips');
  dbEl.innerHTML = '';
  const allDB = chip('Todas', state.activeDB === 'all', () => {
    state.activeDB = 'all'; state.activeTag = null; state.activeSeries = null; buildChips(); renderTable();
  });
  dbEl.appendChild(allDB);

  const visibleDBs = state.activeArea
    ? DB_LIST.filter(db => AREA_MAP[state.activeArea]?.includes(db))
    : DB_LIST;

  visibleDBs.forEach(db => {
    const meta = DB_META[db] || { color: '#888' };
    const c = chip(db, state.activeDB === db, () => {
      state.activeDB = db; state.activeArea = null; state.activeTag = null; state.activeSeries = null; buildChips(); renderTable();
    }, state.activeDB === db ? meta.color : null);
    dbEl.appendChild(c);
  });
}

function chip(label, isActive, onClick, color = null) {
  const btn = document.createElement('button');
  btn.className = 'fchip' + (isActive ? ' active' : '');
  btn.textContent = label;
  if (isActive && color) {
    btn.style.borderColor = color + '77';
    btn.style.color = color;
  }
  btn.addEventListener('click', onClick);
  return btn;
}

/* ═══════════════════════════════════════════════════════════════
   EXPLORE — TABLE
═══════════════════════════════════════════════════════════════ */
function matchQuery(e, q) {
  if (!q) return true;
  // Campos estructurados — búsqueda siempre, sin mínimo de longitud
  if (String(e.id || '').toLowerCase().includes(q))    return true;
  if (String(e.title || '').toLowerCase().includes(q)) return true;
  if ((e.serie  || '').toLowerCase().includes(q)) return true;
  if ((e.db     || '').toLowerCase().includes(q)) return true;
  if ((e.cve    || '').toLowerCase().includes(q)) return true;
  if (e.etiquetas && e.etiquetas.some(t => t.toLowerCase().includes(q))) return true;
  // Campos de texto libre — solo si la query tiene 3+ caracteres
  if (q.length >= 3) {
    if ((e.desc   || '').toLowerCase().includes(q)) return true;
    if ((e.tipo   || '').toLowerCase().includes(q)) return true;
    if ((e.fuente || '').toLowerCase().includes(q)) return true;
  }
  return false;
}

function filtered() {
  const q = state.query.toLowerCase();
  const activeTag = (state.activeTag || '').trim().toLowerCase();
  const activeSeries = (state.activeSeries || '').trim().toLowerCase();
  const pairs = [];
  DATA.forEach(function(e, i) {
    const matchQ = matchQuery(e, q);
    const matchTag = !activeTag || (e.etiquetas || []).some(function(t) {
      return String(t).trim().toLowerCase() === activeTag;
    });
    const matchSeries = !activeSeries || String(e.serie || '').trim().toLowerCase() === activeSeries;
    const matchDB   = state.activeDB === 'all' || e.db === state.activeDB;
    const matchArea = !state.activeArea || AREA_MAP[state.activeArea]?.includes(e.db);
    if (matchQ && matchTag && matchSeries && matchDB && matchArea) pairs.push({ entry: e, dataIndex: i });
  });
  return pairs;
}

// Filtra por etiqueta exacta — no realiza búsqueda textual global
function filterByTag(tag) {
  state.activeArea = null;
  state.activeDB   = 'all';
  state.activeTag  = tag;
  state.activeSeries = null;
  state.query      = '';
  const searchEl   = document.getElementById('search');
  if (searchEl) searchEl.value = '';
  switchView('explore');
  buildChips();
  renderTable();
}

// Índice global para lookup por data-idx
function rowHTML(e, idx) {
  const meta = DB_META[e.db] || { color:'#888', icon:'📄' };
  const col  = meta.color;
  return `<tr class="data-row" data-idx="${idx}">
    <td><code class="id-badge" style="border-color:${col}55;color:${col}">${escapeHTML(e.id)}</code></td>
    <td>
      <span class="row-title">${escapeHTML(e.title)}</span>
      ${e.serie ? `<span class="row-serie">${escapeHTML(e.serie)}</span>` : ''}
    </td>
    <td><span class="db-pill" style="border-color:${col}44;color:${col}">${meta.icon} ${escapeHTML(e.db.replace(/^\S+\s/,''))}</span></td>
  </tr>`;
}

function renderTable() {
  const pairs = filtered();
  const total = DATA.length;
  document.getElementById('result-count').textContent = pairs.length + ' de ' + total + ' entradas';
  document.getElementById('table-foot-count').textContent = pairs.length + ' resultados';

  const tbody = document.getElementById('tbody');
  if (!pairs.length) {
    tbody.innerHTML = `<tr><td colspan="3" class="empty-row">Sin resultados para esta búsqueda</td></tr>`;
    return;
  }
  tbody.innerHTML = pairs.map(function(p) { return rowHTML(p.entry, p.dataIndex); }).join('');
}

/* ═══════════════════════════════════════════════════════════════
   SEARCH
═══════════════════════════════════════════════════════════════ */
document.getElementById('search').addEventListener('input', e => {
  state.query = e.target.value;
  state.activeTag = null;
  state.activeSeries = null;
  if (state.query && state.view === 'home') {
    switchView('explore');
    buildChips();
  }
  if (state.view === 'explore') renderTable();
});
