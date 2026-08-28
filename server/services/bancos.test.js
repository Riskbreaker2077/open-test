import test from 'node:test';
import assert from 'node:assert/strict';
import { abrirBd, cerrarBd } from '../db.js';
import { borrarBanco, guardarBanco, listarBancos, obtenerBanco, preguntasDeBanco } from './bancos.js';
import { preguntaDeEjemplo } from '../fixtures-preguntas.js';

function conBd(fn) {
  const db = abrirBd(':memory:');
  try {
    fn(db);
  } finally {
    cerrarBd(db);
  }
}

test('guarda el banco con sus preguntas y sus cuatro opciones', () => {
  conBd((db) => {
    const { bancoId, preguntas } = guardarBanco(db, 'Ciencias', [
      preguntaDeEjemplo({ id: 'p1' }),
      preguntaDeEjemplo({ id: 'p2' }),
    ]);

    assert.equal(preguntas, 2);
    const guardadas = preguntasDeBanco(db, bancoId);
    assert.equal(guardadas.length, 2);
    assert.equal(guardadas[0].opciones.length, 4);
  });
});

test('marca como correcta exactamente la opción indicada', () => {
  conBd((db) => {
    const { bancoId } = guardarBanco(db, 'Ciencias', [preguntaDeEjemplo()]);
    const [pregunta] = preguntasDeBanco(db, bancoId);

    const correctas = pregunta.opciones.filter((o) => o.es_correcta === 1);
    assert.equal(correctas.length, 1, 'exactamente una correcta');
    assert.deepEqual(correctas[0].contenido, [{ tipo: 'texto', texto: 'Opción C' }]);
  });
});

test('conserva el orden y el contenido de las opciones tal como venían', () => {
  conBd((db) => {
    const original = preguntaDeEjemplo();
    const { bancoId } = guardarBanco(db, 'Ciencias', [original]);
    const [pregunta] = preguntasDeBanco(db, bancoId);

    assert.deepEqual(pregunta.opciones.map((o) => o.contenido), original.opciones.map((o) => o.contenido));
    assert.deepEqual(pregunta.opciones.map((o) => o.justificacion), original.opciones.map((o) => o.justificacion));
  });
});

test('guarda la metadata pedagógica y el contexto/enunciado como bloques', () => {
  conBd((db) => {
    const original = preguntaDeEjemplo({
      contexto: [{ tipo: 'texto', texto: 'Un contexto.' }],
    });
    const { bancoId } = guardarBanco(db, 'Ciencias', [original]);
    const [pregunta] = preguntasDeBanco(db, bancoId);

    assert.equal(pregunta.competencia, original.competencia);
    assert.equal(pregunta.que_evalua, original.que_evalua);
    assert.deepEqual(pregunta.contexto, original.contexto);
    assert.deepEqual(pregunta.enunciado, original.enunciado);
  });
});

test('un banco viejo sin migrar sus datos se sigue leyendo, como texto envuelto en un bloque', () => {
  conBd((db) => {
    // Simula una fila como las que dejó la 003, antes del estándar: texto
    // plano en contexto/enunciado/opciones y metadata en blanco.
    db.prepare("INSERT INTO bancos (nombre, creado_en) VALUES ('Viejo', '2026-01-01')").run();
    db.prepare(`
      INSERT INTO preguntas (banco_id, contexto, enunciado)
      VALUES (1, 'Un contexto viejo', '¿Pregunta vieja?')
    `).run();
    db.prepare(`
      INSERT INTO opciones (pregunta_id, texto, es_correcta) VALUES (1, 'Opción vieja', 1)
    `).run();

    const [pregunta] = preguntasDeBanco(db, 1);
    assert.deepEqual(pregunta.contexto, [{ tipo: 'texto', texto: 'Un contexto viejo' }]);
    assert.deepEqual(pregunta.enunciado, [{ tipo: 'texto', texto: '¿Pregunta vieja?' }]);
    assert.deepEqual(pregunta.opciones[0].contenido, [{ tipo: 'texto', texto: 'Opción vieja' }]);
    assert.equal(pregunta.competencia, '');
  });
});

test('cada importación crea un banco nuevo, sin fusionar', () => {
  conBd((db) => {
    guardarBanco(db, 'Ciencias', [preguntaDeEjemplo()]);
    guardarBanco(db, 'Ciencias', [preguntaDeEjemplo()]);

    const bancos = listarBancos(db);
    assert.equal(bancos.length, 2);
    assert.deepEqual(bancos.map((b) => b.preguntas), [1, 1]);
  });
});

test('la importación es atómica', () => {
  conBd((db) => {
    const roto = preguntaDeEjemplo({ opciones: null });
    assert.throws(() => guardarBanco(db, 'Ciencias', [preguntaDeEjemplo(), roto]));

    assert.equal(listarBancos(db).length, 0, 'no debe quedar el banco a medias');
  });
});

test('borra un banco que no se ha usado', () => {
  conBd((db) => {
    const { bancoId } = guardarBanco(db, 'Ciencias', [preguntaDeEjemplo()]);
    borrarBanco(db, bancoId);

    assert.equal(listarBancos(db).length, 0);
  });
});

test('borrar el banco arrastra sus preguntas y opciones', () => {
  conBd((db) => {
    const { bancoId } = guardarBanco(db, 'Ciencias', [preguntaDeEjemplo()]);
    borrarBanco(db, bancoId);

    assert.equal(db.prepare('SELECT count(*) AS t FROM preguntas').get().t, 0);
    assert.equal(db.prepare('SELECT count(*) AS t FROM opciones').get().t, 0);
  });
});

test('no borra un banco usado en una evaluación, y lo explica', () => {
  conBd((db) => {
    const { bancoId } = guardarBanco(db, 'Ciencias', [preguntaDeEjemplo()]);
    db.prepare(
      "INSERT INTO sesiones (nombre, banco_id, cursos, creado_en) VALUES ('S', ?, '10A', '2026-01-01')",
    ).run(bancoId);

    assert.throws(() => borrarBanco(db, bancoId), /auditables/);
    assert.equal(listarBancos(db).length, 1);
  });
});

test('obtener un banco inexistente da un error claro', () => {
  conBd((db) => {
    assert.throws(() => obtenerBanco(db, 999), /no existe/);
  });
});
