import test from 'node:test';
import assert from 'node:assert/strict';
import { abrirBd, cerrarBd } from '../db.js';
import { guardarBanco } from './bancos.js';
import { preguntaDeEjemplo } from '../fixtures-preguntas.js';
import { guardarEstudiantes } from './estudiantes.js';
import { iniciarOReanudarIntento } from './intentos.js';
import {
  abrirSesion,
  comenzarSesion,
  crearSesion,
  obtenerSesion,
  pausarSesion,
} from './sesiones.js';
import { forzarEntrega } from './intentos.js';
import {
  entregarIntento,
  estadoDelExamen,
  guardarRespuesta,
  obtenerPregunta,
  pausarIntentoComoEstudiante,
} from './examen.js';

const INICIO = new Date('2026-08-26T10:00:00.000Z');

function preparar({ minimo = 10, duracion = 60 } = {}) {
  const db = abrirBd(':memory:');
  guardarBanco(db, 'Ciencias', Array.from({ length: 4 }, (_, i) => preguntaDeEjemplo({
    id: `pregunta-${i + 1}`,
    contexto: i === 0 ? [{ tipo: 'texto', texto: 'Lee el caso.' }] : [],
    enunciado: [{ tipo: 'texto', texto: `¿Pregunta ${i + 1}?` }],
  })));
  const estudiante = { codigo: '1001', nombres: 'Ana', apellidos: 'Gómez', curso: '10A' };
  guardarEstudiantes(db, [estudiante]);
  const creada = crearSesion(db, {
    nombre: 'Parcial', banco_id: 1, cursos: ['10A'], n_preguntas: 4,
    duracion_minutos: duracion, segundos_minimos_pregunta: minimo,
  });
  abrirSesion(db, creada.id);
  const sesionAbierta = obtenerSesion(db, creada.id);
  const intento = iniciarOReanudarIntento(db, sesionAbierta, estudiante).intento;
  comenzarSesion(db, creada.id, INICIO);
  return { db, intento, sesion: obtenerSesion(db, creada.id) };
}

test('devuelve una sola pregunta con opciones materializadas y nunca la correcta', () => {
  const { db, intento } = preparar();
  const pregunta = obtenerPregunta(db, intento, 1, INICIO);
  const texto = JSON.stringify(pregunta);

  assert.equal(pregunta.orden, 1);
  assert.equal(pregunta.total, 4);
  assert.equal(pregunta.opciones.length, 4);
  assert.deepEqual(
    pregunta.opciones.map((opcion) => opcion.id),
    db.prepare('SELECT orden_opciones FROM intento_preguntas WHERE intento_id = ? AND orden = 1')
      .get(intento.id).orden_opciones.split(',').map(Number),
  );
  assert.doesNotMatch(texto, /es_correcta|correcta|explicacion|justificacion/i);
  cerrarBd(db);
});

test('el orden de opciones es idéntico entre llamadas', () => {
  const { db, intento } = preparar();
  const primera = obtenerPregunta(db, intento, 2, INICIO);
  const segunda = obtenerPregunta(db, intento, 2, new Date(INICIO.getTime() + 5000));
  assert.deepEqual(segunda.opciones, primera.opciones);
  cerrarBd(db);
});

test('rechaza responder antes del mínimo según el reloj del servidor', () => {
  const { db, intento } = preparar({ minimo: 10 });
  const pregunta = obtenerPregunta(db, intento, 1, INICIO);

  assert.throws(
    () => guardarRespuesta(db, intento, { n: 1, opcionId: pregunta.opciones[0].id, segundos: 999 },
      new Date(INICIO.getTime() + 9000)),
    /Espera 1 segundo/,
  );
  assert.equal(db.prepare('SELECT count(*) AS t FROM respuestas').get().t, 0);
  cerrarBd(db);
});

test('con mínimo cero guarda de inmediato y acota segundos imposibles', () => {
  const { db, intento } = preparar({ minimo: 0 });
  const pregunta = obtenerPregunta(db, intento, 1, INICIO);
  const respuesta = guardarRespuesta(
    db,
    intento,
    { n: 1, opcionId: pregunta.opciones[0].id, segundos: 9999 },
    new Date(INICIO.getTime() + 3000),
  );

  assert.equal(respuesta.segundosEnPantalla, 3);
  assert.equal(estadoDelExamen(db, intento, new Date(INICIO.getTime() + 3000)).respondidas, 1);
  cerrarBd(db);
});

