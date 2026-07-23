import { mkdir, readFile, writeFile } from "node:fs/promises";

const NOTION_API_URL = "https://api.notion.com/v1";
const NOTION_VERSION = "2026-03-11";
const token = process.env.NOTION_API_KEY;

if (!token) {
  throw new Error("Falta el secreto NOTION_API_KEY.");
}

const sources = JSON.parse(
  await readFile(new URL("../config/notion-sources.json", import.meta.url), "utf8"),
);

function plainText(items = []) {
  return items.map((item) => item.plain_text || item.text?.content || "").join("");
}

function propertyValue(property) {
  if (!property || !property.type) return null;

  switch (property.type) {
    case "title":
    case "rich_text":
      return plainText(property[property.type]);
    case "select":
    case "status":
      return property[property.type]?.name || null;
    case "multi_select":
      return property.multi_select.map((item) => item.name);
    case "number":
    case "checkbox":
    case "url":
    case "email":
    case "phone_number":
    case "created_time":
    case "last_edited_time":
      return property[property.type];
    case "date":
      return property.date
        ? { start: property.date.start, end: property.date.end || null }
        : null;
    case "relation":
      return property.relation.map((item) => item.id.replaceAll("-", ""));
    case "unique_id":
      return property.unique_id
        ? `${property.unique_id.prefix || ""}-${property.unique_id.number}`
        : null;
    case "people":
      return property.people.map((person) => ({
        id: person.id,
        name: person.name || null,
      }));
    case "files":
      return property.files.map((file) => ({
        name: file.name,
        url: file.file?.url || file.external?.url || null,
      }));
    case "formula": {
      const formula = property.formula;
      return formula?.[formula.type] ?? null;
    }
    case "rollup":
      return property.rollup?.[property.rollup.type] ?? null;
    default:
      return null;
  }
}

function normalizePage(page) {
  return {
    notionId: page.id.replaceAll("-", ""),
    url: page.url,
    createdTime: page.created_time,
    lastEditedTime: page.last_edited_time,
    properties: Object.fromEntries(
      Object.entries(page.properties || {}).map(([name, property]) => [
        name,
        propertyValue(property),
      ]),
    ),
  };
}

async function queryAll(dataSourceId) {
  const pages = [];
  let cursor;

  do {
    const response = await fetch(
      `${NOTION_API_URL}/data_sources/${dataSourceId}/query`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "Notion-Version": NOTION_VERSION,
        },
        body: JSON.stringify({
          page_size: 100,
          ...(cursor ? { start_cursor: cursor } : {}),
        }),
      },
    );

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(
        body?.message ||
          `Notion respondió con HTTP ${response.status} para ${dataSourceId}.`,
      );
    }

    const result = await response.json();
    pages.push(...result.results.map(normalizePage));
    cursor = result.has_more ? result.next_cursor : undefined;
  } while (cursor);

  return pages;
}

