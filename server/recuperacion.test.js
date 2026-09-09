import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PassThrough } from 'node:stream';
import { abrirBd, cerrarBd } from './db.js';
import { establecerContrasena, verificar } from './services/auth.js';
import {
  Cancelado,
  esModoRecuperacion,
  recuperarContrasena,
  restablecerContrasena,
} from './recuperacion.js';

function salidaFalsa() {
  const lineas = [];
  return { lineas, write: (texto) => lineas.push(texto) };
}

function entradaFalsa(texto) {
  const entrada = new PassThrough();
  entrada.end(texto);
  return entrada;
}

test('esModoRecuperacion detecta el parámetro con guión doble y simple', () => {
  assert.equal(esModoRecuperacion(['node', 'index.js', '--recuperar-contrasena']), true);
  assert.equal(esModoRecuperacion(['node', 'index.js', '-recuperar-contrasena']), true);
  assert.equal(esModoRecuperacion(['OpenTest.exe', '--recuperar-contrasena']), true);
});

test('esModoRecuperacion es falsa sin parámetros o con otros', () => {
  assert.equal(esModoRecuperacion(['node', 'index.js']), false);
  assert.equal(esModoRecuperacion(['node', 'index.js', '--puerto', '3000']), false);
  assert.equal(esModoRecuperacion([]), false);
  assert.equal(esModoRecuperacion(['node', 'index.js', '--RECUPERAR-CONTRASENA']), true);
});

test('restablecer cambia el hash, exige sal nueva y la nueva contraseña verifica', () => {
  const db = abrirBd(':memory:');
  establecerContrasena(db, 'colegio2026');
  const salVieja = db.prepare("SELECT valor FROM config WHERE clave = 'docente_salt'").get().valor;

  restablecerContrasena(db, 'nuevaClave1', 'nuevaClave1');

  const salNueva = db.prepare("SELECT valor FROM config WHERE clave = 'docente_salt'").get().valor;
  assert.notEqual(salVieja, salNueva);
  assert.equal(verificar(db, 'nuevaClave1'), true);
  assert.equal(verificar(db, 'colegio2026'), false);
  cerrarBd(db);
});

test('restablecer rechaza confirmación distinta y no toca el hash', () => {
  const db = abrirBd(':memory:');
  establecerContrasena(db, 'colegio2026');
  const hash = db.prepare("SELECT valor FROM config WHERE clave = 'docente_hash'").get().valor;

  assert.throws(() => restablecerContrasena(db, 'nuevaClave1', 'otraCosa'), /no coinciden/);
  assert.equal(db.prepare("SELECT valor FROM config WHERE clave = 'docente_hash'").get().valor, hash);
  cerrarBd(db);
});

test('restablecer rechaza contraseñas cortas', () => {
  const db = abrirBd(':memory:');
  establecerContrasena(db, 'colegio2026');

  assert.throws(() => restablecerContrasena(db, 'abc', 'abc'), /al menos/);
  assert.equal(verificar(db, 'colegio2026'), true);
  cerrarBd(db);
});

test('restablecer lanza el aviso de primera instalación sobre una base nueva', () => {
  const db = abrirBd(':memory:');
  assert.throws(() => restablecerContrasena(db, 'nuevaClave1', 'nuevaClave1'), /todavía no tiene contraseña/);
  cerrarBd(db);
});

test('el flujo completo restablece la contraseña de una base real', async () => {
  const carpeta = mkdtempSync(join(tmpdir(), 'opentest-027-'));
  const rutaBd = join(carpeta, 'opentest.db');
  try {
    const db = abrirBd(rutaBd);
    establecerContrasena(db, 'colegio2026');
    cerrarBd(db);

    const salida = salidaFalsa();
    const codigo = await recuperarContrasena({
      entrada: entradaFalsa('nuevaClave1\nnuevaClave1\n'),
      salida,
      rutaBd,
    });

    assert.equal(codigo, 0);
    const db2 = abrirBd(rutaBd);
    assert.equal(verificar(db2, 'nuevaClave1'), true);
    assert.equal(verificar(db2, 'colegio2026'), false);
    cerrarBd(db2);
    assert.ok(salida.lineas.some((l) => l.includes('Contraseña restablecida')));
  } finally {
    rmSync(carpeta, { recursive: true, force: true });
  }
});

