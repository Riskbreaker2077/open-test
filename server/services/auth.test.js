import test from 'node:test';
import assert from 'node:assert/strict';
import { abrirBd, cerrarBd } from '../db.js';
import {
  cambiarContrasena,
  establecerContrasena,
  hayContrasena,
  LONGITUD_MINIMA,
  verificar,
} from './auth.js';

test('el primer arranque no tiene contraseña', () => {
  const db = abrirBd(':memory:');
  assert.equal(hayContrasena(db), false);
  assert.equal(verificar(db, 'cualquiera'), false);
  cerrarBd(db);
});

test('acepta la contraseña correcta y rechaza cualquier otra', () => {
  const db = abrirBd(':memory:');
  establecerContrasena(db, 'colegio2026');

  assert.equal(hayContrasena(db), true);
  assert.equal(verificar(db, 'colegio2026'), true);
  assert.equal(verificar(db, 'colegio2025'), false);
  assert.equal(verificar(db, ''), false);
  assert.equal(verificar(db, undefined), false);
  cerrarBd(db);
});

test('nunca guarda la contraseña en claro', () => {
  const db = abrirBd(':memory:');
  establecerContrasena(db, 'colegio2026');

  const valores = db.prepare('SELECT clave, valor FROM config').all();
  for (const fila of valores) {
    assert.ok(!fila.valor.includes('colegio2026'), `${fila.clave} filtra la contraseña`);
  }
  cerrarBd(db);
});

test('la misma contraseña produce hashes distintos en dos instalaciones', () => {
  const unColegio = abrirBd(':memory:');
  const otroColegio = abrirBd(':memory:');
  establecerContrasena(unColegio, 'colegio2026');
  establecerContrasena(otroColegio, 'colegio2026');

  const hash = (db) => db.prepare("SELECT valor FROM config WHERE clave = 'docente_hash'").get().valor;
  assert.notEqual(hash(unColegio), hash(otroColegio));

  // Y aun así las dos verifican correctamente.
  assert.equal(verificar(unColegio, 'colegio2026'), true);
  assert.equal(verificar(otroColegio, 'colegio2026'), true);
  cerrarBd(unColegio);
  cerrarBd(otroColegio);
});

test('exige una longitud mínima', () => {
  const db = abrirBd(':memory:');
  assert.throws(() => establecerContrasena(db, 'a'.repeat(LONGITUD_MINIMA - 1)), /al menos/);
  assert.equal(hayContrasena(db), false);

  assert.doesNotThrow(() => establecerContrasena(db, 'a'.repeat(LONGITUD_MINIMA)));
  cerrarBd(db);
});

test('cambiar la contraseña exige la actual', () => {
  const db = abrirBd(':memory:');
  establecerContrasena(db, 'colegio2026');

  assert.throws(() => cambiarContrasena(db, 'equivocada', 'nueva123'), /no es correcta/);
  assert.equal(verificar(db, 'colegio2026'), true);

  cambiarContrasena(db, 'colegio2026', 'nueva123');
  assert.equal(verificar(db, 'nueva123'), true);
  assert.equal(verificar(db, 'colegio2026'), false);
  cerrarBd(db);
});