function lines(value) {
  return String(value || "")
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function first(properties, names, fallback = null) {
  for (const name of names) {
    const value = properties[name];
    if (value !== null && value !== undefined && value !== "") return value;
  }
  return fallback;
}

function list(properties, names) {
  const value = first(properties, names, []);
  if (Array.isArray(value)) return value;
  return lines(value);
}

function dateStart(value) {
  return value && typeof value === "object" ? value.start : value || null;
}

function contentFromPage(page, source) {
  const properties = page.properties;
  return {
    id: first(properties, ["ID", "Id", "id"]),
    notionId: page.notionId,
    title: first(properties, [
      "Título", "Titulo", "Nombre", "Name", "Etiqueta", "Concepto",
      "Entrevista completa",
    ], ""),
    db: source.name,
    url: page.url,
    serie: first(properties, ["Serie", "Sección", "Seccion", "Módulo", "Modulo"]),
    fecha: dateStart(first(properties, [
      "Fecha publicación", "Fecha de publicación", "Fecha",
      "Última revisión", "Actualizada",
    ])),
    tipo: first(properties, ["Tipo", "Categoría", "Categoria", "Estado"]),
    lectura: first(properties, ["Lectura (min)", "Lectura", "Duración", "Duracion"]),
    urlFuente: first(properties, [
      "URL Medium", "URL fuente", "URL original", "Fuente", "Enlace",
    ]),
    etiquetas: list(properties, [
      "Etiquetas", "Ecosistema", "Tags", "Temas", "Nivel",
    ]),
    desc: first(properties, [
      "Descripción", "Descripcion", "Resumen", "Notas", "Contenido derivado",
    ]),
    relacionadas: list(properties, [
      "Entradas relacionadas", "Relacionadas", "Artículos derivados",
    ]),
    anterior: list(properties, ["Anterior"]),
    siguiente: list(properties, ["Siguiente"]),
    glosario: list(properties, ["Glosario", "Conceptos"]),
    entrevistas: list(properties, [
      "Entrevistas de origen", "Entrevista origen", "Entrevistas",
    ]),
    createdTime: page.createdTime,
    lastEditedTime: page.lastEditedTime,
  };
}

function investigationFromPage(page) {
  const properties = page.properties;
  const generatedId = properties.ID || null;
  const statusMap = {
    Propuesta: "proposal",
    Borrador: "draft",
    Activa: "active",
    Pausada: "paused",
    Concluida: "concluded",
    Archivada: "archived",
    Abandonada: "abandoned",
  };

  return {
    id: generatedId,
    notionId: page.notionId,
    url: page.url,
    title: properties["Título"] || null,
    status: statusMap[properties.Estado] || null,
    centralQuestion: properties["Pregunta central"] || null,
    questions: lines(properties["Preguntas abiertas"]),
    hypotheses: lines(properties["Hipótesis"]),
    sources: lines(properties.Fuentes),
    concepts: lines(properties.Conceptos),
    entities: lines(properties.Entidades),
    contradictions: lines(properties.Contradicciones),
    conclusions: lines(properties.Conclusiones),
    created: page.createdTime,
    updated: page.lastEditedTime,
  };
}

const snapshot = {
  generatedAt: new Date().toISOString(),
  notionVersion: NOTION_VERSION,
  sources: {},
};
const sourceErrors = [];

for (const source of sources) {
  try {
    const pages = await queryAll(source.dataSourceId);
    snapshot.sources[source.key] = {
      name: source.name,
      dataSourceId: source.dataSourceId,
      count: pages.length,
      pages,
    };
    console.log(`${source.name}: ${pages.length} registros`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    sourceErrors.push({ key: source.key, name: source.name, message });
    snapshot.sources[source.key] = {
      name: source.name,
      dataSourceId: source.dataSourceId,
      count: null,
      pages: [],
      error: message,
    };
    console.error(`${source.name}: ERROR — ${message}`);
  }
}

const investigations = snapshot.sources.investigations.pages
  .filter((page) => page.properties.Publicar === true)
  .map(investigationFromPage);

if (process.env.NOTION_SYNC_MODE !== "validate") {
  const content = sources
    .filter((source) => source.key !== "investigations")
    .flatMap((source) =>
      snapshot.sources[source.key].pages.map((page) =>
        contentFromPage(page, source),
      ),
    );

  await mkdir(new URL("../data/", import.meta.url), { recursive: true });
  await writeFile(
    new URL("../data/content.json", import.meta.url),
    `${JSON.stringify({ generatedAt: snapshot.generatedAt, content }, null, 2)}\n`,
  );
  await writeFile(
    new URL("../data/investigations.json", import.meta.url),
    `${JSON.stringify(
      { generatedAt: snapshot.generatedAt, investigations },
      null,
      2,
    )}\n`,
  );
  console.log(`Contenido web generado: ${content.length} entradas`);
}

console.log(`Investigaciones publicables: ${investigations.length}`);

if (process.env.GITHUB_STEP_SUMMARY) {
  const rows = sources.map((source) => {
    const result = snapshot.sources[source.key];
    const status = result.error ? "❌ Sin acceso" : `✅ ${result.count}`;
    return `| ${source.name} | ${status} |`;
  });
  await writeFile(
    process.env.GITHUB_STEP_SUMMARY,
    [
      "## Sincronización de prueba con Notion",
      "",
      "| Fuente | Registros |",
      "|---|---:|",
      ...rows,
      "",
      `Investigaciones marcadas para publicar: **${investigations.length}**`,
      "",
      "La validación solo publicó conteos. No se guardó ni exportó contenido de Notion.",
      "",
    ].join("\n"),
  );
}

if (sourceErrors.length) {
  const names = sourceErrors.map((error) => error.name).join(", ");
  throw new Error(
    `La integración no puede leer ${sourceErrors.length} fuente(s): ${names}. ` +
      "Conecta esas bases originales con la integración Knowledge Hub y vuelve a ejecutar el workflow.",
  );
}
