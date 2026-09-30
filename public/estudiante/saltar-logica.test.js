import test from 'node:test';
import assert from 'node:assert/strict';
import { opcionAlSaltar } from './saltar-logica.js';

test('saltar conserva la respuesta que ya tenía la pregunta', () => {
  assert.equal(opcionAlSaltar(42), 42);
});

test('saltar sin respuesta la registra como saltada', () => {
  assert.equal(opcionAlSaltar(null), null);
  assert.equal(opcionAlSaltar(undefined), null);
});
