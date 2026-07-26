/* ═══════════════════════════════════════════════════════════════
   SOURCE REGISTRY — leaf module, zero imports
   Hoy: JSON estático sincronizado desde Notion.
   Mañana: API REST de research-engine.

   Para cambiar de fuente:
     configureSource('content', { type: 'api', url: '/api/v1' });
═══════════════════════════════════════════════════════════════ */

const _sources = {
  content: { type: 'json', url: './data/content.json' },
  investigations: { type: 'json', url: './data/investigations.json' },
};

export function getSource(key) {
  return _sources[key];
}

export function configureSource(key, config) {
  _sources[key] = { ..._sources[key], ...config };
}
