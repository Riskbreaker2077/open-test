import test from 'node:test';
import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { abrirBd, cerrarBd } from '../db.js';
import { guardarBanco, obtenerBanco } from './bancos.js';
import { preguntaDeEjemplo } from '../fixtures-preguntas.js';
import { guardarEstudiantes } from './estudiantes.js';
import { iniciarOReanudarIntento } from './intentos.js';
import { abrirSesion, cerrarSesion, crearSesion } from './sesiones.js';
import { estadisticasDeBanco, sesionesCerradasDeBanco } from './estadisticas.js';

function crearBanco(db, preguntas) {
  const { bancoId } = guardarBanco(db, 'Banco de prueba', preguntas);
  return obtenerBanco(db, bancoId);
}

function crearEstudiantes(db, filas) {
  guardarEstudiantes(db, filas.map((fila) => (
    typeof fila === 'string' ? { codigo: fila, nombres: fila, apellidos: 'Apellido', curso: '10A' } : fila
  )));
}

function sesionRow(db, id) {
  return db.prepare('SELECT * FROM sesiones WHERE id = ?').get(id);
}

function crearSesionAbierta(db, bancoId, nPreguntas, cursos = ['10A']) {
  const sesion = crearSesion(db, { nombre: `Sesión ${Math.random()}`, banco_id: bancoId, cursos, n_preguntas: nPreguntas });
  abrirSesion(db, sesion.id);
  return sesion.id;
}

function entrar(db, sesionId, codigo, curso = '10A') {
  return iniciarOReanudarIntento(db, sesionRow(db, sesionId), { codigo, curso }).intento;
}

/** Responde (o salta) todas las preguntas de un intento ya materializado, en el orden dado. */
function responderTodas(db, intentoId, decisiones) {
  const filas = db.prepare('SELECT id, pregunta_id FROM intento_preguntas WHERE intento_id = ? ORDER BY orden').all(intentoId);
  filas.forEach((fila, indice) => {
    const decision = decisiones[indice];
    if (decision === 'saltar') return;
    const opcionId = decision === 'acertar'
      ? db.prepare('SELECT id FROM opciones WHERE pregunta_id = ? AND es_correcta = 1').get(fila.pregunta_id).id
      : db.prepare('SELECT id FROM opciones WHERE pregunta_id = ? AND es_correcta = 0 LIMIT 1').get(fila.pregunta_id).id;
    db.prepare(`
      INSERT INTO respuestas (intento_pregunta_id, opcion_id, segundos_en_pantalla, respondido_en)
      VALUES (?, ?, 12, '2026-08-28T10:00:00Z')
    `).run(fila.id, opcionId);
  });
}

test('% acierto + % saltada + % fallo suman 100 por pregunta', () => {
  const db = abrirBd(':memory:');
  const banco = crearBanco(db, [preguntaDeEjemplo(), preguntaDeEjemplo()]);
  crearEstudiantes(db, ['e1', 'e2', 'e3']);
  const sesionId = crearSesionAbierta(db, banco.id, 2);
  for (const [codigo, decisiones] of [['e1', ['acertar', 'acertar']], ['e2', ['fallar', 'saltar']], ['e3', ['acertar', 'fallar']]]) {
    const intento = entrar(db, sesionId, codigo);
    responderTodas(db, intento.id, decisiones);
  }
  cerrarSesion(db, sesionId);

  const { preguntas } = estadisticasDeBanco(db, banco.id, {});
  assert.equal(preguntas.length, 2);
  for (const pregunta of preguntas) {
    const porcentajeFallo = Number((100 - pregunta.porcentajeAcierto - pregunta.porcentajeSaltada).toFixed(1));
    assert.equal(pregunta.fallos, pregunta.vecesMostrada - pregunta.aciertos - pregunta.saltadas);
    assert.equal(Number((pregunta.porcentajeAcierto + pregunta.porcentajeSaltada + porcentajeFallo).toFixed(1)), 100);
  }
  cerrarBd(db);
});

test('"todas" acumula varias sesiones cerradas del mismo banco', () => {
  const db = abrirBd(':memory:');
  const banco = crearBanco(db, [preguntaDeEjemplo()]);
  crearEstudiantes(db, ['e1', 'e2']);

  const s1 = crearSesionAbierta(db, banco.id, 1);
  const i1 = entrar(db, s1, 'e1');
  responderTodas(db, i1.id, ['acertar']);
  cerrarSesion(db, s1);

  const s2 = crearSesionAbierta(db, banco.id, 1);
  const i2 = entrar(db, s2, 'e2');
  responderTodas(db, i2.id, ['fallar']);
  cerrarSesion(db, s2);

  const todas = estadisticasDeBanco(db, banco.id, {});
  assert.equal(todas.preguntas[0].vecesMostrada, 2);
  assert.equal(todas.preguntas[0].aciertos, 1);
  assert.equal(todas.preguntas[0].porcentajeAcierto, 50);

  const soloS1 = estadisticasDeBanco(db, banco.id, { sesionId: s1 });
  assert.equal(soloS1.preguntas[0].vecesMostrada, 1);
  assert.equal(soloS1.preguntas[0].porcentajeAcierto, 100);
  cerrarBd(db);
});

