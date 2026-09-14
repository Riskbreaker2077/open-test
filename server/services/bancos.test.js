import test from 'node:test';
import assert from 'node:assert/strict';
import { abrirBd, cerrarBd } from '../db.js';
import {
  actualizarPreguntaManual,
  agregarPreguntaManual,
  borrarBanco,
  crearBancoVacio,
  eliminarPregunta,
  guardarBanco,
  gruposDeBanco,
  listarBancos,
  obtenerBanco,
  preguntasDeBanco,
  validarPreguntaManual,
} from './bancos.js';
import { crearSesion } from './sesiones.js';
import {
  grupoBancoOpciones,
  grupoContextoCompartido,
  grupoTextoConBlancos,
  preguntaDeEjemplo,
  preguntaMiembroBancoOpciones,
  preguntaMiembroContextoCompartido,
  preguntaMiembroTextoConBlancos,
  preguntasDeEjemplo,
} from '../fixtures-preguntas.js';

function conBd(fn) {
  const db = abrirBd(':memory:');
  try {
    fn(db);
  } finally {
    cerrarBd(db);
  }
}

test('guarda el banco con sus preguntas y sus cuatro opciones', () => {
  conBd((db) => {
    const { bancoId, preguntas } = guardarBanco(db, 'Ciencias', [
      preguntaDeEjemplo({ id: 'p1' }),
      preguntaDeEjemplo({ id: 'p2' }),
    ]);

    assert.equal(preguntas, 2);
    const guardadas = preguntasDeBanco(db, bancoId);
    assert.equal(guardadas.length, 2);
    assert.equal(guardadas[0].opciones.length, 4);
  });
});

test('marca como correcta exactamente la opción indicada', () => {
  conBd((db) => {
    const { bancoId } = guardarBanco(db, 'Ciencias', [preguntaDeEjemplo()]);
    const [pregunta] = preguntasDeBanco(db, bancoId);

    const correctas = pregunta.opciones.filter((o) => o.es_correcta === 1);
    assert.equal(correctas.length, 1, 'exactamente una correcta');
    assert.deepEqual(correctas[0].contenido, [{ tipo: 'texto', texto: 'Opción C' }]);
  });
});

test('conserva el orden y el contenido de las opciones tal como venían', () => {
  conBd((db) => {
    const original = preguntaDeEjemplo();
    const { bancoId } = guardarBanco(db, 'Ciencias', [original]);
    const [pregunta] = preguntasDeBanco(db, bancoId);

    assert.deepEqual(pregunta.opciones.map((o) => o.contenido), original.opciones.map((o) => o.contenido));
    assert.deepEqual(pregunta.opciones.map((o) => o.justificacion), original.opciones.map((o) => o.justificacion));
  });
});

test('guarda la metadata pedagógica y el contexto/enunciado como bloques', () => {
  conBd((db) => {
    const original = preguntaDeEjemplo({
      contexto: [{ tipo: 'texto', texto: 'Un contexto.' }],
    });
    const { bancoId } = guardarBanco(db, 'Ciencias', [original]);
    const [pregunta] = preguntasDeBanco(db, bancoId);

    assert.equal(pregunta.competencia, original.competencia);
    assert.equal(pregunta.que_evalua, original.que_evalua);
    assert.deepEqual(pregunta.contexto, original.contexto);
    assert.deepEqual(pregunta.enunciado, original.enunciado);
  });
});

