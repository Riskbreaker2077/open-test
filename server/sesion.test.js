import test from 'node:test';
import assert from 'node:assert/strict';
import { crearSesion, destruirSesion, DURACION_MS, limpiarCaducadas, validarSesion, _reiniciar } from './sesion.js';

test('una sesión recién creada es válida', () => {
  _reiniciar();
  const id = crearSesion();
  assert.equal(validarSesion(id), true);
});

test('cada sesión tiene un identificador distinto e impredecible', () => {
  _reiniciar();
  const ids = new Set(Array.from({ length: 200 }, () => crearSesion()));
  assert.equal(ids.size, 200);
  for (const id of ids) assert.match(id, /^[0-9a-f]{64}$/);
});

test('un identificador inventado no vale', () => {
  _reiniciar();
  crearSesion();
  assert.equal(validarSesion('a'.repeat(64)), false);
  assert.equal(validarSesion(''), false);
  assert.equal(validarSesion(undefined), false);
});

test('la sesión caduca', () => {
  _reiniciar();
  const ahora = Date.now();
  const id = crearSesion(ahora);

  assert.equal(validarSesion(id, ahora + DURACION_MS - 1000), true);
  assert.equal(validarSesion(id, ahora + DURACION_MS + 1000), false);
});

test('cerrar sesión la invalida de inmediato', () => {
  _reiniciar();
  const id = crearSesion();
  assert.equal(destruirSesion(id), true);
  assert.equal(validarSesion(id), false);
});

test('el barrido elimina solo las caducadas', () => {
  _reiniciar();
  const ahora = Date.now();
  const vieja = crearSesion(ahora - DURACION_MS - 1000);
  const nueva = crearSesion(ahora);

  assert.equal(limpiarCaducadas(ahora), 1);
  assert.equal(validarSesion(vieja, ahora), false);
  assert.equal(validarSesion(nueva, ahora), true);
});
