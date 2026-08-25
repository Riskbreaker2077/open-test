/** Guarda el paquete entero en una transacción: o entra todo, o nada. */
export function guardarBanco(db, nombre, preguntas) {
  const insertarBanco = db.prepare('INSERT INTO bancos (nombre, creado_en) VALUES (?, ?)');
  const insertarPregunta = db.prepare(`
    INSERT INTO preguntas (banco_id, contexto, imagen, enunciado, explicacion)
    VALUES (?, ?, ?, ?, ?)
  `);
  const insertarOpcion = db.prepare(
    'INSERT INTO opciones (pregunta_id, texto, es_correcta) VALUES (?, ?, ?)',
  );

  return db.transaction(() => {
    const bancoId = insertarBanco.run(nombre, new Date().toISOString()).lastInsertRowid;

    for (const pregunta of preguntas) {
      const preguntaId = insertarPregunta.run(
        bancoId,
        pregunta.contexto || null,
        pregunta.imagen || null,
        pregunta.enunciado,
        pregunta.explicacion || null,
      ).lastInsertRowid;

      pregunta.opciones.forEach((texto, i) => {
        insertarOpcion.run(preguntaId, texto, i === pregunta.correcta ? 1 : 0);
      });
    }

    return { bancoId, preguntas: preguntas.length };
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

/** Las preguntas con sus opciones. Solo para el panel: incluye la correcta. */
export function preguntasDeBanco(db, bancoId) {
  const preguntas = db
    .prepare('SELECT * FROM preguntas WHERE banco_id = ? ORDER BY id')
    .all(bancoId);
  const opciones = db.prepare('SELECT * FROM opciones WHERE pregunta_id = ? ORDER BY id');

  return preguntas.map((pregunta) => ({
    ...pregunta,
    opciones: opciones.all(pregunta.id),
  }));
}

export function obtenerBanco(db, bancoId) {
  const banco = db.prepare('SELECT * FROM bancos WHERE id = ?').get(bancoId);
  if (!banco) throw Object.assign(new Error('Ese banco no existe.'), { estado: 404 });

  return { ...banco, preguntas: preguntasDeBanco(db, bancoId) };
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