test('un banco viejo sin migrar sus datos se sigue leyendo, como texto envuelto en un bloque', () => {
  conBd((db) => {
    // Simula una fila como las que dejó la 003, antes del estándar: texto
    // plano en contexto/enunciado/opciones y metadata en blanco.
    db.prepare("INSERT INTO bancos (nombre, creado_en) VALUES ('Viejo', '2026-01-01')").run();
    db.prepare(`
      INSERT INTO preguntas (banco_id, contexto, enunciado)
      VALUES (1, 'Un contexto viejo', '¿Pregunta vieja?')
    `).run();
    db.prepare(`
      INSERT INTO opciones (pregunta_id, texto, es_correcta) VALUES (1, 'Opción vieja', 1)
    `).run();

    const [pregunta] = preguntasDeBanco(db, 1);
    assert.deepEqual(pregunta.contexto, [{ tipo: 'texto', texto: 'Un contexto viejo' }]);
    assert.deepEqual(pregunta.enunciado, [{ tipo: 'texto', texto: '¿Pregunta vieja?' }]);
    assert.deepEqual(pregunta.opciones[0].contenido, [{ tipo: 'texto', texto: 'Opción vieja' }]);
    assert.equal(pregunta.competencia, '');
  });
});

test('cada importación crea un banco nuevo, sin fusionar', () => {
  conBd((db) => {
    guardarBanco(db, 'Ciencias', [preguntaDeEjemplo()]);
    guardarBanco(db, 'Ciencias', [preguntaDeEjemplo()]);

    const bancos = listarBancos(db);
    assert.equal(bancos.length, 2);
    assert.deepEqual(bancos.map((b) => b.preguntas), [1, 1]);
  });
});

test('la importación es atómica', () => {
  conBd((db) => {
    const roto = preguntaDeEjemplo({ tipo_item: 'no-existe' });
    assert.throws(() => guardarBanco(db, 'Ciencias', [preguntaDeEjemplo(), roto]));

    assert.equal(listarBancos(db).length, 0, 'no debe quedar el banco a medias');
  });
});

test('borra un banco que no se ha usado', () => {
  conBd((db) => {
    const { bancoId } = guardarBanco(db, 'Ciencias', [preguntaDeEjemplo()]);
    borrarBanco(db, bancoId);

    assert.equal(listarBancos(db).length, 0);
  });
});

test('borrar el banco arrastra sus preguntas y opciones', () => {
  conBd((db) => {
    const { bancoId } = guardarBanco(db, 'Ciencias', [preguntaDeEjemplo()]);
    borrarBanco(db, bancoId);

    assert.equal(db.prepare('SELECT count(*) AS t FROM preguntas').get().t, 0);
    assert.equal(db.prepare('SELECT count(*) AS t FROM opciones').get().t, 0);
  });
});

test('no borra un banco usado en una evaluación, y lo explica', () => {
  conBd((db) => {
    const { bancoId } = guardarBanco(db, 'Ciencias', [preguntaDeEjemplo()]);
    db.prepare(
      "INSERT INTO sesiones (nombre, banco_id, cursos, creado_en) VALUES ('S', ?, '10A', '2026-01-01')",
    ).run(bancoId);

    assert.throws(() => borrarBanco(db, bancoId), /auditables/);
    assert.equal(listarBancos(db).length, 1);
  });
});

test('obtener un banco inexistente da un error claro', () => {
  conBd((db) => {
    assert.throws(() => obtenerBanco(db, 999), /no existe/);
  });
});

// --- Grupos de preguntas (feature 026) ------------------------------------

test('guarda un grupo contexto_compartido junto con sus preguntas miembro', () => {
  conBd((db) => {
    const grupo = grupoContextoCompartido({ id: 'g-cc' });
    const m1 = preguntaMiembroContextoCompartido('g-cc', { id: 'm-1' });
    const m2 = preguntaMiembroContextoCompartido('g-cc', { id: 'm-2' });

    const { bancoId, grupos } = guardarBanco(db, 'Ciencias', [m1, m2], [grupo]);
    assert.equal(grupos, 1);

    const guardados = gruposDeBanco(db, bancoId);
    assert.equal(guardados.length, 1);
    assert.equal(guardados[0].id, 'g-cc');
    assert.equal(guardados[0].tipo, 'contexto_compartido');
    assert.equal(guardados[0].metadata_pedagogica.competencia, 'Competencia del grupo');

    const preguntas = preguntasDeBanco(db, bancoId);
    assert.equal(preguntas.length, 2);
    assert.equal(preguntas[0].grupo_id, 'g-cc');
  });
});

