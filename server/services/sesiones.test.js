import test from 'node:test';
import assert from 'node:assert/strict';
import { abrirBd, cerrarBd } from '../db.js';
import { guardarBanco } from './bancos.js';
import { preguntasDeEjemplo } from '../fixtures-preguntas.js';
import { guardarEstudiantes } from './estudiantes.js';
import {
  abrirSesion,
  actualizarNivelFeedback,
  actualizarSesion,
  borrarSesion,
  cerrarSesion,
  comenzarSesion,
  convoca,
  crearSesion,
  cursosDe,
  DIAS_PAPELERA,
  eliminarDePapelera,
  listarPapelera,
  listarSesiones,
  obtenerSesion,
  pausarSesion,
  POR_DEFECTO,
  puedeEntrar,
  reanudarSesion,
  restaurarSesion,
  sesionesDisponiblesPara,
  tiempoRestante,
  vaciarPapeleraVencida,
} from './sesiones.js';
import { borrarBanco } from './bancos.js';

function preparar(nPreguntas = 25) {
  const db = abrirBd(':memory:');
  guardarBanco(db, 'Ciencias', preguntasDeEjemplo(nPreguntas));
  guardarEstudiantes(db, [
    { codigo: '2024001', nombres: 'Ana', apellidos: 'Gómez', curso: '10A' },
    { codigo: '2024002', nombres: 'Luis', apellidos: 'Pérez', curso: '10B' },
  ]);
  return db;
}

const base = { nombre: 'Parcial', banco_id: 1, cursos: ['10A'] };

test('la sesión nace en borrador con los valores por defecto', () => {
  const db = preparar();
  const sesion = crearSesion(db, base);

  assert.equal(sesion.estado, 'borrador');
  assert.equal(sesion.n_preguntas, POR_DEFECTO.n_preguntas);
  assert.equal(sesion.duracion_minutos, POR_DEFECTO.duracion_minutos);
  assert.equal(sesion.segundos_minimos_pregunta, POR_DEFECTO.segundos_minimos_pregunta);
  assert.equal(sesion.nivel_feedback, POR_DEFECTO.nivel_feedback);
  assert.equal(sesion.comenzada_en, null);
  cerrarBd(db);
});

test('los cursos se guardan como texto y se leen como lista', () => {
  const db = preparar();
  const sesion = crearSesion(db, { ...base, cursos: [' 10A ', '10B', ''] });

  assert.equal(sesion.cursos, '10A,10B');
  assert.deepEqual(cursosDe(sesion), ['10A', '10B']);
  assert.equal(convoca(sesion, '10A'), true);
  assert.equal(convoca(sesion, '10C'), false);
  cerrarBd(db);
});

test('rechaza una sesión sin nombre, sin cursos o con parámetros absurdos', () => {
  const db = preparar();

  assert.throws(() => crearSesion(db, { ...base, nombre: '  ' }), /necesita un nombre/);
  assert.throws(() => crearSesion(db, { ...base, cursos: [] }), /al menos un curso/);
  assert.throws(() => crearSesion(db, { ...base, n_preguntas: 0 }), /entero de 1 o más/);
  assert.throws(() => crearSesion(db, { ...base, duracion_minutos: -5 }), /entero de 1 o más/);
  assert.throws(() => crearSesion(db, { ...base, nivel_feedback: 'todo' }), /no existe/);
  assert.throws(() => crearSesion(db, { ...base, banco_id: 999 }), /banco de preguntas no existe/);
  cerrarBd(db);
});

test('permite cero segundos mínimos: desactiva el bloqueo por rapidez', () => {
  const db = preparar();
  assert.equal(crearSesion(db, { ...base, segundos_minimos_pregunta: 0 }).segundos_minimos_pregunta, 0);
  cerrarBd(db);
});

test('no se abre si el banco tiene menos preguntas de las que sortea', () => {
  const db = preparar(10);
  const sesion = crearSesion(db, { ...base, n_preguntas: 20 });

  assert.throws(() => abrirSesion(db, sesion.id), /banco tiene 10 pregunta/);
  assert.equal(listarSesiones(db)[0].estado, 'borrador');
  cerrarBd(db);
});

