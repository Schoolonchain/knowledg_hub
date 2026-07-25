/* ═══════════════════════════════════════════════════════════════
   INVESTIGATIONS ENGINE
═══════════════════════════════════════════════════════════════ */

// Máquina de estados: transiciones válidas
const INV_TRANSITIONS = {
  proposal:  ['draft', 'abandoned'],
  draft:     ['active', 'abandoned'],
  active:    ['paused', 'concluded', 'abandoned'],
  paused:    ['active', 'concluded', 'abandoned'],
  concluded: ['archived'],
  archived:  [],
  abandoned: ['draft'],
  demo:      []  // el estado demo no puede cambiar
};

const INV_STATE_LABELS = {
  proposal:  '💡 Propuesta',
  draft:     '📝 Borrador',
  active:    '🔬 Activa',
  paused:    '⏸️ Pausada',
  concluded: '✅ Concluida',
  archived:  '📦 Archivada',
  abandoned: '❌ Abandonada',
  demo:      '🟣 Demo'
};

const INV_STATE_BTN_LABELS = {
  draft:     'Convertir en activa',
  active:    'Activar',
  paused:    'Pausar',
  concluded: 'Concluir',
  archived:  'Archivar',
  abandoned: 'Abandonar'
};

function renderInvestigations() {
  renderInvList();
  if (state.selectedInv) {
    renderInvDetail(state.selectedInv);
  } else {
    document.getElementById('inv-detail-wrap').innerHTML =
      '<div class="inv-empty"><div class="inv-empty-icon">🔬</div>' +
      '<div class="inv-empty-title">Selecciona una investigación</div>' +
      '<div class="inv-empty-sub">Haz clic en una investigación para ver su detalle, preguntas, hipótesis y fuentes vinculadas.</div></div>';
  }
}

function renderInvList() {
  const listEl = document.getElementById('inv-list');
  if (!INVESTIGATIONS.length) {
    listEl.innerHTML = '<div class="inv-empty">' +
      '<div class="inv-empty-icon">🔬</div>' +
      '<div class="inv-empty-title">Sin investigaciones</div>' +
      '<div class="inv-empty-sub">Crea tu primera investigación desde el botón superior, o genera una propuesta desde Intelligence.</div>' +
      '<button class="btn-new-inv" data-action="new-investigation" style="margin:0 auto">+ Nueva investigación</button>' +
      '</div>';
    return;
  }
  listEl.innerHTML = INVESTIGATIONS.map(function(inv) {
    const isSelected = state.selectedInv && state.selectedInv.id === inv.id;
    const statusBadge = INV_STATE_LABELS[inv.status] || escapeHTML(inv.status);
    return '<div class="inv-card' + (isSelected ? ' selected' : '') + (inv.isDemo ? ' is-demo' : '') + '" data-action="select-inv" data-inv-id="' + escapeHTML(inv.id) + '">' +
      '<div class="inv-card-head">' +
        '<span class="inv-card-id">' + escapeHTML(inv.id) + '</span>' +
        '<span class="inv-status-badge ' + escapeHTML(inv.status) + '">' + statusBadge + '</span>' +
      '</div>' +
      (inv.isDemo ? '<div class="demo-banner">⚠️ DEMO / EXAMPLE DATA</div>' : '') +
      '<div class="inv-card-title">' + escapeHTML(inv.title) + '</div>' +
      '<div class="inv-card-question">' + truncEsc(inv.centralQuestion || '—', 90) + '</div>' +
      '<div class="inv-card-meta">' +
        '<span class="inv-meta-item">📄 ' + (inv.sources || []).length + ' fuentes</span>' +
        '<span class="inv-meta-item">❓ ' + (inv.questions || []).length + ' preguntas</span>' +
        '<span class="inv-meta-item">⚡ ' + (inv.contradictions || []).length + ' contradicciones</span>' +
      '</div>' +
    '</div>';
  }).join('');
}