test('elegir la única sesión cerrada de un banco da lo mismo que "todas"', () => {
  const db = abrirBd(':memory:');
  const banco = crearBanco(db, [preguntaDeEjemplo()]);
  crearEstudiantes(db, ['e1']);
  const s1 = crearSesionAbierta(db, banco.id, 1);
  const intento = entrar(db, s1, 'e1');
  responderTodas(db, intento.id, ['acertar']);
  cerrarSesion(db, s1);

  assert.deepEqual(estadisticasDeBanco(db, banco.id, {}), estadisticasDeBanco(db, banco.id, { sesionId: s1 }));
  cerrarBd(db);
});

test('el curso filtra en ambos modos', () => {
  const db = abrirBd(':memory:');
  const banco = crearBanco(db, [preguntaDeEjemplo()]);
  crearEstudiantes(db, [
    { codigo: 'a1', nombres: 'A', apellidos: 'A', curso: '10A' },
    { codigo: 'b1', nombres: 'B', apellidos: 'B', curso: '10B' },
  ]);
  const sesionId = crearSesionAbierta(db, banco.id, 1, ['10A', '10B']);
  const iA = entrar(db, sesionId, 'a1', '10A');
  responderTodas(db, iA.id, ['acertar']);
  const iB = entrar(db, sesionId, 'b1', '10B');
  responderTodas(db, iB.id, ['fallar']);
  cerrarSesion(db, sesionId);

  const soloA = estadisticasDeBanco(db, banco.id, { curso: '10A' });
  assert.equal(soloA.preguntas[0].vecesMostrada, 1);
  assert.equal(soloA.preguntas[0].porcentajeAcierto, 100);
  const soloB = estadisticasDeBanco(db, banco.id, { sesionId, curso: '10B' });
  assert.equal(soloB.preguntas[0].porcentajeAcierto, 0);
  cerrarBd(db);
});

test('la competencia se pondera por veces mostrada, no por promedio simple de porcentajes', () => {
  const db = abrirBd(':memory:');
  const banco = crearBanco(db, [
    preguntaDeEjemplo({ competencia: 'Comp X' }),
    preguntaDeEjemplo({ competencia: 'Comp X' }),
  ]);
  const preguntaPocoMostrada = banco.preguntas[0];
  const preguntaMuyMostrada = banco.preguntas[1];
  const opcionCorrectaPoca = preguntaPocoMostrada.opciones.find((o) => o.es_correcta).id;
  const opcionIncorrectaMucha = preguntaMuyMostrada.opciones.find((o) => !o.es_correcta).id;

  const codigos = Array.from({ length: 10 }, (_, i) => `e${i}`);
  crearEstudiantes(db, codigos);
  const sesionId = crearSesionAbierta(db, banco.id, 1);

  // Se inserta a mano en vez de dejar que el sorteo decida, para controlar
  // exactamente cuántas veces se muestra cada pregunta: 1 estudiante ve solo
  // la poco mostrada (acierta), 9 ven solo la muy mostrada (fallan).
  // Promedio simple de % (100% y 0%) daría 50%; ponderado da 10%.
  const insertarIntento = db.prepare(`
    INSERT INTO intentos (sesion_id, codigo_estudiante, semilla, token, iniciado_en, entregado_en, motivo_entrega, aciertos, puntaje)
    VALUES (?, ?, 'semilla', ?, '2026-08-28T10:00:00Z', '2026-08-28T10:05:00Z', 'manual', 0, 0)
  `);
  const insertarIp = db.prepare('INSERT INTO intento_preguntas (intento_id, orden, pregunta_id, orden_opciones) VALUES (?, 1, ?, \'1,2,3,4\')');
  const insertarRespuesta = db.prepare(`
    INSERT INTO respuestas (intento_pregunta_id, opcion_id, segundos_en_pantalla, respondido_en)
    VALUES (?, ?, 10, '2026-08-28T10:01:00Z')
  `);

  codigos.forEach((codigo, indice) => {
    const intentoId = insertarIntento.run(sesionId, codigo, `tok-${codigo}`).lastInsertRowid;
    const preguntaId = indice === 0 ? preguntaPocoMostrada.id : preguntaMuyMostrada.id;
    const opcionElegida = indice === 0 ? opcionCorrectaPoca : opcionIncorrectaMucha;
    const ipId = insertarIp.run(intentoId, preguntaId).lastInsertRowid;
    insertarRespuesta.run(ipId, opcionElegida);
  });
  db.prepare("UPDATE sesiones SET estado = 'cerrada' WHERE id = ?").run(sesionId);

  const { competencias } = estadisticasDeBanco(db, banco.id, {});
  assert.equal(competencias.length, 1);
  assert.equal(competencias[0].vecesMostrada, 10);
  assert.equal(competencias[0].aciertos, 1);
  assert.equal(competencias[0].porcentajeAcierto, 10);
  cerrarBd(db);
});

