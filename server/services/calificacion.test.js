import test from 'node:test';
import assert from 'node:assert/strict';
import { abrirBd, cerrarBd } from '../db.js';
import { guardarBanco } from './bancos.js';
import { preguntaDeEjemplo } from '../fixtures-preguntas.js';
import { guardarEstudiantes } from './estudiantes.js';
import { iniciarOReanudarIntento } from './intentos.js';
import { abrirSesion, comenzarSesion, crearSesion, obtenerSesion } from './sesiones.js';
import {
  armarResultado,
  calificarIntento,
  entregarIntentoCalificado,
  obtenerResultado,
  preguntasCalificables,
} from './calificacion.js';

function preparar(nivel = 'aciertos') {
  const db = abrirBd(':memory:');
  guardarBanco(db, 'Banco', Array.from({ length: 4 }, (_, i) => preguntaDeEjemplo({
    id: `pregunta-${i + 1}`,
    enunciado: [{ tipo: 'texto', texto: `Pregunta ${i + 1}` }],
  })));
  const estudiante = { codigo: '1', nombres: 'Ana', apellidos: 'Gómez', curso: '10A' };
  guardarEstudiantes(db, [estudiante]);
  const creada = crearSesion(db, {
    nombre: 'Prueba', banco_id: 1, cursos: ['10A'], n_preguntas: 4,
    segundos_minimos_pregunta: 0, nivel_feedback: nivel,
  });
  abrirSesion(db, creada.id);
  const intento = iniciarOReanudarIntento(db, obtenerSesion(db, creada.id), estudiante).intento;
  comenzarSesion(db, creada.id, new Date('2026-08-26T10:00:00Z'));
  return { db, intento };
}

function responder(db, intentoId, orden, opcionId) {
  const fila = db.prepare('SELECT id FROM intento_preguntas WHERE intento_id = ? AND orden = ?')
    .get(intentoId, orden);
  db.prepare(`
    INSERT INTO respuestas (intento_pregunta_id, opcion_id, segundos_en_pantalla, respondido_en)
    VALUES (?, ?, 1, '2026-08-26T10:00:01Z')
  `).run(fila.id, opcionId);
}

test('califica bien, mal, saltadas y no alcanzadas sobre el total asignado', () => {
  const casos = [
    { respuestas: [1, 2, 3, 4], esperado: 4 },
    { respuestas: [9, 9, 9, 9], esperado: 0 },
    { respuestas: [1, 9, null, undefined], esperado: 1 },
  ];
  for (const caso of casos) {
    const preguntas = caso.respuestas.map((respuesta, i) => ({
      opcion_id: respuesta === undefined ? null : respuesta,
      opcion_correcta_id: i + 1,
    }));
    const resultado = calificarIntento(preguntas);
    assert.equal(resultado.aciertos, caso.esperado);
    assert.equal(resultado.puntaje, caso.esperado);
    assert.equal(resultado.porcentaje, Number(((caso.esperado / 4) * 100).toFixed(1)));
  }
});

test('la entrega persiste la nota una sola vez y distingue los cuatro estados', () => {
  const { db, intento } = preparar('completo');
  const preguntas = preguntasCalificables(db, intento.id);
  responder(db, intento.id, 1, preguntas[0].opcion_correcta_id);
  responder(db, intento.id, 2, preguntas[1].opciones.find((o) => o.id !== preguntas[1].opcion_correcta_id).id);
  responder(db, intento.id, 3, null);

  const entregado = entregarIntentoCalificado(db, intento.id, 'manual', '2026-08-26T10:05:00Z');
  assert.equal(entregado.aciertos, 1);
  assert.equal(entregado.puntaje, 1);
  assert.equal(obtenerResultado(db, intento.id).porcentaje, 25);
  assert.deepEqual(
    obtenerResultado(db, intento.id).preguntas.map((p) => p.estado),
    ['acertada', 'fallada', 'saltada', 'sin_llegar'],
  );

  db.prepare('UPDATE opciones SET es_correcta = CASE WHEN es_correcta = 1 THEN 0 ELSE es_correcta END').run();
  const otraVez = obtenerResultado(db, intento.id);
  assert.equal(otraVez.aciertos, 1);
  assert.equal(otraVez.puntaje, 1);
  cerrarBd(db);
});

test('el servidor revela la correcta y las justificaciones únicamente en nivel completo', () => {
  const base = [{
    orden: 1, contexto: [], enunciado: [{ tipo: 'texto', texto: 'Pregunta' }],
    competencia: 'Comp', componente: 'Compo', afirmacion: 'Afirm', evidencia: 'Evid',
    estandar_asociado: 'Est', que_evalua: 'Qué evalúa',
    respuesta_id: 1, opcion_id: 2, opcion_correcta_id: 1,
    opciones: [
      { id: 1, contenido: [{ tipo: 'texto', texto: 'Primera' }], justificacion: 'Porque sí es correcta' },
      { id: 2, contenido: [{ tipo: 'texto', texto: 'Marcada' }], justificacion: 'Porque no lo es' },
    ],
  }];
  const intento = { puntaje: 0, aciertos: 0 };
  const solo = JSON.stringify(armarResultado(intento, base, 'solo_puntaje'));
  const aciertos = JSON.stringify(armarResultado(intento, base, 'aciertos'));
  const completo = JSON.stringify(armarResultado(intento, base, 'completo'));

  assert.doesNotMatch(solo, /preguntas|Primera|opcionCorrectaId|justificacion|Porque/);
  assert.doesNotMatch(aciertos, /Primera|opcionCorrectaId|justificacion|Porque/);
  assert.match(completo, /Primera/);
  assert.match(completo, /opcionCorrectaId/);
  assert.match(completo, /Porque sí es correcta/);
  assert.match(completo, /Porque no lo es/);
  assert.match(completo, /Qué evalúa/);
});
