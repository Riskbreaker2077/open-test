import { randomBytes } from 'node:crypto';
import { idsDePreguntasYOpciones } from './bancos.js';
import { generarPrueba } from './personalizacion.js';
import { puedeEntrar } from './sesiones.js';

const error = (mensaje, estado = 400) => Object.assign(new Error(mensaje), { estado });

/**
 * Crea el intento del estudiante o le devuelve el que ya tenía.
 *
 * La identidad se ancla al par (sesión, código), no al token: una tablet que
 * se apaga, se limpia o se cambia por otra es lo normal en un aula, y anclar
 * al token convertiría eso en la pérdida del examen.
 *
 * El token se renueva en cada entrada, así que la última tablet en la que se
 * identificó es la única que sigue valiendo.
 */
export function iniciarOReanudarIntento(db, sesion, estudiante) {
  const motivo = puedeEntrar(sesion, estudiante);
  if (motivo) throw error(motivo, 409);

  const token = randomBytes(32).toString('hex');

  return db.transaction(() => {
    const existente = db
      .prepare('SELECT * FROM intentos WHERE sesion_id = ? AND codigo_estudiante = ?')
      .get(sesion.id, estudiante.codigo);

    if (existente) {
      db.prepare('UPDATE intentos SET token = ? WHERE id = ?').run(token, existente.id);
      return { intento: { ...existente, token }, nuevo: false };
    }

    const id = db
      .prepare(`
        INSERT INTO intentos (sesion_id, codigo_estudiante, semilla, token, iniciado_en)
        VALUES (?, ?, ?, ?, ?)
      `)
      .run(
        sesion.id,
        estudiante.codigo,
        randomBytes(16).toString('hex'),
        token,
        new Date().toISOString(),
      ).lastInsertRowid;

    const intento = db.prepare('SELECT * FROM intentos WHERE id = ?').get(id);
    // Su prueba queda fijada aquí y no se vuelve a tocar.
    materializarPrueba(db, intento);

    return { intento, nuevo: true };
  })();
}

/**
 * Escribe la prueba de este estudiante: qué preguntas le tocan y en qué orden
 * van sus opciones.
 *
 * **Se escribe una sola vez y nunca se regenera.** Podría haberse guardado
 * solo la semilla y recalculado en cada petición, pero entonces bastaría con
 * borrar una pregunta del banco para que la prueba de un estudiante cambiara a
 * mitad de examen. Estas filas son un registro histórico, no una caché: son lo
 * que permite reanudar tras una caída y auditar meses después qué vio quien
 * reclama su nota.
 */
export function materializarPrueba(db, intento) {
  return db.transaction(() => {
    const yaMaterializada = db
      .prepare('SELECT count(*) AS total FROM intento_preguntas WHERE intento_id = ?')
      .get(intento.id).total;

    if (yaMaterializada > 0) return { generada: false, preguntas: yaMaterializada };

    const sesion = db.prepare('SELECT * FROM sesiones WHERE id = ?').get(intento.sesion_id);
    const prueba = generarPrueba({
      preguntas: idsDePreguntasYOpciones(db, sesion.banco_id),
      nPreguntas: sesion.n_preguntas,
      semilla: intento.semilla,
    });

    const insertar = db.prepare(`
      INSERT INTO intento_preguntas (intento_id, orden, pregunta_id, orden_opciones)
      VALUES (?, ?, ?, ?)
    `);
    for (const fila of prueba) {
      insertar.run(intento.id, fila.orden, fila.preguntaId, fila.ordenOpciones.join(','));
    }

    return { generada: true, preguntas: prueba.length };
  })();
}

/** La prueba tal como se le mostró, en su orden. */
export function pruebaDelIntento(db, intentoId) {
  return db
    .prepare('SELECT * FROM intento_preguntas WHERE intento_id = ? ORDER BY orden')
    .all(intentoId)
    .map((fila) => ({ ...fila, ordenOpciones: fila.orden_opciones.split(',').map(Number) }));
}

export function intentoPorToken(db, token) {
  if (typeof token !== 'string' || token === '') return null;
  return db.prepare('SELECT * FROM intentos WHERE token = ?').get(token) ?? null;
}

export function entregado(intento) {
  return Boolean(intento?.entregado_en);
}

export function contarIntentos(db, sesionId) {
  return db
    .prepare(`
      SELECT count(*) AS dentro,
             sum(CASE WHEN entregado_en IS NOT NULL THEN 1 ELSE 0 END) AS entregados
      FROM intentos WHERE sesion_id = ?
    `)
    .get(sesionId);
}
