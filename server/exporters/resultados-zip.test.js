import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { abrirBd, cerrarBd, RUTA_IMAGENES } from '../db.js';
import { guardarBanco } from '../services/bancos.js';
import { preguntaDeEjemplo } from '../fixtures-preguntas.js';
import { guardarEstudiantes } from '../services/estudiantes.js';
import { iniciarOReanudarIntento } from '../services/intentos.js';
import { abrirSesion, cerrarSesion, crearSesion, obtenerSesion } from '../services/sesiones.js';
import { aReproduccionZip, armarExportacion } from './resultados.js';
import { leerZip } from '../importers/paquete-zip.js';

const archivosTemporales = [];

function preparar({ conImagen = false, nombreImagen = 'figura.png' } = {}) {
  const db = abrirBd(':memory:');
  const preguntas = [
    preguntaDeEjemplo({
      id: 'p-1',
      contexto: [],
      enunciado: conImagen
        ? [{ tipo: 'texto', texto: 'Lee' }, { tipo: 'imagen', archivo: nombreImagen }]
        : [{ tipo: 'texto', texto: 'Lee' }],
    }),
    preguntaDeEjemplo({ id: 'p-2' }),
  ];
  guardarBanco(db, 'Ciencias', preguntas);
  guardarEstudiantes(db, [{ codigo: '1001', nombres: 'Ana', apellidos: 'Gómez', curso: '10A' }]);
  const sesion = crearSesion(db, { nombre: 'P', banco_id: 1, cursos: ['10A'], n_preguntas: 2 });
  abrirSesion(db, sesion.id);
  iniciarOReanudarIntento(db, obtenerSesion(db, sesion.id), { codigo: '1001', curso: '10A' });
  cerrarSesion(db, sesion.id);
  return { db, sesionId: sesion.id };
}

function ponerImagen(nombre, contenido) {
  const ruta = join(RUTA_IMAGENES, nombre);
  writeFileSync(ruta, contenido);
  archivosTemporales.push(ruta);
}

test.after(() => {
  for (const ruta of archivosTemporales) {
    try { rmSync(ruta, { force: true }); } catch {}
  }
});

test('aReproduccionZip incluye resultados.json parseable', () => {
  const { db, sesionId } = preparar();
  const buffer = aReproduccionZip(db, armarExportacion(db, sesionId));
  const archivos = leerZip(buffer);
  const json = JSON.parse(archivos.find((a) => a.nombre === 'resultados.json').contenido.toString('utf-8'));
  assert.equal(json.formato_version, 2);
  cerrarBd(db);
});

test('aReproduccionZip incluye las imagenes referenciadas dentro de imagenes/', () => {
  const nombre = 'fixture-025-figura.png';
  ponerImagen(nombre, Buffer.from([0x89, 0x50, 0x4e, 0x47]));

  const { db, sesionId } = preparar({ conImagen: true, nombreImagen: nombre });
  const buffer = aReproduccionZip(db, armarExportacion(db, sesionId));
  const archivos = leerZip(buffer);
  const imagen = archivos.find((a) => a.nombre === `imagenes/${nombre}`);
  assert.ok(imagen, 'la imagen debe estar en el ZIP');
  assert.deepEqual([...imagen.contenido.slice(0, 4)], [0x89, 0x50, 0x4e, 0x47]);
  assert.equal(archivos.find((a) => a.nombre === 'imagenes_faltantes.txt'), undefined);
  cerrarBd(db);
});

test('aReproduccionZip incluye imagenes_faltantes.txt si una imagen referenciada no está en disco', () => {
  const nombre = 'fixture-025-inexistente.png';
  const { db, sesionId } = preparar({ conImagen: true, nombreImagen: nombre });
  const buffer = aReproduccionZip(db, armarExportacion(db, sesionId));
  const archivos = leerZip(buffer);
  const faltantes = archivos.find((a) => a.nombre === 'imagenes_faltantes.txt');
  assert.ok(faltantes, 'debe haber un archivo imagenes_faltantes.txt');
  assert.match(faltantes.contenido.toString('utf-8'), new RegExp(nombre.replace('.', '\\.')));
  cerrarBd(db);
});

test('aReproduccionZip no incluye imágenes que nadie referencia', () => {
  const nombre = 'fixture-025-huerfana.png';
  ponerImagen(nombre, Buffer.from([0x89, 0x50]));

  const { db, sesionId } = preparar({ conImagen: false });
  const buffer = aReproduccionZip(db, armarExportacion(db, sesionId));
  const archivos = leerZip(buffer);
  assert.equal(archivos.find((a) => a.nombre === `imagenes/${nombre}`), undefined);
  cerrarBd(db);
});
