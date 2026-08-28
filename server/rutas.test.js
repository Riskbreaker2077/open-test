import test from 'node:test';
import assert from 'node:assert/strict';
import { rutasPara } from './rutas.js';

test('en desarrollo resuelve desde el módulo del servidor', () => {
  const rutas = rutasPara({ sea: false, modulo: 'file:///proyecto/server/rutas.js' });
  assert.equal(rutas.datos, '/proyecto/data');
  assert.equal(rutas.estaticos, '/proyecto/public');
});

test('bajo SEA resuelve todo junto al ejecutable', () => {
  const rutas = rutasPara({ sea: true, ejecutable: '/distribucion/OpenTest.exe' });
  assert.equal(rutas.datos, '/distribucion/data');
  assert.equal(rutas.estaticos, '/distribucion/public');
});