test('se abre si el banco tiene justo las preguntas necesarias', () => {
  const db = preparar(20);
  const sesion = crearSesion(db, { ...base, n_preguntas: 20 });

  assert.equal(abrirSesion(db, sesion.id).estado, 'abierta');
  cerrarBd(db);
});

test('pueden coexistir varias sesiones abiertas', () => {
  const db = preparar();
  const ciencias = crearSesion(db, { ...base, nombre: 'Ciencias', cursos: ['10A'] });
  const mates = crearSesion(db, { ...base, nombre: 'Matemáticas', cursos: ['10B'] });

  abrirSesion(db, ciencias.id);
  assert.doesNotThrow(() => abrirSesion(db, mates.id));
  assert.equal(listarSesiones(db).filter((s) => s.estado === 'abierta').length, 2);
  cerrarBd(db);
});

test('una sesión abierta no se puede volver a abrir', () => {
  const db = preparar();
  const sesion = crearSesion(db, base);
  abrirSesion(db, sesion.id);

  assert.throws(() => abrirSesion(db, sesion.id), /ya no está en borrador/);
  cerrarBd(db);
});

test('los parámetros se congelan al abrir', () => {
  const db = preparar();
  const sesion = crearSesion(db, base);

  // En borrador sí se puede cambiar todo.
  const editada = actualizarSesion(db, sesion.id, { ...base, duracion_minutos: 45 });
  assert.equal(editada.duracion_minutos, 45);

  abrirSesion(db, sesion.id);
  assert.throws(
    () => actualizarSesion(db, sesion.id, { ...base, duracion_minutos: 90 }),
    /no se pueden cambiar/,
  );
  assert.equal(listarSesiones(db)[0].duracion_minutos, 45, 'debe seguir en 45');
  cerrarBd(db);
});

test('cerrar es idempotente y no se puede cerrar un borrador', () => {
  const db = preparar();
  const sesion = crearSesion(db, base);

  assert.throws(() => cerrarSesion(db, sesion.id), /todavía no se ha abierto/);

  abrirSesion(db, sesion.id);
  assert.equal(cerrarSesion(db, sesion.id).estado, 'cerrada');
  assert.equal(cerrarSesion(db, sesion.id).estado, 'cerrada', 'volver a cerrar no falla');
  cerrarBd(db);
});

test('en una sesión cerrada solo se puede cambiar el nivel de feedback', () => {
  const db = preparar();
  const sesion = crearSesion(db, base);
  abrirSesion(db, sesion.id);
  cerrarSesion(db, sesion.id);

  assert.equal(actualizarNivelFeedback(db, sesion.id, 'completo').nivel_feedback, 'completo');
  assert.throws(() => actualizarNivelFeedback(db, sesion.id, 'todo'), /no existe/);
  assert.throws(
    () => actualizarSesion(db, sesion.id, { ...base, duracion_minutos: 90 }),
    /no se pueden cambiar/,
  );
  cerrarBd(db);
});

test('comenzar, pausar y reanudar respetan la máquina de estados', () => {
  const db = preparar();
  const sesion = crearSesion(db, { ...base, duracion_minutos: 10 });
  abrirSesion(db, sesion.id);

  const inicio = comenzarSesion(db, sesion.id, new Date('2026-08-26T10:00:00.000Z'));
  assert.equal(inicio.estado, 'en_curso');
  assert.equal(inicio.comenzada_en, '2026-08-26T10:00:00.000Z');
  assert.throws(() => comenzarSesion(db, sesion.id), /Solo se puede comenzar/);

  const pausada = pausarSesion(db, sesion.id, new Date('2026-08-26T10:02:00.000Z'));
  assert.equal(pausada.estado, 'pausada');
  assert.equal(tiempoRestante(db, pausada, new Date('2026-08-26T10:09:00.000Z')), 480);
  assert.throws(() => pausarSesion(db, sesion.id), /Solo se puede pausar/);

  const reanudada = reanudarSesion(db, sesion.id, new Date('2026-08-26T10:05:00.000Z'));
  assert.equal(reanudada.estado, 'en_curso');
  assert.equal(reanudada.segundos_pausados, 180);
  assert.equal(reanudada.pausada_en, null);
  assert.equal(tiempoRestante(db, reanudada, new Date('2026-08-26T10:06:00.000Z')), 420);
  assert.throws(() => reanudarSesion(db, sesion.id), /Solo se puede reanudar/);
  cerrarBd(db);
});

