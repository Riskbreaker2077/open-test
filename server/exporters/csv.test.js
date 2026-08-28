import test from 'node:test';
import assert from 'node:assert/strict';
import { aCsv, BOM } from './csv.js';

test('genera UTF-8 con BOM, CRLF y escapa coma, comillas y saltos', () => {
  const csv = aCsv(['texto', 'valor'], [
    { texto: 'María, Ana', valor: 'dijo "sí"' },
    { texto: 'dos\nlíneas', valor: 1 },
  ]);
  assert.ok(csv.startsWith(BOM));
  assert.equal(csv, '\uFEFFtexto,valor\r\n"María, Ana","dijo ""sí"""\r\n"dos\nlíneas",1\r\n');
});
