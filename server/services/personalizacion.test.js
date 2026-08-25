import test from 'node:test';
import assert from 'node:assert/strict';
import { crearPrng } from './prng.js';
import { barajar, generarPrueba, muestrear, solapamientoEsperado } from './personalizacion.js';

/** Banco de prueba: cada pregunta con sus cuatro opciones y la correcta marcada. */
function banco(total = 50) {
  return Array.from({ length: total }, (_, i) => ({
    id: i + 1,
    opciones: [0, 1, 2, 3].map((j) => ({ id: (i + 1) * 10 + j, correcta: j === i % 4 })),
  }));
}

const prueba = (semilla, nPreguntas = 20, preguntas = banco()) =>
  generarPrueba({ preguntas, nPreguntas, semilla });

test('barajar no pierde ni inventa elementos', () => {
  const original = [1, 2, 3, 4, 5, 6, 7, 8];
  const revuelto = barajar(original, crearPrng('x'));

  assert.deepEqual([...revuelto].sort((a, b) => a - b), original);
  assert.deepEqual(original, [1, 2, 3, 4, 5, 6, 7, 8], 'no debe modificar el original');
});

test('muestrear devuelve elementos distintos del conjunto', () => {
  const elegidos = muestrear([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 4, crearPrng('x'));

  assert.equal(elegidos.length, 4);
  assert.equal(new Set(elegidos).size, 4, 'sin repeticiones');
  for (const e of elegidos) assert.ok(e >= 1 && e <= 10);
});

test('muestrear más de lo que hay devuelve todo, sin repetir', () => {
  const elegidos = muestrear([1, 2, 3], 10, crearPrng('x'));
  assert.equal(new Set(elegidos).size, 3);
});

// --- Determinismo: lo que sostiene la reanudación y la auditoría -----------

test('la misma semilla produce EXACTAMENTE la misma prueba', () => {
  assert.deepEqual(prueba('semilla-ana'), prueba('semilla-ana'));
});

test('el determinismo llega hasta el orden de las opciones', () => {
  const a = prueba('semilla-ana');
  const b = prueba('semilla-ana');

  for (let i = 0; i < a.length; i += 1) {
    assert.deepEqual(a[i].ordenOpciones, b[i].ordenOpciones, `pregunta ${i + 1}`);
  }
});

// --- Integridad de la prueba generada -------------------------------------

test('no repite ninguna pregunta dentro de un intento', () => {
  const generada = prueba('semilla-ana');
  const ids = generada.map((p) => p.preguntaId);

  assert.equal(new Set(ids).size, 20, 'las 20 deben ser distintas');
});

test('todas las preguntas salen del banco', () => {
  const preguntas = banco();
  const permitidos = new Set(preguntas.map((p) => p.id));

  for (const fila of prueba('semilla-ana', 20, preguntas)) {
    assert.ok(permitidos.has(fila.preguntaId));
  }
});

test('numera de 1 a N sin huecos', () => {
  assert.deepEqual(
    prueba('semilla-ana').map((p) => p.orden),
    Array.from({ length: 20 }, (_, i) => i + 1),
  );
});

test('el orden de opciones es una permutación exacta de las de su pregunta', () => {
  const preguntas = banco();
  const porId = new Map(preguntas.map((p) => [p.id, p]));

  for (const fila of prueba('semilla-ana', 20, preguntas)) {
    const esperadas = porId.get(fila.preguntaId).opciones.map((o) => o.id);

    assert.equal(fila.ordenOpciones.length, 4);
    assert.equal(new Set(fila.ordenOpciones).size, 4, 'sin repetidas');
    assert.deepEqual([...fila.ordenOpciones].sort((a, b) => a - b), [...esperadas].sort((a, b) => a - b));
  }
});

// --- Dispersión: el motivo de existir de todo esto ------------------------

test('cien estudiantes reciben cien pruebas distintas', () => {
  const pruebas = Array.from({ length: 100 }, (_, i) => prueba(`alumno-${i}`));
  const huellas = new Set(pruebas.map((p) => p.map((f) => f.preguntaId).join(',')));

  assert.equal(huellas.size, 100, 'ningún par debe compartir selección y orden');
});

test('dos estudiantes comparten en torno a las preguntas que dicta la teoría', () => {
  // Con 50 preguntas y 20 sorteadas, lo esperable son 20*20/50 = 8.
  const pruebas = Array.from({ length: 100 }, (_, i) =>
    new Set(prueba(`alumno-${i}`).map((f) => f.preguntaId)),
  );

  let suma = 0;
  let pares = 0;
  let maximo = 0;

  for (let i = 0; i < pruebas.length; i += 1) {
    for (let j = i + 1; j < pruebas.length; j += 1) {
      const comunes = [...pruebas[i]].filter((id) => pruebas[j].has(id)).length;
      suma += comunes;
      maximo = Math.max(maximo, comunes);
      pares += 1;
    }
  }

  const media = suma / pares;
  assert.ok(media > 7 && media < 9, `solapamiento medio fuera de lo esperado: ${media}`);
  assert.ok(maximo < 20, 'ningún par debería compartir las 20');
});

test('la pregunta que a uno le sale primera casi nunca es la primera de otro', () => {
  const primeras = Array.from({ length: 100 }, (_, i) => prueba(`alumno-${i}`)[0].preguntaId);
  const repeticionMaxima = Math.max(
    ...[...new Set(primeras)].map((id) => primeras.filter((p) => p === id).length),
  );

  assert.ok(repeticionMaxima < 12, `demasiados empiezan por la misma: ${repeticionMaxima}`);
});

test('la correcta se reparte entre las cuatro posiciones', () => {
  // Si cayera más en unas que en otras, un estudiante espabilado lo notaría.
  const preguntas = banco();
  const porId = new Map(preguntas.map((p) => [p.id, p]));
  const cuenta = [0, 0, 0, 0];
  let total = 0;

  for (let i = 0; i < 50; i += 1) {
    for (const fila of prueba(`alumno-${i}`, 20, preguntas)) {
      const opciones = porId.get(fila.preguntaId).opciones;
      const idCorrecta = opciones.find((o) => o.correcta).id;
      cuenta[fila.ordenOpciones.indexOf(idCorrecta)] += 1;
      total += 1;
    }
  }

  assert.equal(total, 1000);
  for (const [posicion, veces] of cuenta.entries()) {
    const porcentaje = (veces / total) * 100;
    assert.ok(
      porcentaje >= 20 && porcentaje <= 30,
      `la posición ${posicion} se lleva el ${porcentaje.toFixed(1)}%`,
    );
  }
});

// --- Bordes y rendimiento -------------------------------------------------

test('con un banco del tamaño justo funciona: cambia solo el orden', () => {
  const generada = prueba('semilla-ana', 20, banco(20));

  assert.equal(generada.length, 20);
  assert.equal(new Set(generada.map((f) => f.preguntaId)).size, 20);
});

test('un banco corto falla con un mensaje claro y no genera media prueba', () => {
  assert.throws(() => prueba('semilla-ana', 20, banco(19)), /tiene 19 pregunta/);
});

test('generar una prueba tarda menos de 50 ms', () => {
  const preguntas = banco(50);
  const inicio = performance.now();
  generarPrueba({ preguntas, nPreguntas: 20, semilla: 'medida' });

  assert.ok(performance.now() - inicio < 50);
});

test('el solapamiento esperado avisa al docente de un banco pequeño', () => {
  assert.equal(solapamientoEsperado(50, 20), 8);
  assert.equal(solapamientoEsperado(25, 20), 16, 'un banco pequeño protege poco');
  assert.equal(solapamientoEsperado(20, 20), 20, 'con el tamaño justo, todos comparten todo');
});