test('una pregunta del banco que nunca salió sorteada no aparece', () => {
  const db = abrirBd(':memory:');
  const banco = crearBanco(db, [preguntaDeEjemplo(), preguntaDeEjemplo()]);
  crearEstudiantes(db, ['e1']);
  const sesionId = crearSesionAbierta(db, banco.id, 1);
  const intento = entrar(db, sesionId, 'e1');
  responderTodas(db, intento.id, ['acertar']);
  cerrarSesion(db, sesionId);

  const { preguntas } = estadisticasDeBanco(db, banco.id, {});
  assert.equal(preguntas.length, 1);
  cerrarBd(db);
});

test('un banco sin sesiones cerradas devuelve listas vacías sin error', () => {
  const db = abrirBd(':memory:');
  const banco = crearBanco(db, [preguntaDeEjemplo()]);
  assert.deepEqual(sesionesCerradasDeBanco(db, banco.id), []);
  assert.deepEqual(estadisticasDeBanco(db, banco.id, {}), { preguntas: [], competencias: [] });
  cerrarBd(db);
});

test('una sesión de otro banco en sesionId da un error claro', () => {
  const db = abrirBd(':memory:');
  const bancoA = crearBanco(db, [preguntaDeEjemplo()]);
  const bancoB = crearBanco(db, [preguntaDeEjemplo()]);
  crearEstudiantes(db, ['e1']);
  const sesionDeB = crearSesionAbierta(db, bancoB.id, 1);
  const intento = entrar(db, sesionDeB, 'e1');
  responderTodas(db, intento.id, ['acertar']);
  cerrarSesion(db, sesionDeB);

  assert.throws(
    () => estadisticasDeBanco(db, bancoA.id, { sesionId: sesionDeB }),
    /no es una evaluación cerrada de este banco/,
  );
  cerrarBd(db);
});

test('10 sesiones cerradas de 40 estudiantes × 20 preguntas (8000 filas) bajo 2 segundos', () => {
  const db = abrirBd(':memory:');
  const banco = crearBanco(db, Array.from({ length: 20 }, () => preguntaDeEjemplo()));
  const opcionesPorPregunta = new Map(banco.preguntas.map((p) => [p.id, p.opciones.map((o) => o.id)]));
  const codigos = Array.from({ length: 40 }, (_, i) => `est${i}`);
  crearEstudiantes(db, codigos);

  const insertarIntento = db.prepare(`
    INSERT INTO intentos (sesion_id, codigo_estudiante, semilla, token, iniciado_en, entregado_en, motivo_entrega, aciertos, puntaje)
    VALUES (?, ?, 'semilla', ?, '2026-08-28T10:00:00Z', '2026-08-28T10:05:00Z', 'manual', 0, 0)
  `);
  const insertarIp = db.prepare(`
    INSERT INTO intento_preguntas (intento_id, orden, pregunta_id, orden_opciones) VALUES (?, ?, ?, '1,2,3,4')
  `);
  const insertarRespuesta = db.prepare(`
    INSERT INTO respuestas (intento_pregunta_id, opcion_id, segundos_en_pantalla, respondido_en)
    VALUES (?, ?, 10, '2026-08-28T10:01:00Z')
  `);

  let tokenN = 0;
  for (let s = 0; s < 10; s += 1) {
    const sesionId = crearSesionAbierta(db, banco.id, 20);
    for (const codigo of codigos) {
      tokenN += 1;
      const intentoId = insertarIntento.run(sesionId, codigo, `tok-${tokenN}`).lastInsertRowid;
      banco.preguntas.forEach((pregunta, orden) => {
        const ipId = insertarIp.run(intentoId, orden + 1, pregunta.id).lastInsertRowid;
        const opcionId = opcionesPorPregunta.get(pregunta.id)[orden % 4];
        insertarRespuesta.run(ipId, opcionId);
      });
    }
    db.prepare("UPDATE sesiones SET estado = 'cerrada' WHERE id = ?").run(sesionId);
  }

  const total = db.prepare('SELECT count(*) AS n FROM intento_preguntas').get().n;
  assert.equal(total, 8000);

  const inicio = performance.now();
  const { preguntas } = estadisticasDeBanco(db, banco.id, {});
  const duracion = performance.now() - inicio;
  assert.equal(preguntas.length, 20);
  assert.ok(duracion < 2000, `tardó ${duracion.toFixed(1)} ms`);
  cerrarBd(db);
});
