import test from 'node:test';
import assert from 'node:assert/strict';
import { crearPrng } from './prng.js';

const secuencia = (semilla, n = 20) => {
  const prng = crearPrng(semilla);
  return Array.from({ length: n }, () => prng());
};

test('la misma semilla produce siempre la misma secuencia', () => {
  assert.deepEqual(secuencia('abc123'), secuencia('abc123'));
});

test('semillas distintas producen secuencias distintas', () => {
  assert.notDeepEqual(secuencia('abc123'), secuencia('abc124'));
});

test('devuelve números en [0, 1)', () => {
  const valores = secuencia('semilla', 5000);

  for (const valor of valores) {
    assert.ok(valor >= 0 && valor < 1, `fuera de rango: ${valor}`);
  }
});

test('reparte de forma razonablemente uniforme', () => {
  // No buscamos calidad criptográfica, solo que no se amontone en una zona.
  const cubos = new Array(10).fill(0);
  const prng = crearPrng('reparto');

  for (let i = 0; i < 100_000; i += 1) cubos[Math.floor(prng() * 10)] += 1;

  for (const cuenta of cubos) {
    assert.ok(cuenta > 9000 && cuenta < 11000, `cubo desviado: ${cuenta}`);
  }
});

test('semillas parecidas no dan secuencias parecidas', () => {
  const a = secuencia('intento-0001', 5);
  const b = secuencia('intento-0002', 5);

  assert.notEqual(a[0], b[0]);
  assert.ok(Math.abs(a[0] - b[0]) > 0.001, 'no deben quedar pegadas');
});
