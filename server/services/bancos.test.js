import test from 'node:test';
import assert from 'node:assert/strict';
import { abrirBd, cerrarBd } from '../db.js';
import {
  actualizarGrupo,
  actualizarPreguntaManual,
  agregarPaqueteABanco,
  agregarPreguntaManual,
  borrarBanco,
  crearBancoVacio,
  eliminarGrupo,
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

// --- 052: edición completa, grupos y ZIP adicional --------------------------

const textos = (bloques) => bloques.filter((b) => b.tipo === 'texto').map((b) => b.texto);

test('actualizarPreguntaManual edita una miembro de contexto compartido con sus datos pedagógicos', () => {
  conBd((db) => {
    guardarBanco(db, 'Con grupo', [preguntaMiembroContextoCompartido('g1', { id: 'm1' })], [grupoContextoCompartido({ id: 'g1' })]);
    const [miembro] = preguntasDeBanco(db, 1);

    const editada = actualizarPreguntaManual(db, miembro.id, {
      enunciado: [{ tipo: 'texto', texto: '¿Nuevo enunciado?' }],
      opciones: [
        { contenido: [{ tipo: 'texto', texto: 'Sí' }], es_correcta: true, justificacion: 'Porque sí.' },
        { contenido: [{ tipo: 'texto', texto: 'No' }], es_correcta: false },
      ],
      competencia: 'Interpretación',
      valor: 2,
      grado: '11',
    });

    assert.deepEqual(textos(editada.enunciado), ['¿Nuevo enunciado?']);
    assert.equal(editada.opciones.length, 2);
    assert.equal(editada.opciones[0].es_correcta, 1);
    assert.equal(editada.competencia, 'Interpretación');
    assert.equal(editada.componente, 'Componente de prueba', 'lo que no viene no se toca');
    assert.equal(editada.valor, 2);
    assert.equal(editada.grado, '11');
    assert.equal(editada.grupo_id, 'g1');
  });
});

test('editar conserva las tablas y las imágenes que se devuelven', () => {
  conBd((db) => {
    const tabla = { tipo: 'tabla', encabezados: ['País', 'Año'], filas: [['Colombia', '1991']] };
    const imagen = { tipo: 'imagen', archivo: 'mapa.png', descripcion_accesible: 'Mapa' };
    guardarBanco(db, 'B', [preguntaDeEjemplo({ contexto: [tabla, imagen] })]);
    const [p] = preguntasDeBanco(db, 1);

    const editada = actualizarPreguntaManual(db, p.id, { ...p, enunciado: [{ tipo: 'texto', texto: 'Otro' }] });
    assert.deepEqual(editada.contexto, [tabla, imagen]);
  });
});

test('la validación completa junta todos los errores', () => {
  conBd((db) => {
    const { id } = crearBancoVacio(db, 'B');
    assert.throws(() => agregarPreguntaManual(db, id, {
      enunciado: [{ tipo: 'texto', texto: '  ' }],
      contexto: [{ tipo: 'imagen', archivo: '../x.png' }, { tipo: 'tabla', encabezados: ['a', 'b'], filas: [['1']] }],
      opciones: [{ contenido: [], es_correcta: false }],
      valor: 0,
    }), (err) => {
      assert.equal(err.estado, 400);
      const texto = err.errores.join(' | ');
      assert.match(texto, /enunciado es obligatorio/);
      assert.match(texto, /imagen 1/);
      assert.match(texto, /tabla 2/);
      assert.match(texto, /entre 2 y 8/);
      assert.match(texto, /opción A no puede quedar vacía/);
      assert.match(texto, /exactamente una/);
      assert.match(texto, /valor/);
      return true;
    });
  });
});

test('una miembro de emparejamiento se edita eligiendo la entrada correcta del banco', () => {
  conBd((db) => {
    const grupo = grupoBancoOpciones({ id: 'g-bo' });
    guardarBanco(db, 'Inglés', [preguntaMiembroBancoOpciones('g-bo', grupo.banco, { respuesta_pool_id: 'p1' })], [grupo]);
    const [m] = preguntasDeBanco(db, 1);

    const editada = actualizarPreguntaManual(db, m.id, { enunciado: m.enunciado, respuesta_pool_id: 'p2' });
    assert.equal(editada.respuesta_pool_id, 'p2');

    assert.throws(() => actualizarPreguntaManual(db, m.id, { enunciado: m.enunciado, respuesta_pool_id: 'zzz' }),
      (err) => err.errores.some((e) => /entrada del banco/.test(e)));
  });
});

test('eliminar la última miembro de un contexto compartido borra el grupo', () => {
  conBd((db) => {
    guardarBanco(db, 'B', [preguntaMiembroContextoCompartido('g1', { id: 'm1' })], [grupoContextoCompartido({ id: 'g1' })]);
    const [m] = preguntasDeBanco(db, 1);
    eliminarPregunta(db, m.id);
    assert.equal(gruposDeBanco(db, 1).length, 0);
  });
});

test('las miembros de emparejamiento y de texto con blancos no se eliminan sueltas', () => {
  conBd((db) => {
    const bo = grupoBancoOpciones({ id: 'g-bo' });
    const tb = grupoTextoConBlancos({ id: 'g-tb' });
    guardarBanco(db, 'B', [
      preguntaMiembroBancoOpciones('g-bo', bo.banco, { respuesta_pool_id: 'p1' }),
      preguntaMiembroTextoConBlancos('g-tb', 1),
    ], [bo, tb]);
    for (const p of preguntasDeBanco(db, 1)) {
      assert.throws(() => eliminarPregunta(db, p.id), (err) => err.estado === 409 && /grupo completo/.test(err.message));
    }
  });
});

test('actualizarGrupo corrige contexto, banco y metadata, y protege las entradas usadas como respuesta', () => {
  conBd((db) => {
    const grupo = grupoBancoOpciones({ id: 'g-bo' });
    guardarBanco(db, 'B', [preguntaMiembroBancoOpciones('g-bo', grupo.banco, { respuesta_pool_id: 'p1' })], [grupo]);

    const editado = actualizarGrupo(db, 'g-bo', {
      contexto: [{ tipo: 'texto', texto: 'Empareja cada término.' }],
      banco: [
        { id: 'p1', contenido: [{ tipo: 'texto', texto: 'floema' }] },
        { id: 'p9', contenido: [{ tipo: 'texto', texto: 'nuevo' }] },
      ],
      metadata_pedagogica: { competencia: 'Uso del lenguaje' },
    });
    assert.deepEqual(textos(editado.contexto), ['Empareja cada término.']);
    assert.deepEqual(editado.banco.map((e) => e.id), ['p1', 'p9']);
    assert.equal(editado.metadata_pedagogica.competencia, 'Uso del lenguaje');
    assert.equal(editado.metadata_pedagogica.componente, 'Componente del grupo');

    assert.throws(() => actualizarGrupo(db, 'g-bo', {
      banco: [{ id: 'p2', contenido: [{ tipo: 'texto', texto: 'a' }] }, { id: 'p3', contenido: [{ tipo: 'texto', texto: 'b' }] }],
    }), (err) => err.errores.some((e) => /"p1"/.test(e)));
  });
});

test('eliminarGrupo borra el grupo con sus preguntas, salvo si alguna se usó', () => {
  conBd((db) => {
    const tb = grupoTextoConBlancos({ id: 'g-tb' });
    guardarBanco(db, 'B', [preguntaMiembroTextoConBlancos('g-tb', 1)], [tb]);
    const [m] = preguntasDeBanco(db, 1);

    usarEnUnaEvaluacion(db, 1, m.id);
    assert.throws(() => eliminarGrupo(db, 'g-tb'), (err) => err.estado === 409);
    assert.throws(() => actualizarGrupo(db, 'g-tb', {}), (err) => err.estado === 409);

    db.prepare('DELETE FROM intento_preguntas').run();
    eliminarGrupo(db, 'g-tb');
    assert.equal(preguntasDeBanco(db, 1).length, 0);
    assert.equal(gruposDeBanco(db, 1).length, 0);
  });
});

test('el mismo paquete con grupos se puede cargar dos veces: el segundo recibe ids de grupo nuevos', () => {
  conBd((db) => {
    const paquete = () => [[preguntaMiembroContextoCompartido('g1', { id: 'm1' })], [grupoContextoCompartido({ id: 'g1' })]];
    guardarBanco(db, 'Primero', ...paquete());
    const { bancoId } = guardarBanco(db, 'Segundo', ...paquete());
    agregarPaqueteABanco(db, bancoId, ...paquete());

    const grupos = gruposDeBanco(db, bancoId).map((g) => g.id).sort();
    assert.deepEqual(grupos, ['g1-2', 'g1-3']);
    for (const p of preguntasDeBanco(db, bancoId)) assert.ok(grupos.includes(p.grupo_id));
  });
});

test('agregarPaqueteABanco añade al banco existente sin crear otro', () => {
  conBd((db) => {
    const { id } = crearBancoVacio(db, 'Sociales');
    agregarPreguntaManual(db, id, preguntaManualValida());
    agregarPaqueteABanco(db, id, preguntasDeEjemplo(3));

    assert.equal(listarBancos(db).length, 1);
    assert.equal(preguntasDeBanco(db, id).length, 4);
    assert.throws(() => agregarPaqueteABanco(db, 999, preguntasDeEjemplo(1)), (err) => err.estado === 404);
  });
});

test('preguntasDeBanco cuenta en cuántos intentos se usó cada pregunta', () => {
  conBd((db) => {
    const { id } = crearBancoVacio(db, 'Sociales');
    const p = agregarPreguntaManual(db, id, preguntaManualValida());
    assert.equal(preguntasDeBanco(db, id)[0].usos, 0);
    usarEnUnaEvaluacion(db, id, p.id);
    assert.equal(preguntasDeBanco(db, id)[0].usos, 1);
  });
});
