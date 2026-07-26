import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import {
  escapeHTML,
  escapeAttr,
  safeURL,
  escapeJSString,
  truncate,
  safeLink,
} from '../sanitize.js';

describe('escapeHTML', () => {
  it('escapa los 5 caracteres peligrosos', () => {
    assert.equal(escapeHTML('<script>alert("xss")</script>'),
      '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
  });

  it('escapa comillas simples', () => {
    assert.equal(escapeHTML("it's"), 'it&#39;s');
  });

  it('escapa ampersands', () => {
    assert.equal(escapeHTML('a&b'), 'a&amp;b');
  });

  it('devuelve string vacío para null/undefined', () => {
    assert.equal(escapeHTML(null), '');
    assert.equal(escapeHTML(undefined), '');
  });

  it('convierte números a string', () => {
    assert.equal(escapeHTML(42), '42');
  });

  it('no modifica texto seguro', () => {
    assert.equal(escapeHTML('Artículos propios'), 'Artículos propios');
  });

  it('neutraliza el payload clásico de img onerror', () => {
    const payload = '<img src=x onerror=alert(1)>';
    const result = escapeHTML(payload);
    assert.ok(!result.includes('<img'), 'no debe contener tag <img sin escapar');
    assert.equal(result, '&lt;img src=x onerror=alert(1)&gt;');
  });

  it('neutraliza event handlers en atributos', () => {
    const payload = '" onmouseover="alert(1)" data-x="';
    const result = escapeHTML(payload);
    assert.ok(!result.includes('"'), 'no debe contener comillas dobles sin escapar');
    assert.equal(result, '&quot; onmouseover=&quot;alert(1)&quot; data-x=&quot;');
  });
});

describe('escapeAttr', () => {
  it('es equivalente a escapeHTML', () => {
    const input = '<"test">';
    assert.equal(escapeAttr(input), escapeHTML(input));
  });
});

describe('safeURL', () => {
  it('acepta URLs http', () => {
    assert.equal(safeURL('http://example.com'), 'http://example.com');
  });

  it('acepta URLs https', () => {
    assert.equal(safeURL('https://notion.so/page'), 'https://notion.so/page');
  });

  it('rechaza javascript:', () => {
    assert.equal(safeURL('javascript:alert(1)'), '#');
  });

  it('rechaza javascript: con mayúsculas', () => {
    assert.equal(safeURL('JavaScript:alert(1)'), '#');
  });

  it('rechaza data:', () => {
    assert.equal(safeURL('data:text/html,<script>alert(1)</script>'), '#');
  });

  it('rechaza vbscript:', () => {
    assert.equal(safeURL('vbscript:MsgBox'), '#');
  });

  it('devuelve # para null/undefined/vacío', () => {
    assert.equal(safeURL(null), '#');
    assert.equal(safeURL(undefined), '#');
    assert.equal(safeURL(''), '#');
  });

  it('rechaza URLs relativas (no http/https)', () => {
    assert.equal(safeURL('/path/to/page'), '#');
  });

  it('trim espacios', () => {
    assert.equal(safeURL('  https://example.com  '), 'https://example.com');
  });
});

describe('escapeJSString', () => {
  it('escapa comillas simples', () => {
    assert.equal(escapeJSString("test'xss"), "test\\'xss");
  });

  it('escapa comillas dobles', () => {
    assert.equal(escapeJSString('test"xss'), 'test\\"xss');
  });

  it('escapa backslashes', () => {
    assert.equal(escapeJSString('test\\xss'), 'test\\\\xss');
  });

  it('escapa < y > para prevenir cierre de script', () => {
    const result = escapeJSString('</script><script>alert(1)');
    assert.ok(!result.includes('</script>'));
    assert.ok(!result.includes('<script>'));
  });

  it('maneja el payload de ruptura de onclick', () => {
    const payload = "');alert('xss";
    const result = escapeJSString(payload);
    // Cada comilla simple del input queda precedida por backslash
    assert.equal(result, "\\');alert(\\'xss");
    // En contexto JS, \' no termina el string — la inyección queda neutralizada
    assert.ok(result.startsWith("\\'"), 'la primera comilla debe estar escapada con backslash');
  });

  it('devuelve string vacío para null/undefined', () => {
    assert.equal(escapeJSString(null), '');
    assert.equal(escapeJSString(undefined), '');
  });
});

describe('truncate', () => {
  it('no trunca strings cortos', () => {
    assert.equal(truncate('hola', 10), 'hola');
  });

  it('trunca y añade puntos suspensivos', () => {
    assert.equal(truncate('abcdefghij', 5), 'abcde…');
  });

  it('escapa el resultado', () => {
    assert.equal(truncate('<script>', 20), '&lt;script&gt;');
  });

  it('maneja null', () => {
    assert.equal(truncate(null, 10), '');
  });
});

describe('safeLink', () => {
  it('construye un enlace seguro', () => {
    const result = safeLink('https://notion.so/page', 'Mi página');
    assert.ok(result.includes('href="https://notion.so/page"'));
    assert.ok(result.includes('target="_blank"'));
    assert.ok(result.includes('rel="noopener"'));
    assert.ok(result.includes('Mi página'));
  });

  it('escapa el texto del enlace', () => {
    const result = safeLink('https://example.com', '<script>');
    assert.ok(result.includes('&lt;script&gt;'));
    assert.ok(!result.includes('<script>'));
  });

  it('devuelve span si la URL no es http/https', () => {
    const result = safeLink('javascript:alert(1)', 'Click');
    assert.ok(result.startsWith('<span>'));
    assert.ok(!result.includes('href'));
  });

  it('pasa atributos adicionales', () => {
    const result = safeLink('https://example.com', 'test', 'style="color:red"');
    assert.ok(result.includes('style="color:red"'));
  });
});