function selectInv(id) {
  const inv = INVESTIGATIONS.find(function(i) { return i.id === id; });
  if (!inv) return;
  state.selectedInv = inv;
  renderInvList(); // re-renderiza para marcar selected
  renderInvDetail(inv);
}

function renderInvDetail(inv) {
  const detailWrap = document.getElementById('inv-detail-wrap');

  // Fuentes resueltas en DATA
  const resolvedSources = (inv.sources || []).map(function(sid) {
    return DATA.find(function(d) { return d.id === sid; });
  }).filter(Boolean);

  const statusBadge = INV_STATE_LABELS[inv.status] || escapeHTML(inv.status);
  const transitions = INV_TRANSITIONS[inv.status] || [];

  // Botones de transición de estado
  const stateButtons = transitions.map(function(nextState) {
    const isDanger = nextState === 'abandoned';
    const isPromote = nextState === 'active' || nextState === 'concluded';
    const btnClass = isDanger ? 'state-btn danger' : (isPromote ? 'state-btn promote' : 'state-btn');
    const label = INV_STATE_LABELS[nextState] || nextState;
    return '<button class="' + btnClass + '" data-action="transition-inv" data-inv-id="' + escapeHTML(inv.id) + '" data-next-state="' + escapeHTML(nextState) + '" title="Cambiar estado a: ' + escapeHTML(nextState) + '">' + label + '</button>';
  }).join('');

  detailWrap.innerHTML =
    '<div class="inv-detail">' +
      '<div class="inv-detail-header">' +
        (inv.isDemo ? '<div class="demo-banner">⚠️ DEMO / EXAMPLE DATA — Esta investigación es un ejemplo del sistema. No refleja una investigación real tuya.</div>' : '') +
        '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px">' +
          '<div>' +
            '<div style="font-size:10px;color:var(--text3);font-family:monospace;margin-bottom:6px">' + escapeHTML(inv.id) + ' · ' + escapeHTML(inv.created || '—') + '</div>' +
            '<div style="font-size:15px;font-weight:700;color:var(--text);margin-bottom:8px">' + escapeHTML(inv.title) + '</div>' +
            '<span class="inv-status-badge ' + escapeHTML(inv.status) + '">' + statusBadge + '</span>' +
          '</div>' +
        '</div>' +
        (transitions.length ? '<div class="inv-state-controls">' + stateButtons + '</div>' : '') +
      '</div>' +
      '<div class="inv-detail-body">' +

        // Pregunta central
        '<div class="inv-section">' +
          '<div class="inv-section-title">❓ Pregunta central</div>' +
          (inv.centralQuestion
            ? '<div class="inv-question-item" style="border-left-color:var(--accent)">' + escapeHTML(inv.centralQuestion) + '</div>'
            : '<div class="inv-section-empty">Sin pregunta central definida todavía.</div>') +
        '</div>' +

        // Preguntas abiertas
        '<div class="inv-section">' +
          '<div class="inv-section-title">❓ Preguntas abiertas</div>' +
          ((inv.questions && inv.questions.length)
            ? inv.questions.map(function(q) { return '<div class="inv-question-item">' + escapeHTML(q) + '</div>'; }).join('')
            : '<div class="inv-section-empty">Sin preguntas abiertas registradas.</div>') +
        '</div>' +

        // Hipótesis
        '<div class="inv-section">' +
          '<div class="inv-section-title">💡 Hipótesis</div>' +
          ((inv.hypotheses && inv.hypotheses.length)
            ? inv.hypotheses.map(function(h) { return '<div class="inv-hypo-item">' + escapeHTML(h) + '</div>'; }).join('')
            : '<div class="inv-section-empty">Sin hipótesis registradas.</div>') +
        '</div>' +

        // Fuentes vinculadas
        '<div class="inv-section">' +
          '<div class="inv-section-title">📄 Fuentes vinculadas (' + resolvedSources.length + ')</div>' +
          (resolvedSources.length
            ? '<div>' + resolvedSources.map(function(e) {
                const meta = DB_META[e.db] || { color:'#888', icon:'📄' };
                const idx  = DATA.findIndex(function(d){ return d === e; });
                return '<div class="inv-source-row" data-action="open-detail" data-idx="' + idx + '">' +
                  '<span class="inv-source-id" style="color:' + meta.color + '">' + escapeHTML(e.id) + '</span>' +
                  '<span class="inv-source-title">' + truncEsc(e.title, 50) + '</span>' +
                  '<span class="inv-source-db">' + meta.icon + '</span>' +
                '</div>';
              }).join('') + '</div>'
            : '<div class="inv-section-empty">Sin fuentes vinculadas. Añade IDs de entradas del sistema.</div>') +
        '</div>' +

        // Contradicciones
        '<div class="inv-section">' +
          '<div class="inv-section-title">⚡ Contradicciones</div>' +
          ((inv.contradictions && inv.contradictions.length)
            ? inv.contradictions.map(function(c) { return '<div class="inv-contra-item">' + escapeHTML(c) + '</div>'; }).join('')
            : '<div class="inv-section-empty">Sin contradicciones documentadas.</div>') +
        '</div>' +

        // Conclusiones
        '<div class="inv-section">' +
          '<div class="inv-section-title">✅ Conclusiones provisionales</div>' +
          ((inv.conclusions && inv.conclusions.length)
            ? inv.conclusions.map(function(c) { return '<div class="inv-conclu-item">' + escapeHTML(c) + '</div>'; }).join('')
            : '<div class="inv-section-empty">Sin conclusiones todavía. La investigación está en curso.</div>') +
        '</div>' +

      '</div>' +
    '</div>';
}

