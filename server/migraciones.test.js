import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';
import Database from 'better-sqlite3';
import { abrirBd, cerrarBd } from './db.js';
import { aplicarMigraciones, ULTIMA_VERSION, versionDe } from './migraciones.js';

function carpetaTemporal() {
  const carpeta = mkdtempSync(join(tmpdir(), 'opentest-mig-'));
  return { ruta: join(carpeta, 'viejo.db'), limpiar: () => rmSync(carpeta, { recursive: true, force: true }) };
}

/** Reconstruye una base como la que tendría un docente de la versión anterior. */
function baseAntigua(ruta) {
  const db = new Database(ruta);
  db.exec(`
    CREATE TABLE config (clave TEXT PRIMARY KEY NOT NULL, valor TEXT NOT NULL);
    CREATE TABLE estudiantes (
      codigo TEXT PRIMARY KEY NOT NULL, nombres TEXT NOT NULL,
      apellidos TEXT NOT NULL, curso TEXT NOT NULL
    );
    CREATE TABLE bancos (id INTEGER PRIMARY KEY AUTOINCREMENT, nombre TEXT NOT NULL, creado_en TEXT NOT NULL);
    CREATE TABLE preguntas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      banco_id INTEGER NOT NULL REFERENCES bancos (id) ON DELETE CASCADE,
      contexto TEXT,
      imagen TEXT,
      enunciado TEXT NOT NULL
    );
    CREATE TABLE opciones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pregunta_id INTEGER NOT NULL REFERENCES preguntas (id) ON DELETE CASCADE,
      texto TEXT NOT NULL,
      es_correcta INTEGER NOT NULL CHECK (es_correcta IN (0, 1))
    );
    CREATE TABLE sesiones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      banco_id INTEGER NOT NULL REFERENCES bancos (id),
      cursos TEXT NOT NULL,
      n_preguntas INTEGER NOT NULL DEFAULT 20,
      duracion_minutos INTEGER NOT NULL DEFAULT 60,
      segundos_minimos_pregunta INTEGER NOT NULL DEFAULT 10,
      nivel_feedback TEXT NOT NULL DEFAULT 'aciertos',
      preguntas_extra_por_rapidez INTEGER NOT NULL DEFAULT 0,
      estado TEXT NOT NULL DEFAULT 'borrador' CHECK (estado IN ('borrador', 'abierta', 'cerrada')),
      creado_en TEXT NOT NULL
    );
    CREATE UNIQUE INDEX idx_una_sesion_abierta ON sesiones (estado) WHERE estado = 'abierta';
  `);

  // Datos que el docente ya tenía cargados y que no puede perder.
  db.prepare('INSERT INTO estudiantes VALUES (?, ?, ?, ?)').run('2024001', 'Ana', 'Gómez', '10A');
  db.prepare("INSERT INTO bancos (nombre, creado_en) VALUES ('Ciencias', '2026-01-01')").run();
  db.prepare(
    "INSERT INTO preguntas (banco_id, contexto, enunciado) VALUES (1, NULL, '¿Cuánto es 2+2?')",
  ).run();
  db.prepare(
    "INSERT INTO opciones (pregunta_id, texto, es_correcta) VALUES (1, '4', 1), (1, '5', 0), (1, '6', 0), (1, '7', 0)",
  ).run();
  db.prepare(
    "INSERT INTO sesiones (nombre, banco_id, cursos, estado, creado_en) VALUES ('Parcial', 1, '10A', 'abierta', '2026-01-01')",
  ).run();
  db.close();
}

test('una base nueva nace con el esquema al día y sin migrar nada', () => {
  const db = abrirBd(':memory:');
  assert.equal(versionDe(db), ULTIMA_VERSION);
  assert.deepEqual(aplicarMigraciones(db).aplicadas, [], 'no debe quedar nada pendiente');
  cerrarBd(db);
});