test('saltar crea una respuesta NULL y se puede cambiar después', () => {
  const { db, intento } = preparar({ minimo: 0 });
  const pregunta = obtenerPregunta(db, intento, 1, INICIO);
  guardarRespuesta(db, intento, { n: 1, opcionId: null, segundos: 2 }, new Date(INICIO.getTime() + 2000));
  assert.equal(obtenerPregunta(db, intento, 1, new Date(INICIO.getTime() + 3000)).respondida, true);

  guardarRespuesta(
    db,
    intento,
    { n: 1, opcionId: pregunta.opciones[1].id, segundos: 4 },
    new Date(INICIO.getTime() + 4000),
  );
  const guardada = db.prepare('SELECT opcion_id FROM respuestas').get();
  assert.equal(guardada.opcion_id, pregunta.opciones[1].id);
  cerrarBd(db);
});

test('rechaza opciones de otra pregunta', () => {
  const { db, intento } = preparar({ minimo: 0 });
  obtenerPregunta(db, intento, 1, INICIO);
  const ajena = db.prepare(`
    SELECT o.id FROM opciones o JOIN preguntas p ON p.id = o.pregunta_id
    JOIN intento_preguntas ip ON ip.pregunta_id = p.id
    WHERE ip.intento_id = ? AND ip.orden = 2 LIMIT 1
  `).get(intento.id).id;
  assert.throws(
    () => guardarRespuesta(db, intento, { n: 1, opcionId: ajena, segundos: 0 }, INICIO),
    /no pertenece/,
  );
  cerrarBd(db);
});

test('la pausa bloquea respuestas y congela el reloj', () => {
  const { db, intento, sesion } = preparar({ minimo: 0 });
  obtenerPregunta(db, intento, 1, INICIO);
  pausarSesion(db, sesion.id, new Date(INICIO.getTime() + 5000));
  assert.throws(
    () => guardarRespuesta(db, intento, { n: 1, opcionId: null, segundos: 5 },
      new Date(INICIO.getTime() + 30000)),
    /en pausa/,
  );
  assert.equal(estadoDelExamen(db, intento, new Date(INICIO.getTime() + 30000)).segundosRestantes, 3595);
  cerrarBd(db);
});

test('al vencer entrega con motivo tiempo y rechaza respuestas posteriores', () => {
  const { db, intento } = preparar({ minimo: 0, duracion: 1 });
  obtenerPregunta(db, intento, 1, INICIO);
  const vencido = estadoDelExamen(db, intento, new Date(INICIO.getTime() + 61000));
  assert.equal(vencido.intento.motivo_entrega, 'tiempo');
  assert.equal(vencido.sesion.estado, 'cerrada');
  assert.throws(
    () => guardarRespuesta(db, intento, { n: 1, opcionId: null, segundos: 61 },
      new Date(INICIO.getTime() + 61000)),
    /ya fue entregada/,
  );
  cerrarBd(db);
});

test('recargar conserva la pregunta actual y la respuesta', () => {
  const { db, intento, sesion } = preparar({ minimo: 0 });
  const pregunta = obtenerPregunta(db, intento, 3, INICIO);
  guardarRespuesta(db, intento, { n: 3, opcionId: pregunta.opciones[2].id, segundos: 2 },
    new Date(INICIO.getTime() + 2000));

  const reanudado = iniciarOReanudarIntento(
    db,
    sesion,
    { codigo: '1001', curso: '10A' },
  ).intento;
  const estado = estadoDelExamen(db, reanudado, new Date(INICIO.getTime() + 3000));
  const misma = obtenerPregunta(db, reanudado, estado.preguntaActual, new Date(INICIO.getTime() + 3000));
  assert.equal(estado.preguntaActual, 3);
  assert.equal(misma.opcionId, pregunta.opciones[2].id);
  cerrarBd(db);
});

test('rechaza entrega manual cuando quedan preguntas sin responder', () => {
  const { db, intento } = preparar({ minimo: 0 });
  const pregunta1 = obtenerPregunta(db, intento, 1, INICIO);
  guardarRespuesta(db, intento, { n: 1, opcionId: pregunta1.opciones[0].id, segundos: 0 }, INICIO);

  assert.throws(
    () => entregarIntento(db, intento, 'manual', new Date(INICIO.getTime() + 1000)),
    (err) => err.estado === 409 && /3 pregunta\(s\) sin responder/.test(err.message),
  );
  assert.equal(db.prepare('SELECT entregado_en FROM intentos WHERE id = ?').get(intento.id).entregado_en, null);
  cerrarBd(db);
});

