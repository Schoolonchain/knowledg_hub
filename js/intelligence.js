/* ═══════════════════════════════════════════════════════════════
   TAG CLASSIFIER — A1
   Clasifica etiquetas para filtrar el análisis de Intelligence.
   NO modifica DATA. Solo se usa en el motor de Intelligence.

   Tipos:
     level    — nivel o dificultad (excluir de oportunidades y candidatos)
     metadata — nombre de módulo/serie/curso (excluir de candidatos)
     unknown  — ambigua; excluir de candidatos a concepto,
                mantener en análisis de oportunidades
     thematic — temática/conceptual (incluir en todo el análisis)

   Las etiquetas no listadas explícitamente se tratan como "thematic".
   La lista es CONSERVADORA: solo certezas, no inferencias.
═══════════════════════════════════════════════════════════════ */

const TAG_CLASSIFIER = {
  // ── Nivel / dificultad ────────────────────────────────────────
  level: new Set([
    'Fundamental', 'Avanzado', 'Intermedio', 'Básico',
  ]),

  // ── Metadato administrativo: nombre de módulo, serie o curso ─
  metadata: new Set([
    'AB-I · Fundamentos Criptográficos',
    'AB-II · Arquitectura de Seguridad',
    'AB-III · Smart Contracts y DeFi',
    'Cripto Operativa',
    'Estrategias Avanzadas',
    'Niveles del Inversor',
  ]),

  // ── Ambiguas: tipo de contenido sin tema propio ──────────────
  // Se mantienen en análisis de oportunidades pero se excluyen
  // de candidatos a concepto y señales de transversalidad.
  unknown: new Set([
    'Fundamentos',   // puede ser tema o nivel según contexto
    'Concepto',      // tipo de entrada, no concepto en sí
    'Herramienta',   // tipo de entrada
    'Herramientas',  // duplicado con plural
    'Recursos',      // colección, no tema
    'Metodología',   // puede ser tema o tipo según contexto
    'Plataforma',    // tipo genérico
  ]),
};

// Devuelve 'level' | 'metadata' | 'unknown' | 'thematic'
function classifyTag(tag) {
  if (TAG_CLASSIFIER.level.has(tag))    return 'level';
  if (TAG_CLASSIFIER.metadata.has(tag)) return 'metadata';
  if (TAG_CLASSIFIER.unknown.has(tag))  return 'unknown';
  return 'thematic';
}

// true si la etiqueta debe incluirse en análisis de oportunidades
function tagIsOpportunityCandidate(tag) {
  const cls = classifyTag(tag);
  return cls === 'thematic' || cls === 'unknown';
}

// true si la etiqueta debe incluirse en candidatos a concepto
function tagIsConceptCandidate(tag) {
  return classifyTag(tag) === 'thematic';
}

// true si la etiqueta debe incluirse en señales de transversalidad
function tagIsTransversal(tag) {
  return classifyTag(tag) === 'thematic';
}

/* ═══════════════════════════════════════════════════════════════
   INTELLIGENCE ENGINE
   Todo lo que calcula este módulo se basa únicamente en DATA real.
   Ningún insight es inventado. Toda conclusión indica su origen.
═══════════════════════════════════════════════════════════════ */

// DBs de producción propia (entradas que el usuario crea)
const PRODUCTION_DBS = ['✍️ Artículos propios'];
// DBs de consumo (lo que el usuario captura de fuentes externas)
const CONSUMPTION_DBS = ['💻 TLDR Dev','🔐 El Rincón del Hacker','🔎 OSINT Newsletter','🔓 PWN | Hacker Community'];
// DBs de conocimiento sintetizado
const KNOWLEDGE_DBS  = ['📚 Biblioteca','🏷️ Glosario de Etiquetas','📖 Glosario TLDR'];

// Calcula la frecuencia de todas las etiquetas en DATA
function computeTagFrequencies() {
  const freq = {};
  const byArea = {};   // tag → Set de áreas
  const byDB   = {};   // tag → { dbName: count }
  DATA.forEach(function(e) {
    if (!e.etiquetas || !e.etiquetas.length) return;
    const area = (DB_META[e.db] || {}).area || 'unknown';
    e.etiquetas.forEach(function(t) {
      freq[t]  = (freq[t]  || 0) + 1;
      byArea[t] = byArea[t] || new Set();
      byArea[t].add(area);
      byDB[t]  = byDB[t]  || {};
      byDB[t][e.db] = (byDB[t][e.db] || 0) + 1;
    });
  });
  return { freq, byArea, byDB };
}

