const NOTION_API_URL = "https://api.notion.com/v1";
const NOTION_VERSION = "2026-03-11";
const ARTICLES_DATA_SOURCE_ID = "dee1b389-a53a-4f8b-b197-b51ded487e14";

const token = process.env.NOTION_API_KEY;

if (!token) {
  throw new Error(
    "Falta el secreto NOTION_API_KEY. Configúralo en Settings > Secrets and variables > Actions.",
  );
}

let cursor;
let total = 0;

do {
  const response = await fetch(
    `${NOTION_API_URL}/data_sources/${ARTICLES_DATA_SOURCE_ID}/query`,
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
    const message =
      body?.message ||
      `La API de Notion respondió con el estado HTTP ${response.status}.`;
    throw new Error(
      `No se pudo leer "Artículos propios": ${message} ` +
        "Comprueba que la integración esté conectada a la base original.",
    );
  }

  const page = await response.json();
  total += page.results.length;
  cursor = page.has_more ? page.next_cursor : undefined;
} while (cursor);

if (total === 0) {
  throw new Error(
    'La conexión funciona, pero la base "Artículos propios" no devolvió registros.',
  );
}

console.log(`Conexión correcta: ${total} registros en "Artículos propios".`);

if (process.env.GITHUB_STEP_SUMMARY) {
  const { appendFile } = await import("node:fs/promises");
  await appendFile(
    process.env.GITHUB_STEP_SUMMARY,
    [
      "## Prueba de conexión con Notion",
      "",
      "✅ La integración puede leer la base **Artículos propios**.",
      "",
      `Registros encontrados: **${total}**`,
      "",
      "La prueba no ha modificado Notion ni ha publicado contenido.",
      "",
    ].join("\n"),
  );
}
