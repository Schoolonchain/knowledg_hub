/* ═══════════════════════════════════════════════════════════════
   HOME — DB MINI GRID
═══════════════════════════════════════════════════════════════ */
import { DATA, DB_META } from './data.js';
import { DB_LIST, dbCounts, maxCount } from './state.js';
import { escapeHTML } from './sanitize.js';
import { goExploreDB, rowHTML } from './explore.js';

export function buildHomeDBGrid() {
  const el = document.getElementById('home-db-grid');
  el.innerHTML = '';
  DB_LIST.forEach(db => {
    const meta = DB_META[db] || { color:'#888', icon:'📄' };
    const cnt  = dbCounts[db];
    const pct  = Math.round(cnt / maxCount * 100);
    const card = document.createElement('div');
    card.className = 'db-mini';
    card.innerHTML = `
      <div class="db-mini-icon">${meta.icon}</div>
      <div class="db-mini-name">${escapeHTML(db.replace(/^\S+\s/, ''))}</div>
      <div class="db-mini-count">${cnt} entradas</div>
      <div class="db-mini-bar" style="background:${meta.color};width:${pct}%"></div>`;
    card.addEventListener('click', () => goExploreDB(db));
    el.appendChild(card);
  });
}

/* ═══════════════════════════════════════════════════════════════
   HOME — RECENT TABLE (últimas 12 entradas)
═══════════════════════════════════════════════════════════════ */
export function buildHomeRecent() {
  const tbody  = document.getElementById('home-tbody');
  const start  = Math.max(0, DATA.length - 12);
  const recent = DATA.slice(start).map(function(e, i) { return { entry: e, dataIndex: start + i }; }).reverse();
  tbody.innerHTML = recent.map(function(p) { return rowHTML(p.entry, p.dataIndex); }).join('');
}
