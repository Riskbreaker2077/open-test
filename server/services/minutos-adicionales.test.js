import test from 'node:test';
import assert from 'node:assert/strict';
import { abrirBd, cerrarBd } from '../db.js';
import { guardarBanco } from './bancos.js';
import { preguntasDeEjemplo } from '../fixtures-preguntas.js';
import { guardarEstudiantes } from './estudiantes.js';
import { iniciarOReanudarIntento } from './intentos.js';
import { entregarIntento, guardarRespuesta, obtenerPregunta } from './examen.js';
import {
  abrirSesion,
  cerrarSesion,
  comenzarSesion,
  crearSesion,
  darMinutosAdicionales,
  obtenerSesion,
  pausarSesion,
  reanudarSesion,
  tiempoRestante,
} from './sesiones.js';

const T0 = new Date('2026-11-03T08:00:00.000Z');
const en = (segundos) => new Date(T0.getTime() + segundos * 1000);

function preparar() {
  const db = abrirBd(':memory:');
  guardarBanco(db, 'Ciencias', preguntasDeEjemplo(25));
  guardarEstudiantes(db, [
    { codigo: '2024001', nombres: 'Ana', apellidos: 'Gómez', curso: '10A' },
    { codigo: '2024002', nombres: 'Luis', apellidos: 'Pérez', curso: '10A' },
    { codigo: '2024003', nombres: 'Marta', apellidos: 'Ruiz', curso: '10A' },
    { codigo: '2024004', nombres: 'Pedro', apellidos: 'Silva', curso: '10A' },
    { codigo: '2024005', nombres: 'Sofía', apellidos: 'Vega', curso: '10A' },
  ]);
  return db;
}

function sesionEnCurso(db, datos = {}) {
  const sesion = crearSesion(db, {
    nombre: 'Parcial',
    banco_id: 1,
    cursos: ['10A'],
    ...datos,
  });
  abrirSesion(db, sesion.id);
  return comenzarSesion(db, sesion.id, T0);
}

const entrada = (codigo) => ({ codigo, curso: '10A' });

/** Abre y responde todas las preguntas desde `desde` (021 exige cero pendientes para entregar). */
function responderTodo(db, intento, desde, instante) {
  const total = obtenerSesion(db, intento.sesion_id).n_preguntas;
  for (let orden = desde; orden <= total; orden += 1) {
    obtenerPregunta(db, intento, orden, instante);
    guardarRespuesta(db, intento, { n: orden, opcionId: primeraOpcionDe(db, intento.id, orden), segundos: 0 }, instante);
  }
}

/** Entra al examen y entrega con el motivo dado, respondiendo lo que falte. */
function entregar(db, sesionId, codigo, motivo, instante, abrirOrden = null) {
  const { intento } = iniciarOReanudarIntento(db, obtenerSesion(db, sesionId), entrada(codigo));
  responderTodo(db, intento, abrirOrden ?? intento.pregunta_actual, instante);
  return entregarIntento(db, intento, motivo, instante).intento;
}

test('en curso, dar N minutos suma exactamente N×60 a lo que queda', () => {
  const db = preparar();
  const sesion = sesionEnCurso(db, { duracion_minutos: 60 });

  darMinutosAdicionales(db, sesion.id, 5, en(10 * 60));

  const actualizada = obtenerSesion(db, sesion.id);
  assert.equal(actualizada.estado, 'en_curso');
  assert.equal(actualizada.segundos_adicionales, 300);
  // Quedaban 50:00 a los 10 minutos; +5 deja 55:00.
  assert.equal(tiempoRestante(db, actualizada, en(10 * 60)), 55 * 60);
  cerrarBd(db);
});

test('en pausa, los minutos entran congelados y se conservan al reanudar', () => {
  const db = preparar();
  const sesion = sesionEnCurso(db, { duracion_minutos: 60 });
  pausarSesion(db, sesion.id, en(10 * 60));

  darMinutosAdicionales(db, sesion.id, 5, en(20 * 60));
  const pausada = obtenerSesion(db, sesion.id);
  assert.equal(tiempoRestante(db, pausada, en(30 * 60)), 50 * 60 + 300, 'en pausa el reloj no corre');

  const reanudada = reanudarSesion(db, sesion.id, en(20 * 60));
  assert.equal(tiempoRestante(db, reanudada, en(20 * 60)), 50 * 60 + 300);
  cerrarBd(db);
});

test('cerrada por tiempo: quedan exactamente N minutos desde el otorgamiento', () => {
  const db = preparar();
  const sesion = sesionEnCurso(db, { duracion_minutos: 1 });
  const { intento } = iniciarOReanudarIntento(db, sesion, entrada('2024001'));

  assert.equal(tiempoRestante(db, obtenerSesion(db, sesion.id), en(61)), 0);
  assert.equal(obtenerSesion(db, sesion.id).estado, 'cerrada');
  const cortado = db.prepare('SELECT * FROM intentos WHERE id = ?').get(intento.id);
  assert.equal(cortado.motivo_entrega, 'tiempo');

  const { sesion: reabierta, reabrio } = darMinutosAdicionales(db, sesion.id, 5, en(120));
  assert.equal(reabrio, true);
  assert.equal(reabierta.estado, 'en_curso');
  assert.equal(tiempoRestante(db, reabierta, en(120)), 300);
  cerrarBd(db);
});