test('pausar una evaluación sin tiempo restante la cierra en vez de dejarla en pausa', () => {
  const db = preparar();
  const sesion = crearSesion(db, { ...base, duracion_minutos: 1 });
  abrirSesion(db, sesion.id);
  db.prepare(`
    INSERT INTO intentos (sesion_id, codigo_estudiante, semilla, token, iniciado_en)
    VALUES (?, '2024001', 's', 't', '2026-08-26T10:00:00.000Z')
  `).run(sesion.id);
  comenzarSesion(db, sesion.id, new Date('2026-08-26T10:00:00.000Z'));

  const resultado = pausarSesion(db, sesion.id, new Date('2026-08-26T10:01:30.000Z'));
  assert.equal(resultado.estado, 'cerrada');
  const intento = db.prepare('SELECT * FROM intentos WHERE sesion_id = ?').get(sesion.id);
  assert.equal(intento.motivo_entrega, 'tiempo');
  cerrarBd(db);
});

test('el reloj sin comenzar muestra la duración completa', () => {
  const db = preparar();
  const sesion = crearSesion(db, { ...base, duracion_minutos: 45 });
  abrirSesion(db, sesion.id);
  assert.equal(tiempoRestante(db, sesion, new Date('2030-01-01')), 2700);
  cerrarBd(db);
});

test('al vencer el reloj cierra la sesión y entrega los intentos pendientes', () => {
  const db = preparar();
  const sesion = crearSesion(db, { ...base, duracion_minutos: 1 });
  abrirSesion(db, sesion.id);
  db.prepare(`
    INSERT INTO intentos (sesion_id, codigo_estudiante, semilla, token, iniciado_en)
    VALUES (?, '2024001', 's', 't', '2026-08-26T10:00:00.000Z')
  `).run(sesion.id);
  const enCurso = comenzarSesion(db, sesion.id, new Date('2026-08-26T10:00:00.000Z'));

  assert.equal(tiempoRestante(db, enCurso, new Date('2026-08-26T10:01:01.000Z')), 0);
  assert.equal(obtenerSesion(db, sesion.id).estado, 'cerrada');
  const intento = db.prepare('SELECT * FROM intentos WHERE sesion_id = ?').get(sesion.id);
  assert.equal(intento.motivo_entrega, 'tiempo');
  assert.equal(intento.entregado_en, '2026-08-26T10:01:01.000Z');
  assert.equal(intento.aciertos, 0);
  assert.equal(intento.puntaje, 0);
  cerrarBd(db);
});

test('cerrar entrega a todos los intentos pendientes y conserva los ya entregados', () => {
  const db = preparar();
  const sesion = crearSesion(db, base);
  abrirSesion(db, sesion.id);
  db.prepare(`
    INSERT INTO intentos (sesion_id, codigo_estudiante, semilla, token, iniciado_en, entregado_en, motivo_entrega)
    VALUES (?, '2024001', 'a', 'a', '2026-01-01', '2026-01-02', 'manual'),
           (?, '2024002', 'b', 'b', '2026-01-01', NULL, NULL)
  `).run(sesion.id, sesion.id);

  cerrarSesion(db, sesion.id, { ahora: new Date('2026-08-26T12:00:00.000Z') });
  const intentos = db.prepare('SELECT * FROM intentos ORDER BY codigo_estudiante').all();
  assert.equal(intentos[0].motivo_entrega, 'manual');
  assert.equal(intentos[0].entregado_en, '2026-01-02');
  assert.equal(intentos[1].motivo_entrega, 'forzada_docente');
  assert.equal(intentos[1].entregado_en, '2026-08-26T12:00:00.000Z');
  assert.equal(intentos[1].aciertos, 0);
  assert.equal(intentos[1].puntaje, 0);
  cerrarBd(db);
});

