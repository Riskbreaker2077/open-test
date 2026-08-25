import test from 'node:test';
import assert from 'node:assert/strict';
import { abrirBd, cerrarBd } from '../db.js';
import { borrarBanco, guardarBanco, listarBancos, obtenerBanco, preguntasDeBanco } from './bancos.js';

const PREGUNTA = {
  contexto: 'Lee el fragmento',
  imagen: '',
  enunciado: '¿Cuál es la idea principal?',
  opciones: ['La migración', 'El clima', 'La cosecha', 'El río'],
  correcta: 2,
  explicacion: 'Está en la primera oración.',
};

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
    const { bancoId, preguntas } = guardarBanco(db, 'Ciencias', [PREGUNTA, { ...PREGUNTA, correcta: 0 }]);

    assert.equal(preguntas, 2);
    const guardadas = preguntasDeBanco(db, bancoId);
    assert.equal(guardadas.length, 2);
    assert.equal(guardadas[0].opciones.length, 4);
  });
});

test('marca como correcta exactamente la opción indicada', () => {
  conBd((db) => {
    const { bancoId } = guardarBanco(db, 'Ciencias', [PREGUNTA]);
    const [pregunta] = preguntasDeBanco(db, bancoId);

    const correctas = pregunta.opciones.filter((o) => o.es_correcta === 1);
    assert.equal(correctas.length, 1, 'exactamente una correcta');
    assert.equal(correctas[0].texto, 'La cosecha', 'la de la posición 2');
  });
});

test('conserva el orden de las opciones tal como venían en el archivo', () => {
  conBd((db) => {
    const { bancoId } = guardarBanco(db, 'Ciencias', [PREGUNTA]);
    const [pregunta] = preguntasDeBanco(db, bancoId);

    assert.deepEqual(pregunta.opciones.map((o) => o.texto), PREGUNTA.opciones);
  });
});

test('los campos opcionales vacíos se guardan como NULL, no como cadena vacía', () => {
  conBd((db) => {
    const { bancoId } = guardarBanco(db, 'Ciencias', [
      { ...PREGUNTA, contexto: '', imagen: '', explicacion: '' },
    ]);
    const [pregunta] = preguntasDeBanco(db, bancoId);

    assert.equal(pregunta.contexto, null);
    assert.equal(pregunta.imagen, null);
    assert.equal(pregunta.explicacion, null);
  });
});

test('cada importación crea un banco nuevo, sin fusionar', () => {
  conBd((db) => {
    guardarBanco(db, 'Ciencias', [PREGUNTA]);
    guardarBanco(db, 'Ciencias', [PREGUNTA]);

    const bancos = listarBancos(db);
    assert.equal(bancos.length, 2);
    assert.deepEqual(bancos.map((b) => b.preguntas), [1, 1]);
  });
});

test('la importación es atómica', () => {
  conBd((db) => {
    const roto = { ...PREGUNTA, enunciado: null };
    assert.throws(() => guardarBanco(db, 'Ciencias', [PREGUNTA, roto]));

    assert.equal(listarBancos(db).length, 0, 'no debe quedar el banco a medias');
  });
});

test('borra un banco que no se ha usado', () => {
  conBd((db) => {
    const { bancoId } = guardarBanco(db, 'Ciencias', [PREGUNTA]);
    borrarBanco(db, bancoId);

    assert.equal(listarBancos(db).length, 0);
  });
});

test('borrar el banco arrastra sus preguntas y opciones', () => {
  conBd((db) => {
    const { bancoId } = guardarBanco(db, 'Ciencias', [PREGUNTA]);
    borrarBanco(db, bancoId);

    assert.equal(db.prepare('SELECT count(*) AS t FROM preguntas').get().t, 0);
    assert.equal(db.prepare('SELECT count(*) AS t FROM opciones').get().t, 0);
  });
});

test('no borra un banco usado en una evaluación, y lo explica', () => {
  conBd((db) => {
    const { bancoId } = guardarBanco(db, 'Ciencias', [PREGUNTA]);
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
