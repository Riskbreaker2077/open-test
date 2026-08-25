import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';
import { abrirBd, cerrarBd } from './db.js';

const TABLAS = [
  'estudiantes',
  'bancos',
  'preguntas',
  'opciones',
  'sesiones',
  'intentos',
  'intento_preguntas',
  'respuestas',
];

function bdTemporal() {
  const carpeta = mkdtempSync(join(tmpdir(), 'opentest-'));
  const ruta = join(carpeta, 'prueba.db');
  return { ruta, limpiar: () => rmSync(carpeta, { recursive: true, force: true }) };
}

test('crea todas las tablas del modelo de datos', () => {
  const db = abrirBd(':memory:');
  const existentes = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
    .all()
    .map((f) => f.name);

  for (const tabla of TABLAS) {
    assert.ok(existentes.includes(tabla), `falta la tabla ${tabla}`);
  }
  cerrarBd(db);
});

test('activa las claves foráneas', () => {
  const db = abrirBd(':memory:');
  assert.equal(db.pragma('foreign_keys', { simple: true }), 1);

  assert.throws(
    () => db.prepare('INSERT INTO preguntas (banco_id, enunciado) VALUES (99, ?)').run('¿?'),
    /FOREIGN KEY/,
  );
  cerrarBd(db);
});

test('el código del estudiante es único', () => {
  const db = abrirBd(':memory:');
  const insertar = db.prepare(
    'INSERT INTO estudiantes (codigo, nombres, apellidos, curso) VALUES (?, ?, ?, ?)',
  );
  insertar.run('2024001', 'Ana', 'Ruiz', '10A');

  assert.throws(() => insertar.run('2024001', 'Otro', 'Nombre', '10B'), /UNIQUE/);
  cerrarBd(db);
});

test('pueden coexistir varias sesiones abiertas', () => {
  // 10A en Ciencias mientras 10B está en Matemáticas: el estudiante elige
  // entre las convocadas para su curso.
  const db = abrirBd(':memory:');
  db.prepare("INSERT INTO bancos (nombre, creado_en) VALUES ('Banco', '2026-01-01')").run();
  const insertar = db.prepare(
    "INSERT INTO sesiones (nombre, banco_id, cursos, estado, creado_en) VALUES (?, 1, ?, ?, '2026-01-01')",
  );

  assert.doesNotThrow(() => insertar.run('Ciencias', '10A', 'abierta'));
  assert.doesNotThrow(() => insertar.run('Matemáticas', '10B', 'abierta'));
  assert.equal(db.prepare("SELECT count(*) AS t FROM sesiones WHERE estado = 'abierta'").get().t, 2);
  cerrarBd(db);
});

test('acepta los cinco estados de sesión y rechaza cualquier otro', () => {
  const db = abrirBd(':memory:');
  db.prepare("INSERT INTO bancos (nombre, creado_en) VALUES ('Banco', '2026-01-01')").run();
  const insertar = db.prepare(
    "INSERT INTO sesiones (nombre, banco_id, cursos, estado, creado_en) VALUES (?, 1, '10A', ?, '2026-01-01')",
  );

  for (const estado of ['borrador', 'abierta', 'en_curso', 'pausada', 'cerrada']) {
    assert.doesNotThrow(() => insertar.run(`S-${estado}`, estado), estado);
  }
  assert.throws(() => insertar.run('S-malo', 'inventado'), /CHECK/);
  cerrarBd(db);
});

test('un estudiante no puede tener dos intentos en la misma sesión', () => {
  const db = abrirBd(':memory:');
  db.prepare("INSERT INTO bancos (nombre, creado_en) VALUES ('Banco', '2026-01-01')").run();
  db.prepare(
    "INSERT INTO sesiones (nombre, banco_id, cursos, creado_en) VALUES ('S', 1, '10A', '2026-01-01')",
  ).run();
  db.prepare(
    "INSERT INTO estudiantes (codigo, nombres, apellidos, curso) VALUES ('2024001', 'Ana', 'Ruiz', '10A')",
  ).run();

  const insertar = db.prepare(
    'INSERT INTO intentos (sesion_id, codigo_estudiante, semilla, token, iniciado_en) VALUES (1, ?, ?, ?, ?)',
  );
  insertar.run('2024001', 'semilla-a', 'token-a', '2026-01-01T08:00:00');

  assert.throws(
    () => insertar.run('2024001', 'semilla-b', 'token-b', '2026-01-01T08:05:00'),
    /UNIQUE/,
  );
  cerrarBd(db);
});

test('rechaza un nivel de retroalimentación desconocido', () => {
  const db = abrirBd(':memory:');
  db.prepare("INSERT INTO bancos (nombre, creado_en) VALUES ('Banco', '2026-01-01')").run();

  assert.throws(
    () =>
      db
        .prepare(
          "INSERT INTO sesiones (nombre, banco_id, cursos, nivel_feedback, creado_en) VALUES ('S', 1, '10A', ?, '2026-01-01')",
        )
        .run('todo'),
    /CHECK/,
  );
  cerrarBd(db);
});

test('aplica los valores por defecto de una sesión', () => {
  const db = abrirBd(':memory:');
  db.prepare("INSERT INTO bancos (nombre, creado_en) VALUES ('Banco', '2026-01-01')").run();
  db.prepare(
    "INSERT INTO sesiones (nombre, banco_id, cursos, creado_en) VALUES ('S', 1, '10A', '2026-01-01')",
  ).run();

  const sesion = db.prepare('SELECT * FROM sesiones WHERE id = 1').get();
  assert.equal(sesion.n_preguntas, 20);
  assert.equal(sesion.duracion_minutos, 60);
  assert.equal(sesion.segundos_minimos_pregunta, 10);
  assert.equal(sesion.nivel_feedback, 'aciertos');
  assert.equal(sesion.preguntas_extra_por_rapidez, 0);
  assert.equal(sesion.estado, 'borrador');
  cerrarBd(db);
});

test('reabrir la base de datos no pierde datos', () => {
  const { ruta, limpiar } = bdTemporal();
  try {
    const primera = abrirBd(ruta);
    primera
      .prepare('INSERT INTO estudiantes (codigo, nombres, apellidos, curso) VALUES (?, ?, ?, ?)')
      .run('2024001', 'Ana', 'Ruiz', '10A');
    cerrarBd(primera);

    const segunda = abrirBd(ruta);
    const guardado = segunda.prepare('SELECT * FROM estudiantes WHERE codigo = ?').get('2024001');
    assert.equal(guardado.nombres, 'Ana');
    assert.equal(guardado.curso, '10A');
    cerrarBd(segunda);
  } finally {
    limpiar();
  }
});

test('crea la carpeta de datos si no existe', () => {
  const { ruta, limpiar } = bdTemporal();
  try {
    const anidada = join(ruta, '..', 'sub', 'carpeta', 'opentest.db');
    const db = abrirBd(anidada);
    assert.ok(db.open);
    cerrarBd(db);
  } finally {
    limpiar();
  }
});

test('rechaza un estudiante sin código', () => {
  // SQLite admite NULL en una TEXT PRIMARY KEY salvo que se declare NOT NULL.
  // Sin esto, un estudiante sin código entraría en la base y rompería el login.
  const db = abrirBd(':memory:');

  assert.throws(
    () =>
      db
        .prepare('INSERT INTO estudiantes (codigo, nombres, apellidos, curso) VALUES (?, ?, ?, ?)')
        .run(null, 'Ana', 'Gómez', '10A'),
    /NOT NULL/,
  );
  cerrarBd(db);
});
