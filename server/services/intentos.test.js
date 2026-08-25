import test from 'node:test';
import assert from 'node:assert/strict';
import { abrirBd, cerrarBd } from '../db.js';
import { guardarBanco } from './bancos.js';
import { guardarEstudiantes } from './estudiantes.js';
import { abrirSesion, cerrarSesion, crearSesion, obtenerSesion } from './sesiones.js';
import { contarIntentos, entregado, iniciarOReanudarIntento, intentoPorToken } from './intentos.js';

const ANA = { codigo: '2024001', nombres: 'Ana', apellidos: 'Gómez', curso: '10A' };
const LUIS = { codigo: '2024002', nombres: 'Luis', apellidos: 'Pérez', curso: '10B' };

function preparar() {
  const db = abrirBd(':memory:');
  guardarBanco(
    db,
    'Ciencias',
    Array.from({ length: 25 }, (_, i) => ({
      contexto: '', imagen: '', enunciado: `¿P${i}?`,
      opciones: ['a', 'b', 'c', 'd'], correcta: 0, explicacion: '',
    })),
  );
  guardarEstudiantes(db, [ANA, LUIS]);
  const sesion = crearSesion(db, { nombre: 'Parcial', banco_id: 1, cursos: ['10A'] });
  abrirSesion(db, sesion.id);
  return { db, sesion: obtenerSesion(db, sesion.id) };
}

test('crea el intento con su semilla y su token', () => {
  const { db, sesion } = preparar();
  const { intento, nuevo } = iniciarOReanudarIntento(db, sesion, ANA);

  assert.equal(nuevo, true);
  assert.match(intento.semilla, /^[0-9a-f]{32}$/);
  assert.match(intento.token, /^[0-9a-f]{64}$/);
  assert.ok(intento.iniciado_en);
  assert.equal(entregado(intento), false);
  cerrarBd(db);
});

test('volver a entrar devuelve el MISMO intento, no uno nuevo', () => {
  const { db, sesion } = preparar();
  const primera = iniciarOReanudarIntento(db, sesion, ANA);
  const segunda = iniciarOReanudarIntento(db, sesion, ANA);

  assert.equal(segunda.nuevo, false);
  assert.equal(segunda.intento.id, primera.intento.id);
  assert.equal(segunda.intento.semilla, primera.intento.semilla, 'la prueba no cambia');
  assert.equal(contarIntentos(db, sesion.id).dentro, 1);
  cerrarBd(db);
});

test('el token se renueva al reentrar: solo vale la última tablet', () => {
  const { db, sesion } = preparar();
  const primera = iniciarOReanudarIntento(db, sesion, ANA);
  const segunda = iniciarOReanudarIntento(db, sesion, ANA);

  assert.notEqual(segunda.intento.token, primera.intento.token);
  assert.equal(intentoPorToken(db, primera.intento.token), null, 'el token viejo deja de valer');
  assert.equal(intentoPorToken(db, segunda.intento.token).id, primera.intento.id);
  cerrarBd(db);
});

test('cada estudiante tiene su propia semilla', () => {
  const { db, sesion } = preparar();
  guardarEstudiantes(db, [{ ...LUIS, curso: '10A' }]);

  const deAna = iniciarOReanudarIntento(db, sesion, ANA).intento;
  const deLuis = iniciarOReanudarIntento(db, sesion, { ...LUIS, curso: '10A' }).intento;

  assert.notEqual(deAna.semilla, deLuis.semilla);
  assert.notEqual(deAna.token, deLuis.token);
  cerrarBd(db);
});

test('las semillas no se repiten en mil intentos', () => {
  const { db } = preparar();
  const semillas = new Set();

  for (let i = 0; i < 1000; i += 1) {
    guardarEstudiantes(db, [{ codigo: `alu${i}`, nombres: 'N', apellidos: 'A', curso: '10A' }]);
    const sesion = crearSesion(db, { nombre: `S${i}`, banco_id: 1, cursos: ['10A'] });
    abrirSesion(db, sesion.id);
    semillas.add(
      iniciarOReanudarIntento(db, obtenerSesion(db, sesion.id), { codigo: `alu${i}`, curso: '10A' })
        .intento.semilla,
    );
  }

  assert.equal(semillas.size, 1000);
  cerrarBd(db);
});

test('un estudiante de otro curso no entra', () => {
  const { db, sesion } = preparar();
  assert.throws(() => iniciarOReanudarIntento(db, sesion, LUIS), /no es para tu curso/);
  assert.equal(contarIntentos(db, sesion.id).dentro, 0);
  cerrarBd(db);
});

test('no se entra a una sesión sin abrir ni a una cerrada', () => {
  const { db } = preparar();
  const borrador = crearSesion(db, { nombre: 'Otra', banco_id: 1, cursos: ['10A'] });

  assert.throws(() => iniciarOReanudarIntento(db, borrador, ANA), /todavía no está abierta/);

  abrirSesion(db, borrador.id);
  cerrarSesion(db, borrador.id);
  assert.throws(
    () => iniciarOReanudarIntento(db, obtenerSesion(db, borrador.id), ANA),
    /ya se cerró/,
  );
  cerrarBd(db);
});

test('el índice único impide dos intentos del mismo estudiante en la misma sesión', () => {
  const { db, sesion } = preparar();
  iniciarOReanudarIntento(db, sesion, ANA);

  assert.throws(
    () =>
      db
        .prepare(
          'INSERT INTO intentos (sesion_id, codigo_estudiante, semilla, token, iniciado_en) VALUES (?, ?, ?, ?, ?)',
        )
        .run(sesion.id, ANA.codigo, 'otra', 'otro', '2026-01-01'),
    /UNIQUE/,
  );
  cerrarBd(db);
});

test('cuenta quién está dentro y quién ha entregado', () => {
  const { db, sesion } = preparar();
  guardarEstudiantes(db, [{ ...LUIS, curso: '10A' }]);

  const deAna = iniciarOReanudarIntento(db, sesion, ANA).intento;
  iniciarOReanudarIntento(db, sesion, { ...LUIS, curso: '10A' });

  assert.deepEqual(contarIntentos(db, sesion.id), { dentro: 2, entregados: 0 });

  db.prepare("UPDATE intentos SET entregado_en = '2026-01-01', motivo_entrega = 'manual' WHERE id = ?").run(deAna.id);
  assert.deepEqual(contarIntentos(db, sesion.id), { dentro: 2, entregados: 1 });
  cerrarBd(db);
});

test('un token inventado no resuelve a ningún intento', () => {
  const { db, sesion } = preparar();
  iniciarOReanudarIntento(db, sesion, ANA);

  assert.equal(intentoPorToken(db, 'a'.repeat(64)), null);
  assert.equal(intentoPorToken(db, ''), null);
  assert.equal(intentoPorToken(db, undefined), null);
  cerrarBd(db);
});
