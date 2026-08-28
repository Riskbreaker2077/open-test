-- Esquema completo de OpenTest.
-- Se aplica entero en cada arranque con CREATE ... IF NOT EXISTS: el docente
-- copia el archivo .db entre máquinas y nunca va a ejecutar migraciones.

-- Ajustes del equipo en formato clave/valor. Guarda la contraseña del panel
-- derivada con scrypt (docente_hash + docente_salt); nunca en claro.
CREATE TABLE IF NOT EXISTS config (
  clave TEXT PRIMARY KEY NOT NULL,
  valor TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS estudiantes (
  codigo    TEXT PRIMARY KEY NOT NULL,
  nombres   TEXT NOT NULL,
  apellidos TEXT NOT NULL,
  curso     TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_estudiantes_curso ON estudiantes (curso);

CREATE TABLE IF NOT EXISTS bancos (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre    TEXT NOT NULL,
  creado_en TEXT NOT NULL
);

-- Sigue el estándar externo preguntas-icfes v1
-- (https://github.com/riskbreaker2077/preguntas-icfes, ver
-- spec/contracts/paquete-preguntas-icfes.md). `contexto` y `enunciado`
-- guardan JSON serializado: un array de bloques `{tipo: texto|imagen|tabla, ...}`,
-- nunca texto plano. `imagen` queda como columna heredada, sin usar desde la
-- 016: las imágenes ahora son bloques dentro de contexto/enunciado/opciones.
CREATE TABLE IF NOT EXISTS preguntas (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  banco_id          INTEGER NOT NULL REFERENCES bancos (id) ON DELETE CASCADE,
  contexto          TEXT NOT NULL DEFAULT '[]',
  imagen            TEXT,
  enunciado         TEXT NOT NULL,
  competencia       TEXT NOT NULL DEFAULT '',
  componente        TEXT NOT NULL DEFAULT '',
  afirmacion        TEXT NOT NULL DEFAULT '',
  evidencia         TEXT NOT NULL DEFAULT '',
  estandar_asociado TEXT NOT NULL DEFAULT '',
  que_evalua        TEXT NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_preguntas_banco ON preguntas (banco_id);

-- Invariante: exactamente 4 opciones por pregunta y exactamente una correcta,
-- y cada opción trae su propia justificación (incluidas las incorrectas). No
-- es expresable en SQL; lo garantiza el importador (features 003 y 016).
-- `texto` guarda JSON serializado: un array de bloques, igual que `contexto`.
CREATE TABLE IF NOT EXISTS opciones (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  pregunta_id   INTEGER NOT NULL REFERENCES preguntas (id) ON DELETE CASCADE,
  texto         TEXT NOT NULL,
  es_correcta   INTEGER NOT NULL CHECK (es_correcta IN (0, 1)),
  justificacion TEXT NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_opciones_pregunta ON opciones (pregunta_id);

CREATE TABLE IF NOT EXISTS sesiones (
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
  -- Reloj global: el plazo vence en comenzada_en + duracion_minutos + segundos_pausados.
  -- Todos terminan a la misma hora y es el mismo reloj que se proyecta al aula.
  comenzada_en                TEXT,
  pausada_en                  TEXT,
  segundos_pausados           INTEGER NOT NULL DEFAULT 0,
  creado_en                   TEXT NOT NULL
);

-- Pueden coexistir varias sesiones abiertas: 10A en Ciencias mientras 10B
-- está en Matemáticas. El estudiante elige entre las de su curso.

CREATE TABLE IF NOT EXISTS intentos (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  sesion_id         INTEGER NOT NULL REFERENCES sesiones (id) ON DELETE CASCADE,
  codigo_estudiante TEXT NOT NULL REFERENCES estudiantes (codigo),
  semilla           TEXT NOT NULL,
  token             TEXT NOT NULL UNIQUE,
  iniciado_en       TEXT NOT NULL,
  entregado_en      TEXT,
  motivo_entrega    TEXT CHECK (motivo_entrega IN
                      ('manual', 'tiempo', 'ultima_pregunta', 'forzada_docente')),
  aciertos          INTEGER,
  puntaje           INTEGER,
  pregunta_actual   INTEGER NOT NULL DEFAULT 1 CHECK (pregunta_actual > 0),
  pregunta_mostrada_en TEXT,
  UNIQUE (sesion_id, codigo_estudiante)
);

CREATE INDEX IF NOT EXISTS idx_intentos_sesion ON intentos (sesion_id);

-- La prueba materializada. Se escribe una sola vez al iniciar el intento y
-- nunca se regenera: es lo que permite reanudar tras una caída y auditar
-- después qué vio exactamente cada estudiante.
CREATE TABLE IF NOT EXISTS intento_preguntas (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  intento_id     INTEGER NOT NULL REFERENCES intentos (id) ON DELETE CASCADE,
  orden          INTEGER NOT NULL,
  pregunta_id    INTEGER NOT NULL REFERENCES preguntas (id),
  orden_opciones TEXT NOT NULL,
  UNIQUE (intento_id, orden)
);

CREATE INDEX IF NOT EXISTS idx_intento_preguntas_intento ON intento_preguntas (intento_id);

-- opcion_id NULL = la vio y la saltó. Ausencia de fila = nunca llegó a ella.
CREATE TABLE IF NOT EXISTS respuestas (
  id                   INTEGER PRIMARY KEY AUTOINCREMENT,
  intento_pregunta_id  INTEGER NOT NULL UNIQUE REFERENCES intento_preguntas (id) ON DELETE CASCADE,
  opcion_id            INTEGER REFERENCES opciones (id),
  segundos_en_pantalla INTEGER NOT NULL DEFAULT 0,
  respondido_en        TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_respuestas_intento_pregunta ON respuestas (intento_pregunta_id);
