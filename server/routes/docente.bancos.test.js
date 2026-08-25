import { rmSync } from 'node:fs';
import test, { afterEach, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { crearApp } from '../app.js';
import { abrirBd, cerrarBd, RUTA_IMAGENES } from '../db.js';
import { _reiniciar } from '../sesion.js';
import { _reiniciarLimitador } from './auth.js';
import { listarImagenes } from '../services/imagenes.js';

let db;
let servidor;
let base;
let cookie;

const CABECERA = 'contexto,imagen,enunciado,opcion_a,opcion_b,opcion_c,opcion_d,correcta,explicacion';
const CSV = `${CABECERA}\n,,¿Cuál es la idea principal?,La migración,El clima,La cosecha,El río,C,Primera oración.\n`;

// PNG mínimo válido de 1x1.
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

beforeEach(async () => {
  _reiniciar();
  _reiniciarLimitador();
  db = abrirBd(':memory:');
  servidor = crearApp(db).listen(0);
  await new Promise((listo) => servidor.once('listening', listo));
  base = `http://127.0.0.1:${servidor.address().port}`;

  const alta = await fetch(`${base}/api/auth/establecer`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ contrasena: 'colegio2026' }),
  });
  cookie = alta.headers.getSetCookie()[0].split(';')[0];
});

afterEach(async () => {
  await new Promise((listo) => servidor.close(listo));
  cerrarBd(db);
  for (const nombre of listarImagenes()) {
    rmSync(`${RUTA_IMAGENES}/${nombre}`, { force: true });
  }
});

const llamar = (ruta, opciones = {}) =>
  fetch(`${base}${ruta}`, {
    ...opciones,
    headers: { 'content-type': 'application/json', cookie, ...opciones.headers },
  });

const enviar = (ruta, cuerpo) =>
  llamar(ruta, { method: 'POST', body: JSON.stringify(cuerpo) });

const subirImagen = (nombre, contenido = PNG) =>
  fetch(`${base}/api/docente/imagenes?nombre=${encodeURIComponent(nombre)}`, {
    method: 'POST',
    headers: { 'content-type': 'image/png', cookie },
    body: contenido,
  });

test('valida sin escribir y luego confirma', async () => {
  const previa = await (await enviar('/api/docente/bancos/validar', { contenido: CSV })).json();

  assert.equal(previa.ok, true);
  assert.equal(previa.resumen.total, 1);
  assert.equal(previa.muestra[0].correcta, 2);
  assert.equal((await (await llamar('/api/docente/bancos')).json()).bancos.length, 0);

  await enviar('/api/docente/bancos/confirmar', { contenido: CSV, nombre: 'Ciencias' });
  const { bancos } = await (await llamar('/api/docente/bancos')).json();

  assert.equal(bancos.length, 1);
  assert.equal(bancos[0].nombre, 'Ciencias');
  assert.equal(bancos[0].preguntas, 1);
});

test('un archivo con un solo error no importa nada', async () => {
  const malo = `${CABECERA}\n,,¿Buena?,a,b,c,d,A,\n,,¿Mala?,a,b,,d,A,\n`;
  const res = await enviar('/api/docente/bancos/confirmar', { contenido: malo });

  assert.equal(res.status, 400);
  assert.match((await res.json()).errores[0], /opción C está vacía/);
  assert.equal((await (await llamar('/api/docente/bancos')).json()).bancos.length, 0);
});

test('sube una imagen y la deja disponible para el importador', async () => {
  const res = await subirImagen('celula.png');
  const cuerpo = await res.json();

  assert.equal(cuerpo.ok, true);
  assert.equal(cuerpo.imagen.nombre, 'celula.png');

  const { imagenes } = await (await llamar('/api/docente/imagenes')).json();
  assert.ok(imagenes.includes('celula.png'));
});

test('la imagen subida se sirve sin contraseña: la ve el estudiante', async () => {
  await subirImagen('celula.png');
  const res = await fetch(`${base}/imagenes/celula.png`);

  assert.equal(res.status, 200);
  assert.equal(Buffer.from(await res.arrayBuffer()).length, PNG.length);
});

test('el importador exige que la imagen esté subida', async () => {
  const conImagen = `${CABECERA}\n,celula.png,¿Qué organelo?,a,b,c,d,B,\n`;

  const sinSubir = await (await enviar('/api/docente/bancos/validar', { contenido: conImagen })).json();
  assert.equal(sinSubir.ok, false);
  assert.match(sinSubir.errores[0], /no está en la carpeta de imágenes/);

  await subirImagen('celula.png');
  const conSubida = await (await enviar('/api/docente/bancos/validar', { contenido: conImagen })).json();
  assert.equal(conSubida.ok, true);
});

test('un nombre de imagen con ruta no escribe fuera de la carpeta', async () => {
  const res = await subirImagen('../../../escapada.png');
  const cuerpo = await res.json();

  // O se rechaza, o se guarda saneado; lo que no puede es salirse.
  if (cuerpo.ok) assert.equal(cuerpo.imagen.nombre, 'escapada.png');
  assert.deepEqual(
    listarImagenes().filter((n) => n.includes('..')),
    [],
  );
});

test('rechaza un archivo que no es imagen', async () => {
  const res = await fetch(`${base}/api/docente/imagenes?nombre=malicioso.js`, {
    method: 'POST',
    headers: { 'content-type': 'text/javascript', cookie },
    body: Buffer.from('alert(1)'),
  });

  assert.equal(res.status, 400);
  assert.match((await res.json()).mensaje, /Solo se admiten/);
});

test('el detalle del banco muestra cuál es la correcta (es del docente)', async () => {
  await enviar('/api/docente/bancos/confirmar', { contenido: CSV, nombre: 'Ciencias' });
  const { banco } = await (await llamar('/api/docente/bancos/1')).json();

  const correctas = banco.preguntas[0].opciones.filter((o) => o.es_correcta === 1);
  assert.equal(correctas.length, 1);
  assert.equal(correctas[0].texto, 'La cosecha');
});

test('nada de todo esto es alcanzable sin contraseña', async () => {
  const rutas = [
    ['/api/docente/bancos/validar', 'POST'],
    ['/api/docente/bancos/confirmar', 'POST'],
    ['/api/docente/bancos', 'GET'],
    ['/api/docente/bancos/1', 'GET'],
    ['/api/docente/bancos/1', 'DELETE'],
    ['/api/docente/imagenes', 'GET'],
    ['/api/docente/imagenes?nombre=x.png', 'POST'],
  ];

  for (const [ruta, metodo] of rutas) {
    const res = await fetch(`${base}${ruta}`, {
      method: metodo,
      headers: { 'content-type': 'application/json' },
      body: metodo === 'POST' ? JSON.stringify({ contenido: CSV }) : undefined,
    });
    assert.equal(res.status, 401, `${metodo} ${ruta} debería exigir contraseña`);
  }
});

test('ninguna respuesta abierta al estudiante revela la correcta', async () => {
  await enviar('/api/docente/bancos/confirmar', { contenido: CSV, nombre: 'Ciencias' });

  for (const ruta of ['/', '/api/salud', '/api/auth/estado']) {
    const res = await fetch(`${base}${ruta}`);
    const texto = await res.text();

    assert.doesNotMatch(texto, /es_correcta/, `${ruta} filtra es_correcta`);
    assert.doesNotMatch(texto, /La cosecha/, `${ruta} filtra la respuesta correcta`);
  }
});