test('guarda un grupo banco_opciones y sus preguntas miembro con respuesta_pool_id', () => {
  conBd((db) => {
    const grupo = grupoBancoOpciones({ id: 'g-bo' });
    const m1 = preguntaMiembroBancoOpciones('g-bo', grupo.banco, { id: 'm-1', respuesta_pool_id: 'p1' });
    const m2 = preguntaMiembroBancoOpciones('g-bo', grupo.banco, { id: 'm-2', respuesta_pool_id: 'p2' });

    guardarBanco(db, 'Inglés', [m1, m2], [grupo]);

    const preguntas = preguntasDeBanco(db, 1);
    assert.equal(preguntas.length, 2);
    assert.equal(preguntas[0].tipo_item, 'miembro_banco_opciones');
    assert.equal(preguntas[0].respuesta_pool_id, 'p1');
    assert.equal(preguntas[0].opciones.length, 0, 'los miembros de matching no tienen opciones');
  });
});

test('guarda un grupo texto_con_blancos con numero_blanco y opciones por miembro', () => {
  conBd((db) => {
    const grupo = grupoTextoConBlancos({ id: 'g-tb' });
    const m1 = preguntaMiembroTextoConBlancos('g-tb', 1, { id: 'm-1' });
    const m2 = preguntaMiembroTextoConBlancos('g-tb', 2, { id: 'm-2' });

    guardarBanco(db, 'Inglés', [m1, m2], [grupo]);

    const preguntas = preguntasDeBanco(db, 1);
    assert.equal(preguntas.length, 2);
    assert.equal(preguntas[0].tipo_item, 'miembro_texto_con_blancos');
    assert.equal(preguntas[0].numero_blanco, 1);
    assert.equal(preguntas[0].opciones.length, 3);
  });
});

test('obtenerBanco devuelve preguntas standalone y grupos con sus preguntas anidadas', () => {
  conBd((db) => {
    const grupo = grupoContextoCompartido({ id: 'g-1' });
    const standalone = preguntaDeEjemplo();
    const miembro = preguntaMiembroContextoCompartido('g-1');

    guardarBanco(db, 'Mix', [standalone, miembro], [grupo]);

    const banco = obtenerBanco(db, 1);
    assert.equal(banco.preguntas.length, 1);
    assert.equal(banco.preguntas[0].grupo_id, null);
    assert.equal(banco.grupos.length, 1);
    assert.equal(banco.grupos[0].id, 'g-1');
    assert.equal(banco.grupos[0].preguntas.length, 1);
    assert.equal(banco.grupos[0].preguntas[0].grupo_id, 'g-1');
  });
});

test('persiste los campos informativos v1.1.0/v1.2.0+ de cada pregunta', () => {
  conBd((db) => {
    const pregunta = preguntaDeEjemplo({
      id: 'p-info',
      grado: '9',
      prueba: 'saber11',
      nivel_mcer: 'B1',
      valor: 2,
      version_estandar: '1.2.0',
      procedencia: { contenido: 'oficial', clasificacion: 'ia_generada', respuesta_correcta: 'oficial' },
      verificado: { contenido: true, clasificacion: false, respuesta_correcta: true },
      fuentes: { contenido: 'cuadernillo.pdf', clasificacion: null, respuesta_correcta: 'clave.pdf' },
    });

    guardarBanco(db, 'Info', [pregunta]);
    const [guardada] = preguntasDeBanco(db, 1);

    assert.equal(guardada.grado, '9');
    assert.equal(guardada.prueba, 'saber11');
    assert.equal(guardada.nivel_mcer, 'B1');
    assert.equal(guardada.valor, 2);
    assert.equal(guardada.version_estandar, '1.2.0');
    assert.deepEqual(guardada.procedencia, { contenido: 'oficial', clasificacion: 'ia_generada', respuesta_correcta: 'oficial' });
    assert.equal(guardada.verificado.contenido, true);
    assert.equal(guardada.fuentes.respuesta_correcta, 'clave.pdf');
  });
});

