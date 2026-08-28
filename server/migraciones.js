/**
 * Migraciones del esquema.
 *
 * `CREATE TABLE IF NOT EXISTS` de `schema.sql` crea las tablas que faltan,
 * pero no añade columnas ni cambia un CHECK en una base que ya existe. Y el
 * docente no va a ejecutar migraciones: su `.db` es un archivo que copia entre
 * máquinas y que ya puede tener sus estudiantes y sus bancos cargados.
 *
 * Esto es lo mínimo que resuelve eso: un contador de versión en `config` y una
 * lista ordenada de pasos idempotentes. No es un sistema de migraciones; es
 * una lista que se recorre una vez.
 */

const CLAVE_VERSION = 'esquema_version';

/** Añade una columna solo si falta. La forma barata de evolucionar el esquema. */
function anadirColumna(db, tabla, columna, definicion) {
  const existe = db.pragma(`table_info(${tabla})`).some((c) => c.name === columna);
  if (!existe) db.exec(`ALTER TABLE ${tabla} ADD COLUMN ${columna} ${definicion}`);
}

const MIGRACIONES = [
  {
    version: 1,
    descripcion: 'Reloj global de sesión y varias sesiones abiertas a la vez',
    aplicar(db) {
      // SQLite no sabe modificar un CHECK, así que para ampliar los estados
      // hay que rehacer la tabla. Es la receta estándar del propio SQLite.
      const definicion = db
        .prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'sesiones'")
        .get()?.sql;

      if (definicion && !definicion.includes("'en_curso'")) {
        db.exec(`
          CREATE TABLE sesiones_nueva (
            id                          INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre                      TEXT NOT NULL,
            banco_id                    INTEGER NOT NULL REFERENCES bancos (id),
            cursos                      TEXT NOT NULL,
            n_preguntas                 INTEGER NOT NULL DEFAULT 20 CHECK (n_preguntas > 0),
            duracion_minutos            INTEGER NOT NULL DEFAULT 60 CHECK (duracion_minutos > 0),
            segundos_minimos_pregunta   INTEGER NOT NULL DEFAULT 10 CHECK (segundos_minimos_pregunta >= 0),
            nivel_feedback              TEXT NOT NULL DEFAULT 'aciertos'
                                          CHECK (nivel_feedback IN ('solo_puntaje', 'aciertos', 'completo')),
            preguntas_extra_por_rapidez INTEGER NOT NULL DEFAULT 0,
            estado                      TEXT NOT NULL DEFAULT 'borrador'
                                          CHECK (estado IN ('borrador', 'abierta', 'en_curso', 'pausada', 'cerrada')),
            comenzada_en                TEXT,
            pausada_en                  TEXT,
            segundos_pausados           INTEGER NOT NULL DEFAULT 0,
            creado_en                   TEXT NOT NULL
          );

          INSERT INTO sesiones_nueva
            (id, nombre, banco_id, cursos, n_preguntas, duracion_minutos,
             segundos_minimos_pregunta, nivel_feedback, preguntas_extra_por_rapidez,
             estado, creado_en)
          SELECT
             id, nombre, banco_id, cursos, n_preguntas, duracion_minutos,
             segundos_minimos_pregunta, nivel_feedback, preguntas_extra_por_rapidez,
             estado, creado_en
          FROM sesiones;

          DROP TABLE sesiones;
          ALTER TABLE sesiones_nueva RENAME TO sesiones;
        `);
      } else {
        anadirColumna(db, 'sesiones', 'comenzada_en', 'TEXT');
        anadirColumna(db, 'sesiones', 'pausada_en', 'TEXT');
        anadirColumna(db, 'sesiones', 'segundos_pausados', 'INTEGER NOT NULL DEFAULT 0');
      }

      // Ya no hay una sola sesión abierta a la vez.
      db.exec('DROP INDEX IF EXISTS idx_una_sesion_abierta');
    },
  },
  {
    version: 2,
    descripcion: 'Posición y tiempo de vista del examen por intento',
    aplicar(db) {
      anadirColumna(db, 'intentos', 'pregunta_actual', 'INTEGER NOT NULL DEFAULT 1');
      anadirColumna(db, 'intentos', 'pregunta_mostrada_en', 'TEXT');
    },
  },
  {
    version: 3,
    descripcion: 'Estándar preguntas-icfes: metadata pedagógica y justificación por opción',
    aplicar(db) {
      // Un banco ya cargado no tiene esta metadata y no se puede inventar
      // retroactivamente: queda en '' hasta que el docente reimporte con el
      // paquete nuevo. `contexto`/`texto` ya guardaban texto plano; una base
      // vieja sigue teniendo ese texto plano en la columna hasta que se
      // reimporte, momento en el que preguntas.js escribe JSON de bloques.
      anadirColumna(db, 'preguntas', 'competencia', "TEXT NOT NULL DEFAULT ''");
      anadirColumna(db, 'preguntas', 'componente', "TEXT NOT NULL DEFAULT ''");
      anadirColumna(db, 'preguntas', 'afirmacion', "TEXT NOT NULL DEFAULT ''");
      anadirColumna(db, 'preguntas', 'evidencia', "TEXT NOT NULL DEFAULT ''");
      anadirColumna(db, 'preguntas', 'estandar_asociado', "TEXT NOT NULL DEFAULT ''");
      anadirColumna(db, 'preguntas', 'que_evalua', "TEXT NOT NULL DEFAULT ''");
      anadirColumna(db, 'opciones', 'justificacion', "TEXT NOT NULL DEFAULT ''");
    },
  },
];

export const ULTIMA_VERSION = MIGRACIONES.at(-1)?.version ?? 0;

export function versionDe(db) {
  const fila = db.prepare('SELECT valor FROM config WHERE clave = ?').get(CLAVE_VERSION);
  return fila ? Number(fila.valor) : 0;
}

export function fijarVersion(db, version) {
  db.prepare(
    'INSERT INTO config (clave, valor) VALUES (?, ?) ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor',
  ).run(CLAVE_VERSION, String(version));
}

/**
 * Aplica lo que falte. Volver a llamar no hace nada: es la propiedad que
 * permite ejecutarlo en cada arranque sin pensárselo.
 */
export function aplicarMigraciones(db) {
  const desde = versionDe(db);
  const pendientes = MIGRACIONES.filter((m) => m.version > desde);
  if (pendientes.length === 0) return { aplicadas: [], version: desde };

  // Rehacer una tabla con claves foráneas activas fallaría; es la receta que
  // documenta SQLite para este caso.
  const fkActivas = db.pragma('foreign_keys', { simple: true }) === 1;
  if (fkActivas) db.pragma('foreign_keys = OFF');

  try {
    db.transaction(() => {
      for (const migracion of pendientes) {
        migracion.aplicar(db);
        fijarVersion(db, migracion.version);
      }
    })();

    const rotas = db.pragma('foreign_key_check');
    if (rotas.length > 0) {
      throw new Error(`La migración dejó ${rotas.length} referencia(s) rota(s).`);
    }
  } finally {
    if (fkActivas) db.pragma('foreign_keys = ON');
  }

  return { aplicadas: pendientes.map((m) => m.version), version: ULTIMA_VERSION };
}
