import test from 'node:test';
import assert from 'node:assert/strict';
import { crearLibroXlsx } from './xlsx.js';
import { leerZip } from '../importers/paquete-zip.js';

function partes(buffer) {
  return Object.fromEntries(leerZip(buffer).map((entrada) => [entrada.nombre, entrada.contenido.toString('utf-8')]));
}

test('libro de una hoja: cabeceras y valores presentes en el XML de la hoja', () => {
  const buffer = crearLibroXlsx([
    { cabeceras: ['nombre', 'puntaje'], filas: [['Ana', 18], ['Luis', 15]] },
  ]);
  const { 'xl/worksheets/sheet1.xml': hoja } = partes(buffer);
  assert.match(hoja, /nombre/);
  assert.match(hoja, /puntaje/);
  assert.match(hoja, /Ana/);
  assert.match(hoja, /Luis/);
});

test('workbook.xml lista las hojas en el orden dado, con sus nombres', () => {
  const buffer = crearLibroXlsx([
    { nombre: 'Resumen', cabeceras: ['codigo'], filas: [['1']] },
    { nombre: 'Detalle', cabeceras: ['codigo'], filas: [['1']] },
  ]);
  const { 'xl/workbook.xml': workbook } = partes(buffer);
  const posicionResumen = workbook.indexOf('name="Resumen"');
  const posicionDetalle = workbook.indexOf('name="Detalle"');
  assert.ok(posicionResumen >= 0 && posicionDetalle >= 0 && posicionResumen < posicionDetalle);
});

test('texto con &, < y > sale escapado en el XML de la hoja', () => {
  const buffer = crearLibroXlsx([
    { cabeceras: ['texto'], filas: [['Ana & Luis <hermanos>']] },
  ]);
  const { 'xl/worksheets/sheet1.xml': hoja } = partes(buffer);
  assert.match(hoja, /Ana &amp; Luis &lt;hermanos&gt;/);
  assert.doesNotMatch(hoja, /Ana & Luis/);
});

test('columna numérica produce <v> sin t="inlineStr"', () => {
  const buffer = crearLibroXlsx([
    { cabeceras: ['puntaje'], filas: [[18]] },
  ]);
  const { 'xl/worksheets/sheet1.xml': hoja } = partes(buffer);
  assert.match(hoja, /<c r="A2"><v>18<\/v><\/c>/);
});

test('las 5 partes fijas más una hoja por entrada existen en el ZIP', () => {
  const buffer = crearLibroXlsx([
    { nombre: 'Resumen', cabeceras: ['a'], filas: [] },
    { nombre: 'Detalle', cabeceras: ['a'], filas: [] },
  ]);
  const nombres = leerZip(buffer).map((entrada) => entrada.nombre).sort();
  assert.deepEqual(nombres, [
    '[Content_Types].xml', '_rels/.rels', 'xl/_rels/workbook.xml.rels',
    'xl/styles.xml', 'xl/workbook.xml', 'xl/worksheets/sheet1.xml', 'xl/worksheets/sheet2.xml',
  ].sort());
});
