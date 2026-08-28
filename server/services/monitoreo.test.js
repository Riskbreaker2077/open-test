import test from 'node:test';
import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { abrirBd, cerrarBd } from '../db.js';
import { guardarBanco } from './bancos.js';
import { preguntasDeEjemplo } from '../fixtures-preguntas.js';
import { guardarEstudiantes } from './estudiantes.js';
import { forzarEntrega, iniciarOReanudarIntento } from './intentos.js';
import { estadoDeSesion } from './monitoreo.js';
import { abrirSesion, comenzarSesion, crearSesion, obtenerSesion } from './sesiones.js';

const INICIO = new Date('2026-08-26T10:00:00Z');

function preparar(cantidad = 3) {
  const db = abrirBd(':memory:');
  guardarBanco(db, 'Ciencias', preguntasDeEjemplo(4));
  const estudiantes = Array.from({ length: cantidad }, (_, i) => ({
    codigo: String(1000 + i), nombres: `Nombre ${i}`, apellidos: `Apellido ${i}`, curso: '10A',
  }));
  guardarEstudiantes(db, estudiantes);
  const creada = crearSesion(db, {
    nombre: 'Parcial', banco_id: 1, cursos: ['10A'], n_preguntas: 4,
    duracion_minutos: 60, segundos_minimos_pregunta: 0,
  });
  abrirSesion(db, creada.id);
  const abierta = obtenerSesion(db, creada.id);
  const intentos = estudiantes.slice(0, 2).map((estudiante) =>
    iniciarOReanudarIntento(db, abierta, estudiante).intento);
  comenzarSesion(db, creada.id, INICIO);
  return { db, sesionId: creada.id, intentos };
}

test('muestra sin entrar, presentando y entregado con contadores y resultado', () => {
  const { db, sesionId, intentos } = preparar();
  forzarEntrega(db, intentos[1].id, new Date('2026-08-26T10:01:00Z'));
  const estado = estadoDeSesion(db, sesionId, new Date('2026-08-26T10:02:00Z'));
  assert.deepEqual(estado.estudiantes.map((e) => e.estado).sort(), ['entregado', 'presentando', 'sin_entrar']);
  assert.deepEqual(estado.contadores, {
    convocados: 3, dentro: 2, entregados: 1, sinEntrar: 1, presentando: 1,
  });
  const entregado = estado.estudiantes.find((e) => e.estado === 'entregado');
  assert.equal(entregado.puntaje, 0);
  assert.equal(entregado.porcentaje, 0);
  assert.equal(entregado.motivoEntrega, 'forzada_docente');
  const presentando = estado.estudiantes.find((e) => e.estado === 'presentando');
  assert.equal(presentando.preguntaActual, 1);
  assert.equal(presentando.segundosRestantes, 3480);
  cerrarBd(db);
});

test('forzar entrega es idempotente, califica y usa el motivo docente', () => {
  const { db, intentos } = preparar();
  const primera = forzarEntrega(db, intentos[0].id, INICIO);
  const segunda = forzarEntrega(db, intentos[0].id, new Date(INICIO.getTime() + 1000));
  assert.equal(primera.nueva, true);
  assert.equal(primera.intento.motivo_entrega, 'forzada_docente');
  assert.equal(primera.intento.puntaje, 0);
  assert.equal(segunda.nueva, false);
  assert.equal(segunda.intento.entregado_en, primera.intento.entregado_en);
  cerrarBd(db);
});

test('el monitoreo de 40 convocados responde en menos de 200 ms', () => {
  const { db, sesionId } = preparar(40);
  const inicio = performance.now();
  const estado = estadoDeSesion(db, sesionId, INICIO);
  const duracion = performance.now() - inicio;
  assert.equal(estado.contadores.convocados, 40);
  assert.ok(duracion < 200, `tardó ${duracion.toFixed(1)} ms`);
  cerrarBd(db);
});
