import { readFile } from "node:fs/promises";

const contentPayload = JSON.parse(
  await readFile(new URL("../data/content.json", import.meta.url), "utf8"),
);
const investigationPayload = JSON.parse(
  await readFile(new URL("../data/investigations.json", import.meta.url), "utf8"),
);

if (!Array.isArray(contentPayload.content)) {
  throw new Error("data/content.json no contiene un array content.");
}
if (!Array.isArray(investigationPayload.investigations)) {
  throw new Error("data/investigations.json no contiene un array investigations.");
}

const ids = new Map();
const notionIds = new Map();
const incomplete = [];

for (const [index, entry] of contentPayload.content.entries()) {
  if (!entry || typeof entry !== "object") {
    throw new Error(`Entrada ${index} no es un objeto.`);
  }
  for (const field of ["id", "title", "db", "url", "notionId"]) {
    if (!entry[field]) incomplete.push({ index, id: entry.id || null, field });
  }
  if (entry.id) ids.set(entry.id, (ids.get(entry.id) || 0) + 1);
  if (entry.notionId) {
    notionIds.set(entry.notionId, (notionIds.get(entry.notionId) || 0) + 1);
  }
}

const duplicateIds = [...ids].filter(([, count]) => count > 1);
const duplicateNotionIds = [...notionIds].filter(([, count]) => count > 1);

console.log(JSON.stringify({
  generatedAt: contentPayload.generatedAt,
  entries: contentPayload.content.length,
  investigations: investigationPayload.investigations.length,
  incompleteFields: incomplete.length,
  duplicateIds: duplicateIds.length,
  duplicateNotionIds: duplicateNotionIds.length,
}, null, 2));

if (duplicateIds.length || duplicateNotionIds.length) {
  throw new Error("La auditoría bloqueó la publicación: hay identidades duplicadas.");
}
