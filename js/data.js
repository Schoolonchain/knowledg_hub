/* ═══════════════════════════════════════════════════════════════
   DATA
═══════════════════════════════════════════════════════════════ */
export const DB_META = {
  "✍️ Artículos propios":     { color:"#4f86c6", area:"cripto", icon:"✍️", areaLabel:"Finanzas & Cripto" },
  "💻 TLDR Dev":               { color:"#5ba85b", area:"tech",   icon:"💻", areaLabel:"Tecnología & Desarrollo" },
  "🔐 El Rincón del Hacker":  { color:"#c45a5a", area:"ciber",  icon:"🔐", areaLabel:"Ciberseguridad & OSINT" },
  "🔎 OSINT Newsletter":       { color:"#8a6bbf", area:"ciber",  icon:"🔎", areaLabel:"Ciberseguridad & OSINT" },
  "🔓 PWN | Hacker Community": { color:"#e07b54", area:"ciber",  icon:"🔓", areaLabel:"Ciberseguridad & OSINT" },
  "📚 Biblioteca":             { color:"#c4a020", area:"cripto", icon:"📚", areaLabel:"Finanzas & Cripto" },
  "🏷️ Glosario de Etiquetas": { color:"#5bbaba", area:"ciber",  icon:"🏷️", areaLabel:"Ciberseguridad & OSINT" },
  "📖 Glosario TLDR":          { color:"#a0a05b", area:"tech",   icon:"📖", areaLabel:"Tecnología & Desarrollo" },
};

export const AREA_META = {
  ciber:  { label:"Ciberseguridad & OSINT", color:"#c45a5a", icon:"🔐" },
  tech:   { label:"Tecnología & Desarrollo",  color:"#5ba85b", icon:"💡" },
  cripto: { label:"Finanzas & Cripto",         color:"#c4a020", icon:"🧭" },
};

export const AREA_MAP = {
  ciber:  ["🔐 El Rincón del Hacker","🔎 OSINT Newsletter","🔓 PWN | Hacker Community","🏷️ Glosario de Etiquetas"],
  tech:   ["💻 TLDR Dev","📖 Glosario TLDR"],
  cripto: ["✍️ Artículos propios","📚 Biblioteca","🎙️ Entrevistas"],
};

/* ═══════════════════════════════════════════════════════════════
   SYSTEM STATE — para auditoría y sincronización con Notion
   Los valores de total, last_sync y dbs[*].count se parchean
   automáticamente en boot.js tras cargar content.json.
   Los metadatos estáticos (version, area, color) se mantienen aquí.
═══════════════════════════════════════════════════════════════ */
export const SYSTEM_STATE = {
  version:   "2.2.0",
  last_sync: "2026-07-23",
  total:     244,
  dbs: {
    "dee1b389-a53a-4f8b-b197-b51ded487e14": {
      name:    "✍️ Artículos propios",
      area:    "cripto",
      color:   "#4f86c6",
      count:   65,
      last_id: "ART-65",
      collection_id: "dee1b389-a53a-4f8b-b197-b51ded487e14"
    },
    "36769f84-8239-4180-9687-7cd9730fd249": {
      name:    "💻 TLDR Dev",
      area:    "tech",
      color:   "#5ba85b",
      count:   51,
      last_id: "TDV-51",
      collection_id: "36769f84-8239-4180-9687-7cd9730fd249"
    },
    "32e28cdf-7709-8045-a071-e57cc6201592": {
      name:    "🎙️ Entrevistas",
      area:    "cripto",
      color:   "#e07b54",
      count:   8,
      last_id: "ENT-8",
      collection_id: "32e28cdf-7709-8045-a071-e57cc6201592"
    },
    "ab92e5f3-b966-4607-8b20-56a96fc5cede": {
      name:    "🔐 El Rincón del Hacker",
      area:    "ciber",
      color:   "#c45a5a",
      count:   3,
      last_id: "RDH-3",
      collection_id: "ab92e5f3-b966-4607-8b20-56a96fc5cede"
    },
    "123bbe80-4e6c-47dc-965b-676e043ecfba": {
      name:    "🔎 OSINT Newsletter",
      area:    "ciber",
      color:   "#8a6bbf",
      count:   1,
      last_id: "OSN-1",
      collection_id: "123bbe80-4e6c-47dc-965b-676e043ecfba"
    },
    "0118d6f9-bd46-49f1-be18-61a0bef38a5b": {
      name:    "🔓 PWN | Hacker Community",
      area:    "ciber",
      color:   "#e07b54",
      count:   1,
      last_id: "PWN-1",
      collection_id: "0118d6f9-bd46-49f1-be18-61a0bef38a5b"
    },
    "5294a684-ff20-4944-9aef-4fc362b23741": {
      name:    "📚 Biblioteca",
      area:    "cripto",
      color:   "#c4a020",
      count:   46,
      last_id: "BIB-50",
      collection_id: "5294a684-ff20-4944-9aef-4fc362b23741"
    },
    "d25162b6-2c06-40d6-b764-103914260271": {
      name:    "🏷️ Glosario de Etiquetas",
      area:    "ciber",
      color:   "#5bbaba",
      count:   35,
      last_id: "GE-35",
      collection_id: "d25162b6-2c06-40d6-b764-103914260271"
    },
    "01410f52-66c5-46d3-87de-22573c6a0d63": {
      name:    "📖 Glosario TLDR",
      area:    "tech",
      color:   "#a0a05b",
      count:   29,
      last_id: "GT-29",
      collection_id: "01410f52-66c5-46d3-87de-22573c6a0d63"
    }
  }
};

