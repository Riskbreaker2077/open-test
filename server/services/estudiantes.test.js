import test from 'node:test';
import assert from 'node:assert/strict';
import { abrirBd, cerrarBd } from '../db.js';
import {
  contarEstudiantes,
  cursosDeEstudiantes,
  eliminarEstudiante,
  guardarEstudiantes,
  listarEstudiantes,
  resumirCambios,
} from './estudiantes.js';

const ANA = { codigo: '2024001', nombres: 'Ana', apellidos: 'Gómez', curso: '10A' };
const LUIS = { codigo: '2024002', nombres: 'Luis', apellidos: 'Pérez', curso: '10A' };
const EVA = { codigo: '2024003', nombres: 'Eva', apellidos: 'Díaz', curso: '10B' };

function conBd(fn) {
  const db = abrirBd(':memory:');
  try {
    fn(db);
  } finally {
    cerrarBd(db);
  }
}

test('guarda la lista completa', () => {
  conBd((db) => {
    const resumen = guardarEstudiantes(db, [ANA, LUIS, EVA]);

    assert.deepEqual(resumen, { creados: 3, actualizados: 0, total: 3 });
    assert.equal(contarEstudiantes(db), 3);
  });
});

test('reimportar actualiza por código y no duplica', () => {
  conBd((db) => {
    guardarEstudiantes(db, [ANA, LUIS]);
    const resumen = guardarEstudiantes(db, [{ ...ANA, curso: '11A' }, LUIS]);

    assert.deepEqual(resumen, { creados: 0, actualizados: 2, total: 2 });
    assert.equal(contarEstudiantes(db), 2);
    assert.equal(listarEstudiantes(db, { curso: '11A' })[0].codigo, ANA.codigo);
  });
});

test('quien no viene en el archivo nuevo se conserva', () => {
  conBd((db) => {
    guardarEstudiantes(db, [ANA, LUIS, EVA]);
    guardarEstudiantes(db, [ANA]);

    assert.equal(contarEstudiantes(db), 3, 'importar no debe borrar a nadie');
  });
});

test('cuenta por separado los nuevos y los que ya estaban', () => {
  conBd((db) => {
    guardarEstudiantes(db, [ANA]);
    const resumen = guardarEstudiantes(db, [ANA, LUIS, EVA]);

    assert.deepEqual(resumen, { creados: 2, actualizados: 1, total: 3 });
  });
});

test('la previsualización anticipa los cambios sin escribir nada', () => {
  conBd((db) => {
    guardarEstudiantes(db, [ANA]);
    const resumen = resumirCambios(db, [ANA, LUIS, EVA]);

    assert.deepEqual(resumen, { total: 3, actualizados: 1, creados: 2 });
    assert.equal(contarEstudiantes(db), 1, 'previsualizar no debe guardar');
  });
});

test('la importación es atómica: un fallo a mitad no deja nada escrito', () => {
  conBd((db) => {
    const invalido = { codigo: null, nombres: 'X', apellidos: 'Y', curso: '10A' };

    assert.throws(() => guardarEstudiantes(db, [ANA, LUIS, invalido]));
    assert.equal(contarEstudiantes(db), 0, 'no debe quedar ninguna fila');
  });
});

test('lista ordenada y filtrable por curso', () => {
  conBd((db) => {
    guardarEstudiantes(db, [LUIS, ANA, EVA]);

    assert.deepEqual(
      listarEstudiantes(db, { curso: '10A' }).map((e) => e.codigo),
      [ANA.codigo, LUIS.codigo],
      'dentro del curso, por apellidos',
    );
    assert.equal(listarEstudiantes(db).length, 3);
  });
});

test('los cursos salen con su total, para poblar los selectores', () => {
  conBd((db) => {
    guardarEstudiantes(db, [ANA, LUIS, EVA]);

    assert.deepEqual(cursosDeEstudiantes(db), [
      { curso: '10A', total: 2 },
      { curso: '10B', total: 1 },
    ]);
  });
});

test('elimina a un estudiante sin intentos', () => {
  conBd((db) => {
    guardarEstudiantes(db, [ANA, LUIS]);
    eliminarEstudiante(db, ANA.codigo);

    assert.equal(contarEstudiantes(db), 1);
  });
});

test('no elimina a quien ya presentó, y lo explica', () => {
  conBd((db) => {
    guardarEstudiantes(db, [ANA]);
    db.prepare("INSERT INTO bancos (nombre, creado_en) VALUES ('B', '2026-01-01')").run();
    db.prepare(
      "INSERT INTO sesiones (nombre, banco_id, cursos, creado_en) VALUES ('S', 1, '10A', '2026-01-01')",
    ).run();
    db.prepare(
      "INSERT INTO intentos (sesion_id, codigo_estudiante, semilla, token, iniciado_en) VALUES (1, ?, 's', 't', '2026-01-01')",
    ).run(ANA.codigo);

    assert.throws(() => eliminarEstudiante(db, ANA.codigo), /ya presentó/);
    assert.equal(contarEstudiantes(db), 1, 'debe seguir ahí');
  });
});

test('eliminar a quien no existe da un error claro', () => {
  conBd((db) => {
    assert.throws(() => eliminarEstudiante(db, 'inventado'), /no está en la lista/);
  });
});
