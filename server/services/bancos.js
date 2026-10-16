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
 * Los `id` de grupo son clave primaria en toda la base, no por banco: cargar
 * dos veces el mismo ZIP (en el mismo banco o en otro) chocaría. Los que ya
 * existen reciben un sufijo y sus miembros se reescriben para seguirlos.
 */
function conIdsDeGrupoLibres(db, preguntas, grupos) {
  const existe = db.prepare('SELECT 1 FROM grupos WHERE id = ?');
  const usados = new Set();
  const renombre = new Map();
  for (const grupo of grupos) {
    let id = grupo.id;
    for (let n = 2; existe.get(id) || usados.has(id); n += 1) id = `${grupo.id}-${n}`;
    usados.add(id);
    if (id !== grupo.id) renombre.set(grupo.id, id);
  }
  if (renombre.size === 0) return { preguntas, grupos };
  return {
    grupos: grupos.map((g) => (renombre.has(g.id) ? { ...g, id: renombre.get(g.id) } : g)),
    preguntas: preguntas.map((p) => (renombre.has(p.grupo_id) ? { ...p, grupo_id: renombre.get(p.grupo_id) } : p)),
  };
}

/** Inserta preguntas y grupos validados en un banco ya existente. Llamar dentro de una transacción. */
function insertarContenido(db, bancoId, preguntasEntrada, gruposEntrada = []) {
  const { preguntas, grupos } = conIdsDeGrupoLibres(db, preguntasEntrada, gruposEntrada);
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
  return db.transaction(() => {
    const bancoId = db
      .prepare('INSERT INTO bancos (nombre, creado_en) VALUES (?, ?)')
      .run(nombre, new Date().toISOString()).lastInsertRowid;
    return insertarContenido(db, bancoId, preguntas, grupos);
  })();
}

