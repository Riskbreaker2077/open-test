import test, { afterEach, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { crearApp } from '../app.js';
import { abrirBd, cerrarBd } from '../db.js';
import { _reiniciar } from '../sesion.js';
import { _reiniciarLimitador } from './auth.js';

let db;
let servidor;
let base;
let cookie;

const ESTUDIANTES = 'codigo,nombres,apellidos,curso\n2024001,Ana,Gómez,10A\n2024002,Luis,Pérez,10B\n';
const banco = (n) =>
  'enunciado,opcion_a,opcion_b,opcion_c,opcion_d,correcta\n' +
  Array.from({ length: n }, (_, i) => `¿P${i}?,a,b,c,d,A`).join('\n') +
  '\n';

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

  await post('/api/docente/estudiantes/confirmar', { contenido: ESTUDIANTES });
  await post('/api/docente/bancos/confirmar', { contenido: banco(25), nombre: 'Ciencias' });
});

afterEach(async () => {
  await new Promise((listo) => servidor.close(listo));
  cerrarBd(db);
});

const llamar = (ruta, opciones = {}) =>
  fetch(`${base}${ruta}`, {
    ...opciones,
    headers: { 'content-type': 'application/json', cookie, ...opciones.headers },
  });

const post = async (ruta, cuerpo) =>
  (await llamar(ruta, { method: 'POST', body: JSON.stringify(cuerpo ?? {}) })).json();

const NUEVA = { nombre: 'Parcial', banco_id: 1, cursos: ['10A'] };

test('crea la evaluación en borrador con los valores por defecto', async () => {
  const { sesion } = await post('/api/docente/sesiones', NUEVA);

  assert.equal(sesion.estado, 'borrador');
  assert.equal(sesion.n_preguntas, 20);
  assert.equal(sesion.duracion_minutos, 60);
  assert.equal(sesion.segundos_minimos_pregunta, 10);
  assert.equal(sesion.nivel_feedback, 'aciertos');
});

test('la lista trae el banco, el recuento y los valores por defecto del panel', async () => {
  await post('/api/docente/sesiones', NUEVA);
  const cuerpo = await (await llamar('/api/docente/sesiones')).json();

  assert.equal(cuerpo.sesiones[0].banco, 'Ciencias');
  assert.equal(cuerpo.sesiones[0].preguntas_banco, 25);
  assert.equal(cuerpo.sesiones[0].dentro, 0);
  assert.equal(cuerpo.porDefecto.n_preguntas, 20);
});

test('no abre una evaluación cuyo banco se queda corto', async () => {
  const { sesion } = await post('/api/docente/sesiones', { ...NUEVA, n_preguntas: 30 });
  const res = await llamar(`/api/docente/sesiones/${sesion.id}/abrir`, { method: 'POST' });

  assert.equal(res.status, 409);
  assert.match((await res.json()).mensaje, /banco tiene 25 pregunta/);
});

test('abre y cierra la evaluación', async () => {
  const { sesion } = await post('/api/docente/sesiones', NUEVA);

  assert.equal((await post(`/api/docente/sesiones/${sesion.id}/abrir`)).sesion.estado, 'abierta');
  assert.equal((await post(`/api/docente/sesiones/${sesion.id}/cerrar`)).sesion.estado, 'cerrada');
});

test('los parámetros no se pueden cambiar una vez abierta', async () => {
  const { sesion } = await post('/api/docente/sesiones', NUEVA);

  const enBorrador = await llamar(`/api/docente/sesiones/${sesion.id}`, {
    method: 'PUT',
    body: JSON.stringify({ ...NUEVA, duracion_minutos: 45 }),
  });
  assert.equal(enBorrador.status, 200);

  await post(`/api/docente/sesiones/${sesion.id}/abrir`);

  const abierta = await llamar(`/api/docente/sesiones/${sesion.id}`, {
    method: 'PUT',
    body: JSON.stringify({ ...NUEVA, duracion_minutos: 90 }),
  });
  assert.equal(abierta.status, 409);
  assert.match((await abierta.json()).mensaje, /no se pueden cambiar/);

  const { sesion: final } = await (await llamar(`/api/docente/sesiones/${sesion.id}`)).json();
  assert.equal(final.duracion_minutos, 45);
});

test('pueden abrirse varias evaluaciones a la vez para cursos distintos', async () => {
  const a = await post('/api/docente/sesiones', { ...NUEVA, nombre: 'Ciencias', cursos: ['10A'] });
  const b = await post('/api/docente/sesiones', { ...NUEVA, nombre: 'Mates', cursos: ['10B'] });

  await post(`/api/docente/sesiones/${a.sesion.id}/abrir`);
  const segunda = await llamar(`/api/docente/sesiones/${b.sesion.id}/abrir`, { method: 'POST' });

  assert.equal(segunda.status, 200);
  const { sesiones } = await (await llamar('/api/docente/sesiones')).json();
  assert.equal(sesiones.filter((s) => s.estado === 'abierta').length, 2);
});

test('rechaza datos incompletos con un mensaje en español', async () => {
  const sinCurso = await llamar('/api/docente/sesiones', {
    method: 'POST',
    body: JSON.stringify({ ...NUEVA, cursos: [] }),
  });

  assert.equal(sinCurso.status, 400);
  assert.match((await sinCurso.json()).mensaje, /al menos un curso/);
});

test('el recuento de la lista refleja quién ha entrado', async () => {
  const { sesion } = await post('/api/docente/sesiones', NUEVA);
  await post(`/api/docente/sesiones/${sesion.id}/abrir`);

  await fetch(`${base}/api/examen/entrar`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ codigo: '2024001', sesionId: sesion.id }),
  });

  const { sesiones } = await (await llamar('/api/docente/sesiones')).json();
  assert.equal(sesiones[0].dentro, 1);
  assert.equal(sesiones[0].entregados, 0);
});

test('todas las rutas de evaluaciones exigen contraseña', async () => {
  const rutas = [
    ['/api/docente/sesiones', 'GET'],
    ['/api/docente/sesiones', 'POST'],
    ['/api/docente/sesiones/1', 'GET'],
    ['/api/docente/sesiones/1', 'PUT'],
    ['/api/docente/sesiones/1/abrir', 'POST'],
    ['/api/docente/sesiones/1/cerrar', 'POST'],
    ['/api/docente/sesiones/1', 'DELETE'],
  ];

  for (const [ruta, metodo] of rutas) {
    const res = await fetch(`${base}${ruta}`, {
      method: metodo,
      headers: { 'content-type': 'application/json' },
      body: ['POST', 'PUT'].includes(metodo) ? JSON.stringify(NUEVA) : undefined,
    });
    assert.equal(res.status, 401, `${metodo} ${ruta} debería exigir contraseña`);
  }
});