test('una base antigua se migra al abrirla, sin perder datos', () => {
  const { ruta, limpiar } = carpetaTemporal();
  try {
    baseAntigua(ruta);
    const db = abrirBd(ruta);

    assert.equal(versionDe(db), ULTIMA_VERSION);
    assert.equal(db.prepare('SELECT count(*) AS t FROM estudiantes').get().t, 1);
    assert.equal(db.prepare('SELECT nombres FROM estudiantes').get().nombres, 'Ana');
    assert.equal(db.prepare('SELECT nombre FROM sesiones').get().nombre, 'Parcial');
    cerrarBd(db);
  } finally {
    limpiar();
  }
});

test('la base migrada admite los estados nuevos del reloj global', () => {
  const { ruta, limpiar } = carpetaTemporal();
  try {
    baseAntigua(ruta);
    const db = abrirBd(ruta);

    assert.doesNotThrow(() =>
      db.prepare("UPDATE sesiones SET estado = 'en_curso', comenzada_en = '2026-08-24T08:00:00'").run(),
    );
    assert.doesNotThrow(() => db.prepare("UPDATE sesiones SET estado = 'pausada'").run());
    assert.throws(() => db.prepare("UPDATE sesiones SET estado = 'inventado'").run(), /CHECK/);
    cerrarBd(db);
  } finally {
    limpiar();
  }
});

test('la base migrada tiene las columnas del reloj con sus valores por defecto', () => {
  const { ruta, limpiar } = carpetaTemporal();
  try {
    baseAntigua(ruta);
    const db = abrirBd(ruta);
    const sesion = db.prepare('SELECT * FROM sesiones').get();

    assert.equal(sesion.comenzada_en, null);
    assert.equal(sesion.pausada_en, null);
    assert.equal(sesion.segundos_pausados, 0);
    cerrarBd(db);
  } finally {
    limpiar();
  }
});

test('la base migrada conserva la posición actual de cada intento', () => {
  const { ruta, limpiar } = carpetaTemporal();
  try {
    baseAntigua(ruta);
    const db = abrirBd(ruta);
    const columnas = new Set(db.pragma('table_info(intentos)').map((columna) => columna.name));

    assert.ok(columnas.has('pregunta_actual'));
    assert.ok(columnas.has('pregunta_mostrada_en'));
    cerrarBd(db);
  } finally {
    limpiar();
  }
});

test('tras migrar ya pueden coexistir varias sesiones abiertas', () => {
  const { ruta, limpiar } = carpetaTemporal();
  try {
    baseAntigua(ruta);
    const db = abrirBd(ruta);

    assert.doesNotThrow(() =>
      db
        .prepare(
          "INSERT INTO sesiones (nombre, banco_id, cursos, estado, creado_en) VALUES ('Otra', 1, '10B', 'abierta', '2026-01-01')",
        )
        .run(),
    );
    assert.equal(db.prepare("SELECT count(*) AS t FROM sesiones WHERE estado = 'abierta'").get().t, 2);
    cerrarBd(db);
  } finally {
    limpiar();
  }
});

test('migrar es idempotente: abrir la base tres veces no cambia nada', () => {
  const { ruta, limpiar } = carpetaTemporal();
  try {
    baseAntigua(ruta);

    for (let i = 0; i < 3; i += 1) {
      const db = abrirBd(ruta);
      assert.equal(versionDe(db), ULTIMA_VERSION);
      assert.equal(db.prepare('SELECT count(*) AS t FROM sesiones').get().t, 1);
      assert.equal(db.prepare('SELECT count(*) AS t FROM estudiantes').get().t, 1);
      cerrarBd(db);
    }
  } finally {
    limpiar();
  }
});

