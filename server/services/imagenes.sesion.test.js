import test from 'node:test';
import assert from 'node:assert/strict';
import { abrirBd, cerrarBd } from '../db.js';
import { guardarBanco } from './bancos.js';
import {
  abrirSesion,
  cerrarSesion,
  comenzarSesion,
  crearSesion,
} from './sesiones.js';
import { guardarEstudiantes } from './estudiantes.js';
import { iniciarOReanudarIntento } from './intentos.js';
import { imagenesDeSesion } from './imagenes.js';

const INICIO = new Date('2026-09-08T10:00:00.000Z');

function preparar({ conImagen = false } = {}) {
  const db = abrirBd(':memory:');
  const preguntas = [
    {
      id: 'p-1',
      competencia: 'C', componente: 'C', afirmacion: 'A', evidencia: 'E',
      estandar_asociado: 'X', que_evalua: 'Q',
      contexto: [],
      enunciado: conImagen
        ? [{ tipo: 'texto', texto: '¿Cuál es?' }, { tipo: 'imagen', archivo: 'celula.png' }]
        : [{ tipo: 'texto', texto: '¿Cuál es?' }],
      opciones: [
        { id: 'A', contenido: [{ tipo: 'texto', texto: 'A' }], es_correcta: false, justificacion: 'a' },
        { id: 'B', contenido: [{ tipo: 'texto', texto: 'B' }], es_correcta: false, justificacion: 'b' },
        {
          id: 'C',
          contenido: conImagen
            ? [{ tipo: 'imagen', archivo: 'opcion-c.png' }, { tipo: 'texto', texto: 'C' }]
            : [{ tipo: 'texto', texto: 'C' }],
          es_correcta: true,
          justificacion: 'c',
        },
        { id: 'D', contenido: [{ tipo: 'texto', texto: 'D' }], es_correcta: false, justificacion: 'd' },
      ],
    },
    {
      id: 'p-2',
      competencia: 'C', componente: 'C', afirmacion: 'A', evidencia: 'E',
      estandar_asociado: 'X', que_evalua: 'Q',
      contexto: [],
      enunciado: conImagen
        ? [{ tipo: 'texto', texto: 'Otra' }, { tipo: 'imagen', archivo: 'celula.png' }]
        : [{ tipo: 'texto', texto: 'Otra' }],
      opciones: [
        { id: 'A', contenido: [{ tipo: 'texto', texto: 'A' }], es_correcta: false, justificacion: 'a' },
        { id: 'B', contenido: [{ tipo: 'texto', texto: 'B' }], es_correcta: false, justificacion: 'b' },
        { id: 'C', contenido: [{ tipo: 'texto', texto: 'C' }], es_correcta: true, justificacion: 'c' },
        { id: 'D', contenido: [{ tipo: 'texto', texto: 'D' }], es_correcta: false, justificacion: 'd' },
      ],
    },
  ];
  guardarBanco(db, 'Ciencias', preguntas);
  guardarEstudiantes(db, [{ codigo: '1001', nombres: 'Ana', apellidos: 'Gómez', curso: '10A' }]);
  const creada = crearSesion(db, { nombre: 'Parcial', banco_id: 1, cursos: ['10A'], n_preguntas: 2 });
  abrirSesion(db, creada.id);
  const sesion = { ...creada, estado: 'abierta' };
  const intento = iniciarOReanudarIntento(db, sesion, { codigo: '1001', curso: '10A' }).intento;
  comenzarSesion(db, creada.id, INICIO);
  cerrarSesion(db, creada.id);
  return { db, sesionId: creada.id, intentoId: intento.id };
}

test('imagenesDeSesion devuelve vacío si ninguna pregunta tiene imágenes', () => {
  const { db, sesionId } = preparar({ conImagen: false });
  assert.deepEqual(imagenesDeSesion(db, sesionId), new Set());
  cerrarBd(db);
});

test('imagenesDeSesion detecta imagen en el enunciado', () => {
  const { db, sesionId } = preparar({ conImagen: true });
  const nombres = imagenesDeSesion(db, sesionId);
  assert.ok(nombres.has('celula.png'));
  cerrarBd(db);
});

test('imagenesDeSesion detecta imagen dentro de una opción', () => {
  const { db, sesionId } = preparar({ conImagen: true });
  const nombres = imagenesDeSesion(db, sesionId);
  assert.ok(nombres.has('opcion-c.png'));
  cerrarBd(db);
});

test('imagenesDeSesion deduplica cuando dos preguntas referencian la misma imagen', () => {
  const { db, sesionId } = preparar({ conImagen: true });
  const nombres = imagenesDeSesion(db, sesionId);
  assert.equal(nombres.size, 2, 'celula.png + opcion-c.png sin duplicar');
  cerrarBd(db);
});

test('imagenesDeSesion devuelve vacío si la sesión no tiene intentos', () => {
  const db = abrirBd(':memory:');
  guardarBanco(db, 'Ciencias', [
    {
      id: 'p-1',
      competencia: 'C', componente: 'C', afirmacion: 'A', evidencia: 'E',
      estandar_asociado: 'X', que_evalua: 'Q',
      contexto: [],
      enunciado: [{ tipo: 'imagen', archivo: 'huerfana.png' }],
      opciones: [
        { id: 'A', contenido: [{ tipo: 'texto', texto: 'A' }], es_correcta: true, justificacion: 'a' },
        { id: 'B', contenido: [{ tipo: 'texto', texto: 'B' }], es_correcta: false, justificacion: 'b' },
        { id: 'C', contenido: [{ tipo: 'texto', texto: 'C' }], es_correcta: false, justificacion: 'c' },
        { id: 'D', contenido: [{ tipo: 'texto', texto: 'D' }], es_correcta: false, justificacion: 'd' },
      ],
    },
  ]);
  crearSesion(db, { nombre: 'X', banco_id: 1, cursos: ['10A'] });
  assert.deepEqual(imagenesDeSesion(db, 1), new Set());
  cerrarBd(db);
});
