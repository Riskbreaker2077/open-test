import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { estaConectado, marcarSalida, marcarVisto, UMBRAL_MS, _reiniciar } from './presencia.js';

beforeEach(() => _reiniciar());

test('un intento que nunca se ha visto no está conectado', () => {
  assert.equal(estaConectado(1, 1000), false);
});

test('sigue conectado hasta el umbral y deja de estarlo después', () => {
  marcarVisto(1, 1000);
  assert.equal(estaConectado(1, 1000 + UMBRAL_MS), true);
  assert.equal(estaConectado(1, 1000 + UMBRAL_MS + 1), false);
});

test('cada petición renueva la marca', () => {
  marcarVisto(1, 1000);
  marcarVisto(1, 1000 + UMBRAL_MS);
  assert.equal(estaConectado(1, 1000 + UMBRAL_MS * 2), true);
});

test('salir desconecta de inmediato y volver a entrar reconecta', () => {
  marcarVisto(1, 1000);
  marcarSalida(1);
  assert.equal(estaConectado(1, 1000), false);
  marcarVisto(1, 2000);
  assert.equal(estaConectado(1, 2000), true);
});

test('las marcas de un intento no afectan a otro', () => {
  marcarVisto(1, 1000);
  assert.equal(estaConectado(2, 1000), false);
});