test('la base migrada gana la metadata del estándar preguntas-icfes, en blanco', () => {
  const { ruta, limpiar } = carpetaTemporal();
  try {
    baseAntigua(ruta);
    const db = abrirBd(ruta);
    const pregunta = db.prepare('SELECT * FROM preguntas').get();

    assert.equal(pregunta.competencia, '');
    assert.equal(pregunta.componente, '');
    assert.equal(pregunta.afirmacion, '');
    assert.equal(pregunta.evidencia, '');
    assert.equal(pregunta.estandar_asociado, '');
    assert.equal(pregunta.que_evalua, '');
    // El texto plano que ya tenía no se toca: no se puede inventar la
    // metadata retroactivamente, y reescribirlo a bloques exige reimportar.
    assert.equal(pregunta.enunciado, '¿Cuánto es 2+2?');

    const opciones = db.prepare('SELECT * FROM opciones ORDER BY id').all();
    assert.ok(opciones.every((o) => o.justificacion === ''));
    assert.equal(opciones.length, 4);
    cerrarBd(db);
  } finally {
    limpiar();
  }
});

test('la migración no rompe las referencias entre tablas', () => {
  const { ruta, limpiar } = carpetaTemporal();
  try {
    baseAntigua(ruta);
    const db = abrirBd(ruta);

    assert.deepEqual(db.pragma('foreign_key_check'), []);
    assert.equal(db.pragma('foreign_keys', { simple: true }), 1, 'las FK quedan activas');

    // Y la relación sesiones → bancos sigue viva.
    assert.throws(
      () =>
        db
          .prepare(
            "INSERT INTO sesiones (nombre, banco_id, cursos, creado_en) VALUES ('X', 999, '10A', '2026-01-01')",
          )
          .run(),
      /FOREIGN KEY/,
    );
    cerrarBd(db);
  } finally {
    limpiar();
  }
});

test('la base migrada gana la columna descargado_en en sesiones, en null', () => {
  const { ruta, limpiar } = carpetaTemporal();
  try {
    baseAntigua(ruta);
    const db = abrirBd(ruta);
    const sesion = db.prepare('SELECT * FROM sesiones').get();

    assert.equal(sesion.descargado_en, null);
    assert.doesNotThrow(() =>
      db.prepare("UPDATE sesiones SET descargado_en = '2026-08-26T10:00:00Z' WHERE id = ?").run(sesion.id),
    );
    cerrarBd(db);
  } finally {
    limpiar();
  }
});

test('la migración v5 crea la tabla grupos y añade las columnas de la 026', () => {
  const { ruta, limpiar } = carpetaTemporal();
  try {
    baseAntigua(ruta);
    const db = abrirBd(ruta);

    const columnasPreguntas = new Set(db.pragma('table_info(preguntas)').map((c) => c.name));
    for (const col of [
      'grupo_id', 'tipo_item', 'respuesta_pool_id', 'numero_blanco',
      'nivel_mcer', 'valor', 'grado', 'prueba',
      'procedencia', 'verificado', 'fuentes', 'version_estandar',
    ]) {
      assert.ok(columnasPreguntas.has(col), `preguntas.${col} debe existir`);
    }
    assert.equal(db.prepare('SELECT count(*) AS t FROM grupos').get().t, 0);

    const columnasOpciones = new Set(db.pragma('table_info(opciones)').map((c) => c.name));
    assert.ok(columnasOpciones.has('procedencia_justificacion'));
    assert.ok(columnasOpciones.has('justificacion_verificada'));

    const columnasIntento = new Set(db.pragma('table_info(intento_preguntas)').map((c) => c.name));
    assert.ok(columnasIntento.has('respuesta_banco_id'));

    cerrarBd(db);
  } finally {
    limpiar();
  }
});

/**
 * Una base de la versión 5: el esquema de hoy pero con `intentos` como estaba
 * antes de la 038 (sin `anulado_en` y sin 'anulada_docente' en el CHECK).
 * Es la base que tiene el docente que ya aplicó un examen.
 */