test('cerrada por el docente con tiempo disponible: queda lo congelado al cierre más N', () => {
  const db = preparar();
  const sesion = sesionEnCurso(db, { duracion_minutos: 60 });
  const { intento } = iniciarOReanudarIntento(db, sesion, entrada('2024001'));

  cerrarSesion(db, sesion.id, { ahora: en(10 * 60) });
  const cerrada = obtenerSesion(db, sesion.id);
  assert.equal(cerrada.estado, 'cerrada');
  const entregado = db.prepare('SELECT * FROM intentos WHERE id = ?').get(intento.id);
  assert.equal(entregado.motivo_entrega, 'cierre_docente', 'el cierre de sala usa su propio motivo');

  // Reabrir 10 minutos después de cerrada: el tramo de cerrada no corre contra
  // el reloj, así que quedan los 50:00 congelados al cerrar más 5 = 55:00.
  const { sesion: reabierta } = darMinutosAdicionales(db, sesion.id, 5, en(20 * 60));
  assert.equal(reabierta.estado, 'en_curso');
  assert.equal(reabierta.cerrada_en, null);
  assert.equal(tiempoRestante(db, reabierta, en(20 * 60)), 55 * 60);
  cerrarBd(db);
});

test('al reabrir solo vuelven los entregados por el cierre; los voluntarios conservan su nota', () => {
  const db = preparar();
  const sesion = sesionEnCurso(db, { duracion_minutos: 1, segundos_minimos_pregunta: 0 });

  entregar(db, sesion.id, '2024001', 'manual', en(20));
  entregar(db, sesion.id, '2024002', 'ultima_pregunta', en(25));

  // Marta presentaba y el docente la entregó a propósito desde monitoreo.
  const { intento: marta } = iniciarOReanudarIntento(db, sesion, entrada('2024003'));
  obtenerPregunta(db, marta, 1, en(31));
  guardarRespuesta(db, marta, { n: 1, opcionId: primeraOpcionDe(db, marta.id, 1), segundos: 0 }, en(31));
  db.prepare(`
    UPDATE intentos SET entregado_en = ?, motivo_entrega = 'forzada_docente', aciertos = 1, puntaje = 1
    WHERE id = ?
  `).run(en(40).toISOString(), marta.id);

  // Pedro seguía presentando cuando el reloj venció.
  const { intento: pedro } = iniciarOReanudarIntento(db, sesion, entrada('2024004'));
  obtenerPregunta(db, pedro, 1, en(45));
  guardarRespuesta(db, pedro, { n: 1, opcionId: primeraOpcionDe(db, pedro.id, 1), segundos: 0 }, en(45));

  // Sofía también fue cortada por el cierre, pero el docente la anuló después
  // (038): la anulación es deliberada y sobrevive a la reapertura.
  iniciarOReanudarIntento(db, sesion, entrada('2024005'));
  assert.equal(tiempoRestante(db, obtenerSesion(db, sesion.id), en(61)), 0); // cierra por tiempo
  db.prepare(`
    UPDATE intentos SET anulado_en = ?, aciertos = 0, puntaje = 0
    WHERE codigo_estudiante = '2024005'
  `).run(en(65).toISOString());

  darMinutosAdicionales(db, sesion.id, 5, en(70));

  const porCodigo = new Map(
    db.prepare('SELECT * FROM intentos ORDER BY codigo_estudiante').all()
      .map((fila) => [fila.codigo_estudiante, fila]),
  );

  // Los voluntarios y la forzada conservan entrega y nota intactas.
  for (const codigo of ['2024001', '2024002', '2024003']) {
    const fila = porCodigo.get(codigo);
    assert.notEqual(fila.entregado_en, null, `${codigo} conserva su entrega`);
    assert.notEqual(fila.motivo_entrega, 'tiempo');
    assert.notEqual(fila.puntaje, null);
  }
  assert.equal(porCodigo.get('2024003').motivo_entrega, 'forzada_docente');
  assert.equal(porCodigo.get('2024003').puntaje, 1);

  // La anulada no resucita: revivirla desharía una decisión del docente.
  const anulada = porCodigo.get('2024005');
  assert.notEqual(anulada.anulado_en, null);
  assert.notEqual(anulada.entregado_en, null);

  // Pedro, entregado por el cierre, vuelve al examen con su intento revocado.
  const revivido = porCodigo.get('2024004');
  assert.equal(revivido.entregado_en, null);
  assert.equal(revivido.motivo_entrega, null);
  assert.equal(revivido.aciertos, null);
  assert.equal(revivido.puntaje, null);

  const auditoria = db
    .prepare('SELECT minutos, reabrio FROM minutos_otorgados WHERE sesion_id = ?')
    .all(sesion.id);
  assert.deepEqual(auditoria, [{ minutos: 5, reabrio: 1 }]);
  cerrarBd(db);
});