/** Añade un paquete ya validado a un banco existente (052), sin crear uno nuevo. */
export function agregarPaqueteABanco(db, bancoId, preguntas, grupos = []) {
  bancoExistente(db, bancoId);
  return db.transaction(() => insertarContenido(db, bancoId, preguntas, grupos))();
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
             procedencia, verificado, fuentes, version_estandar,
             (SELECT count(*) FROM intento_preguntas ip WHERE ip.pregunta_id = preguntas.id) AS usos
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
        .prepare('SELECT id, tipo, banco FROM grupos WHERE id = ?')
        .get(pregunta.grupo_id);
      if (fila) {
        const banco = JSON.parse(fila.banco ?? '[]');
        gruposPorId.set(fila.id, { tipo: fila.tipo, entradas: banco.map((e) => ({ id: e.id })) });
      }
    }
  }

  return preguntas.map((pregunta) => ({
    id: pregunta.id,
    competencia: pregunta.competencia,
    grupo_id: pregunta.grupo_id ?? null,
    // Solo el contexto compartido se puede partir para completar la prueba (053).
    grupo_divisible: gruposPorId.get(pregunta.grupo_id)?.tipo === 'contexto_compartido',
    tipo_item: pregunta.tipo_item ?? 'estandar',
    opciones: pregunta.tipo_item === 'miembro_banco_opciones'
      ? (gruposPorId.get(pregunta.grupo_id)?.entradas ?? [])
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

  // Las que están en la papelera (046) también cuentan: se pueden restaurar.
  const { total: sesiones, enPapelera } = db
    .prepare(`
      SELECT count(*) AS total, count(en_papelera_en) AS enPapelera
      FROM sesiones WHERE banco_id = ?
    `)
    .get(bancoId);

  if (sesiones > 0) {
    const papelera = enPapelera > 0 ? ` (${enPapelera} en la papelera)` : '';
    throw Object.assign(
      new Error(
        `No se puede borrar "${banco.nombre}": se ha usado en ${sesiones} evaluación(es)${papelera} y ` +
          'sus resultados deben seguir siendo auditables.',
      ),
      { estado: 409 },
    );
  }

  db.prepare('DELETE FROM bancos WHERE id = ?').run(bancoId);
  return banco;
}

// --- Ingreso y edición de preguntas (028, ampliada en 052) ------------------
// La 028 nació con la forma simple de la 003 (texto plano y 4 opciones). La
// 052 deja corregir cualquier pregunta del banco entera: bloques del
// estándar, de 2 a 8 opciones, datos pedagógicos y miembros de grupo. El
// formato simple se sigue aceptando y se convierte al completo.

const LETRAS_OPCION = ['A', 'B', 'C', 'D'];
const N_OPCIONES_MANUAL = 4;
const MIN_OPCIONES = 2;
const MAX_OPCIONES = 8;
const CAMPOS_TEXTO_OPCIONAL = ['grado', 'prueba', 'nivel_mcer'];

function textoLimpio(valor) {
  return typeof valor === 'string' ? valor.trim() : '';
}

const letraDe = (i) => String.fromCharCode(65 + i);

function errorDeValidacion(errores) {
  return Object.assign(new Error('Hay errores en la pregunta.'), { estado: 400, errores });
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

/** El formato simple de la 028 trae strings donde el completo trae bloques. */
function esFormatoSimple(datos) {
  return typeof datos?.enunciado === 'string' || typeof datos?.contexto === 'string';
}

function aFormatoCompleto(datos) {
  const enunciado = textoLimpio(datos.enunciado);
  return {
    contexto: bloquesDeContexto({
      contexto: textoLimpio(datos.contexto),
      archivoImagen: textoLimpio(datos.archivoImagen) || null,
    }),
    enunciado: enunciado ? [{ tipo: 'texto', texto: enunciado }] : [],
    opciones: (Array.isArray(datos.opciones) ? datos.opciones : []).map((opcion) => ({
      contenido: textoLimpio(opcion?.texto) ? [{ tipo: 'texto', texto: textoLimpio(opcion.texto) }] : [],
      es_correcta: Boolean(opcion?.esCorrecta),
      justificacion: opcion?.justificacion,
    })),
  };
}

/** Un nombre de archivo de imagen, nunca una ruta. */
function archivoSeguro(nombre) {
  const limpio = textoLimpio(nombre);
  if (!limpio || /[/\\]/.test(limpio) || limpio.includes('..')) return null;
  return limpio;
}

/**
 * Revisa un array de bloques del estándar y devuelve su versión limpia. Los
 * bloques de texto vacíos se descartan; las propiedades que no se editan
 * aquí se conservan, para no perder nada de lo que trajo el ZIP.
 */
function validarBloques(bloques, donde, errores) {
  if (bloques == null) return [];
  if (!Array.isArray(bloques)) {
    errores.push(`${donde}: el contenido no es válido.`);
    return [];
  }
  const limpios = [];
  bloques.forEach((bloque, i) => {
    if (bloque?.tipo === 'texto') {
      const texto = textoLimpio(bloque.texto);
      if (texto) limpios.push({ ...bloque, texto });
      return;
    }
    if (bloque?.tipo === 'imagen') {
      const archivo = archivoSeguro(bloque.archivo);
      if (!archivo) {
        errores.push(`${donde}: falta elegir el archivo de la imagen ${i + 1}.`);
        return;
      }
      const limpio = { ...bloque, archivo };
      const descripcion = textoLimpio(bloque.descripcion_accesible);
      if (descripcion) limpio.descripcion_accesible = descripcion;
      else delete limpio.descripcion_accesible;
      limpios.push(limpio);
      return;
    }
    if (bloque?.tipo === 'tabla') {
      const encabezados = Array.isArray(bloque.encabezados) ? bloque.encabezados.map((c) => String(c ?? '').trim()) : [];
      const filas = Array.isArray(bloque.filas) ? bloque.filas : null;
      const bien = encabezados.length > 0 && filas
        && filas.every((fila) => Array.isArray(fila) && fila.length === encabezados.length);
      if (!bien) {
        errores.push(`${donde}: la tabla ${i + 1} está incompleta (cada fila debe tener tantas celdas como columnas).`);
        return;
      }
      limpios.push({ ...bloque, encabezados, filas: filas.map((fila) => fila.map((c) => String(c ?? '').trim())) });
      return;
    }
    errores.push(`${donde}: el bloque ${i + 1} es de un tipo que no se reconoce.`);
  });
  return limpios;
}

/**
 * Valida una pregunta en formato completo. `bancoDelGrupo` solo llega para
 * una miembro de emparejamiento: no tiene opciones propias, su respuesta es
 * una entrada de ese banco. Los datos pedagógicos solo se tocan si vienen:
 * el formato simple no los trae y no debe borrarlos.
 */
function validarPreguntaCompleta(entrada, { bancoDelGrupo = null } = {}) {
  const datos = esFormatoSimple(entrada) ? aFormatoCompleto(entrada) : (entrada ?? {});
  const errores = [];

  const contexto = validarBloques(datos.contexto ?? [], 'Contexto', errores);
  const enunciado = validarBloques(datos.enunciado ?? [], 'Enunciado', errores);
  if (enunciado.length === 0) errores.push('El enunciado es obligatorio.');

  const registro = { contexto, enunciado, opciones: [], campos: {} };

  if (bancoDelGrupo) {
    const respuesta = textoLimpio(datos.respuesta_pool_id);
    if (!bancoDelGrupo.some((entradaBanco) => entradaBanco.id === respuesta)) {
      errores.push('Elige cuál entrada del banco del grupo es la respuesta correcta.');
    }
    registro.campos.respuesta_pool_id = respuesta;
  } else {
    const opciones = Array.isArray(datos.opciones) ? datos.opciones : [];
    if (opciones.length < MIN_OPCIONES || opciones.length > MAX_OPCIONES) {
      errores.push(`Una pregunta lleva entre ${MIN_OPCIONES} y ${MAX_OPCIONES} opciones.`);
    }
    registro.opciones = opciones.map((opcion, i) => {
      const donde = `Opción ${letraDe(i)}`;
      const contenido = validarBloques(opcion?.contenido ?? [], donde, errores);
      if (contenido.length === 0) errores.push(`La opción ${letraDe(i)} no puede quedar vacía.`);
      return {
        contenido,
        es_correcta: Boolean(opcion?.es_correcta),
        justificacion: textoLimpio(opcion?.justificacion),
        procedencia_justificacion: typeof opcion?.procedencia_justificacion === 'string' ? opcion.procedencia_justificacion : null,
        justificacion_verificada: Number.isInteger(opcion?.justificacion_verificada) ? opcion.justificacion_verificada : null,
      };
    });
    if (opciones.length > 0 && registro.opciones.filter((o) => o.es_correcta).length !== 1) {
      errores.push('Marca exactamente una opción como correcta.');
    }
  }

  for (const campo of METADATA_POR_DEFECTO) {
    if (campo in datos) registro.campos[campo] = textoLimpio(datos[campo]);
  }
  for (const campo of CAMPOS_TEXTO_OPCIONAL) {
    if (campo in datos) registro.campos[campo] = textoLimpio(datos[campo]) || null;
  }
  if ('valor' in datos) {
    const valor = Number(datos.valor);
    if (!Number.isFinite(valor) || valor <= 0) errores.push('El valor debe ser un número mayor que cero.');
    else registro.campos.valor = valor;
  }

  return { registro, errores };
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

const MENSAJE_USADA =
  'Esta pregunta ya se usó en una evaluación y no se puede editar ni eliminar: ' +
  'sus respuestas deben seguir siendo auditables.';

function preguntaEditable(db, preguntaId) {
  const pregunta = db
    .prepare('SELECT id, banco_id, grupo_id, tipo_item FROM preguntas WHERE id = ?')
    .get(preguntaId);
  if (!pregunta) throw Object.assign(new Error('Esa pregunta no existe.'), { estado: 404 });

  const usos = db
    .prepare('SELECT count(*) AS total FROM intento_preguntas WHERE pregunta_id = ?')
    .get(preguntaId).total;
  if (usos > 0) throw Object.assign(new Error(MENSAJE_USADA), { estado: 409 });

  return pregunta;
}

function insertarOpciones(db, preguntaId, opciones) {
  const insertar = db.prepare(`
    INSERT INTO opciones (pregunta_id, texto, es_correcta, justificacion,
      procedencia_justificacion, justificacion_verificada)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  for (const opcion of opciones) {
    insertar.run(
      preguntaId,
      serializarBloques(opcion.contenido),
      opcion.es_correcta ? 1 : 0,
      opcion.justificacion,
      opcion.procedencia_justificacion,
      opcion.justificacion_verificada,
    );
  }
}

/** Escribe contenido, campos presentes y (si la pregunta las tiene) opciones. */
function escribirPregunta(db, preguntaId, registro, { conOpciones }) {
  const campos = Object.keys(registro.campos);
  const asignaciones = ['contexto = ?', 'enunciado = ?', ...campos.map((campo) => `${campo} = ?`)];
  db.prepare(`UPDATE preguntas SET ${asignaciones.join(', ')} WHERE id = ?`).run(
    serializarBloques(registro.contexto),
    serializarBloques(registro.enunciado),
    ...campos.map((campo) => registro.campos[campo]),
    preguntaId,
  );
  if (conOpciones) {
    db.prepare('DELETE FROM opciones WHERE pregunta_id = ?').run(preguntaId);
    insertarOpciones(db, preguntaId, registro.opciones);
  }
}

/** Agrega una pregunta suelta (sin grupo) a un banco ya existente. */
export function agregarPreguntaManual(db, bancoId, datos) {
  bancoExistente(db, bancoId);

  const { registro, errores } = validarPreguntaCompleta(datos);
  if (errores.length > 0) throw errorDeValidacion(errores);

  const preguntaId = db.transaction(() => {
    const id = db
      .prepare("INSERT INTO preguntas (banco_id, contexto, enunciado) VALUES (?, '[]', '[]')")
      .run(bancoId).lastInsertRowid;
    escribirPregunta(db, id, registro, { conOpciones: true });
    return id;
  })();

  return preguntaUnica(db, preguntaId);
}

/** Reemplaza el contenido, las opciones y los datos pedagógicos de cualquier pregunta no usada. */
export function actualizarPreguntaManual(db, preguntaId, datos) {
  const pregunta = preguntaEditable(db, preguntaId);
  const esMatching = pregunta.tipo_item === 'miembro_banco_opciones';
  const bancoDelGrupo = esMatching
    ? JSON.parse(db.prepare('SELECT banco FROM grupos WHERE id = ?').get(pregunta.grupo_id)?.banco ?? '[]')
    : null;

  const { registro, errores } = validarPreguntaCompleta(datos, { bancoDelGrupo });
  if (errores.length > 0) throw errorDeValidacion(errores);

  db.transaction(() => escribirPregunta(db, preguntaId, registro, { conOpciones: !esMatching }))();
  return preguntaUnica(db, preguntaId);
}

// En emparejamiento y texto con blancos el grupo es una sola pieza: quitar
// una miembro dejaría una entrada huérfana o un hueco sin pregunta en el pasaje.
const GRUPOS_INDIVISIBLES = new Set(['banco_opciones', 'texto_con_blancos']);

/** Elimina una pregunta (cascada a sus opciones); si deja vacío su grupo, también lo borra. */
export function eliminarPregunta(db, preguntaId) {
  const pregunta = preguntaEditable(db, preguntaId);
  const grupo = pregunta.grupo_id
    ? db.prepare('SELECT id, tipo FROM grupos WHERE id = ?').get(pregunta.grupo_id)
    : null;
  if (grupo && GRUPOS_INDIVISIBLES.has(grupo.tipo)) {
    throw Object.assign(
      new Error('Esta pregunta es parte de un grupo de emparejamiento o de texto con blancos: elimina el grupo completo.'),
      { estado: 409 },
    );
  }

  db.transaction(() => {
    db.prepare('DELETE FROM preguntas WHERE id = ?').run(preguntaId);
    if (grupo) {
      const quedan = db.prepare('SELECT count(*) AS total FROM preguntas WHERE grupo_id = ?').get(grupo.id).total;
      if (quedan === 0) db.prepare('DELETE FROM grupos WHERE id = ?').run(grupo.id);
    }
  })();
  return pregunta;
}

// --- Edición de grupos (052) ----------------------------------------------

function grupoEditable(db, grupoId) {
  const fila = db.prepare('SELECT * FROM grupos WHERE id = ?').get(grupoId);
  if (!fila) throw Object.assign(new Error('Ese grupo no existe.'), { estado: 404 });

  const usos = db.prepare(`
    SELECT count(*) AS total FROM intento_preguntas ip
    JOIN preguntas p ON p.id = ip.pregunta_id
    WHERE p.grupo_id = ?
  `).get(grupoId).total;
  if (usos > 0) {
    throw Object.assign(
      new Error(
        'Este grupo tiene preguntas que ya se usaron en una evaluación y no se puede editar ni eliminar: ' +
          'sus respuestas deben seguir siendo auditables.',
      ),
      { estado: 409 },
    );
  }
  return parsearGrupo(fila);
}

/** Corrige el contexto compartido, el banco de opciones y la metadata pedagógica de un grupo. */
export function actualizarGrupo(db, grupoId, datos) {
  const grupo = grupoEditable(db, grupoId);
  const errores = [];

  const contexto = validarBloques(datos?.contexto ?? [], 'Contexto del grupo', errores);

  let banco = grupo.banco;
  if (grupo.tipo === 'banco_opciones') {
    const entradas = Array.isArray(datos?.banco) ? datos.banco : [];
    if (entradas.length < MIN_OPCIONES) errores.push(`El banco de opciones lleva al menos ${MIN_OPCIONES} entradas.`);
    const vistos = new Set();
    banco = entradas.map((entrada, i) => {
      const id = textoLimpio(entrada?.id) || `e${i + 1}`;
      if (vistos.has(id)) errores.push(`La entrada "${id}" del banco está repetida.`);
      vistos.add(id);
      const contenido = validarBloques(entrada?.contenido ?? [], `Entrada ${i + 1} del banco`, errores);
      if (contenido.length === 0) errores.push(`La entrada ${i + 1} del banco no puede quedar vacía.`);
      return { ...entrada, id, contenido };
    });
    const respuestas = db
      .prepare('SELECT DISTINCT respuesta_pool_id AS id FROM preguntas WHERE grupo_id = ? AND respuesta_pool_id IS NOT NULL')
      .all(grupoId)
      .map((fila) => fila.id);
    for (const respuesta of respuestas) {
      if (!vistos.has(respuesta)) {
        errores.push(`No puedes quitar la entrada "${respuesta}": es la respuesta correcta de una pregunta del grupo.`);
      }
    }
  }

  const metadata = { ...grupo.metadata_pedagogica };
  for (const campo of METADATA_POR_DEFECTO) {
    if (datos?.metadata_pedagogica && campo in datos.metadata_pedagogica) {
      metadata[campo] = textoLimpio(datos.metadata_pedagogica[campo]);
    }
  }

  if (errores.length > 0) throw Object.assign(new Error('Hay errores en el grupo.'), { estado: 400, errores });

  db.prepare('UPDATE grupos SET contexto = ?, banco = ?, metadata_pedagogica = ? WHERE id = ?').run(
    serializarBloques(contexto),
    JSON.stringify(banco),
    JSON.stringify(metadata),
    grupoId,
  );
  return parsearGrupo(db.prepare('SELECT * FROM grupos WHERE id = ?').get(grupoId));
}

/** Elimina un grupo con todas sus preguntas. */
export function eliminarGrupo(db, grupoId) {
  const grupo = grupoEditable(db, grupoId);
  db.transaction(() => {
    db.prepare('DELETE FROM preguntas WHERE grupo_id = ?').run(grupoId);
    db.prepare('DELETE FROM grupos WHERE id = ?').run(grupoId);
  })();
  return grupo;
}