// Calcula cuántas entradas de producción tienen una etiqueta
function productionCountForTag(tag, byDB) {
  let count = 0;
  PRODUCTION_DBS.forEach(function(db) {
    count += (byDB[tag] && byDB[tag][db]) || 0;
  });
  return count;
}

// Calcula cuántas entradas de consumo tienen una etiqueta
function consumptionCountForTag(tag, byDB) {
  let count = 0;
  CONSUMPTION_DBS.forEach(function(db) {
    count += (byDB[tag] && byDB[tag][db]) || 0;
  });
  return count;
}

// Calcula score de conectividad de una entrada
function connectivityScore(e) {
  return (e.relacionadas  || []).length
       + (e.entrevistas   || []).length
       + (e.glosario      || []).length
       + (e.anterior      || []).length
       + (e.siguiente     || []).length;
}

// Calcula series con ≥4 artículos propios
function computeSeries() {
  const serieMap = {};
  DATA.filter(function(e) { return PRODUCTION_DBS.includes(e.db) && e.serie; })
    .forEach(function(e) {
      serieMap[e.serie] = (serieMap[e.serie] || 0) + 1;
    });
  return Object.entries(serieMap)
    .filter(function(p) { return p[1] >= 4; })
    .sort(function(a,b) { return b[1] - a[1]; });
}

// Genera oportunidades usando reglas explícitas
function computeOpportunities(freq, byArea, byDB) {
  const opps = [];
  const MIN_FREQ = 4; // umbral mínimo de apariciones para considerar

  Object.keys(freq)
    .filter(function(t) { return freq[t] >= MIN_FREQ && tagIsOpportunityCandidate(t); })
    .sort(function(a,b) { return freq[b] - freq[a]; })
    .slice(0, 15) // máximo 15 candidatos
    .forEach(function(tag) {
      const totalCount  = freq[tag];
      const prodCount   = productionCountForTag(tag, byDB);
      const consCount   = consumptionCountForTag(tag, byDB);
      const areaCount   = byArea[tag] ? byArea[tag].size : 0;

      // Índices reales de las entradas que contienen esta etiqueta
      // Usando dataIndex directo — sin DATA.indexOf()
      const entryIndices = [];
      DATA.forEach(function(e, i) {
        if (e.etiquetas && e.etiquetas.indexOf(tag) !== -1) {
          entryIndices.push(i);
        }
      });

      // Regla 1: consumo significativo sin producción propia
      if (consCount >= MIN_FREQ && prodCount === 0) {
        const confidence = totalCount >= 10 ? 'high' : (totalCount >= 6 ? 'medium' : 'low');
        opps.push({
          id: 'opp-r1-' + tag.replace(/\s/g,'_'),
          tag: tag,
          type: 'production_gap',
          confidence: confidence,
          rule: 'tag_frequency + production_gap',
          totalCount: totalCount,
          prodCount: prodCount,
          consCount: consCount,
          areaCount: areaCount,
          byDB: byDB[tag] || {},
          entryIndices: entryIndices,
          title: 'Sin producción propia sobre "' + tag + '"',
          interpretation: 'No se detecta producción propia etiquetada como "' + tag + '" en los datos actuales. Existe consumo significativo pero no hay artículos propios equivalentes.',
          action: 'Considerar iniciar una investigación o artículo sobre este tema.'
        });
      }
      // Regla 2: etiqueta transversal (aparece en ≥2 áreas)
      else if (areaCount >= 2 && totalCount >= MIN_FREQ) {
        opps.push({
          id: 'opp-r2-' + tag.replace(/\s/g,'_'),
          tag: tag,
          type: 'cross_area',
          confidence: 'medium',
          rule: 'cross_area + tag_frequency',
          totalCount: totalCount,
          prodCount: prodCount,
          consCount: consCount,
          areaCount: areaCount,
          byDB: byDB[tag] || {},
          entryIndices: entryIndices,
          title: '"' + tag + '" es transversal a ' + areaCount + ' áreas',
          interpretation: 'Esta etiqueta aparece en ' + areaCount + ' áreas distintas de tu sistema. Puede representar una conexión de conocimiento no explorada explícitamente.',
          action: 'Considera si este tema merece un concepto explícito o una investigación transversal.'
        });
      }
    });

  return opps.slice(0, 8); // máximo 8 oportunidades mostradas
}
// Identifica candidatos a concepto: alta frecuencia + presencia transversal
function computeCandidates(freq, byArea) {
  return Object.keys(freq)
    .filter(function(t) { return freq[t] >= 3 && byArea[t] && byArea[t].size >= 2 && tagIsConceptCandidate(t); })
    .sort(function(a,b) {
      const score = function(t) { return freq[t] * byArea[t].size; };
      return score(b) - score(a);
    })
    .slice(0, 12);
}

