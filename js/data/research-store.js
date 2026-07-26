/* ═══════════════════════════════════════════════════════════════
   RESEARCH STORE
   Abstrae la carga y mutación de investigaciones.
   Las vistas leen INVESTIGATIONS desde data.js — este módulo
   controla carga, creación y transiciones de estado.

   Hoy:   JSON local + mutación en memoria
   Mañana: POST /api/v1/proposals, POST /api/v1/proposals/:id/open, etc.
═══════════════════════════════════════════════════════════════ */
import { INVESTIGATIONS, setINVESTIGATIONS } from '../data.js';
import { getSource } from './sources.js';

export async function loadInvestigations() {
  const src = getSource('investigations');

  if (src.type === 'json') {
    const res = await fetch(src.url, { cache: 'no-store' });
    if (!res.ok) throw new Error('investigations.json HTTP ' + res.status);
    const payload = await res.json();
    if (!Array.isArray(payload.investigations)) throw new Error('investigations.json: payload inválido');
    setINVESTIGATIONS(payload.investigations);
    return;
  }

  // Future: src.type === 'api'
  // const res = await fetch(src.url + '/investigations', { headers: { ... } });
  // setINVESTIGATIONS(await res.json());

  throw new Error('Fuente de investigaciones desconocida: ' + src.type);
}

export function createInvestigation(inv) {
  const src = getSource('investigations');

  if (src.type === 'json') {
    INVESTIGATIONS.push(inv);
    return inv;
  }

  // Future: src.type === 'api'
  // return fetch(src.url + '/proposals', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify(inv),
  // }).then(r => r.json());

  throw new Error('Fuente de investigaciones desconocida: ' + src.type);
}

export function transitionInvestigation(id, nextState) {
  const src = getSource('investigations');

  if (src.type === 'json') {
    const inv = INVESTIGATIONS.find(function(i) { return i.id === id; });
    if (!inv) return null;
    inv.status = nextState;
    inv.updated = new Date().toISOString().split('T')[0];
    return inv;
  }

  // Future: src.type === 'api'
  // return fetch(src.url + '/proposals/' + id + '/transition', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ state: nextState }),
  // }).then(r => r.json());

  throw new Error('Fuente de investigaciones desconocida: ' + src.type);
}
