/* ═══════════════════════════════════════════════════════════════
   CONTENT STORE
   Abstrae la carga de entradas de contenido.
   Las vistas siguen leyendo DATA desde data.js — este módulo
   solo controla de dónde viene y cómo se carga.

   Hoy:   fetch('./data/content.json') → setDATA()
   Mañana: GET /api/v1/content          → setDATA()
═══════════════════════════════════════════════════════════════ */
import { setDATA } from '../data.js';
import { getSource } from './sources.js';

export async function loadContent() {
  const src = getSource('content');

  if (src.type === 'json') {
    const res = await fetch(src.url, { cache: 'no-store' });
    if (!res.ok) throw new Error('content.json HTTP ' + res.status);
    const payload = await res.json();
    if (!Array.isArray(payload.content)) throw new Error('content.json: payload inválido');
    setDATA(payload.content);
    return;
  }

  // Future: src.type === 'api'
  // const res = await fetch(src.url + '/content', { headers: { ... } });
  // const entries = await res.json();
  // setDATA(entries);

  throw new Error('Fuente de contenido desconocida: ' + src.type);
}