test('una pregunta sin campos informativos nuevos los trae vacíos por defecto', () => {
  conBd((db) => {
    guardarBanco(db, 'Legacy', [preguntaDeEjemplo()]);
    const [guardada] = preguntasDeBanco(db, 1);

    assert.equal(guardada.grado, null);
    assert.equal(guardada.prueba, null);
    assert.equal(guardada.nivel_mcer, null);
    assert.equal(guardada.valor, 1, 'valor por defecto es 1');
    assert.deepEqual(guardada.procedencia, {});
    assert.deepEqual(guardada.verificado, {});
    assert.deepEqual(guardada.fuentes, {});
  });
});

test('persiste procedencia_justificacion y justificacion_verificada por opción', () => {
  conBd((db) => {
    const pregunta = preguntaDeEjemplo({
      id: 'p-op',
      opciones: [
        { id: 'A', contenido: [{ tipo: 'texto', texto: 'A' }], es_correcta: true, justificacion: 'Correcta', procedencia_justificacion: 'oficial', justificacion_verificada: 1 },
        { id: 'B', contenido: [{ tipo: 'texto', texto: 'B' }], es_correcta: false, justificacion: 'Incorrecta', procedencia_justificacion: 'ia_generada', justificacion_verificada: 0 },
        { id: 'C', contenido: [{ tipo: 'texto', texto: 'C' }], es_correcta: false, justificacion: 'Otra', procedencia_justificacion: null, justificacion_verificada: null },
        { id: 'D', contenido: [{ tipo: 'texto', texto: 'D' }], es_correcta: false, justificacion: 'Última' },
      ],
    });

    guardarBanco(db, 'Op', [pregunta]);
    const [guardada] = preguntasDeBanco(db, 1);

    assert.equal(guardada.opciones[0].procedencia_justificacion, 'oficial');
    assert.equal(guardada.opciones[0].justificacion_verificada, 1);
    assert.equal(guardada.opciones[1].procedencia_justificacion, 'ia_generada');
    assert.equal(guardada.opciones[1].justificacion_verificada, 0);
    assert.equal(guardada.opciones[2].procedencia_justificacion, null);
    assert.equal(guardada.opciones[2].justificacion_verificada, null);
  });
});

// --- Ingreso manual de preguntas (028) --------------------------------------

function opcionesManual(indiceCorrecta = 0) {
  return ['A', 'B', 'C', 'D'].map((letra, i) => ({
    texto: `Opción ${letra}`,
    esCorrecta: i === indiceCorrecta,
    justificacion: i === indiceCorrecta ? 'Porque sí' : '',
  }));
}

const preguntaManualValida = (extra = {}) => ({
  contexto: '',
  enunciado: '¿Cuánto es 2 + 2?',
  opciones: opcionesManual(),
  ...extra,
});

test('crearBancoVacio crea un banco sin preguntas', () => {
  conBd((db) => {
    const banco = crearBancoVacio(db, 'Matemáticas');
    assert.equal(banco.nombre, 'Matemáticas');
    assert.equal(banco.preguntas.length, 0);
    assert.equal(listarBancos(db)[0].preguntas, 0);
  });
});

test('crearBancoVacio rechaza un nombre vacío', () => {
  conBd((db) => {
    assert.throws(() => crearBancoVacio(db, '  '), (err) => {
      assert.equal(err.estado, 400);
      assert.deepEqual(err.errores, ['El nombre del banco es obligatorio.']);
      return true;
    });
  });
});

test('validarPreguntaManual junta todos los errores a la vez', () => {
  const { errores } = validarPreguntaManual({
    enunciado: '',
    opciones: [
      { texto: '', esCorrecta: false },
      { texto: 'B', esCorrecta: false },
      { texto: 'C', esCorrecta: false },
      { texto: 'D', esCorrecta: false },
    ],
  });

  assert.equal(errores.length, 3);
  assert.match(errores[0], /enunciado/);
  assert.match(errores[1], /opción A/i);
  assert.match(errores[2], /exactamente una/);
});

