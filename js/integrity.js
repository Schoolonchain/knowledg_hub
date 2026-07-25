/* ═══════════════════════════════════════════════════════════════
   INTEGRITY AUDIT ENGINE
   Solo lectura. No modifica DATA.
   Llamar: runIntegrityAudit() → objeto con todos los resultados.
═══════════════════════════════════════════════════════════════ */
import { DATA, DB_META, AREA_MAP, SYSTEM_STATE, INVESTIGATIONS } from './data.js';
import { ciberCount, techCount, criptoCount } from './state.js';
import { escapeHTML } from './sanitize.js';

// Capture static HTML counter values at module load time,
// before bootKnowledgeHub() overwrites them (C-1 audit).
// ES modules are deferred, so the DOM is ready but boot hasn't run yet.
const _staticCounters = {};
['nc-total','h-total','exp-total','nc-ciber','nc-tech','nc-cripto','nc-inv'].forEach(function(id) {
  const el = document.getElementById(id);
  if (el) _staticCounters[id] = el.textContent.trim();
});

function extractNotionIdFromUrl(url) {
  if (!url) return null;
  const m = url.match(/([0-9a-f]{32})(?:[?#].*)?$/i);
  return m ? m[1] : null;
}

export function runIntegrityAudit() {
  const results = {
    meta: {
      timestamp: new Date().toISOString(),
      totalEntries: DATA.length,
    },
    // A. IDs visibles duplicados
    duplicateIds: [],
    // B. notionId duplicados
    duplicateNotionIds: [],
    // C. URLs duplicadas
    duplicateUrls: [],
    // D. notionId ≠ hash de URL
    notionIdUrlMismatch: [],
    // E. Relaciones no resueltas
    unresolvedRelations: [],
    // F. Sin URL
    missingUrl: [],
    // G. Sin ID
    missingId: [],
    // H. Campos estructurales inválidos
    invalidStructure: [],
    // Anomalías documentadas en datos (_dataIntegrityIssue)
    documentedIssues: [],
  };

  // Índices de trabajo (no modifican DATA)
  const idIndex     = {};
  const nidIndex    = {};
  const urlIndex    = {};

  DATA.forEach(function(e, i) {
    // G — Sin ID
    if (!e.id) { results.missingId.push({ dataIndex: i, title: e.title || '—' }); }
    // F — Sin URL
    if (!e.url) { results.missingUrl.push({ dataIndex: i, id: e.id || '—', title: e.title || '—' }); }
    // A — IDs visibles
    if (e.id) {
      if (!idIndex[e.id]) idIndex[e.id] = [];
      idIndex[e.id].push(i);
    }
    // B — notionId
    if (e.notionId) {
      if (!nidIndex[e.notionId]) nidIndex[e.notionId] = [];
      nidIndex[e.notionId].push(i);
    }
    // C — URL
    if (e.url) {
      if (!urlIndex[e.url]) urlIndex[e.url] = [];
      urlIndex[e.url].push(i);
    }
    // D — notionId vs hash en URL
    if (e.url && e.notionId) {
      const extracted = extractNotionIdFromUrl(e.url);
      if (extracted && extracted !== e.notionId) {
        results.notionIdUrlMismatch.push({
          dataIndex: i, id: e.id,
          storedNotionId: e.notionId,
          extractedFromUrl: extracted,
          url: e.url,
        });
      }
    }
    // H — Campos estructurales: id, title, db, url deben existir y ser strings
    const required = ['id', 'title', 'db'];
    required.forEach(function(f) {
      if (!e[f] || typeof e[f] !== 'string') {
        results.invalidStructure.push({ dataIndex: i, id: e.id || '—', field: f, value: e[f] });
      }
    });
    // Anomalías documentadas
    if (e._dataIntegrityIssue) {
      results.documentedIssues.push({
        dataIndex: i, id: e.id, title: e.title,
        issue: e._dataIntegrityIssue,
      });
    }
  });

  // Poblar duplicados
  Object.entries(idIndex).forEach(function([id, idxs]) {
    if (idxs.length > 1) results.duplicateIds.push({
      id: id,
      entries: idxs.map(function(i) { return { dataIndex: i, title: DATA[i].title, notionId: DATA[i].notionId }; }),
    });
  });
  Object.entries(nidIndex).forEach(function([nid, idxs]) {
    if (idxs.length > 1) results.duplicateNotionIds.push({
      notionId: nid,
      entries: idxs.map(function(i) { return { dataIndex: i, id: DATA[i].id, title: DATA[i].title, url: DATA[i].url }; }),
    });
  });
  Object.entries(urlIndex).forEach(function([url, idxs]) {
    if (idxs.length > 1) results.duplicateUrls.push({
      url: url,
      entries: idxs.map(function(i) { return { dataIndex: i, id: DATA[i].id, title: DATA[i].title }; }),
    });
  });

  // E — Relaciones no resueltas
  const allNotionIds = new Set(DATA.map(function(e) { return e.notionId; }).filter(Boolean));
  DATA.forEach(function(e) {
    if (e.url) {
      const h = extractNotionIdFromUrl(e.url);
      if (h) allNotionIds.add(h);
    }
  });

  DATA.forEach(function(e) {
    var allRefs = [].concat(
      (e.relacionadas  || []).map(function(r){ return {ref:r, field:'relacionadas'}; }),
      (e.anterior      || []).map(function(r){ return {ref:r, field:'anterior'}; }),
      (e.siguiente     || []).map(function(r){ return {ref:r, field:'siguiente'}; }),
      (e.glosario      || []).map(function(r){ return {ref:r, field:'glosario'}; }),
      (e.entrevistas   || []).map(function(r){ return {ref:r, field:'entrevistas'}; })
    );
    allRefs.forEach(function(item) {
      const resolved = allNotionIds.has(item.ref) ||
        DATA.some(function(d) { return d.url && d.url.replace(/-/g,'').includes(item.ref); });
      if (!resolved) {
        const prefix = item.ref.substring(0, 8);
        const existing = results.unresolvedRelations.find(function(x) { return x.refPrefix === prefix && x.field === item.field; });
        if (existing) {
          existing.count++;
          if (existing.sourcesIds.indexOf(e.id) === -1) existing.sourcesIds.push(e.id);
        } else {
          results.unresolvedRelations.push({
            refPrefix: prefix,
            field: item.field,
            count: 1,
            sourcesIds: [e.id],
            exampleRef: item.ref,
          });
        }
      }
    });
  });

  // Estado general
  const nidPairs = new Set(results.duplicateNotionIds.flatMap(function(d){ return d.entries.map(function(e){ return e.dataIndex; }); }).sort().join(','));
  const urlOnlyDups = results.duplicateUrls.filter(function(d) {
    const urlIdxs = d.entries.map(function(e){ return e.dataIndex; }).sort().join(',');
    return !results.duplicateNotionIds.some(function(n){
      return n.entries.map(function(e){ return e.dataIndex; }).sort().join(',') === urlIdxs;
    });
  });

  const criticalCount = results.duplicateIds.length + results.missingId.length +
    results.invalidStructure.length + results.notionIdUrlMismatch.length;
  const warningCount  = results.duplicateNotionIds.length + urlOnlyDups.length;
  const infoCount     = results.unresolvedRelations.length + results.missingUrl.length;

  results.status = criticalCount > 0 ? 'CRITICAL'
                 : warningCount  > 0 ? 'WARNING'
                 : 'HEALTHY';

  results._counts = { critical: criticalCount, warning: warningCount, info: infoCount };
  return results;
}

/* ═══════════════════════════════════════════════════════════════
   SYSTEM INTEGRITY VIEW
═══════════════════════════════════════════════════════════════ */

export function renderIntegrity() {
  const audit = runIntegrityAudit();
  const wrap  = document.getElementById('integrity-wrap');
  if (!wrap) return;

  const statusColors = { HEALTHY:'#5ba85b', WARNING:'#c4a020', CRITICAL:'#c45a5a' };
  const statusIcons  = { HEALTHY:'✅', WARNING:'⚠️', CRITICAL:'🔴' };
  const statusColor  = statusColors[audit.status];

  // ── SECCIÓN A: Anomalías AUTOMÁTICAS ─────────────────────────────
  const autoAnomalies = [];

  audit.duplicateIds.forEach(function(d) {
    autoAnomalies.push({
      severity:'critical', icon:'🔴',
      title: 'ID visible duplicado: ' + d.id,
      detail: d.entries.map(function(e){ return '['+e.dataIndex+'] '+e.id+' — '+e.title.substring(0,38); }).join(' | '),
      cause: 'Dos entradas en DATA tienen el mismo id visible. El sistema las distingue por dataIndex.',
      action: 'Reasignar el ID duplicado en la próxima sincronización. Verificar el generador de IDs.',
      auto: false,
    });
  });

  audit.duplicateNotionIds.forEach(function(d) {
    autoAnomalies.push({
      severity:'warning', icon:'⚠️',
      title: 'notionId duplicado: …' + d.notionId.slice(-12),
      detail: d.entries.map(function(e){ return e.id+' — '+e.title.substring(0,38); }).join(' | '),
      cause: 'Dos entradas comparten el mismo Page ID de Notion (notionId). Detectado por comparación de hashes.',
      action: 'Verificar en Notion si una página fue reubicada, renombrada o si la URL fue asignada incorrectamente en el sync.',
      auto: false,
    });
  });

  audit.duplicateUrls.forEach(function(d) {
    const sameEntries = audit.duplicateNotionIds.some(function(n){
      return n.entries.length === d.entries.length &&
        n.entries.every(function(ne){ return d.entries.some(function(ue){ return ue.dataIndex === ne.dataIndex; }); });
    });
    if (!sameEntries) {
      autoAnomalies.push({
        severity:'warning', icon:'⚠️',
        title: 'URL duplicada',
        detail: d.url.substring(0,72)+'… · entradas: '+d.entries.map(function(e){ return e.id; }).join(', '),
        cause: 'Dos entradas tienen exactamente la misma URL de Notion.',
        action: 'Verificar si el sync asignó la URL incorrecta a alguna de las entradas.',
        auto: false,
      });
    }
  });

  audit.notionIdUrlMismatch.forEach(function(d) {
    autoAnomalies.push({
      severity:'critical', icon:'🔴',
      title: 'notionId ≠ hash de URL · ' + d.id,
      detail: 'Almacenado: '+d.storedNotionId.substring(0,16)+'… | Extraído de URL: '+d.extractedFromUrl.substring(0,16)+'…',
      cause: 'El campo notionId del objeto no coincide con el Page ID que contiene la URL.',
      action: 'Recalcular notionId desde la URL. Corregible automáticamente en la próxima sync.',
      auto: true,
    });
  });

  audit.missingId.forEach(function(d) {
    autoAnomalies.push({
      severity:'critical', icon:'🔴',
      title: 'Entrada sin ID visible [dataIndex='+d.dataIndex+']',
      detail: 'Título: '+(d.title||'—'),
      cause: 'El campo id está ausente o vacío.',
      action: 'Asignar ID en el proceso de sincronización.',
      auto: false,
    });
  });

  audit.missingUrl.forEach(function(d) {
    autoAnomalies.push({
      severity:'warning', icon:'⚠️',
      title: 'Entrada sin URL · ' + d.id,
      detail: d.title.substring(0,55),
      cause: 'El campo url está ausente. El botón "Abrir en Notion" no funcionará para esta entrada.',
      action: 'Verificar que la página existe en Notion y resincronizar.',
      auto: false,
    });
  });

  audit.invalidStructure.forEach(function(d) {
    autoAnomalies.push({
      severity:'critical', icon:'🔴',
      title: 'Campo requerido inválido · '+d.id+'.'+d.field,
      detail: 'Valor actual: '+JSON.stringify(d.value),
      cause: 'Un campo estructural requerido (id, title o db) está ausente o no es string.',
      action: 'Corregir en la fuente Notion y resincronizar.',
      auto: false,
    });
  });

  audit.unresolvedRelations.forEach(function(d) {
    autoAnomalies.push({
      severity:'info', icon:'ℹ️',
      title: d.count+' referencia(s) sin resolver · campo "'+d.field+'" · prefijo '+d.refPrefix+'…',
      detail: 'Afecta a: '+d.sourcesIds.slice(0,6).join(', ')+(d.sourcesIds.length>6?' y '+(d.sourcesIds.length-6)+' más':''),
      cause: 'Las referencias apuntan a una base de datos de Notion que no está incluida en DATA.',
      action: 'Incorporar la base de datos referenciada en una futura sincronización.',
      auto: false,
    });
  });

  // ── SECCIÓN B: Anomalías DOCUMENTADAS ────────────────────────────
  const docAnomalies = audit.documentedIssues.map(function(d) {
    var sev = d.issue.severity || 'warning';
    return {
      severity: sev,
      icon: sev==='critical'?'🔴':sev==='warning'?'⚠️':'ℹ️',
      id: d.id,
      title: d.title.substring(0,50),
      content: d.issue.content,
      urlPoints: d.issue.urlPoints,
      status: d.issue.status,
      note: d.issue.note,
      code: d.issue.code,
    };
  });

  // ── MÉTRICAS GENERALES ────────────────────────────────────────────
  var totalRefs = 0;
  DATA.forEach(function(e) {
    totalRefs += (e.relacionadas || []).length + (e.anterior || []).length +
      (e.siguiente || []).length + (e.glosario || []).length + (e.entrevistas || []).length;
  });
  const totalUnresolved = audit.unresolvedRelations.reduce(function(a,r){ return a+r.count; },0);
  const resolvedCount   = totalRefs - totalUnresolved;

  // ── SECCIÓN C: Coherencia código-datos ──────────────────────────
  var coherenceIssues = [];

  // C-1: Valores HTML estáticos vs. DATA
  var counterMap = {
    'nc-total': { label: '#nc-total (sidebar)', fn: function(){ return String(DATA.length); } },
    'h-total':  { label: '#h-total (home)', fn: function(){ return String(DATA.length); } },
    'exp-total':{ label: '#exp-total (explore)', fn: function(){ return String(DATA.length); } },
    'nc-ciber': { label: '#nc-ciber', fn: function(){ return String(ciberCount); } },
    'nc-tech':  { label: '#nc-tech', fn: function(){ return String(techCount); } },
    'nc-cripto':{ label: '#nc-cripto', fn: function(){ return String(criptoCount); } },
    'nc-inv':   { label: '#nc-inv (investigations)', fn: function(){ return typeof INVESTIGATIONS !== 'undefined' ? String(INVESTIGATIONS.filter(function(i){ return i.status === 'active' || i.status === 'draft'; }).length) : undefined; } },
  };
  Object.keys(counterMap).forEach(function(id) {
    var staticVal = _staticCounters[id];
    var realVal   = counterMap[id].fn();
    if (staticVal && staticVal !== realVal) {
      coherenceIssues.push({
        code: 'C-1', severity: 'warning', icon: '⚠️',
        title: 'Valor HTML estático desactualizado: ' + counterMap[id].label,
        detail: 'El HTML mostraba "' + staticVal + '" antes de que initCounts() lo actualizara a ' + realVal + '.',
        cause: 'El HTML contiene un valor fijo que se desincroniza con cada nueva entrada en Notion.',
        action: 'Sustituir el valor fijo por un placeholder (—) o generar index.html con conteos dinámicos en el sync.',
      });
    }
  });

  // C-2: SYSTEM_STATE vs. DATA
  if (SYSTEM_STATE.total !== DATA.length) {
    coherenceIssues.push({
      code: 'C-2', severity: 'warning', icon: '⚠️',
      title: 'SYSTEM_STATE.total (' + SYSTEM_STATE.total + ') ≠ DATA.length (' + DATA.length + ')',
      detail: 'El objeto SYSTEM_STATE declara ' + SYSTEM_STATE.total + ' entradas pero DATA contiene ' + DATA.length + '.',
      cause: 'SYSTEM_STATE se actualiza manualmente y no se regenera automáticamente en el sync.',
      action: 'Generar SYSTEM_STATE desde DATA en sync-notion.mjs o eliminarlo por completo.',
    });
  }
  Object.keys(SYSTEM_STATE.dbs).forEach(function(dbId) {
    var dbState = SYSTEM_STATE.dbs[dbId];
    var realCount = DATA.filter(function(d){ return d.db === dbState.name; }).length;
    if (dbState.count !== realCount) {
      coherenceIssues.push({
        code: 'C-2', severity: 'info', icon: 'ℹ️',
        title: dbState.name + ': SYSTEM_STATE.count (' + dbState.count + ') ≠ real (' + realCount + ')',
        detail: 'La DB "' + dbState.name + '" declara ' + dbState.count + ' en SYSTEM_STATE pero DATA tiene ' + realCount + '.',
        cause: 'Los conteos por DB en SYSTEM_STATE no se actualizan con el sync.',
        action: 'Recalcular automáticamente en sync-notion.mjs.',
      });
    }
  });

  // C-3: DB_META vs. DATA vs. AREA_MAP
  var dbsInData = new Set(DATA.map(function(d){ return d.db; }));
  Object.keys(DB_META).forEach(function(dbName) {
    if (!dbsInData.has(dbName)) {
      coherenceIssues.push({
        code: 'C-3', severity: 'info', icon: 'ℹ️',
        title: 'DB en DB_META sin entradas en DATA: ' + dbName,
        detail: 'La base "' + dbName + '" está definida en DB_META pero no tiene ninguna entrada en DATA.',
        cause: 'La DB puede haber sido vaciada o eliminada de Notion sin actualizar DB_META.',
        action: 'Verificar en Notion si la DB sigue activa. Si no, eliminar de DB_META.',
      });
    }
  });
  dbsInData.forEach(function(dbName) {
    if (!DB_META[dbName]) {
      coherenceIssues.push({
        code: 'C-3', severity: 'warning', icon: '⚠️',
        title: 'DB en DATA sin configurar en DB_META: ' + dbName,
        detail: DATA.filter(function(d){ return d.db === dbName; }).length + ' entradas con db="' + dbName + '" pero sin color/icon/area en DB_META.',
        cause: 'Nueva base sincronizada sin configurar en el código.',
        action: 'Añadir "' + dbName + '" a DB_META con color, area e icon.',
      });
    }
  });
  Object.keys(AREA_MAP).forEach(function(area) {
    AREA_MAP[area].forEach(function(dbName) {
      if (!DB_META[dbName]) {
        coherenceIssues.push({
          code: 'C-3', severity: 'warning', icon: '⚠️',
          title: 'DB en AREA_MAP["' + area + '"] sin DB_META: ' + dbName,
          detail: '"' + dbName + '" está listada en AREA_MAP pero no existe en DB_META.',
          cause: 'Incoherencia entre AREA_MAP y DB_META.',
          action: 'Añadir a DB_META o eliminar de AREA_MAP.',
        });
      }
    });
  });

  // C-4: Constantes hardcodeadas que deberían ser dinámicas
  var suspectValues = {};
  suspectValues[236] = 'total histórico de entradas';
  suspectValues[244] = 'total histórico de entradas';
  suspectValues[325] = 'resolvedCount histórico';
  if (typeof SYSTEM_STATE !== 'undefined' && SYSTEM_STATE.total != null) {
    if (suspectValues[SYSTEM_STATE.total] && SYSTEM_STATE.total !== DATA.length) {
      coherenceIssues.push({
        code: 'C-4', severity: 'warning', icon: '⚠️',
        title: 'SYSTEM_STATE.total contiene constante obsoleta: ' + SYSTEM_STATE.total,
        detail: 'Coincide con ' + suspectValues[SYSTEM_STATE.total] + '. DATA tiene ' + DATA.length + ' entradas.',
        cause: 'Valor hardcodeado que no se recalcula con cada sync.',
        action: 'Eliminar SYSTEM_STATE o generarlo en sync-notion.mjs.',
      });
    }
  }

  // C-5: Campos presentes en DATA pero no usados por las vistas
  var knownFields = new Set([
    'id','title','db','url','desc','etiquetas','area','fuente','fecha',
    'notionId','serie','anterior','siguiente','relacionadas','glosario',
    'entrevistas','_dataIntegrityIssue','tipo','lectura','gravedad','urlFuente'
  ]);
  var unknownFields = {};
  DATA.forEach(function(e) {
    Object.keys(e).forEach(function(k) {
      if (!knownFields.has(k)) {
        unknownFields[k] = (unknownFields[k] || 0) + 1;
      }
    });
  });
  Object.keys(unknownFields).forEach(function(field) {
    coherenceIssues.push({
      code: 'C-5', severity: 'info', icon: 'ℹ️',
      title: 'Campo no utilizado en DATA: "' + field + '"',
      detail: 'Presente en ' + unknownFields[field] + ' de ' + DATA.length + ' entradas pero no referenciado por ninguna vista.',
      cause: 'sync-notion.mjs exporta un campo que el frontend ignora.',
      action: 'Integrar en la vista correspondiente o excluir del sync para reducir tamaño.',
    });
  });

  // ── RENDER ────────────────────────────────────────────────────────
  function cardAuto(a) {
    var borderClass = a.severity==='critical'?'high':a.severity==='warning'?'medium':'low';
    var sigClass    = borderClass;
    var sigLabel    = a.severity==='critical'?'Crítico':a.severity==='warning'?'Aviso':'Info';
    return '<div class="opp-card '+borderClass+'" style="margin-bottom:8px">' +
      '<div class="opp-header">' +
        '<span class="opp-signal '+sigClass+'">'+a.icon+' '+sigLabel+'</span>' +
        '<span class="opp-title">'+escapeHTML(a.title)+'</span>' +
      '</div>' +
      '<div class="opp-body" style="grid-template-columns:1fr 1fr 1fr">' +
        '<div><div class="opp-block-label">Detalle</div><div class="opp-block-content">'+escapeHTML(a.detail)+'</div></div>' +
        '<div><div class="opp-block-label">Causa detectada</div><div class="opp-block-content">'+escapeHTML(a.cause)+'</div></div>' +
        '<div><div class="opp-block-label">Acción recomendada</div><div class="opp-block-content">'+escapeHTML(a.action)+
          (a.auto?'<br><span style="color:#5ba85b;font-size:10px">✅ Corregible automáticamente</span>':
                  '<br><span style="color:#c4a020;font-size:10px">Requiere intervención manual</span>')+
        '</div></div>' +
      '</div>' +
    '</div>';
  }

  function cardDoc(d) {
    var statusLabel = d.status === 'pending_source_correction' ? '⏳ Pendiente de corrección en origen'
                    : d.status === 'resolved' ? '✅ Resuelto' : d.status;
    return '<div class="opp-card medium" style="margin-bottom:8px;border-left-color:#6c63ff">' +
      '<div class="opp-header">' +
        '<span class="opp-signal medium" style="background:#6c63ff22;color:var(--accent2)">👤 Documentado</span>' +
        '<span class="opp-title">'+escapeHTML(d.id)+' — '+escapeHTML(d.title)+'</span>' +
        '<span style="font-size:9px;font-family:monospace;color:var(--text3);flex-shrink:0">'+escapeHTML(d.code)+'</span>' +
      '</div>' +
      '<div class="opp-body" style="grid-template-columns:1fr 1fr 1fr">' +
        '<div><div class="opp-block-label">Contenido de la entrada</div><div class="opp-block-content">'+escapeHTML(d.content)+'</div></div>' +
        '<div><div class="opp-block-label">URL apunta a</div><div class="opp-block-content">'+escapeHTML(d.urlPoints)+'</div></div>' +
        '<div><div class="opp-block-label">Estado</div><div class="opp-block-content">'+escapeHTML(statusLabel)+
          '<br><span style="font-size:10px;color:var(--text3);margin-top:4px;display:block">'+escapeHTML(d.note)+'</span>'+
        '</div></div>' +
      '</div>' +
    '</div>';
  }

  function statChip(label, val, flag) {
    return '<div class="stat-card"><div class="stat-label">'+label+'</div>' +
      '<div class="stat-value">'+val+'</div>' +
      '<div class="stat-sub">'+flag+'</div></div>';
  }

  var critCount = audit._counts.critical;
  var warnCount = audit._counts.warning;
  var statusReason = critCount > 0
    ? critCount+' anomalía(s) crítica(s) detectada(s) automáticamente'
    : warnCount > 0
    ? warnCount+' duplicado(s) de identidad detectado(s) automáticamente'
    : 'Sin anomalías estructurales detectadas';

  wrap.innerHTML =
    // Header de estado
    '<div style="display:flex;align-items:center;gap:16px;margin-bottom:6px">' +
      '<div style="font-size:34px">'+statusIcons[audit.status]+'</div>' +
      '<div>' +
        '<div style="font-size:18px;font-weight:700;color:'+statusColor+'">'+audit.status+'</div>' +
        '<div style="font-size:11px;color:var(--text3);margin-top:2px">'+statusReason+'</div>' +
        '<div style="font-size:10px;color:var(--text3);margin-top:1px">Análisis: '+audit.meta.timestamp.replace('T',' ').substring(0,19)+' UTC</div>' +
      '</div>' +
    '</div>' +

    // Aclaración sobre el estado global
    '<div style="font-size:11px;color:var(--text3);background:var(--bg2);border:1px solid var(--border);border-radius:var(--radius-sm);padding:8px 12px;margin-bottom:20px">' +
      'El estado global refleja solo las anomalías detectadas automáticamente. Las anomalías documentadas se muestran aparte y no alteran el estado salvo que su severidad sea definida como bloqueante.' +
    '</div>' +

    // Métricas
    '<div class="stat-grid" style="margin-bottom:24px">' +
      statChip('Entradas totales',  audit.meta.totalEntries, '') +
      statChip('IDs únicos',        audit.meta.totalEntries - audit.duplicateIds.length, audit.duplicateIds.length>0?'⚠️':'✅') +
      statChip('notionIds únicos',  audit.meta.totalEntries - audit.duplicateNotionIds.reduce(function(a,d){return a+d.entries.length-1;},0), audit.duplicateNotionIds.length>0?'⚠️':'✅') +
      statChip('URLs únicas',       audit.meta.totalEntries - audit.duplicateUrls.reduce(function(a,d){return a+d.entries.length-1;},0), audit.duplicateUrls.length>0?'⚠️':'✅') +
      statChip('Rels. resueltas',   resolvedCount, '✅') +
      statChip('Rels. pendientes',  totalUnresolved, totalUnresolved>0?'ℹ️':'✅') +
    '</div>' +

    // SECCIÓN A — AUTOMÁTICO
    '<div class="intel-section-title">🤖 Anomalías detectadas automáticamente' +
      (autoAnomalies.length>0?' ('+autoAnomalies.length+')':' — ninguna') +
    '</div>' +
    '<div style="font-size:10px;color:var(--text3);margin-bottom:12px">' +
      'Resultado directo de <code style="background:var(--bg3);padding:1px 5px;border-radius:3px">runIntegrityAudit()</code> · ' +
      'Solo compara hashes, IDs y estructura. No interpreta contenido semántico.' +
    '</div>' +
    (autoAnomalies.length===0
      ? '<div class="gen-empty" style="margin-bottom:24px">No se detectan anomalías automáticas en este momento.</div>'
      : autoAnomalies.map(cardAuto).join('') + '<div style="height:8px"></div>') +

    // SECCIÓN B — DOCUMENTADO
    '<div class="intel-section-title" style="margin-top:4px">👤 Anomalías documentadas' +
      (docAnomalies.length>0?' ('+docAnomalies.length+')':' — ninguna') +
    '</div>' +
    '<div style="font-size:10px;color:var(--text3);margin-bottom:12px">' +
      'Añadidas mediante <code style="background:var(--bg3);padding:1px 5px;border-radius:3px">_dataIntegrityIssue</code> en DATA · ' +
      'Representan conocimiento humano que la máquina no puede deducir automáticamente.' +
    '</div>' +
    (docAnomalies.length===0
      ? '<div class="gen-empty" style="margin-bottom:24px">No hay anomalías documentadas manualmente.</div>'
      : docAnomalies.map(cardDoc).join('')) +

    // SECCIÓN C — COHERENCIA CÓDIGO-DATOS
    '<div class="intel-section-title" style="margin-top:4px">🔗 Coherencia código ↔ datos' +
      (coherenceIssues.length>0?' ('+coherenceIssues.length+')':' — sin divergencias') +
    '</div>' +
    '<div style="font-size:10px;color:var(--text3);margin-bottom:12px">' +
      'Detecta divergencias entre lo que el código asume y lo que DATA contiene. ' +
      'Regla: <em>el código no debe contener valores que los datos puedan contradecir</em>.' +
    '</div>' +
    (coherenceIssues.length===0
      ? '<div class="gen-empty" style="margin-bottom:24px">No se detectan divergencias entre código y datos.</div>'
      : coherenceIssues.map(function(c) {
          var borderClass = c.severity==='warning'?'medium':c.severity==='info'?'low':'high';
          var sigLabel = c.severity==='warning'?'Aviso':c.severity==='info'?'Info':'Crítico';
          return '<div class="opp-card '+borderClass+'" style="margin-bottom:8px">' +
            '<div class="opp-header">' +
              '<span class="opp-signal '+borderClass+'">'+c.icon+' '+escapeHTML(c.code)+'</span>' +
              '<span class="opp-title">'+escapeHTML(c.title)+'</span>' +
            '</div>' +
            '<div class="opp-body" style="grid-template-columns:1fr 1fr 1fr">' +
              '<div><div class="opp-block-label">Detalle</div><div class="opp-block-content">'+escapeHTML(c.detail)+'</div></div>' +
              '<div><div class="opp-block-label">Causa</div><div class="opp-block-content">'+escapeHTML(c.cause)+'</div></div>' +
              '<div><div class="opp-block-label">Acción</div><div class="opp-block-content">'+escapeHTML(c.action)+'</div></div>' +
            '</div>' +
          '</div>';
        }).join('')) +

    // Footer
    '<div style="margin-top:20px;padding:10px 14px;background:var(--bg2);border:1px solid var(--border);border-radius:var(--radius-sm);font-size:10px;color:var(--text3)">' +
      '<strong style="color:var(--text2)">Regla arquitectónica:</strong> ' +
      'Detectar automáticamente. Explicar automáticamente. ' +
      'Corregir automáticamente solo cuando la identidad sea inequívoca. ' +
      'El código no debe contener valores que los datos puedan contradecir. ' +
      'Este panel es de solo lectura — <strong style="color:var(--text2)">no modifica DATA</strong>.' +
    '</div>';
}