function baseVersion5(ruta) {
  const esquema = readFileSync(new URL('./schema.sql', import.meta.url), 'utf8')
    .replace(
      /motivo_entrega    TEXT CHECK \(motivo_entrega IN\n[^)]*\)\),/,
      "motivo_entrega    TEXT CHECK (motivo_entrega IN\n"
      + "                      ('manual', 'tiempo', 'ultima_pregunta', 'forzada_docente')),",
    )
    .replace(/\n  anulado_en        TEXT,/, '');
  assert.doesNotMatch(esquema, /anulada_docente|anulado_en/, 'la base de partida no tiene lo nuevo');

  const db = new Database(ruta);
  db.exec(esquema);
  db.prepare("INSERT INTO config VALUES ('esquema_version', '5')").run();
  db.prepare('INSERT INTO estudiantes VALUES (?, ?, ?, ?)').run('2024001', 'Ana', 'Gómez', '10A');
  db.prepare("INSERT INTO bancos (nombre, creado_en) VALUES ('Ciencias', '2026-01-01')").run();
  db.prepare("INSERT INTO preguntas (banco_id, enunciado) VALUES (1, '¿Cuánto es 2+2?')").run();
  db.prepare(
    "INSERT INTO opciones (pregunta_id, texto, es_correcta) VALUES (1, '4', 1), (1, '5', 0), (1, '6', 0), (1, '7', 0)",
  ).run();
  db.prepare(`
    INSERT INTO sesiones (nombre, banco_id, cursos, estado, creado_en)
    VALUES ('Parcial', 1, '10A', 'cerrada', '2026-01-01')
  `).run();
  db.prepare(`
    INSERT INTO intentos (sesion_id, codigo_estudiante, semilla, token, iniciado_en,
                          entregado_en, motivo_entrega, aciertos, puntaje, pregunta_actual)
    VALUES (1, '2024001', 'semilla-1', 'tok-1', '2026-01-01T08:00:00', '2026-01-01T08:40:00',
            'manual', 1, 1, 1)
  `).run();
  db.prepare(`
    INSERT INTO intento_preguntas (intento_id, orden, pregunta_id, orden_opciones)
    VALUES (1, 1, 1, '1,2,3,4')
  `).run();
  db.prepare(`
    INSERT INTO respuestas (intento_pregunta_id, opcion_id, segundos_en_pantalla, respondido_en)
    VALUES (1, 1, 42, '2026-01-01T08:05:00')
  `).run();
  db.close();
}

test('la migración v6 rehace intentos sin perder el examen ya aplicado', () => {
  const { ruta, limpiar } = carpetaTemporal();
  try {
    baseVersion5(ruta);
    const db = abrirBd(ruta);

    assert.equal(versionDe(db), ULTIMA_VERSION);
    const intento = db.prepare('SELECT * FROM intentos').get();
    assert.equal(intento.id, 1, 'el id se conserva: de él cuelgan preguntas y respuestas');
    assert.equal(intento.semilla, 'semilla-1', 'la semilla es la prueba que le tocó: no puede cambiar');
    assert.equal(intento.motivo_entrega, 'manual');
    assert.equal(intento.puntaje, 1);
    assert.equal(intento.anulado_en, null, 'nadie queda anulado por migrar');

    // Las filas hijas siguen colgando del mismo intento.
    assert.equal(db.prepare('SELECT count(*) AS t FROM intento_preguntas WHERE intento_id = 1').get().t, 1);
    assert.equal(db.prepare('SELECT segundos_en_pantalla FROM respuestas').get().segundos_en_pantalla, 42);
    assert.equal(db.pragma('foreign_key_check').length, 0);

    // Y el motivo nuevo ya se acepta.
    assert.doesNotThrow(
      () => db.prepare("UPDATE intentos SET motivo_entrega = 'anulada_docente' WHERE id = 1").run(),
    );
    assert.throws(
      () => db.prepare("UPDATE intentos SET motivo_entrega = 'inventado' WHERE id = 1").run(),
      /CHECK/,
    );
    cerrarBd(db);
  } finally {
    limpiar();
  }
});
