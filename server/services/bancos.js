import { analizarBloques, serializarBloques } from './bloques.js';

function parsearProcedencia(valor) {
  if (!valor || valor === '{}') return {};
  try {
    const obj = JSON.parse(valor);
    return obj && typeof obj === 'object' ? obj : {};
  } catch {
    return {};
  }
}

function conBloquesParseados(pregunta) {
  return {
    ...pregunta,
    contexto: analizarBloques(pregunta.contexto),
    enunciado: analizarBloques(pregunta.enunciado),
    procedencia: parsearProcedencia(pregunta.procedencia),
    verificado: parsearProcedencia(pregunta.verificado),
    fuentes: parsearProcedencia(pregunta.fuentes),
  };
}

function opcionConContenidoParseado(opcion) {
  const { texto, ...resto } = opcion;
  return { ...resto, contenido: analizarBloques(texto) };
}

const CAMPOS_PREGUNTA_V1_1 = [
  'grado', 'prueba', 'nivel_mcer', 'version_estandar', 'respuesta_pool_id', 'numero_blanco',
];

function camposNumericos(pregunta) {
  return {
    grupo_id: pregunta.grupo_id ?? null,
    tipo_item: pregunta.tipo_item ?? null,
    respuesta_pool_id: pregunta.respuesta_pool_id ?? null,
    numero_blanco: pregunta.numero_blanco ?? null,
    nivel_mcer: pregunta.nivel_mcer ?? null,
    valor: pregunta.valor ?? 1,
    grado: pregunta.grado ?? null,
    prueba: pregunta.prueba ?? null,
    procedencia: pregunta.procedencia ?? {},
    verificado: pregunta.verificado ?? {},
    fuentes: pregunta.fuentes ?? {},
    version_estandar: pregunta.version_estandar ?? null,
  };
}

/** Persiste los campos informativos del estándar en una pregunta. */
function datosCamposInformativos(pregunta) {
  return {
    grado: pregunta.grado ?? null,
    prueba: pregunta.prueba ?? null,
    procedencia: JSON.stringify(pregunta.procedencia ?? {}),
    verificado: JSON.stringify(pregunta.verificado ?? {}),
    fuentes: JSON.stringify(pregunta.fuentes ?? {}),
    nivel_mcer: pregunta.nivel_mcer ?? null,
    valor: typeof pregunta.valor === 'number' ? pregunta.valor : 1,
    version_estandar: pregunta.version_estandar ?? null,
    grupo_id: pregunta.grupo_id ?? null,
    tipo_item: pregunta.tipo_item ?? null,
    respuesta_pool_id: pregunta.respuesta_pool_id ?? null,
    numero_blanco: pregunta.numero_blanco ?? null,
  };
}