test('el estudiante solo ve lo abierto y convocado para su curso', () => {
  const db = preparar();
  const ana = { codigo: '2024001', curso: '10A' };

  const suya = crearSesion(db, { ...base, nombre: 'Para 10A', cursos: ['10A'] });
  const ajena = crearSesion(db, { ...base, nombre: 'Para 10B', cursos: ['10B'] });
  const borrador = crearSesion(db, { ...base, nombre: 'Sin abrir', cursos: ['10A'] });
  abrirSesion(db, suya.id);
  abrirSesion(db, ajena.id);

  const disponibles = sesionesDisponiblesPara(db, ana);
  assert.deepEqual(disponibles.map((s) => s.nombre), ['Para 10A']);
  assert.ok(!('cursos' in disponibles[0]), 'no hace falta enseñarle la lista de cursos');
  assert.ok(borrador.id, 'el borrador existe pero no se lista');
  cerrarBd(db);
});

test('lo que el estudiante ya entregó no vuelve a aparecer, abierto o cerrado (045)', () => {
  const db = preparar();
  const sesion = crearSesion(db, base);
  abrirSesion(db, sesion.id);
  db.prepare(`
    INSERT INTO intentos
      (sesion_id, codigo_estudiante, semilla, token, iniciado_en, entregado_en, motivo_entrega, aciertos, puntaje)
    VALUES (?, '2024001', 's', 't', '2026-01-01', '2026-01-02', 'manual', 0, 0)
  `).run(sesion.id);

  assert.deepEqual(sesionesDisponiblesPara(db, { codigo: '2024001', curso: '10A' }), []);
  assert.deepEqual(
    sesionesDisponiblesPara(db, { codigo: '2024003', curso: '10A' }).map((s) => s.id),
    [sesion.id],
    'un compañero que no ha entregado sí la ve',
  );

  cerrarSesion(db, sesion.id);
  assert.deepEqual(sesionesDisponiblesPara(db, { codigo: '2024001', curso: '10A' }), []);
  assert.deepEqual(sesionesDisponiblesPara(db, { codigo: '2024003', curso: '10A' }), []);
  cerrarBd(db);
});

test('puedeEntrar explica por qué no en cada caso', () => {
  const db = preparar();
  const sesion = crearSesion(db, base);
  const ana = { codigo: '2024001', curso: '10A' };
  const luis = { codigo: '2024002', curso: '10B' };

  assert.match(puedeEntrar(sesion, ana), /todavía no está abierta/);

  abrirSesion(db, sesion.id);
  const abierta = listarSesiones(db)[0];
  assert.equal(puedeEntrar(abierta, ana), null, 'Ana sí puede');
  assert.match(puedeEntrar(abierta, luis), /no es para tu curso \(10B\)/);

  cerrarSesion(db, sesion.id);
  assert.match(puedeEntrar(listarSesiones(db)[0], ana), /ya se cerró/);
  cerrarBd(db);
});

/** Una sesión cerrada con un intento que tiene una pregunta respondida. */
function cerradaConIntento(db) {
  const sesion = crearSesion(db, base);
  abrirSesion(db, sesion.id);
  const intento = db.prepare(
    "INSERT INTO intentos (sesion_id, codigo_estudiante, semilla, token, iniciado_en) VALUES (?, '2024001', 's', 't', '2026-01-01')",
  ).run(sesion.id).lastInsertRowid;
  const ip = db.prepare(
    "INSERT INTO intento_preguntas (intento_id, orden, pregunta_id, orden_opciones) VALUES (?, 1, 1, '1,2,3,4')",
  ).run(intento).lastInsertRowid;
  db.prepare(
    "INSERT INTO respuestas (intento_pregunta_id, opcion_id, segundos_en_pantalla, respondido_en) VALUES (?, 1, 0, '2026-01-01')",
  ).run(ip);
  cerrarSesion(db, sesion.id);
  return { sesion, intento, ip };
}

const cuenta = (db, sql, ...args) => db.prepare(`SELECT count(*) AS t FROM ${sql}`).get(...args).t;