function transitionInv(id, nextState) {
  const inv = INVESTIGATIONS.find(function(i) { return i.id === id; });
  if (!inv) return;
  if (inv.isDemo) { alert('Esta es una investigación de demostración y no puede cambiar de estado.'); return; }
  const valid = INV_TRANSITIONS[inv.status] || [];
  if (!valid.includes(nextState)) { return; }
  inv.status = nextState;
  inv.updated = new Date().toISOString().split('T')[0];
  state.selectedInv = inv;
  document.getElementById('nc-inv').textContent = INVESTIGATIONS.filter(function(i) { return i.status === 'active' || i.status === 'draft'; }).length;
  renderInvestigations();
}

function openNewInvestigationForm(prefill) {
  prefill = prefill || {};
  const formWrap = document.getElementById('proposal-form-wrap');
  formWrap.style.display = 'block';
  formWrap.innerHTML =
    '<div class="proposal-form">' +
      '<div class="proposal-form-header">' +
        '<div class="proposal-form-title">💡 <span>Nueva investigación</span> <span class="proposal-label">BORRADOR</span></div>' +
        '<button class="proposal-cancel" data-action="close-proposal-form">✕ Cancelar</button>' +
      '</div>' +
      (prefill.evidence ? '<div class="proposal-evidence"><div class="proposal-evidence-label">Generada por Intelligence</div>' +
        'Etiqueta: <strong>' + escapeHTML(prefill.tag || '—') + '</strong> · ' +
        'Entradas detectadas: <strong>' + escapeHTML(prefill.totalCount || '—') + '</strong> · ' +
        'Producción propia: <strong>' + escapeHTML(prefill.productionCount || 0) + '</strong>' +
        '</div>' : '') +
      '<div class="proposal-field"><label>Título de la investigación</label>' +
        '<input class="proposal-input" id="pf-title" placeholder="¿Qué quieres investigar?" value="' + escapeHTML(prefill.title || '') + '"></div>' +
      '<div class="proposal-field"><label>Pregunta central</label>' +
        '<input class="proposal-input" id="pf-question" placeholder="¿Cuál es la pregunta que guía esta investigación?"></div>' +
      '<div class="proposal-actions">' +
        '<button class="proposal-save" data-action="save-proposal">✓ Guardar como investigación</button>' +
      '</div>' +
    '</div>';
  formWrap.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function closeProposalForm() {
  const formWrap = document.getElementById('proposal-form-wrap');
  formWrap.style.display = 'none';
  formWrap.innerHTML = '';
  state.pendingProposal = null;
}

function saveProposalAsInvestigation() {
  const title    = (document.getElementById('pf-title')    || {}).value || '';
  const question = (document.getElementById('pf-question') || {}).value || '';
  if (!title.trim()) { alert('El título es obligatorio.'); return; }

  const maxId = INVESTIGATIONS.filter(function(i) { return !i.isDemo; }).length;
  const newId = 'INV-' + String(maxId + 1).padStart(3, '0');
  const today = new Date().toISOString().split('T')[0];

  const inv = {
    id: newId,
    title: title.trim(),
    status: 'draft',
    isDemo: false,
    centralQuestion: question.trim() || null,
    questions: [],
    hypotheses: [],
    sources: [],
    concepts: [],
    entities: [],
    contradictions: [],
    conclusions: [],
    suggestedBy: state.pendingProposal ? state.pendingProposal.id : null,
    evidence: state.pendingProposal ? state.pendingProposal.evidence : null,
    created: today,
    updated: today
  };

  INVESTIGATIONS.push(inv);
  closeProposalForm();
  state.selectedInv = inv;
  document.getElementById('nc-inv').textContent = INVESTIGATIONS.filter(function(i) {
    return i.status === 'active' || i.status === 'draft';
  }).length;
  renderInvestigations();
}

// Expande/contrae el panel de entradas de una oportunidad
// entryIndices: array de dataIndex reales — sin DATA.indexOf()
function toggleOppEntries(oppId, entryIndices, tag, rule) {
  var panel  = document.getElementById('entries-' + oppId);
  var btn    = document.getElementById('btn-entries-' + oppId);
  if (!panel || !btn) return;

  var isOpen = panel.style.display !== 'none';

  if (isOpen) {
    // Contraer
    panel.style.display = 'none';
    panel.innerHTML = '';
    btn.textContent = 'Ver entradas (' + entryIndices.length + ') ↓';
    btn.classList.remove('opp-btn-toggle-active');
  } else {
    // Expandir — construir la lista de entradas
    var rows = entryIndices.map(function(idx) {
      var e = DATA[idx];
      if (!e) return '';
      var meta = DB_META[e.db] || { color: '#888', icon: '📄' };
      return '<div class="opp-entry-row" data-action="open-detail" data-idx="' + idx + '">' +
        '<span class="opp-entry-id" style="color:' + meta.color + '">' + escapeHTML(e.id) + '</span>' +
        '<span class="opp-entry-title">' + truncEsc(e.title, 55) + '</span>' +
        '<span class="opp-entry-db">' + meta.icon + ' ' + escapeHTML(e.db.replace(/^\S+\s/, '')) + '</span>' +
      '</div>';
    }).filter(Boolean).join('');

    panel.innerHTML =
      '<div class="opp-entries-header">' +
        '<span class="opp-entries-title">Entradas · etiqueta "' + escapeHTML(tag) + '" (' + entryIndices.length + ')</span>' +
        '<span class="opp-entries-rule">regla: ' + escapeHTML(rule) + '</span>' +
      '</div>' +
      (rows || '<div style="color:var(--text3);font-size:11px;padding:4px 0">Sin entradas encontradas</div>');

    panel.style.display = 'block';
    btn.textContent = 'Cerrar ↑';
    btn.classList.add('opp-btn-toggle-active');
  }
}

// Llamado desde Intelligence al pulsar "Sugerir investigación"
function suggestInvestigation(tag, oppId) {
  // La propuesta NO se guarda como investigación. El usuario decide.
  state.pendingProposal = {
    id: oppId,
    tag: tag,
    evidence: { source: 'intelligence_rule', tag: tag }
  };

  const { freq, byArea, byDB } = computeTagFrequencies();
  const totalCount   = freq[tag] || 0;
  const prodCount    = productionCountForTag(tag, byDB);

  switchView('investigations');
  openNewInvestigationForm({
    title: 'Investigar: ' + tag,
    tag: tag,
    totalCount: totalCount,
    productionCount: prodCount,
    evidence: true
  });
}
