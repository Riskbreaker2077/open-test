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