test('rechaza entrega desde la última pregunta cuando quedan pendientes', () => {
  const { db, intento } = preparar({ minimo: 0 });
  const pregunta = obtenerPregunta(db, intento, 4, INICIO);
  guardarRespuesta(db, intento, { n: 4, opcionId: pregunta.opciones[0].id, segundos: 0 }, INICIO);

  assert.throws(
    () => entregarIntento(db, intento, 'ultima_pregunta', new Date(INICIO.getTime() + 1000)),
    (err) => err.estado === 409 && /3 pregunta\(s\) sin responder/.test(err.message),
  );
  assert.equal(db.prepare('SELECT entregado_en FROM intentos WHERE id = ?').get(intento.id).entregado_en, null);
  cerrarBd(db);
});

test('entrega manual con todas respondidas cierra el intento y es idempotente', () => {
  const { db, intento } = preparar({ minimo: 0 });
  for (let n = 1; n <= 4; n += 1) {
    const pregunta = obtenerPregunta(db, intento, n, INICIO);
    guardarRespuesta(
      db,
      intento,
      { n, opcionId: pregunta.opciones[0].id, segundos: 0 },
      new Date(INICIO.getTime() + n * 1000),
    );
  }

  const primera = entregarIntento(db, intento, 'manual', new Date(INICIO.getTime() + 5000));
  const segunda = entregarIntento(db, intento, 'manual', new Date(INICIO.getTime() + 6000));
  assert.equal(primera.nueva, true);
  assert.equal(segunda.nueva, false);
  assert.equal(segunda.intento.entregado_en, primera.intento.entregado_en);
  assert.equal(segunda.intento.motivo_entrega, 'manual');
  cerrarBd(db);
});

test('entrega desde la última pregunta con todas respondidas cierra el intento', () => {
  const { db, intento } = preparar({ minimo: 0 });
  for (let n = 1; n <= 4; n += 1) {
    const pregunta = obtenerPregunta(db, intento, n, INICIO);
    guardarRespuesta(
      db,
      intento,
      { n, opcionId: pregunta.opciones[0].id, segundos: 0 },
      new Date(INICIO.getTime() + n * 1000),
    );
  }

  const entrega = entregarIntento(db, intento, 'ultima_pregunta', new Date(INICIO.getTime() + 5000));
  assert.equal(entrega.intento.motivo_entrega, 'ultima_pregunta');
  cerrarBd(db);
});

test('el cierre por vencimiento del reloj no pasa por la guarda de pendientes', () => {
  const { db, intento } = preparar({ minimo: 0, duracion: 1 });
  const pregunta1 = obtenerPregunta(db, intento, 1, INICIO);
  guardarRespuesta(db, intento, { n: 1, opcionId: pregunta1.opciones[0].id, segundos: 0 },
    new Date(INICIO.getTime() + 1000));

  const vencido = estadoDelExamen(db, intento, new Date(INICIO.getTime() + 61000));
  assert.equal(vencido.intento.motivo_entrega, 'tiempo');
  assert.equal(vencido.sesion.estado, 'cerrada');
  cerrarBd(db);
});

test('la entrega forzada por el docente cierra aunque haya preguntas sin responder', () => {
  const { db, intento } = preparar({ minimo: 0 });
  const pregunta1 = obtenerPregunta(db, intento, 1, INICIO);
  guardarRespuesta(db, intento, { n: 1, opcionId: pregunta1.opciones[0].id, segundos: 0 }, INICIO);

  const entrega = forzarEntrega(db, intento.id, new Date(INICIO.getTime() + 5000));
  assert.equal(entrega.intento.motivo_entrega, 'forzada_docente');
  cerrarBd(db);
});

test('pausar desde el lado del estudiante pone la sesión en pausada y deja el intento sin entregar', () => {
  const { db, intento } = preparar({ minimo: 0 });
  obtenerPregunta(db, intento, 1, INICIO);

  const sesion = pausarIntentoComoEstudiante(db, intento, INICIO);

  assert.equal(sesion.estado, 'pausada');
  assert.equal(db.prepare('SELECT entregado_en FROM intentos WHERE id = ?').get(intento.id).entregado_en, null);
  cerrarBd(db);
});

test('pausar desde el estudiante es idempotente si la sesión ya está pausada', () => {
  const { db, intento } = preparar({ minimo: 0 });
  obtenerPregunta(db, intento, 1, INICIO);

  pausarIntentoComoEstudiante(db, intento, INICIO);
  const segunda = pausarIntentoComoEstudiante(db, intento, new Date(INICIO.getTime() + 5000));

  assert.equal(segunda.estado, 'pausada');
  cerrarBd(db);
});