function renderIntelligence() {
  const { freq, byArea, byDB } = computeTagFrequencies();

  // Badge de modo
  const badgeWrap = document.getElementById('intel-mode-badge-wrap');
  const hasRelations = RELATIONS.length > 0;
  const hasConceptsOrEntities = CONCEPTS.length > 0 || ENTITIES.length > 0;
  const level = (hasRelations || hasConceptsOrEntities) ? 'B' : 'A';
  badgeWrap.innerHTML = '<div class="intel-mode-badge level-' + level.toLowerCase() + '">' +
    (level === 'A'
      ? '🔍 Nivel A — Análisis de señales (etiquetas + frecuencias). Sin relaciones explícitas aún.'
      : '🧠 Nivel B — Análisis semántico activo (conceptos, entidades, relaciones).') +
    '</div>';

  // Stat strip
  const artCount  = DATA.filter(function(e) { return PRODUCTION_DBS.includes(e.db); }).length;
  const consCount = DATA.filter(function(e) { return CONSUMPTION_DBS.includes(e.db); }).length;
  const knowCount = DATA.filter(function(e) { return KNOWLEDGE_DBS.includes(e.db); }).length;
  const tagTotal  = Object.keys(freq).length;
  document.getElementById('intel-stat-grid').innerHTML = [
    { l: 'Producción propia', v: artCount,  s: 'Artículos y artículos' },
    { l: 'Fuentes capturadas', v: consCount, s: 'Newsletters y noticias' },
    { l: 'Conocimiento sintetizado', v: knowCount, s: 'Biblioteca y glosarios' },
    { l: 'Etiquetas únicas', v: tagTotal,  s: 'En todo el sistema' },
  ].map(function(s) {
    return '<div class="stat-card"><div class="stat-label">' + s.l + '</div>' +
      '<div class="stat-value stat-accent">' + s.v + '</div>' +
      '<div class="stat-sub">' + s.s + '</div></div>';
  }).join('');

  // Top etiquetas temáticas
  // Excluir etiquetas de clasificación de dificultad: no son temas de conocimiento.
  const CLASSIFICATION_TAGS = new Set(['Básico', 'Intermedio', 'Avanzado', 'Fundamental']);
  const topTags = Object.keys(freq)
    .filter(function(t) { return !CLASSIFICATION_TAGS.has(t); })
    .sort(function(a,b) { return freq[b]-freq[a]; })
    .slice(0,10);
  const maxFreq = topTags.length ? freq[topTags[0]] : 1;
  document.getElementById('intel-top-tags').innerHTML = topTags.map(function(t) {
    const pct = Math.round(freq[t] / maxFreq * 100);
    return '<div class="intel-tag-row" data-action="filter-tag" data-tag="' + escapeHTML(t) + '">' +
      '<span class="intel-tag-name">' + escapeHTML(t) + '</span>' +
      '<div class="intel-tag-bar-wrap"><div class="intel-tag-bar" style="width:' + pct + '%"></div></div>' +
      '<span class="intel-tag-count">' + freq[t] + '</span></div>';
  }).join('') || '<div style="color:var(--text3);font-size:11px">Sin etiquetas registradas</div>';

  // Etiquetas transversales
  const crossTags = Object.keys(freq)
    .filter(function(t) { return byArea[t] && byArea[t].size >= 2 && tagIsTransversal(t); })
    .sort(function(a,b) { return freq[b]-freq[a]; })
    .slice(0, 8);
  const areaColors = { ciber: 'var(--ciber)', tech: 'var(--tech)', cripto: 'var(--cripto)' };
  document.getElementById('intel-cross-tags').innerHTML = crossTags.length
    ? crossTags.map(function(t) {
        const areas = [...byArea[t]];
        const dots  = areas.map(function(a) {
          return '<span class="cand-area-dot" style="background:' + (areaColors[a] || '#888') + '" title="' + escapeHTML(AREA_META[a] ? AREA_META[a].label : a) + '"></span>';
        }).join('');
        return '<div class="intel-tag-row" data-action="filter-tag" data-tag="' + escapeHTML(t) + '">' +
          '<span class="intel-tag-name">' + escapeHTML(t) + '</span>' +
          '<span style="display:flex;gap:3px;margin:0 6px">' + dots + '</span>' +
          '<span class="intel-tag-count">' + freq[t] + '</span></div>';
      }).join('')
    : '<div style="color:var(--text3);font-size:11px">Sin etiquetas transversales detectadas</div>';

  // Hubs de conocimiento (entradas más conectadas)
  const hubs = DATA.map(function(e, i) { return { e: e, dataIndex: i, score: connectivityScore(e) }; })
    .filter(function(x) { return x.score >= 2; })
    .sort(function(a,b) { return b.score - a.score; })
    .slice(0, 8);
  document.getElementById('intel-hubs').innerHTML = hubs.length
    ? hubs.map(function(x) {
        const idx = x.dataIndex;
        return '<div class="intel-hub-row" data-action="open-detail" data-idx="' + idx + '">' +
          '<span class="intel-hub-id">' + escapeHTML(x.e.id) + '</span>' +
          '<span class="intel-hub-title">' + truncEsc(x.e.title, 38) + '</span>' +
          '<span class="intel-hub-score">' + x.score + ' rel</span></div>';
      }).join('')
    : '<div style="color:var(--text3);font-size:11px">Sin entradas con conexiones múltiples</div>';

  // Oportunidades
  const opps = computeOpportunities(freq, byArea, byDB);
  const oppContainer = document.getElementById('intel-opportunities');
  if (!opps.length) {
    oppContainer.innerHTML = '<div class="gen-empty">No se detectan oportunidades claras con los datos actuales. Añade más entradas o etiquetas para activar el análisis.</div>';
  } else {
    oppContainer.innerHTML = opps.map(function(opp) {
      // Distribución por DB
      const distRows = Object.entries(opp.byDB)
        .sort(function(a,b) { return b[1]-a[1]; })
        .map(function(p) {
          const dbMeta = DB_META[p[0]] || { color:'#888' };
          const isProd = PRODUCTION_DBS.includes(p[0]);
          return '<div class="opp-dist-row">' +
            '<span class="opp-dist-dot" style="background:' + dbMeta.color + '"></span>' +
            '<span class="opp-dist-label">' + escapeHTML(p[0].replace(/^\S+\s/,'')) + '</span>' +
            '<span class="opp-dist-val' + (isProd && p[1] > 0 ? '' : '') + '">' + p[1] + '</span></div>';
        }).join('');

      // Producción explícita
      const prodRows = PRODUCTION_DBS.map(function(db) {
        const cnt = (opp.byDB[db] || 0);
        return '<div class="opp-dist-row">' +
          '<span class="opp-dist-dot" style="background:' + (DB_META[db]||{color:'#888'}).color + '"></span>' +
          '<span class="opp-dist-label">' + escapeHTML(db.replace(/^\S+\s/,'')) + '</span>' +
          '<span class="opp-dist-val' + (cnt === 0 ? ' zero' : '') + '">' + (cnt === 0 ? '0 ← sin producción' : cnt) + '</span></div>';
      }).join('');

      return '<div class="opp-card ' + opp.confidence + '">' +
        '<div class="opp-header">' +
          '<span class="opp-signal ' + opp.confidence + '">' +
            (opp.confidence === 'high' ? '🔥 Alta' : opp.confidence === 'medium' ? '⚡ Media' : '💡 Baja') +
          '</span>' +
          '<span class="opp-title">' + escapeHTML(opp.title) + '</span>' +
        '</div>' +
        '<div class="opp-body">' +
          '<div><div class="opp-block-label">Datos</div><div class="opp-block-content">' +
            '<strong>' + opp.totalCount + '</strong> entradas con esta etiqueta<br>' +
            '<strong>' + opp.areaCount + '</strong> área(s) del sistema<br>' +
            '<strong>' + opp.prodCount + '</strong> en producción propia' +
          '</div></div>' +
          '<div><div class="opp-block-label">Distribución</div><div class="opp-block-content">' + distRows + '</div></div>' +
          '<div><div class="opp-block-label">Interpretación</div><div class="opp-block-content">' + escapeHTML(opp.interpretation) +
            '<br><br><strong>Acción sugerida:</strong> ' + escapeHTML(opp.action) +
          '</div></div>' +
        '</div>' +
        '<div class="opp-footer">' +
          '<span class="opp-evidence">regla: ' + escapeHTML(opp.rule) + ' · evidencia: tag_frequency · confianza: ' + escapeHTML(opp.confidence) + '</span>' +
          '<div class="opp-actions">' +
            '<button class="opp-btn opp-btn-secondary" id="btn-entries-' + escapeHTML(opp.id) + '" data-action="toggle-opp-entries" data-opp-id="' + escapeHTML(opp.id) + '" data-indices="' + escapeHTML(JSON.stringify(opp.entryIndices)) + '" data-tag="' + escapeHTML(opp.tag) + '" data-rule="' + escapeHTML(opp.rule) + '">Ver entradas (' + opp.entryIndices.length + ') ↓</button>' +
            '<button class="opp-btn opp-btn-primary" data-action="suggest-investigation" data-tag="' + escapeHTML(opp.tag) + '" data-opp-id="' + escapeHTML(opp.id) + '">💡 Sugerir investigación</button>' +
          '</div>' +
        '</div>' +
        '<div class="opp-entries-panel" id="entries-' + escapeHTML(opp.id) + '" style="display:none"></div>' +
      '</div>';
    }).join('');
  }

  // Candidatos a concepto
  const candidates = computeCandidates(freq, byArea);
  const areaColorMap = { ciber: 'var(--ciber)', tech: 'var(--tech)', cripto: 'var(--cripto)' };
  document.getElementById('intel-candidates').innerHTML = candidates.length
    ? candidates.map(function(t) {
        const areas = byArea[t] ? [...byArea[t]] : [];
        const dots  = areas.map(function(a) {
          return '<span class="cand-area-dot" style="background:' + (areaColorMap[a]||'#888') + '" title="' + escapeHTML(AREA_META[a]?AREA_META[a].label:a) + '"></span>';
        }).join('');
        return '<div class="candidate-card">' +
          '<div style="flex:1"><div class="cand-tag">🏷️ ' + escapeHTML(t) + '</div>' +
          '<div class="cand-meta">' + freq[t] + ' entradas</div>' +
          '<div class="cand-areas">' + dots + '</div></div>' +
          '<div style="font-size:10px;color:var(--text3)">' + areas.length + ' área(s)</div>' +
        '</div>';
      }).join('')
    : '<div class="gen-empty" style="grid-column:1/-1">No hay candidatos con suficiente presencia transversal todavía.</div>';

  // Series con potencial
  const series = computeSeries();
  document.getElementById('intel-series').innerHTML = series.length
    ? series.map(function(s) {
        return '<div class="series-card" data-action="filter-tag" data-tag="' + escapeHTML(s[0]) + '">' +
          '<span style="font-size:13px">✍️</span>' +
          '<span class="series-name">' + escapeHTML(s[0]) + '</span>' +
          '<span class="series-count">' + s[1] + ' artículos</span>' +
          '<button class="opp-btn opp-btn-primary" style="font-size:10px;padding:3px 8px" data-action="suggest-investigation" data-tag="' + escapeHTML(s[0]) + '" data-opp-id="series-r3-' + escapeHTML(s[0].replace(/\s/g,'_')) + '">💡 Sugerir inv.</button>' +
        '</div>';
      }).join('')
    : '<div class="gen-empty">No se detectan series con ≥4 artículos en los datos actuales.</div>';
}