export let DATA = [];
export function setDATA(d) { DATA = d; }

/* ═══════════════════════════════════════════════════════════════
   SYNC CONTRACT — Reglas para el sincronizador Notion → DATA
   ═══════════════════════════════════════════════════════════════

   IDENTIDAD ESTABLE:
   Cada entrada tiene dos identificadores:
     notionId  →  Page ID de Notion (hash 32 chars, extraído de url)
                  INMUTABLE. Nunca cambia. Es la identidad real.
     id        →  Etiqueta visible en el Hub ("BIB-N", "ART-N"…)
                  PUEDE cambiar si hay colisión, pero no debe hacerlo sin razón.

   ALGORITMO DE SYNC IDEMPOTENTE:
   Para cada página que devuelve la API de Notion:

   1. Extraer notionId de su Page ID.
   2. Buscar en DATA si ya existe una entrada con ese notionId.

   CASO A — ya existe:
     → Actualizar los campos de contenido (title, desc, fecha, etiquetas…)
     → NO cambiar su id visible ni su notionId
     → La sync es idempotente: misma entrada → mismo resultado

   CASO B — es nueva:
     → Calcular el siguiente ID libre para su prefijo:
        maxN = max(N de todos los ids del mismo prefijo en DATA)
        newId = prefijo + "-" + (maxN + 1)
     → Nunca reutilizar un ID visible que ya haya sido asignado,
        aunque la entrada original haya sido eliminada de Notion.
     → Guardar notionId como campo explícito.

   INVARIANTES:
   - Un notionId → exactamente un id visible en DATA
   - Un id visible → como máximo un notionId (no duplicar)
   - El contador de IDs es monotónico por prefijo (nunca retrocede)

   MIGRACIÓN EJECUTADA (2026-07-23):
   Los siguientes IDs visibles duplicados fueron corregidos.
   Las entradas que conservaron su ID son las de menor dataIndex (llegaron primero).
   Las entradas que recibieron nuevo ID son las de mayor dataIndex.

   BIB-30 (Cap. 5 · Fundamentos de Smart Contracts)  → BIB-51
     notionId: 39328cdf770981508cb9e74d0fb25d80
   BIB-31 (Cap. 6 · Arquitectura DeFi)               → BIB-52
     notionId: 39328cdf7709819d99a3d63b230d1d21
   BIB-32 (Cap. 7 · Gobernanza…)                     → BIB-53
     notionId: 39328cdf770981fda361e1abe9e59eca

   ANOMALÍA PENDIENTE:
   GT-1 y GT-20 comparten el mismo notionId:
     3a428cdf77098103b144c237b1930fde
   Requiere revisión manual en Notion — puede ser página reubicada
   o entrada duplicada en la base de datos de origen.
═══════════════════════════════════════════════════════════════ */


// SYNC FROM NOTION — Conceptos estructurados (Nivel 2)
export const CONCEPTS = [
  // Ejemplo de estructura (no poblado):
  // {
  //   id: "CON-001",
  //   name: "Inteligencia Artificial",
  //   aliases: ["IA", "AI", "Artificial Intelligence"],
  //   description: "...",
  //   areas: ["tech", "ciber"],
  //   status: "active",   // active | explored | gap
  //   relatedConcepts: [],
  //   relatedEntities: []
  // }
];

// SYNC FROM NOTION — Entidades concretas (Nivel 3)
export const ENTITIES = [
  // Ejemplo de estructura (no poblado):
  // {
  //   id: "ENT-001",
  //   name: "OpenAI",
  //   type: "company",   // company | person | tool | protocol | blockchain | token | vulnerability | organization
  //   description: "...",
  //   relatedEntries: [],
  //   relatedConcepts: []
  // }
];

// SYNC FROM NOTION — Relaciones explícitas y tipadas
// Tipos: about | mentions | illustrates | analyzes | involves | derived_from | continues | references
//        related_to | is_part_of | contradicts | implements | exemplifies
//        consumes | produces | explores
export const RELATIONS = [
  // Ejemplo de estructura (no poblado):
  // { source: "TDV-42", target: "CON-001", type: "about" }
];

// INVESTIGATIONS — Procesos activos de comprensión
// Máquina de estados: proposal → draft → active → paused → concluded → archived
//                     draft → abandoned | active → abandoned
export let INVESTIGATIONS = [];
export function setINVESTIGATIONS(inv) { INVESTIGATIONS = inv; }