test('borrar una sesión con intentos la manda a la papelera sin perder nada (046)', () => {
  const db = preparar();
  const { sesion, intento, ip } = cerradaConIntento(db);

  const borrada = borrarSesion(db, sesion.id, new Date('2026-09-01T10:00:00Z'));
  assert.equal(borrada.enPapelera, true);
  assert.equal(cuenta(db, 'sesiones WHERE id = ?', sesion.id), 1);
  assert.equal(cuenta(db, 'intentos WHERE id = ?', intento), 1);
  assert.equal(cuenta(db, 'respuestas WHERE intento_pregunta_id = ?', ip), 1);

  assert.deepEqual(listarSesiones(db), [], 'desaparece de las evaluaciones');
  assert.throws(() => obtenerSesion(db, sesion.id), /no existe/);
  const [enPapelera] = listarPapelera(db);
  assert.equal(enPapelera.id, sesion.id);
  assert.equal(enPapelera.intentos, 1);
  assert.equal(enPapelera.se_elimina_en, '2026-10-01T10:00:00.000Z');

  restaurarSesion(db, sesion.id);
  assert.equal(listarSesiones(db).length, 1, 'vuelve tal como estaba');
  assert.equal(obtenerSesion(db, sesion.id).estado, 'cerrada');
  assert.deepEqual(listarPapelera(db), []);
  cerrarBd(db);
});

test('sin intentos se borra en el acto; con intentos y abierta no se deja borrar (046)', () => {
  const db = preparar();
  const borrador = crearSesion(db, base);
  assert.equal(borrarSesion(db, borrador.id).enPapelera, false);
  assert.equal(cuenta(db, 'sesiones WHERE id = ?', borrador.id), 0);

  const abierta = crearSesion(db, base);
  abrirSesion(db, abierta.id);
  db.prepare(
    "INSERT INTO intentos (sesion_id, codigo_estudiante, semilla, token, iniciado_en) VALUES (?, '2024001', 's', 't', '2026-01-01')",
  ).run(abierta.id);
  assert.throws(() => borrarSesion(db, abierta.id), (err) => err.estado === 409 && /Cierra la evaluación/.test(err.message));
  cerrarBd(db);
});

test('eliminar desde la papelera borra en cascada intentos, preguntas y respuestas (046)', () => {
  const db = preparar();
  const { sesion, intento, ip } = cerradaConIntento(db);
  assert.throws(() => eliminarDePapelera(db, sesion.id), /no está en la papelera/, 'solo lo que ya está en la papelera');
  borrarSesion(db, sesion.id);

  eliminarDePapelera(db, sesion.id);

  assert.equal(cuenta(db, 'sesiones WHERE id = ?', sesion.id), 0);
  assert.equal(cuenta(db, 'intentos WHERE sesion_id = ?', sesion.id), 0);
  assert.equal(cuenta(db, 'intento_preguntas WHERE intento_id = ?', intento), 0);
  assert.equal(cuenta(db, 'respuestas WHERE intento_pregunta_id = ?', ip), 0);
  cerrarBd(db);
});

test('la papelera se vacía sola a los 30 días, no antes (046)', () => {
  const db = preparar();
  const { sesion } = cerradaConIntento(db);
  const borrada = new Date('2026-09-01T10:00:00Z');
  borrarSesion(db, sesion.id, borrada);
  const dia = 24 * 60 * 60 * 1000;

  assert.equal(DIAS_PAPELERA, 30);
  assert.equal(vaciarPapeleraVencida(db, new Date(borrada.getTime() + 30 * dia - 1000)), 0);
  assert.equal(listarPapelera(db).length, 1);
  assert.equal(vaciarPapeleraVencida(db, new Date(borrada.getTime() + 30 * dia)), 1);
  assert.equal(cuenta(db, 'sesiones'), 0);
  assert.equal(cuenta(db, 'intentos'), 0);
  cerrarBd(db);
});

test('un banco usado por una evaluación en la papelera sigue sin poder borrarse (046)', () => {
  const db = preparar();
  const { sesion } = cerradaConIntento(db);
  borrarSesion(db, sesion.id);
  assert.throws(() => borrarBanco(db, 1), /1 evaluación\(es\) \(1 en la papelera\)/);
  cerrarBd(db);
});

test('una sesión cerrada con cero intentos se borra', () => {
  const db = preparar();
  const sesion = crearSesion(db, base);
  abrirSesion(db, sesion.id);
  cerrarSesion(db, sesion.id);
  assert.doesNotThrow(() => borrarSesion(db, sesion.id));
  cerrarBd(db);
});
