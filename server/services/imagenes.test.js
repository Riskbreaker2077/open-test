import test from 'node:test';
import assert from 'node:assert/strict';
import { sanearNombre } from './imagenes.js';

test('acepta los nombres normales', () => {
  assert.equal(sanearNombre('celula.png'), 'celula.png');
  assert.equal(sanearNombre('célula animal 1.png'), 'célula animal 1.png');
  assert.equal(sanearNombre('FOTO.JPG'), 'FOTO.JPG');
});

test('se queda solo con el nombre: nada de rutas ni de subir de carpeta', () => {
  // Es la única superficie de escritura de archivos del sistema.
  assert.equal(sanearNombre('../../etc/passwd.png'), 'passwd.png');
  assert.equal(sanearNombre('/etc/sombra.png'), 'sombra.png');
  assert.equal(sanearNombre('C:\\Windows\\system32\\algo.png'), 'algo.png');
  assert.equal(sanearNombre('carpeta/otra/imagen.png'), 'imagen.png');
});

test('rechaza lo que no sea una imagen admitida', () => {
  assert.throws(() => sanearNombre('script.js'), /Solo se admiten/);
  assert.throws(() => sanearNombre('documento.pdf'), /Solo se admiten/);
  assert.throws(() => sanearNombre('sin-extension'), /Solo se admiten/);
});

test('rechaza un nombre vacío o que se queda en nada', () => {
  assert.throws(() => sanearNombre(''), /no es válido/);
  assert.throws(() => sanearNombre('...'), /no es válido/);
  assert.throws(() => sanearNombre(undefined), /no es válido/);
});
