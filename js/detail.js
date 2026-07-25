/* ═══════════════════════════════════════════════════════════════
   DETAIL PANEL
═══════════════════════════════════════════════════════════════ */
import { DATA, DB_META, AREA_META, RELATIONS, CONCEPTS, ENTITIES } from './data.js';
import { state } from './state.js';
import { escapeHTML, safeURL, truncEsc } from './sanitize.js';

export function openDetailByIdx(idx) {
  const entry = DATA[idx];
  if (!entry) return;
  state.selectedEntry = entry;

  const meta     = DB_META[entry.db] || { color:'#888', icon:'📄', areaLabel:'—' };
  const col      = meta.color;
  const areaKey  = meta.area;
  const areaMeta = AREA_META[areaKey] || {};

  const pill = document.getElementById('dp-db-pill');
  pill.textContent = meta.icon + ' ' + entry.db.replace(/^\S+\s/,'');
  pill.style.borderColor = col + '55';
  pill.style.color = col;

  document.getElementById('dp-title').textContent = entry.title;
  document.getElementById('dp-id').textContent    = entry.id;
  document.getElementById('dp-db').textContent    = entry.db;
  document.getElementById('dp-serie').innerHTML   = entry.serie
    ? `<span style="color:var(--text)">${escapeHTML(entry.serie)}</span>`
    : '<span class="df-empty">No disponible</span>';

  const areaEl = document.getElementById('dp-area');
  areaEl.innerHTML = areaMeta.label
    ? `<span class="area-badge" style="border-color:${areaMeta.color}55;color:${areaMeta.color}">${areaMeta.icon} ${escapeHTML(areaMeta.label)}</span>`
    : '<span class="df-empty">—</span>';

  // Fecha
  document.getElementById('dp-fecha').innerHTML = entry.fecha
    ? '<span style="color:var(--text);font-weight:500">' + escapeHTML(entry.fecha) + '</span>'
    : '<span class="df-empty">No disponible</span>';
  // Tipo
  const dpTipo = document.getElementById('dp-tipo');
  if (dpTipo) dpTipo.innerHTML = entry.tipo ? '<span style="color:var(--text)">' + escapeHTML(entry.tipo) + '</span>' : '<span class="df-empty">—</span>';
  // Lectura — mostrar campo solo si existe
  const dpLectField = document.getElementById('dp-field-lectura');
  const dpLect = document.getElementById('dp-lectura');
  if (dpLect && dpLectField) {
    if (entry.lectura) {
      const isNum = !isNaN(entry.lectura);
      dpLect.innerHTML = '<span style="color:var(--text)">' + escapeHTML(entry.lectura) + (isNum ? ' min' : '') + '</span>';
      dpLectField.style.display = 'flex';
    } else {
      dpLectField.style.display = 'none';
    }
  }
  // Gravedad — mostrar campo solo si existe
  const dpGravField = document.getElementById('dp-field-gravedad');
  const dpGrav = document.getElementById('dp-gravedad');
  if (dpGrav && dpGravField) {
    if (entry.gravedad) {
      dpGrav.innerHTML = '<span style="color:var(--text)">' + escapeHTML(entry.gravedad) + '</span>';
      dpGravField.style.display = 'flex';
    } else {
      dpGravField.style.display = 'none';
    }
  }
  // Fuente — mostrar campo solo si existe
  const dpFuenteField = document.getElementById('dp-field-fuente');
  const dpFuente = document.getElementById('dp-fuente');
  if (dpFuente && dpFuenteField) {
    if (entry.urlFuente || entry.fuente) {
      dpFuenteField.style.display = 'flex';
      if (entry.urlFuente) {
        dpFuente.innerHTML = '<a href="' + safeURL(entry.urlFuente) + '" target="_blank" rel="noopener" style="color:var(--accent2)">' + escapeHTML(entry.fuente || 'Ver fuente') + ' ↗</a>';
      } else {
        dpFuente.innerHTML = '<span style="color:var(--text2)">' + escapeHTML(entry.fuente) + '</span>';
      }
    } else {
      dpFuenteField.style.display = 'none';
    }
  }
  // Etiquetas navegables
  const dpTagsSection = document.getElementById('dp-section-tags');
  const dpTags = document.getElementById('dp-tags');
  if (dpTags && dpTagsSection) {
    if (entry.etiquetas && entry.etiquetas.length) {
      dpTagsSection.style.display = 'block';
      dpTags.innerHTML = entry.etiquetas.map(function(t) {
        return '<span class="dp-tag-chip" data-action="filter-tag" data-tag="' + escapeHTML(t) + '" title="Filtrar por &#39;' + escapeHTML(t) + '&#39;">🏷️ ' + escapeHTML(t) + '</span>';
      }).join('');
    } else {
      dpTagsSection.style.display = 'none';
    }
  }
  // Conceptos y entidades — buscar relaciones explícitas si existen
  const dpCE = document.getElementById('dp-concepts-entities');
  if (dpCE) {
    const entryRelations = RELATIONS.filter(function(r) { return r.source === entry.id; });
    if (entryRelations.length) {
      dpCE.innerHTML = entryRelations.map(function(r) {
        const con = CONCEPTS.find(function(c) { return c.id === r.target; });
        const ent = ENTITIES.find(function(e) { return e.id === r.target; });
        const obj = con || ent;
        if (!obj) return '';
        const icon = con ? '🧠' : '🏢';
        return '<div class="gen-node">' +
          '<span class="rel-badge ' + escapeHTML(r.type) + '">' + escapeHTML(r.type) + '</span>' +
          '<span style="margin-right:4px">' + icon + '</span>' +
          '<span style="color:var(--text3);font-size:10px;margin-right:4px">' + escapeHTML(r.target) + '</span>' +
          '<span style="color:var(--text2)">' + escapeHTML(obj.name) + '</span></div>';
      }).filter(Boolean).join('<div style="height:4px"></div>') ||
      '<div class="gen-empty">Sin relaciones explícitas registradas para esta entrada. Las etiquetas actúan como señal de clasificación.</div>';
    } else {
      dpCE.innerHTML = '<div class="gen-empty">Sin relaciones explícitas registradas para esta entrada. Las etiquetas actúan como señal de clasificación.</div>';
    }
  }
  // Descripción
  document.getElementById('dp-desc').innerHTML = entry.desc
    ? '<span style="color:var(--text2);line-height:1.7;font-size:12px">' + escapeHTML(entry.desc) + '</span>'
    : '<span class="df-empty">No disponible</span>';
  // Cadena de conocimiento — anterior/siguiente (Biblioteca) + entrevistas de origen
  const dpGen = document.getElementById('dp-genealogy');
  if (dpGen) {
    let genNodes = [];
    // Anterior en la cadena
    if (entry.anterior && entry.anterior.length) {
      entry.anterior.forEach(function(rid) {
        const found = DATA.find(function(d){ return d.url && d.url.includes(rid); });
        if (!found) return;
        genNodes.push('<div class="gen-node" data-action="open-detail" data-idx="' + DATA.findIndex(function(d){ return d === found; }) + '" style="cursor:pointer">' +
          '<span style="font-size:13px;margin-right:6px">⬅️</span>' +
          '<span style="color:var(--text3);font-size:10px;margin-right:6px">ANTERIOR</span>' +
          '<span style="color:var(--accent2);font-weight:600;margin-right:6px">' + escapeHTML(found.id) + '</span>' +
          '<span style="color:var(--text2)">' + truncEsc(found.title, 45) + '</span></div>');
      });
    }
    // Entrevistas de origen
    if (entry.entrevistas && entry.entrevistas.length) {
      entry.entrevistas.forEach(function(eid) {
        const rid = eid.replace(/-/g,'');
        const found = DATA.find(function(d){ return d.url && d.url.includes(rid); });
        if (!found) return;
        genNodes.push('<div class="gen-node" data-action="open-detail" data-idx="' + DATA.findIndex(function(d){ return d === found; }) + '" style="cursor:pointer">' +
          '<span style="font-size:13px;margin-right:6px">🎙️</span>' +
          '<span style="color:var(--text3);font-size:10px;margin-right:6px">ENTREVISTA</span>' +
          '<span style="color:var(--accent2);font-weight:600;margin-right:6px">' + escapeHTML(found.id) + '</span>' +
          '<span style="color:var(--text2)">' + truncEsc(found.title, 45) + '</span></div>');
      });
    }
    // Siguiente en la cadena
    if (entry.siguiente && entry.siguiente.length) {
      entry.siguiente.forEach(function(rid) {
        const found = DATA.find(function(d){ return d.url && d.url.includes(rid); });
        if (!found) return;
        genNodes.push('<div class="gen-node" data-action="open-detail" data-idx="' + DATA.findIndex(function(d){ return d === found; }) + '" style="cursor:pointer">' +
          '<span style="font-size:13px;margin-right:6px">➡️</span>' +
          '<span style="color:var(--text3);font-size:10px;margin-right:6px">SIGUIENTE</span>' +
          '<span style="color:var(--accent2);font-weight:600;margin-right:6px">' + escapeHTML(found.id) + '</span>' +
          '<span style="color:var(--text2)">' + truncEsc(found.title, 45) + '</span></div>');
      });
    }
    if (genNodes.length) {
      dpGen.innerHTML = genNodes.join('<div style="height:4px"></div>');
    } else {
      dpGen.innerHTML = '<div class="gen-empty">Sin cadena de conocimiento registrada para esta entrada.</div>';
    }
  }

  // Entradas relacionadas + glosario vinculado
  const dpRel = document.getElementById('dp-related');
  if (dpRel) {
    const relIds = [].concat(entry.relacionadas || [], entry.glosario || []);
    if (relIds.length) {
      const nodes = relIds.map(function(rid) {
        const cleanId = rid.replace(/-/g,'');
        const found = DATA.find(function(d){ return d.url && d.url.includes(cleanId); });
        if (!found) return '';
        const fi = DATA.findIndex(function(d){ return d.url && d.url.includes(cleanId); });
        const icon = found.db.includes('Glosario') ? '🏷️' : (found.db.includes('Artículos') ? '✍️' : '🔗');
        return '<div class="gen-node" data-action="open-detail" data-idx="' + fi + '" style="cursor:pointer">' +
          '<span style="font-size:13px;margin-right:6px">' + icon + '</span>' +
          '<span style="color:var(--accent2);font-weight:600;margin-right:6px">' + escapeHTML(found.id) + '</span>' +
          '<span style="color:var(--text2)">' + truncEsc(found.title, 48) + '</span>' +
          '</div>';
      }).filter(Boolean);
      dpRel.innerHTML = nodes.length
        ? nodes.join('<div style="height:4px"></div>')
        : '<div class="gen-empty">Sin entradas relacionadas indexadas todavía.</div>';
    } else {
      dpRel.innerHTML = '<div class="gen-empty">Sin relaciones registradas para esta entrada.</div>';
    }
  }
  document.getElementById('dp-notion-link').href = safeURL(entry.url);

  document.querySelectorAll('tr.data-row').forEach(r => r.classList.remove('selected'));
  document.querySelectorAll(`tr.data-row[data-idx="${idx}"]`).forEach(r => r.classList.add('selected'));

  document.getElementById('detail-panel').classList.add('open');
  document.getElementById('detail-overlay').classList.add('active');
  document.getElementById('main').classList.add('detail-open');
}

export function closeDetail() {
  document.getElementById('detail-panel').classList.remove('open');
  document.getElementById('detail-overlay').classList.remove('active');
  document.getElementById('main').classList.remove('detail-open');
  document.querySelectorAll('tr.data-row').forEach(r => r.classList.remove('selected'));
  state.selectedEntry = null;
}

document.getElementById('detail-overlay').addEventListener('click', closeDetail);

// Event delegation — solo dentro de los tbody de las tablas
['tbody', 'home-tbody'].forEach(function(tbodyId) {
  const el = document.getElementById(tbodyId);
  if (!el) return;
  el.addEventListener('click', function(e) {
    const row = e.target.closest('tr.data-row');
    if (row && row.dataset.idx !== undefined) {
      openDetailByIdx(parseInt(row.dataset.idx, 10));
    }
  });
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeDetail();
});