/** Inserta un grupo y devuelve su id (que es el mismo string del estándar). */
function insertarGrupo(db, bancoId, grupo) {
  db.prepare(`
    INSERT INTO grupos (id, banco_id, tipo, contexto, banco, metadata_pedagogica)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    grupo.id,
    bancoId,
    grupo.tipo,
    JSON.stringify(grupo.contexto ?? []),
    JSON.stringify(grupo.banco ?? []),
    JSON.stringify(grupo.metadata_pedagogica ?? {}),
  );
}

const METADATA_POR_DEFECTO = [
  'competencia', 'componente', 'afirmacion',
  'evidencia', 'estandar_asociado', 'que_evalua',
];

/** Si una pregunta miembro no trae los 6 campos propios, los hereda del grupo. */
function conMetadataHeredada(pregunta, grupoPorId) {
  const grupo = pregunta.grupo_id ? grupoPorId.get(pregunta.grupo_id) : null;
  const fuente = { ...(grupo?.metadata_pedagogica ?? {}) };
  const resultado = { ...pregunta };
  for (const campo of METADATA_POR_DEFECTO) {
    if (resultado[campo] === undefined || resultado[campo] === '') {
      resultado[campo] = fuente[campo] ?? '';
    }
  }
  return resultado;
}

/**
 * Guarda el paquete entero en una transacción: o entra todo, o nada.
 *
 * `preguntas` es el array del validador (puede contener preguntas standalone
 * y preguntas miembro de un grupo). `grupos` es opcional; si está presente,
 * se insertan primero los grupos para que las FK de las preguntas miembro
 * los encuentren.
 */
export function guardarBanco(db, nombre, preguntas, grupos = []) {
  const insertarBanco = db.prepare('INSERT INTO bancos (nombre, creado_en) VALUES (?, ?)');
  const insertarPregunta = db.prepare(`
    INSERT INTO preguntas (
      banco_id, contexto, enunciado,
      competencia, componente, afirmacion, evidencia, estandar_asociado, que_evalua,
      grupo_id, tipo_item, respuesta_pool_id, numero_blanco,
      nivel_mcer, valor, grado, prueba,
      procedencia, verificado, fuentes, version_estandar
    ) VALUES (
      ?, ?, ?,
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?
    )
  `);
  const insertarOpcion = db.prepare(`
    INSERT INTO opciones (pregunta_id, texto, es_correcta, justificacion,
      procedencia_justificacion, justificacion_verificada)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  return db.transaction(() => {
    const bancoId = insertarBanco.run(nombre, new Date().toISOString()).lastInsertRowid;

    for (const grupo of grupos) insertarGrupo(db, bancoId, grupo);

    const grupoPorId = new Map(grupos.map((g) => [g.id, g]));

    for (const pregunta of preguntas) {
      const completa = conMetadataHeredada(pregunta, grupoPorId);
      const extras = datosCamposInformativos(completa);
      const preguntaId = insertarPregunta.run(
        bancoId,
        serializarBloques(completa.contexto),
        serializarBloques(completa.enunciado),
        completa.competencia,
        completa.componente,
        completa.afirmacion,
        completa.evidencia,
        completa.estandar_asociado,
        completa.que_evalua,
        extras.grupo_id,
        extras.tipo_item,
        extras.respuesta_pool_id,
        extras.numero_blanco,
        extras.nivel_mcer,
        extras.valor,
        extras.grado,
        extras.prueba,
        extras.procedencia,
        extras.verificado,
        extras.fuentes,
        extras.version_estandar,
      ).lastInsertRowid;

      for (const opcion of completa.opciones ?? []) {
        insertarOpcion.run(
          preguntaId,
          serializarBloques(opcion.contenido),
          opcion.es_correcta ? 1 : 0,
          opcion.justificacion ?? '',
          opcion.procedencia_justificacion ?? null,
          opcion.justificacion_verificada ?? null,
        );
      }
    }

    return { bancoId, preguntas: preguntas.length, grupos: grupos.length };
  })();
}

export function listarBancos(db) {
  return db
    .prepare(`
      SELECT b.id, b.nombre, b.creado_en,
             count(p.id) AS preguntas,
             (SELECT count(*) FROM sesiones s WHERE s.banco_id = b.id) AS sesiones
      FROM bancos b
      LEFT JOIN preguntas p ON p.banco_id = b.id
      GROUP BY b.id
      ORDER BY b.creado_en DESC
    `)
    .all();
}

export function contarBancos(db) {
  return db.prepare('SELECT count(*) AS total FROM bancos').get().total;
}

function parsearGrupo(grupo) {
  return {
    ...grupo,
    contexto: analizarBloques(grupo.contexto),
    banco: grupo.banco ? JSON.parse(grupo.banco) : [],
    metadata_pedagogica: grupo.metadata_pedagogica && grupo.metadata_pedagogica !== '{}'
      ? JSON.parse(grupo.metadata_pedagogica)
      : {},
  };
}

/** Las preguntas con sus opciones, bloques ya parseados. Solo para el panel: incluye la correcta. */
export function preguntasDeBanco(db, bancoId) {
  const preguntas = db
    .prepare(`
      SELECT id, banco_id, contexto, enunciado,
             competencia, componente, afirmacion, evidencia, estandar_asociado, que_evalua,
             grupo_id, tipo_item, respuesta_pool_id, numero_blanco,
             nivel_mcer, valor, grado, prueba,
             procedencia, verificado, fuentes, version_estandar
      FROM preguntas WHERE banco_id = ? ORDER BY id
    `)
    .all(bancoId);
  const opciones = db.prepare('SELECT id, texto, es_correcta, justificacion, procedencia_justificacion, justificacion_verificada FROM opciones WHERE pregunta_id = ? ORDER BY id');

  return preguntas.map((pregunta) => ({
    ...conBloquesParseados(pregunta),
    opciones: opciones.all(pregunta.id).map(opcionConContenidoParseado),
  }));
}

export function gruposDeBanco(db, bancoId) {
  const filas = db.prepare(`
    SELECT id, banco_id, tipo, contexto, banco, metadata_pedagogica
    FROM grupos WHERE banco_id = ? ORDER BY id
  `).all(bancoId);
  return filas.map(parsearGrupo);
}

/**
 * Solo los identificadores: es lo único que el motor de personalización
 * necesita para sortear, y evita arrastrar enunciados de mil caracteres.
 *
 * Devuelve también el `grupo_id` y `tipo_item` por pregunta para que el
 * muestreador trate los grupos como unidades indivisibles y para que la
 * materialización sepa qué entradas del banco usar en matching.
 */
export function idsDePreguntasYOpciones(db, bancoId) {
  const preguntas = db
    .prepare('SELECT id, competencia, grupo_id, tipo_item FROM preguntas WHERE banco_id = ? ORDER BY id')
    .all(bancoId);
  const opciones = db.prepare('SELECT id FROM opciones WHERE pregunta_id = ? ORDER BY id');

  const gruposPorId = new Map();
  for (const pregunta of preguntas) {
    if (pregunta.grupo_id && !gruposPorId.has(pregunta.grupo_id)) {
      const fila = db
        .prepare('SELECT id, banco FROM grupos WHERE id = ?')
        .get(pregunta.grupo_id);
      if (fila) {
        const banco = JSON.parse(fila.banco ?? '[]');
        gruposPorId.set(fila.id, banco.map((e) => ({ id: e.id })));
      }
    }
  }

  return preguntas.map((pregunta) => ({
    id: pregunta.id,
    competencia: pregunta.competencia,
    grupo_id: pregunta.grupo_id ?? null,
    tipo_item: pregunta.tipo_item ?? 'estandar',
    opciones: pregunta.tipo_item === 'miembro_banco_opciones'
      ? (gruposPorId.get(pregunta.grupo_id) ?? [])
      : opciones.all(pregunta.id),
  }));
}

export function obtenerBanco(db, bancoId) {
  const banco = db.prepare('SELECT * FROM bancos WHERE id = ?').get(bancoId);
  if (!banco) throw Object.assign(new Error('Ese banco no existe.'), { estado: 404 });

  const grupos = gruposDeBanco(db, bancoId);
  const preguntas = preguntasDeBanco(db, bancoId);
  // Anida las preguntas miembro dentro de su grupo para el visor del docente.
  const preguntasPorGrupo = new Map();
  const preguntasSueltas = [];
  for (const pregunta of preguntas) {
    if (pregunta.grupo_id) {
      if (!preguntasPorGrupo.has(pregunta.grupo_id)) preguntasPorGrupo.set(pregunta.grupo_id, []);
      preguntasPorGrupo.get(pregunta.grupo_id).push(pregunta);
    } else {
      preguntasSueltas.push(pregunta);
    }
  }
  const gruposConPreguntas = grupos.map((grupo) => ({
    ...grupo,
    preguntas: preguntasPorGrupo.get(grupo.id) ?? [],
  }));

  return { ...banco, preguntas: preguntasSueltas, grupos: gruposConPreguntas };
}

/**
 * Un banco usado en una sesión no se borra: los resultados de esos estudiantes
 * dejarían de ser auditables.
 */
export function borrarBanco(db, bancoId) {
  const banco = db.prepare('SELECT * FROM bancos WHERE id = ?').get(bancoId);
  if (!banco) throw Object.assign(new Error('Ese banco no existe.'), { estado: 404 });

  const sesiones = db
    .prepare('SELECT count(*) AS total FROM sesiones WHERE banco_id = ?')
    .get(bancoId).total;

  if (sesiones > 0) {
    throw Object.assign(
      new Error(
        `No se puede borrar "${banco.nombre}": se ha usado en ${sesiones} evaluación(es) y ` +
          'sus resultados deben seguir siendo auditables.',
      ),
      { estado: 409 },
    );
  }

  db.prepare('DELETE FROM bancos WHERE id = ?').run(bancoId);
  return banco;
}

// --- Ingreso manual de preguntas (028) -------------------------------------
// Forma simple original de la feature 003: contexto opcional, imagen
// opcional, enunciado y exactamente 4 opciones. Sin metadata pedagógica del
// estándar ni grupos — eso sigue siendo exclusivo del ZIP (015/016/026).

const LETRAS_OPCION = ['A', 'B', 'C', 'D'];
const N_OPCIONES_MANUAL = 4;

function textoLimpio(valor) {
  return typeof valor === 'string' ? valor.trim() : '';
}

/**
 * Valida los datos de una pregunta manual. Devuelve `{registro, errores}`:
 * `errores` trae todos los problemas a la vez, no el primero, igual que
 * `validarEstudiante` en la 020.
 */
export function validarPreguntaManual(datos) {
  const errores = [];
  const contexto = textoLimpio(datos?.contexto);
  const enunciado = textoLimpio(datos?.enunciado);
  const archivoImagen = textoLimpio(datos?.archivoImagen) || null;
  const opciones = Array.isArray(datos?.opciones) ? datos.opciones : [];

  if (enunciado === '') errores.push('El enunciado es obligatorio.');

  if (opciones.length !== N_OPCIONES_MANUAL) {
    errores.push(`Debes escribir exactamente ${N_OPCIONES_MANUAL} opciones.`);
  } else {
    opciones.forEach((opcion, i) => {
      if (textoLimpio(opcion?.texto) === '') {
        errores.push(`La opción ${LETRAS_OPCION[i]} no puede quedar vacía.`);
      }
    });
    const correctas = opciones.filter((opcion) => Boolean(opcion?.esCorrecta)).length;
    if (correctas !== 1) errores.push('Marca exactamente una opción como correcta.');
  }

  return {
    errores,
    registro: {
      contexto,
      enunciado,
      archivoImagen,
      opciones: opciones.map((opcion) => ({
        texto: textoLimpio(opcion?.texto),
        esCorrecta: Boolean(opcion?.esCorrecta),
        justificacion: textoLimpio(opcion?.justificacion),
      })),
    },
  };
}

/** Bloques del contexto: texto si lo hay, imagen si se adjuntó una. */
function bloquesDeContexto({ contexto, archivoImagen }) {
  const bloques = [];
  if (contexto) bloques.push({ tipo: 'texto', texto: contexto });
  if (archivoImagen) bloques.push({ tipo: 'imagen', archivo: archivoImagen });
  return bloques;
}

function preguntaUnica(db, preguntaId) {
  const fila = db.prepare(`
    SELECT id, banco_id, contexto, enunciado,
           competencia, componente, afirmacion, evidencia, estandar_asociado, que_evalua,
           grupo_id, tipo_item, respuesta_pool_id, numero_blanco,
           nivel_mcer, valor, grado, prueba,
           procedencia, verificado, fuentes, version_estandar
    FROM preguntas WHERE id = ?
  `).get(preguntaId);
  const opciones = db
    .prepare(`
      SELECT id, texto, es_correcta, justificacion, procedencia_justificacion, justificacion_verificada
      FROM opciones WHERE pregunta_id = ? ORDER BY id
    `)
    .all(preguntaId);

  return { ...conBloquesParseados(fila), opciones: opciones.map(opcionConContenidoParseado) };
}

/** Crea un banco sin preguntas, listo para que el docente empiece a agregarlas a mano. */
export function crearBancoVacio(db, nombre) {
  const limpio = textoLimpio(nombre);
  if (limpio === '') {
    throw Object.assign(
      new Error('El nombre del banco es obligatorio.'),
      { estado: 400, errores: ['El nombre del banco es obligatorio.'] },
    );
  }

  const bancoId = db
    .prepare('INSERT INTO bancos (nombre, creado_en) VALUES (?, ?)')
    .run(limpio, new Date().toISOString()).lastInsertRowid;

  return obtenerBanco(db, bancoId);
}

function bancoExistente(db, bancoId) {
  const banco = db.prepare('SELECT id FROM bancos WHERE id = ?').get(bancoId);
  if (!banco) throw Object.assign(new Error('Ese banco no existe.'), { estado: 404 });
}

function preguntaEditable(db, preguntaId) {
  const pregunta = db.prepare('SELECT id, banco_id, grupo_id FROM preguntas WHERE id = ?').get(preguntaId);
  if (!pregunta) throw Object.assign(new Error('Esa pregunta no existe.'), { estado: 404 });

  if (pregunta.grupo_id) {
    throw Object.assign(
      new Error('Esta pregunta pertenece a un grupo del banco importado y no se puede editar desde aquí.'),
      { estado: 409 },
    );
  }

  const usos = db
    .prepare('SELECT count(*) AS total FROM intento_preguntas WHERE pregunta_id = ?')
    .get(preguntaId).total;
  if (usos > 0) {
    throw Object.assign(
      new Error(
        'Esta pregunta ya se usó en una evaluación y no se puede editar ni eliminar: ' +
          'sus respuestas deben seguir siendo auditables.',
      ),
      { estado: 409 },
    );
  }

  return pregunta;
}

/** Agrega una pregunta suelta (sin grupo) a un banco ya existente. */
export function agregarPreguntaManual(db, bancoId, datos) {
  bancoExistente(db, bancoId);

  const { registro, errores } = validarPreguntaManual(datos);
  if (errores.length > 0) throw Object.assign(new Error('Hay errores en la pregunta.'), { estado: 400, errores });

  const insertarPregunta = db.prepare(`
    INSERT INTO preguntas (banco_id, contexto, enunciado) VALUES (?, ?, ?)
  `);
  const insertarOpcion = db.prepare(`
    INSERT INTO opciones (pregunta_id, texto, es_correcta, justificacion) VALUES (?, ?, ?, ?)
  `);

  const preguntaId = db.transaction(() => {
    const id = insertarPregunta.run(
      bancoId,
      serializarBloques(bloquesDeContexto(registro)),
      serializarBloques([{ tipo: 'texto', texto: registro.enunciado }]),
    ).lastInsertRowid;

    for (const opcion of registro.opciones) {
      insertarOpcion.run(
        id,
        serializarBloques([{ tipo: 'texto', texto: opcion.texto }]),
        opcion.esCorrecta ? 1 : 0,
        opcion.justificacion,
      );
    }
    return id;
  })();

  return preguntaUnica(db, preguntaId);
}

/** Reemplaza contexto, enunciado y las 4 opciones de una pregunta suelta existente. */
export function actualizarPreguntaManual(db, preguntaId, datos) {
  preguntaEditable(db, preguntaId);

  const { registro, errores } = validarPreguntaManual(datos);
  if (errores.length > 0) throw Object.assign(new Error('Hay errores en la pregunta.'), { estado: 400, errores });

  db.transaction(() => {
    db.prepare('UPDATE preguntas SET contexto = ?, enunciado = ? WHERE id = ?').run(
      serializarBloques(bloquesDeContexto(registro)),
      serializarBloques([{ tipo: 'texto', texto: registro.enunciado }]),
      preguntaId,
    );

    db.prepare('DELETE FROM opciones WHERE pregunta_id = ?').run(preguntaId);
    const insertarOpcion = db.prepare(`
      INSERT INTO opciones (pregunta_id, texto, es_correcta, justificacion) VALUES (?, ?, ?, ?)
    `);
    for (const opcion of registro.opciones) {
      insertarOpcion.run(
        preguntaId,
        serializarBloques([{ tipo: 'texto', texto: opcion.texto }]),
        opcion.esCorrecta ? 1 : 0,
        opcion.justificacion,
      );
    }
  })();

  return preguntaUnica(db, preguntaId);
}

/** Elimina una pregunta suelta (cascada a sus opciones por la FK). */
export function eliminarPregunta(db, preguntaId) {
  const pregunta = preguntaEditable(db, preguntaId);
  db.prepare('DELETE FROM preguntas WHERE id = ?').run(preguntaId);
  return pregunta;
}
