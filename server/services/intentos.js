import { randomBytes } from 'node:crypto';
import { idsDePreguntasYOpciones } from './bancos.js';
import { generarPrueba } from './personalizacion.js';
import { puedeEntrar } from './sesiones.js';
import { calificarIntento, entregarIntentoCalificado, preguntasCalificables } from './calificacion.js';

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
  const token = randomBytes(32).toString('hex');

  return db.transaction(() => {
    const existente = db
      .prepare('SELECT * FROM intentos WHERE sesion_id = ? AND codigo_estudiante = ?')
      .get(sesion.id, estudiante.codigo);

    if (existente) {
      const motivo = puedeEntrar(sesion, estudiante);
      if (motivo && !existente.entregado_en) throw error(motivo, 409);
      db.prepare('UPDATE intentos SET token = ? WHERE id = ?').run(token, existente.id);
      return { intento: { ...existente, token }, nuevo: false };
    }

    const motivo = puedeEntrar(sesion, estudiante);
    if (motivo) throw error(motivo, 409);

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
    .prepare(`
      SELECT ip.*, p.grupo_id, p.tipo_item
      FROM intento_preguntas ip
      JOIN preguntas p ON p.id = ip.pregunta_id
      WHERE ip.intento_id = ?
      ORDER BY ip.orden
    `)
    .all(intentoId)
    .map((fila) => ({
      ...fila,
      grupo_id: fila.grupo_id ?? null,
      tipo_item: fila.tipo_item ?? 'estandar',
      ordenOpciones: fila.orden_opciones.split(',').map(Number),
    }));
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

export function forzarEntrega(db, intentoId, ahora = new Date()) {
  const intento = db.prepare('SELECT * FROM intentos WHERE id = ?').get(intentoId);
  if (!intento) throw error('Ese intento no existe.', 404);
  if (intento.entregado_en) return { intento, nueva: false };
  const sesion = db.prepare('SELECT * FROM sesiones WHERE id = ?').get(intento.sesion_id);
  if (sesion.estado === 'cerrada' || sesion.estado === 'borrador') {
    throw error('No se puede forzar una entrega en el estado actual de la evaluación.', 409);
  }
  const entregadoEn = (ahora instanceof Date ? ahora : new Date(ahora)).toISOString();
  return {
    intento: entregarIntentoCalificado(db, intento.id, 'forzada_docente', entregadoEn),
    nueva: true,
  };
}

/**
 * Anula la prueba de un estudiante (038).
 *
 * Anular es un **estado del intento**, no una nota: por eso vive en
 * `anulado_en` y no solo en un puntaje cero, que también lo saca quien falla
 * las veinte preguntas. La sanción tiene que poder demostrarse meses después.
 *
 * No borra ni una respuesta. Eso es lo que hace reversible un doble clic
 * accidental sobre el proyector y lo que conserva la evidencia de lo que el
 * estudiante llevaba hecho.
 */
export function anularIntento(db, intentoId, ahora = new Date()) {
  const intento = db.prepare('SELECT * FROM intentos WHERE id = ?').get(intentoId);
  if (!intento) throw error('Ese intento no existe.', 404);
  if (intento.anulado_en) return { intento, nueva: false };

  const sesion = db.prepare('SELECT * FROM sesiones WHERE id = ?').get(intento.sesion_id);
  if (sesion.estado === 'borrador') {
    throw error('Esta evaluación todavía no ha empezado: no hay prueba que anular.', 409);
  }

  const cuando = (ahora instanceof Date ? ahora : new Date(ahora)).toISOString();
  return db.transaction(() => {
    if (intento.entregado_en) {
      // Ya había entregado: se le conserva su entrega original, que cuenta qué
      // pasó de verdad. La anulación se superpone, no reescribe la historia.
      db.prepare('UPDATE intentos SET anulado_en = ?, aciertos = 0, puntaje = 0 WHERE id = ?')
        .run(cuando, intentoId);
    } else {
      db.prepare(`
        UPDATE intentos
        SET anulado_en = ?, entregado_en = ?, motivo_entrega = 'anulada_docente',
            aciertos = 0, puntaje = 0
        WHERE id = ?
      `).run(cuando, cuando, intentoId);
    }
    return {
      intento: db.prepare('SELECT * FROM intentos WHERE id = ?').get(intentoId),
      nueva: true,
    };
  })();
}

/**
 * Deshace una anulación. Como la calificación es una función pura de las
 * respuestas, y anular no borró ninguna, recalcularla devuelve exactamente la
 * nota que había.
 */
export function revertirAnulacion(db, intentoId) {
  const intento = db.prepare('SELECT * FROM intentos WHERE id = ?').get(intentoId);
  if (!intento) throw error('Ese intento no existe.', 404);
  if (!intento.anulado_en) return { intento, nueva: false };

  return db.transaction(() => {
    if (intento.motivo_entrega === 'anulada_docente') {
      // La entrega era la de la propia anulación: el estudiante vuelve a
      // presentar donde iba, con sus respuestas intactas.
      db.prepare(`
        UPDATE intentos
        SET anulado_en = NULL, entregado_en = NULL, motivo_entrega = NULL,
            aciertos = NULL, puntaje = NULL
        WHERE id = ?
      `).run(intentoId);
    } else {
      // Ya había entregado antes de que se le anulara: se le restituye su nota.
      const { aciertos, puntaje } = calificarIntento(preguntasCalificables(db, intentoId));
      db.prepare('UPDATE intentos SET anulado_en = NULL, aciertos = ?, puntaje = ? WHERE id = ?')
        .run(aciertos, puntaje, intentoId);
    }
    return {
      intento: db.prepare('SELECT * FROM intentos WHERE id = ?').get(intentoId),
      nueva: true,
    };
  })();
}

export function anulado(intento) {
  return Boolean(intento?.anulado_en);
}