test('validarPreguntaManual exige exactamente 4 opciones', () => {
  const { errores } = validarPreguntaManual(preguntaManualValida({ opciones: opcionesManual().slice(0, 2) }));
  assert.match(errores[0], /exactamente 4 opciones/);
});

test('validarPreguntaManual rechaza dos opciones correctas', () => {
  const opciones = opcionesManual();
  opciones[1].esCorrecta = true; // ahora hay dos correctas
  const { errores } = validarPreguntaManual(preguntaManualValida({ opciones }));
  assert.deepEqual(errores, ['Marca exactamente una opción como correcta.']);
});

test('agregarPreguntaManual guarda una pregunta suelta con sus 4 opciones', () => {
  conBd((db) => {
    const { id: bancoId } = crearBancoVacio(db, 'Sociales');
    const pregunta = agregarPreguntaManual(db, bancoId, preguntaManualValida({ contexto: 'Un texto de apoyo' }));

    assert.deepEqual(pregunta.contexto, [{ tipo: 'texto', texto: 'Un texto de apoyo' }]);
    assert.deepEqual(pregunta.enunciado, [{ tipo: 'texto', texto: '¿Cuánto es 2 + 2?' }]);
    assert.equal(pregunta.opciones.length, 4);
    assert.equal(pregunta.opciones.filter((o) => o.es_correcta === 1).length, 1);
    assert.equal(pregunta.grupo_id, null);

    const [guardada] = preguntasDeBanco(db, bancoId);
    assert.equal(guardada.id, pregunta.id);
  });
});

test('agregarPreguntaManual sin contexto ni imagen guarda contexto vacío', () => {
  conBd((db) => {
    const { id: bancoId } = crearBancoVacio(db, 'Sociales');
    const pregunta = agregarPreguntaManual(db, bancoId, preguntaManualValida());
    assert.deepEqual(pregunta.contexto, []);
  });
});

test('agregarPreguntaManual con imagen agrega un bloque de imagen al contexto', () => {
  conBd((db) => {
    const { id: bancoId } = crearBancoVacio(db, 'Sociales');
    const pregunta = agregarPreguntaManual(
      db,
      bancoId,
      preguntaManualValida({ contexto: 'Mira el mapa', archivoImagen: 'mapa.png' }),
    );
    assert.deepEqual(pregunta.contexto, [
      { tipo: 'texto', texto: 'Mira el mapa' },
      { tipo: 'imagen', archivo: 'mapa.png' },
    ]);
  });
});

test('agregarPreguntaManual no escribe nada si hay errores de validación', () => {
  conBd((db) => {
    const { id: bancoId } = crearBancoVacio(db, 'Sociales');
    assert.throws(
      () => agregarPreguntaManual(db, bancoId, preguntaManualValida({ enunciado: '' })),
      (err) => {
        assert.equal(err.estado, 400);
        assert.ok(err.errores.length > 0);
        return true;
      },
    );
    assert.equal(preguntasDeBanco(db, bancoId).length, 0);
  });
});

test('agregarPreguntaManual devuelve 404 si el banco no existe', () => {
  conBd((db) => {
    assert.throws(() => agregarPreguntaManual(db, 999, preguntaManualValida()), (err) => {
      assert.equal(err.estado, 404);
      return true;
    });
  });
});

test('actualizarPreguntaManual reemplaza contexto, enunciado y opciones', () => {
  conBd((db) => {
    const { id: bancoId } = crearBancoVacio(db, 'Sociales');
    const original = agregarPreguntaManual(db, bancoId, preguntaManualValida());

    const editada = actualizarPreguntaManual(
      db,
      original.id,
      preguntaManualValida({ enunciado: '¿Cuánto es 3 + 3?', opciones: opcionesManual(2) }),
    );

    assert.deepEqual(editada.enunciado, [{ tipo: 'texto', texto: '¿Cuánto es 3 + 3?' }]);
    assert.equal(editada.opciones.length, 4);
    assert.equal(editada.opciones[2].es_correcta, 1);
    assert.equal(editada.opciones.filter((o) => o.es_correcta === 1).length, 1);
  });
});

