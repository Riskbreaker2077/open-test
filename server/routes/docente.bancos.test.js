import { rmSync } from 'node:fs';
import test, { afterEach, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { crearApp } from '../app.js';
import { abrirBd, cerrarBd, RUTA_IMAGENES } from '../db.js';
import { _reiniciar } from '../sesion.js';
import { _reiniciarLimitador } from './auth.js';
import { listarImagenes } from '../services/imagenes.js';
import { zip } from '../importers/paquete-zip.test.js';
import { preguntaDeEjemplo } from '../fixtures-preguntas.js';

let db;
let servidor;
let base;
let cookie;
let imagenesIniciales;

// PNG mínimo válido de 1x1.
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

const paqueteJson = (preguntas, overrides = {}) => JSON.stringify({
  estandar: 'preguntas-icfes',
  version_estandar: '1.0.0',
  nombre: 'Ciencias',
  preguntas,
  ...overrides,
});

const zipDe = (preguntas, imagenes = {}) => zip({
  'paquete.json': paqueteJson(preguntas),
  ...Object.fromEntries(Object.entries(imagenes).map(([nombre, contenido]) => [`imagenes/${nombre}`, contenido])),
});

beforeEach(async () => {
  _reiniciar();
  _reiniciarLimitador();
  imagenesIniciales = new Set(listarImagenes());
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
  for (const nombre of listarImagenes().filter((item) => !imagenesIniciales.has(item))) {
    rmSync(`${RUTA_IMAGENES}/${nombre}`, { force: true });
  }
});

const llamar = (ruta, opciones = {}) =>
  fetch(`${base}${ruta}`, {
    ...opciones,
    headers: { cookie, ...opciones.headers },
  });

const subirZip = (ruta, buffer, nombre) =>
  llamar(`${ruta}${nombre ? `?nombre=${encodeURIComponent(nombre)}` : ''}`, {
    method: 'POST',
    headers: { 'content-type': 'application/zip' },
    body: buffer,
  });

const subirImagen = (nombre, contenido = PNG) =>
  fetch(`${base}/api/docente/imagenes?nombre=${encodeURIComponent(nombre)}`, {
    method: 'POST',
    headers: { 'content-type': 'image/png', cookie },
    body: contenido,
  });

test('valida sin escribir y luego confirma', async () => {
  const buffer = zipDe([preguntaDeEjemplo()]);
  const previa = await (await subirZip('/api/docente/bancos/paquete/validar', buffer, 'Ciencias')).json();

  assert.equal(previa.ok, true);
  assert.equal(previa.resumen.total, 1);
  assert.equal((await (await llamar('/api/docente/bancos')).json()).bancos.length, 0);

  await subirZip('/api/docente/bancos/paquete/confirmar', buffer, 'Ciencias');
  const { bancos } = await (await llamar('/api/docente/bancos')).json();

  assert.equal(bancos.length, 1);
  assert.equal(bancos[0].nombre, 'Ciencias');
  assert.equal(bancos[0].preguntas, 1);
});

test('un paquete con un solo error no importa nada', async () => {
  const buena = preguntaDeEjemplo({ id: 'buena' });
  const mala = preguntaDeEjemplo({ id: 'mala' });
  delete mala.competencia;
  const buffer = zipDe([buena, mala]);

  const res = await subirZip('/api/docente/bancos/paquete/confirmar', buffer);
  assert.equal(res.status, 400);
  assert.match((await res.json()).errores[0], /competencia/);
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

test('el importador exige que la imagen referenciada esté disponible', async () => {
  const conImagen = preguntaDeEjemplo({ contexto: [{ tipo: 'imagen', archivo: 'celula.png' }] });

  const sinImagen = await (await subirZip('/api/docente/bancos/paquete/validar', zipDe([conImagen]))).json();
  assert.equal(sinImagen.ok, false);
  assert.match(sinImagen.errores[0], /no existe en imagenes/);

  const conElZip = await (await subirZip(
    '/api/docente/bancos/paquete/validar',
    zipDe([conImagen], { 'celula.png': PNG }),
  )).json();
  assert.equal(conElZip.ok, true);

  await subirImagen('celula.png');
  const yaSubida = await (await subirZip('/api/docente/bancos/paquete/validar', zipDe([conImagen]))).json();
  assert.equal(yaSubida.ok, true);
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

test('el detalle del banco muestra cuál es la correcta y su justificación (es del docente)', async () => {
  await subirZip('/api/docente/bancos/paquete/confirmar', zipDe([preguntaDeEjemplo()]), 'Ciencias');
  const { banco } = await (await llamar('/api/docente/bancos/1')).json();

  const correctas = banco.preguntas[0].opciones.filter((o) => o.es_correcta === 1);
  assert.equal(correctas.length, 1);
  assert.deepEqual(correctas[0].contenido, [{ tipo: 'texto', texto: 'Opción C' }]);
  assert.match(correctas[0].justificacion, /Correcta/);
});

test('nada de todo esto es alcanzable sin contraseña', async () => {
  const rutas = [
    ['/api/docente/bancos/paquete/validar', 'POST'],
    ['/api/docente/bancos/paquete/confirmar', 'POST'],
    ['/api/docente/bancos', 'GET'],
    ['/api/docente/bancos/1', 'GET'],
    ['/api/docente/bancos/1', 'DELETE'],
    ['/api/docente/imagenes', 'GET'],
    ['/api/docente/imagenes?nombre=x.png', 'POST'],
  ];

  for (const [ruta, metodo] of rutas) {
    const res = await fetch(`${base}${ruta}`, { method: metodo });
    assert.equal(res.status, 401, `${metodo} ${ruta} debería exigir contraseña`);
  }
});

test('ninguna respuesta abierta al estudiante revela la correcta ni la justificación', async () => {
  await subirZip('/api/docente/bancos/paquete/confirmar', zipDe([preguntaDeEjemplo()]), 'Ciencias');

  for (const ruta of ['/', '/api/salud', '/api/auth/estado']) {
    const res = await fetch(`${base}${ruta}`);
    const texto = await res.text();

    assert.doesNotMatch(texto, /es_correcta/, `${ruta} filtra es_correcta`);
    assert.doesNotMatch(texto, /justificacion/, `${ruta} filtra justificacion`);
    assert.doesNotMatch(texto, /Opción C/, `${ruta} filtra la respuesta correcta`);
  }
});
