import { randomBytes } from 'node:crypto';
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

    return { intento: db.prepare('SELECT * FROM intentos WHERE id = ?').get(id), nuevo: true };
  })();
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
