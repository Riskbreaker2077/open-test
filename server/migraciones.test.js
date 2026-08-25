import { mkdtempSync, rmSync } from 'node:fs';
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
