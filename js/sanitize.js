// Sanitización de datos externos (Notion) antes de insertar en el DOM.
// Cada función tiene un propósito concreto — no usar una donde va otra.

const ESCAPE_MAP = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

const ESCAPE_RE = /[&<>"']/g;

/**
 * Escapa HTML para inserción segura en innerHTML.
 * Usar cuando el dato es texto plano (títulos, IDs, fechas, etiquetas).
 */
export function escapeHTML(str) {
  if (str === null || str === undefined) return '';
  return String(str).replace(ESCAPE_RE, (ch) => ESCAPE_MAP[ch]);
}

/**
 * Escapa un valor para uso dentro de un atributo HTML entrecomillado.
 * Cubre el mismo set que escapeHTML — para atributos con comillas dobles.
 */
export function escapeAttr(str) {
  return escapeHTML(str);
}

const SAFE_URL_RE = /^https?:\/\//i;

/**
 * Valida una URL para uso en href. Solo permite http/https.
 * Devuelve la URL si es segura, o '#' si no lo es.
 * Previene inyección vía javascript:, data:, vbscript:, etc.
 */
export function safeURL(url) {
  if (!url || typeof url !== 'string') return '#';
  const trimmed = url.trim();
  return SAFE_URL_RE.test(trimmed) ? trimmed : '#';
}

/**
 * Escapa un string para uso seguro dentro de un atributo onclick o similar.
 * Escapa comillas simples, dobles, backslashes y caracteres de control.
 *
 * NOTA: Preferir addEventListener con clausuras en lugar de onclick inline.
 * Esta función existe como medida transitoria durante la migración.
 */
export function escapeJSString(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/</g, '\\x3c')
    .replace(/>/g, '\\x3e');
}

/**
 * Trunca un string a maxLen caracteres y añade '…' si se recortó.
 * Escapa el resultado para HTML.
 */
export function truncate(str, maxLen) {
  if (!str) return '';
  const s = String(str);
  const truncated = s.length > maxLen ? s.substring(0, maxLen) + '…' : s;
  return escapeHTML(truncated);
}

/**
 * Construye un elemento <a> seguro desde una URL y un texto.
 * Devuelve el HTML como string. Si la URL no es http/https, devuelve solo el texto.
 */
export function safeLink(url, text, attrs = '') {
  const href = safeURL(url);
  const label = escapeHTML(text || url || '');
  if (href === '#') return `<span>${label}</span>`;
  return `<a href="${href}" target="_blank" rel="noopener"${attrs ? ' ' + attrs : ''}>${label}</a>`;
}

/**
 * Alias for truncate — used throughout the app under this name.
 */
export const truncEsc = truncate;
