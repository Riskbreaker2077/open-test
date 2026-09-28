import test from 'node:test';
import assert from 'node:assert/strict';

import { crearContadorDeClics } from './triple-clic.js';

test('tres clics seguidos sobre el mismo estudiante completan la serie', () => {
  const registrar = crearContadorDeClics();
  assert.equal(registrar('a', 0), false);
  assert.equal(registrar('a', 300), false);
  assert.equal(registrar('a', 600), true);
});

test('uno o dos clics no hacen nada', () => {
  const registrar = crearContadorDeClics();
  assert.equal(registrar('a', 0), false);
  assert.equal(registrar('a', 200), false);
  assert.equal(registrar('b', 5_000), false);
});

test('los clics sobre estudiantes distintos no se suman', () => {
  const registrar = crearContadorDeClics();
  assert.equal(registrar('a', 0), false);
  assert.equal(registrar('b', 100), false);
  assert.equal(registrar('a', 200), false);
  assert.equal(registrar('a', 300), false);
  assert.equal(registrar('a', 400), true);
});

test('una pausa más larga que la ventana reinicia la cuenta', () => {
  const registrar = crearContadorDeClics();
  assert.equal(registrar('a', 0), false);
  assert.equal(registrar('a', 500), false);
  assert.equal(registrar('a', 1_200), false);
  assert.equal(registrar('a', 1_700), false);
  assert.equal(registrar('a', 2_200), true);
});

test('clics sueltos a lo largo de un minuto no anulan a nadie', () => {
  const registrar = crearContadorDeClics();
  for (let instante = 0; instante < 60_000; instante += 5_000) {
    assert.equal(registrar('a', instante), false);
  }
});

test('la serie se consume: el cuarto clic empieza una nueva', () => {
  const registrar = crearContadorDeClics();
  registrar('a', 0);
  registrar('a', 100);
  assert.equal(registrar('a', 200), true);
  assert.equal(registrar('a', 300), false);
  assert.equal(registrar('a', 400), false);
  assert.equal(registrar('a', 500), true);
});

test('la cantidad de clics y la ventana son configurables', () => {
  const registrar = crearContadorDeClics({ clics: 2, ventanaMs: 100 });
  assert.equal(registrar('a', 0), false);
  assert.equal(registrar('a', 150), false);
  assert.equal(registrar('a', 200), true);
});