test('actualizarPreguntaManual devuelve 404 si la pregunta no existe', () => {
  conBd((db) => {
    assert.throws(() => actualizarPreguntaManual(db, 999, preguntaManualValida()), (err) => {
      assert.equal(err.estado, 404);
      return true;
    });
  });
});

test('actualizarPreguntaManual rechaza una pregunta miembro de un grupo', () => {
  conBd((db) => {
    const grupo = grupoContextoCompartido({ id: 'g1' });
    const miembro = preguntaMiembroContextoCompartido('g1', { id: 'm1' });
    guardarBanco(db, 'Con grupo', [miembro], [grupo]);
    const [preguntaGuardada] = preguntasDeBanco(db, 1);

    assert.throws(() => actualizarPreguntaManual(db, preguntaGuardada.id, preguntaManualValida()), (err) => {
      assert.equal(err.estado, 409);
      assert.match(err.message, /grupo/);
      return true;
    });
  });
});

function usarEnUnaEvaluacion(db, bancoId, preguntaId) {
  db.prepare("INSERT INTO estudiantes (codigo, nombres, apellidos, curso) VALUES ('e1', 'Ana', 'Ruiz', '10A')").run();
  const sesion = crearSesion(db, { nombre: 'Prueba', banco_id: bancoId, cursos: ['10A'], n_preguntas: 1 });
  const intentoId = db.prepare(
    "INSERT INTO intentos (sesion_id, codigo_estudiante, semilla, token, iniciado_en) VALUES (?, 'e1', 's', 't', '2026-01-01')",
  ).run(sesion.id).lastInsertRowid;
  db.prepare(
    "INSERT INTO intento_preguntas (intento_id, orden, pregunta_id, orden_opciones) VALUES (?, 1, ?, '1,2,3,4')",
  ).run(intentoId, preguntaId);
}

test('actualizarPreguntaManual rechaza una pregunta ya usada en una evaluación', () => {
  conBd((db) => {
    const { id: bancoId } = crearBancoVacio(db, 'Sociales');
    const pregunta = agregarPreguntaManual(db, bancoId, preguntaManualValida());
    usarEnUnaEvaluacion(db, bancoId, pregunta.id);

    assert.throws(() => actualizarPreguntaManual(db, pregunta.id, preguntaManualValida()), (err) => {
      assert.equal(err.estado, 409);
      assert.match(err.message, /auditables/);
      return true;
    });
  });
});

test('eliminarPregunta borra la pregunta y sus opciones', () => {
  conBd((db) => {
    const { id: bancoId } = crearBancoVacio(db, 'Sociales');
    const pregunta = agregarPreguntaManual(db, bancoId, preguntaManualValida());

    eliminarPregunta(db, pregunta.id);

    assert.equal(preguntasDeBanco(db, bancoId).length, 0);
    assert.equal(db.prepare('SELECT count(*) AS t FROM opciones WHERE pregunta_id = ?').get(pregunta.id).t, 0);
  });
});

test('eliminarPregunta rechaza una pregunta ya usada en una evaluación', () => {
  conBd((db) => {
    const { id: bancoId } = crearBancoVacio(db, 'Sociales');
    const pregunta = agregarPreguntaManual(db, bancoId, preguntaManualValida());
    usarEnUnaEvaluacion(db, bancoId, pregunta.id);

    assert.throws(() => eliminarPregunta(db, pregunta.id), (err) => {
      assert.equal(err.estado, 409);
      return true;
    });
    assert.equal(preguntasDeBanco(db, bancoId).length, 1);
  });
});
