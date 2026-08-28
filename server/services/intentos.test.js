import test from 'node:test';
import assert from 'node:assert/strict';
import { abrirBd, cerrarBd } from '../db.js';
import { guardarBanco } from './bancos.js';
import { preguntaDeEjemplo, preguntasDeEjemplo } from '../fixtures-preguntas.js';
import { guardarEstudiantes } from './estudiantes.js';
import { abrirSesion, cerrarSesion, crearSesion, obtenerSesion } from './sesiones.js';
import {
  contarIntentos,
  entregado,
  iniciarOReanudarIntento,
  intentoPorToken,
  materializarPrueba,
  pruebaDelIntento,
} from './intentos.js';

const ANA = { codigo: '2024001', nombres: 'Ana', apellidos: 'Gómez', curso: '10A' };
const LUIS = { codigo: '2024002', nombres: 'Luis', apellidos: 'Pérez', curso: '10B' };

function preparar() {
  const db = abrirBd(':memory:');
  guardarBanco(db, 'Ciencias', preguntasDeEjemplo(25));
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

// --- Materialización de la prueba (feature 005) ----------------------------

test('al entrar, la prueba queda escrita con sus preguntas y su orden', () => {
  const { db, sesion } = preparar();
  const { intento } = iniciarOReanudarIntento(db, sesion, ANA);
  const prueba = pruebaDelIntento(db, intento.id);

  assert.equal(prueba.length, sesion.n_preguntas);
  assert.deepEqual(prueba.map((f) => f.orden), Array.from({ length: 20 }, (_, i) => i + 1));

  for (const fila of prueba) {
    assert.equal(fila.ordenOpciones.length, 4);
    assert.equal(new Set(fila.ordenOpciones).size, 4);
  }
});

test('materializar dos veces NO altera ni una fila', () => {
  const { db, sesion } = preparar();
  const { intento } = iniciarOReanudarIntento(db, sesion, ANA);
  const antes = pruebaDelIntento(db, intento.id);

  const segunda = materializarPrueba(db, intento);
  assert.equal(segunda.generada, false, 'no debe volver a generar');
  assert.deepEqual(pruebaDelIntento(db, intento.id), antes);
});

test('reanudar devuelve la MISMA prueba: es lo que salva una tablet caída', () => {
  const { db, sesion } = preparar();
  const primera = iniciarOReanudarIntento(db, sesion, ANA);
  const antes = pruebaDelIntento(db, primera.intento.id);

  const segunda = iniciarOReanudarIntento(db, sesion, ANA);
  assert.deepEqual(pruebaDelIntento(db, segunda.intento.id), antes);
});

test('borrar una pregunta del banco no cambia la prueba ya materializada', () => {
  // El motivo de guardar las filas en vez de recalcular desde la semilla.
  const { db, sesion } = preparar();
  const { intento } = iniciarOReanudarIntento(db, sesion, ANA);
  const antes = pruebaDelIntento(db, intento.id);

  const noUsada = db
    .prepare(
      'SELECT id FROM preguntas WHERE id NOT IN (SELECT pregunta_id FROM intento_preguntas) LIMIT 1',
    )
    .get();
  db.prepare('DELETE FROM preguntas WHERE id = ?').run(noUsada.id);

  assert.deepEqual(pruebaDelIntento(db, intento.id), antes);
});

test('dos estudiantes reciben pruebas distintas en la misma sesión', () => {
  const { db, sesion } = preparar();
  guardarEstudiantes(db, [{ ...LUIS, curso: '10A' }]);

  const deAna = iniciarOReanudarIntento(db, sesion, ANA).intento;
  const deLuis = iniciarOReanudarIntento(db, sesion, { ...LUIS, curso: '10A' }).intento;

  const claves = (id) => pruebaDelIntento(db, id).map((f) => `${f.pregunta_id}:${f.orden_opciones}`);
  assert.notDeepEqual(claves(deAna.id), claves(deLuis.id));
});

test('la prueba materializada solo usa preguntas del banco de su sesión', () => {
  const { db, sesion } = preparar();
  guardarBanco(db, 'Otro banco', [preguntaDeEjemplo({ enunciado: [{ tipo: 'texto', texto: '¿Intrusa?' }] })]);

  const { intento } = iniciarOReanudarIntento(db, sesion, ANA);
  const delBanco = new Set(
    db.prepare('SELECT id FROM preguntas WHERE banco_id = ?').all(sesion.banco_id).map((p) => p.id),
  );

  for (const fila of pruebaDelIntento(db, intento.id)) {
    assert.ok(delBanco.has(fila.pregunta_id), 'no puede colarse una pregunta de otro banco');
  }
});

test('las opciones guardadas son exactamente las de su pregunta', () => {
  const { db, sesion } = preparar();
  const { intento } = iniciarOReanudarIntento(db, sesion, ANA);

  for (const fila of pruebaDelIntento(db, intento.id)) {
    const suyas = db
      .prepare('SELECT id FROM opciones WHERE pregunta_id = ? ORDER BY id')
      .all(fila.pregunta_id)
      .map((o) => o.id);

    assert.deepEqual([...fila.ordenOpciones].sort((a, b) => a - b), suyas);
  }
});

test('si la prueba no se puede generar, no queda un intento a medias', () => {
  const db = abrirBd(':memory:');
  guardarBanco(db, 'Corto', [preguntaDeEjemplo({ enunciado: [{ tipo: 'texto', texto: '¿Única?' }] })]);
  guardarEstudiantes(db, [ANA]);

  // Se fuerza el estado saltándose la validación de apertura, que ya lo impide.
  db.prepare(
    "INSERT INTO sesiones (nombre, banco_id, cursos, n_preguntas, estado, creado_en) VALUES ('X', 1, '10A', 20, 'abierta', '2026-01-01')",
  ).run();

  assert.throws(() => iniciarOReanudarIntento(db, obtenerSesion(db, 1), ANA), /tiene 1 pregunta/);
  assert.equal(db.prepare('SELECT count(*) AS t FROM intentos').get().t, 0, 'sin intento huérfano');
  assert.equal(db.prepare('SELECT count(*) AS t FROM intento_preguntas').get().t, 0);
  cerrarBd(db);
});
