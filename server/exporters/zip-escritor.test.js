import test from 'node:test';
import assert from 'node:assert/strict';
import { crearZip } from './zip-escritor.js';
import { leerZip } from '../importers/paquete-zip.js';

test('lo que crearZip escribe, leerZip lo relee igual', () => {
  const entradas = [
    { nombre: 'a.txt', contenido: 'contenido corto' },
    { nombre: 'carpeta/b.txt', contenido: Buffer.from('x'.repeat(5000)) },
  ];
  const buffer = crearZip(entradas);
  const leidas = leerZip(buffer);
  assert.equal(leidas.length, 2);
  assert.equal(leidas[0].nombre, 'a.txt');
  assert.equal(leidas[0].contenido.toString('utf-8'), 'contenido corto');
  assert.equal(leidas[1].nombre, 'carpeta/b.txt');
  assert.equal(leidas[1].contenido.length, 5000);
  assert.ok(leidas[1].contenido.every((byte) => byte === 'x'.charCodeAt(0)));
});

test('entrada vacía no rompe el central directory', () => {
  const buffer = crearZip([{ nombre: 'vacio.txt', contenido: '' }]);
  const leidas = leerZip(buffer);
  assert.equal(leidas.length, 1);
  assert.equal(leidas[0].contenido.length, 0);
});

test('sin entradas produce un ZIP vacío válido', () => {
  const buffer = crearZip([]);
  assert.throws(() => leerZip(buffer), /entre 1 y/);
});