test('el flujo reitera cuando las contraseñas no coinciden y luego guarda', async () => {
  const carpeta = mkdtempSync(join(tmpdir(), 'opentest-027-'));
  const rutaBd = join(carpeta, 'opentest.db');
  try {
    const db = abrirBd(rutaBd);
    establecerContrasena(db, 'colegio2026');
    cerrarBd(db);

    await recuperarContrasena({
      entrada: entradaFalsa('nuevaClave1\notraCosa2\nnuevaClave1\nnuevaClave1\n'),
      salida: salidaFalsa(),
      rutaBd,
    });

    const db2 = abrirBd(rutaBd);
    assert.equal(verificar(db2, 'nuevaClave1'), true);
    cerrarBd(db2);
  } finally {
    rmSync(carpeta, { recursive: true, force: true });
  }
});

test('el flujo no crea la base si no existe y no pide nada', async () => {
  const carpeta = mkdtempSync(join(tmpdir(), 'opentest-027-'));
  const rutaBd = join(carpeta, 'opentest.db');
  try {
    const salida = salidaFalsa();
    const codigo = await recuperarContrasena({
      entrada: entradaFalsa(''),
      salida,
      rutaBd,
    });

    assert.equal(codigo, 0);
    assert.equal(existsSync(rutaBd), false);
    assert.ok(salida.lineas.some((l) => l.includes('todavía no tiene contraseña')));
  } finally {
    rmSync(carpeta, { recursive: true, force: true });
  }
});

test('el flujo avisa y no pide nada si el equipo aún no tiene contraseña', async () => {
  const carpeta = mkdtempSync(join(tmpdir(), 'opentest-027-'));
  const rutaBd = join(carpeta, 'opentest.db');
  try {
    abrirBd(rutaBd).close();

    const salida = salidaFalsa();
    const codigo = await recuperarContrasena({
      entrada: entradaFalsa('nuevaClave1\n'),
      salida,
      rutaBd,
    });

    assert.equal(codigo, 0);
    assert.ok(salida.lineas.some((l) => l.includes('todavía no tiene contraseña')));
    assert.ok(!salida.lineas.some((l) => l.includes('Escribe la contraseña nueva')));
  } finally {
    rmSync(carpeta, { recursive: true, force: true });
  }
});

test('el flujo rechaza una contraseña corta y reitera', async () => {
  const carpeta = mkdtempSync(join(tmpdir(), 'opentest-027-'));
  const rutaBd = join(carpeta, 'opentest.db');
  try {
    const db = abrirBd(rutaBd);
    establecerContrasena(db, 'colegio2026');
    cerrarBd(db);

    await recuperarContrasena({
      entrada: entradaFalsa('abc\nnuevaClave1\nnuevaClave1\n'),
      salida: salidaFalsa(),
      rutaBd,
    });

    const db2 = abrirBd(rutaBd);
    assert.equal(verificar(db2, 'nuevaClave1'), true);
    cerrarBd(db2);
  } finally {
    rmSync(carpeta, { recursive: true, force: true });
  }
});

test('cancelar a mitad de camino no cambia la contraseña', async () => {
  const carpeta = mkdtempSync(join(tmpdir(), 'opentest-027-'));
  const rutaBd = join(carpeta, 'opentest.db');
  try {
    const db = abrirBd(rutaBd);
    establecerContrasena(db, 'colegio2026');
    cerrarBd(db);

    const salida = salidaFalsa();
    const codigo = await recuperarContrasena({
      entrada: entradaFalsa('nuevaClave1\n'),
      salida,
      rutaBd,
    });

    assert.equal(codigo, 1);
    assert.ok(salida.lineas.some((l) => l.includes('Cancelado')));
    const db2 = abrirBd(rutaBd);
    assert.equal(verificar(db2, 'colegio2026'), true);
    cerrarBd(db2);
  } finally {
    rmSync(carpeta, { recursive: true, force: true });
  }
});

test('una base ocupada produce un mensaje accionable y código 1', async () => {
  const carpeta = mkdtempSync(join(tmpdir(), 'opentest-027-'));
  const rutaBd = join(carpeta, 'opentest.db');
  try {
    abrirBd(rutaBd).close();

    const salida = salidaFalsa();
    const codigo = await recuperarContrasena({
      entrada: entradaFalsa('nuevaClave1\nnuevaClave1\n'),
      salida,
      rutaBd,
      abrir: () => {
        const err = new Error('database is locked');
        err.code = 'SQLITE_BUSY';
        throw err;
      },
    });

    assert.equal(codigo, 1);
    assert.ok(salida.lineas.some((l) => l.includes('Cierra OpenTest')));
  } finally {
    rmSync(carpeta, { recursive: true, force: true });
  }
});

test('Cancelado es la excepción de cancelación, no un fallo del flujo', () => {
  const err = new Cancelado();
  assert.equal(err instanceof Error, true);
  assert.equal(err.name, 'Cancelado');
});
