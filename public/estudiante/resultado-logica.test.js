import test from 'node:test';
import assert from 'node:assert/strict';
import {
  colorDePunto, esPerfecto, etiquetaDeEstado, hashDePregunta, mensajeDeFelicitacion,
  MENSAJES_PERFECTO, ordenDesdeHash,
} from './resultado-logica.js';

test('esPerfecto solo con todas acertadas y al menos una pregunta', () => {
  assert.equal(esPerfecto({ aciertos: 20, total: 20 }), true);
  assert.equal(esPerfecto({ aciertos: 19, total: 20 }), false);
  assert.equal(esPerfecto({ aciertos: 0, total: 0 }), false);
  assert.equal(esPerfecto(undefined), false);
});

test('colorDePunto: verde, rojo y gris para saltada o sin llegar', () => {
  assert.equal(colorDePunto('acertada'), 'verde');
  assert.equal(colorDePunto('fallada'), 'rojo');
  assert.equal(colorDePunto('saltada'), 'gris');
  assert.equal(colorDePunto('sin_llegar'), 'gris');
});

test('etiquetaDeEstado en español, con respaldo para estados desconocidos', () => {
  assert.equal(etiquetaDeEstado('fallada'), 'Fallada');
  assert.equal(etiquetaDeEstado('otro'), 'Sin información');
});

test('ordenDesdeHash acepta solo preguntas existentes', () => {
  const ordenes = [1, 2, 3];
  assert.equal(ordenDesdeHash(hashDePregunta(2), ordenes), 2);
  assert.equal(ordenDesdeHash('#pregunta-9', ordenes), null);
  assert.equal(ordenDesdeHash('#otra-cosa', ordenes), null);
  assert.equal(ordenDesdeHash('', ordenes), null);
});

test('mensajeDeFelicitacion es fijo para la misma entrega y sale de la lista', () => {
  const resultado = { estudiante: 'Ana Gómez', sesion: 'Parcial', entregadoEn: '2026-09-23T10:00:00.000Z' };
  const mensaje = mensajeDeFelicitacion(resultado);
  assert.ok(MENSAJES_PERFECTO.includes(mensaje));
  assert.equal(mensajeDeFelicitacion({ ...resultado }), mensaje);
});

test('mensajeDeFelicitacion reparte mensajes distintos entre estudiantes', () => {
  const vistos = new Set();
  for (let i = 0; i < 200; i += 1) {
    vistos.add(mensajeDeFelicitacion({ estudiante: `Estudiante ${i}`, sesion: 'Parcial', entregadoEn: '2026-09-23T10:00:00.000Z' }));
  }
  assert.equal(vistos.size, MENSAJES_PERFECTO.length, 'con 200 estudiantes salen los diez mensajes');
});