test('el estudiante revocado continúa su misma prueba y la sala vuelve a cerrar al vencer', () => {
  const db = preparar();
  const sesion = sesionEnCurso(db, { duracion_minutos: 1, segundos_minimos_pregunta: 0 });
  const { intento: primero } = iniciarOReanudarIntento(db, sesion, entrada('2024001'));
  obtenerPregunta(db, primero, 1, en(6));
  guardarRespuesta(db, primero, { n: 1, opcionId: primeraOpcionDe(db, primero.id, 1), segundos: 0 }, en(6));

  assert.equal(tiempoRestante(db, obtenerSesion(db, sesion.id), en(61)), 0);
  darMinutosAdicionales(db, sesion.id, 5, en(70));

  const { intento: reanudado } = iniciarOReanudarIntento(
    db,
    obtenerSesion(db, sesion.id),
    entrada('2024001'),
  );
  assert.equal(reanudado.id, primero.id, 'es el mismo intento, no uno nuevo');
  assert.equal(reanudado.entregado_en, null);
  assert.equal(reanudado.pregunta_actual, primero.pregunta_actual);

  obtenerPregunta(db, reanudado, 2, en(76));
  guardarRespuesta(db, reanudado, { n: 2, opcionId: primeraOpcionDe(db, reanudado.id, 2), segundos: 0 }, en(76));
  responderTodo(db, reanudado, 3, en(76));
  const { intento: final } = entregarIntento(db, reanudado, 'manual', en(80));
  assert.equal(final.entregado_en, en(80).toISOString());
  assert.notEqual(final.puntaje, null);

  // El nuevo plazo también vence y cierra por tiempo.
  assert.equal(tiempoRestante(db, obtenerSesion(db, sesion.id), en(70 + 5 * 60 + 1)), 0);
  assert.equal(obtenerSesion(db, sesion.id).estado, 'cerrada');
  cerrarBd(db);
});

test('una sesión cerrada desde pausa conserva su reloj congelado', () => {
  const db = preparar();
  const sesion = sesionEnCurso(db, { duracion_minutos: 60 });
  pausarSesion(db, sesion.id, en(10 * 60));

  cerrarSesion(db, sesion.id, { ahora: en(30 * 60) });
  const cerrada = obtenerSesion(db, sesion.id);
  assert.equal(cerrada.segundos_pausados, 20 * 60, 'la pausa se pliega al cerrar');

  // Pausada en 50:00 (10 min corridos de 60), cerrada 20 min y reabierta
  // 10 minutos después con +5: los 50:00 congelados siguen intactos y quedan
  // 50:00 + 5:00 = 55:00.
  const { sesion: reabierta } = darMinutosAdicionales(db, sesion.id, 5, en(40 * 60));
  assert.equal(tiempoRestante(db, reabierta, en(40 * 60)), 55 * 60);
  cerrarBd(db);
});

test('cada otorgamiento queda auditado y acumulado', () => {
  const db = preparar();
  const sesion = sesionEnCurso(db, { duracion_minutos: 60 });

  darMinutosAdicionales(db, sesion.id, 5, en(60));
  darMinutosAdicionales(db, sesion.id, 3, en(120));

  const auditoria = db
    .prepare('SELECT minutos, reabrio FROM minutos_otorgados WHERE sesion_id = ? ORDER BY id')
    .all(sesion.id);
  assert.deepEqual(auditoria, [
    { minutos: 5, reabrio: 0 },
    { minutos: 3, reabrio: 0 },
  ]);
  assert.equal(obtenerSesion(db, sesion.id).segundos_adicionales, 8 * 60);
  cerrarBd(db);
});

test('rechaza estados y cantidades sin sentido', () => {
  const db = preparar();

  const borrador = crearSesion(db, { nombre: 'Parcial', banco_id: 1, cursos: ['10A'] });
  assert.throws(() => darMinutosAdicionales(db, borrador.id, 5), /comenzada/, 'un borrador no recibe minutos');

  abrirSesion(db, borrador.id);
  assert.throws(
    () => darMinutosAdicionales(db, borrador.id, 5),
    /comenzada/,
    'una abierta sin comenzar tampoco',
  );
  assert.throws(() => darMinutosAdicionales(db, 999, 5), /existe/, 'sesión inexistente es 404');

  const sesion = sesionEnCurso(db);
  for (const cantidad of [0, -3, 2.5, 'x', 2000, null]) {
    assert.throws(
      () => darMinutosAdicionales(db, sesion.id, cantidad),
      /entero/,
      `"${cantidad}" no es una cantidad válida`,
    );
  }
  assert.equal(obtenerSesion(db, sesion.id).segundos_adicionales, 0);
  cerrarBd(db);
});

/** La primera opción materializada de la pregunta `orden` de ese intento. */
function primeraOpcionDe(db, intentoId, orden) {
  const fila = db
    .prepare('SELECT orden_opciones FROM intento_preguntas WHERE intento_id = ? AND orden = ?')
    .get(intentoId, orden);
  return Number(fila.orden_opciones.split(',')[0]);
}
