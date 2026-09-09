import test from 'node:test';
import assert from 'node:assert/strict';
import { letrasDeOpciones, textoPlano } from './pregunta.js';

test('letrasDeOpciones devuelve A-D para cuatro opciones', () => {
  assert.deepEqual(letrasDeOpciones(4), ['A', 'B', 'C', 'D']);
});

test('letrasDeOpciones se extiende más allá de la D para 5+ opciones', () => {
  assert.deepEqual(letrasDeOpciones(6), ['A', 'B', 'C', 'D', 'E', 'F']);
});

test('letrasDeOpciones con cero o negativo devuelve un array vacío', () => {
  assert.deepEqual(letrasDeOpciones(0), []);
  assert.deepEqual(letrasDeOpciones(-2), []);
});

test('textoPlano concatena solo los bloques de texto', () => {
  const bloques = [
    { tipo: 'texto', texto: 'Primer párrafo.' },
    { tipo: 'imagen', archivo: 'x.png' },
    { tipo: 'texto', texto: 'Segundo párrafo.' },
  ];
  assert.equal(textoPlano(bloques), 'Primer párrafo. Segundo párrafo.');
});

test('textoPlano tolera undefined y arrays vacíos', () => {
  assert.equal(textoPlano(undefined), '');
  assert.equal(textoPlano([]), '');
});
