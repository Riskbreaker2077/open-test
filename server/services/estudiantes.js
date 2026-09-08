import { COLUMNAS, validarEstudianteIndividual } from '../importers/estudiantes.js';

/**
 * Guarda la lista en una sola transacción: o entra entera o no entra nada.
 * Actualiza por código y nunca borra a quien no venga en el archivo, para que
 * cargar por error la lista de otro curso no destruya la que ya había.
 */
export function guardarEstudiantes(db, registros) {
  const existe = db.prepare('SELECT 1 FROM estudiantes WHERE codigo = ?');
  const guardar = db.prepare(`
    INSERT INTO estudiantes (codigo, nombres, apellidos, curso)
    VALUES (@codigo, @nombres, @apellidos, @curso)
    ON CONFLICT(codigo) DO UPDATE SET
      nombres = excluded.nombres,
      apellidos = excluded.apellidos,
      curso = excluded.curso
  `);

  return db.transaction((lista) => {
    let creados = 0;
    let actualizados = 0;

    for (const registro of lista) {
      if (existe.get(registro.codigo)) actualizados += 1;
      else creados += 1;
      guardar.run(registro);
    }
    return { creados, actualizados, total: lista.length };
  })(registros);
}

/** Cuántos de la lista ya estaban: alimenta la previsualización, sin escribir. */
export function resumirCambios(db, registros) {
  const existe = db.prepare('SELECT 1 FROM estudiantes WHERE codigo = ?');
  let actualizados = 0;

  for (const registro of registros) {
    if (existe.get(registro.codigo)) actualizados += 1;
  }
  return { total: registros.length, actualizados, creados: registros.length - actualizados };
}

export function listarEstudiantes(db, { curso } = {}) {
  if (curso) {
    return db
      .prepare('SELECT * FROM estudiantes WHERE curso = ? ORDER BY apellidos, nombres')
      .all(curso);
  }
  return db.prepare('SELECT * FROM estudiantes ORDER BY curso, apellidos, nombres').all();
}

/** Los cursos que existen de verdad. Alimenta los selectores del panel. */
export function cursosDeEstudiantes(db) {
  return db
    .prepare('SELECT curso, count(*) AS total FROM estudiantes GROUP BY curso ORDER BY curso')
    .all();
}

export function contarEstudiantes(db) {
  return db.prepare('SELECT count(*) AS total FROM estudiantes').get().total;
}

/**
 * Marca un error de la API del docente: `estado` se traduce a HTTP y `errores`
 * (cuando existe) lleva la lista completa de problemas de validación para que
 * el docente los vea todos a la vez.
 */
const httpError = (estado, mensaje, errores) =>
  Object.assign(new Error(mensaje), { estado, errores });

/**
 * Crea un estudiante tras validar los cuatro campos del contrato.
 * Falla con 409 si el código ya existe y con 400 (con `errores`) si los datos
 * son inválidos.
 */
export function crearEstudiante(db, datos) {
  const problemas = validarEstudianteIndividual(datos);
  if (problemas.length > 0) throw httpError(400, problemas[0], problemas);

  const codigo = datos.codigo;
  const existente = db.prepare('SELECT 1 FROM estudiantes WHERE codigo = ?').get(codigo);
  if (existente) throw httpError(409, 'Ya existe un estudiante con ese código.');

  const campos = COLUMNAS.reduce((acc, columna) => {
    acc[columna] = datos[columna];
    return acc;
  }, {});
  db.prepare(
    'INSERT INTO estudiantes (codigo, nombres, apellidos, curso) VALUES (@codigo, @nombres, @apellidos, @curso)',
  ).run(campos);
  return db.prepare('SELECT * FROM estudiantes WHERE codigo = ?').get(codigo);
}

/**
 * Actualiza nombres, apellidos y curso de un estudiante existente.
 * El código nunca cambia: es la identidad y la FK de intentos.
 */
export function actualizarEstudiante(db, codigo, datos) {
  const existente = db.prepare('SELECT * FROM estudiantes WHERE codigo = ?').get(codigo);
  if (!existente) throw httpError(404, 'Ese estudiante no está en la lista.');

  const parcial = { codigo, nombres: datos.nombres, apellidos: datos.apellidos, curso: datos.curso };
  const problemas = validarEstudianteIndividual(parcial);
  if (problemas.length > 0) throw httpError(400, problemas[0], problemas);

  db.prepare(
    'UPDATE estudiantes SET nombres = @nombres, apellidos = @apellidos, curso = @curso WHERE codigo = @codigo',
  ).run(parcial);
  return db.prepare('SELECT * FROM estudiantes WHERE codigo = ?').get(codigo);
}

/**
 * Borrar a un estudiante con intentos registrados dejaría resultados
 * huérfanos y sin auditar, así que se impide.
 */
export function eliminarEstudiante(db, codigo) {
  const estudiante = db.prepare('SELECT * FROM estudiantes WHERE codigo = ?').get(codigo);
  if (!estudiante) {
    throw Object.assign(new Error('Ese estudiante no está en la lista.'), { estado: 404 });
  }

  const intentos = db
    .prepare('SELECT count(*) AS total FROM intentos WHERE codigo_estudiante = ?')
    .get(codigo).total;

  if (intentos > 0) {
    throw Object.assign(
      new Error(
        `No se puede eliminar a ${estudiante.nombres} ${estudiante.apellidos}: ya presentó ` +
          `${intentos} evaluación(es) y se perderían sus resultados.`,
      ),
      { estado: 409 },
    );
  }

  db.prepare('DELETE FROM estudiantes WHERE codigo = ?').run(codigo);
  return estudiante;
}
