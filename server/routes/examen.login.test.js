import test, { afterEach, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { crearApp } from '../app.js';
import { abrirBd, cerrarBd } from '../db.js';
import { _reiniciar } from '../sesion.js';
import { _reiniciarLimitador } from './auth.js';
import { NOMBRE_COOKIE_ESTUDIANTE } from './examen.js';

let db;
let servidor;
let base;
let cookieDocente;

const ESTUDIANTES = 'codigo,nombres,apellidos,curso\n2024001,Ana,Gómez,10A\n2024002,Luis,Pérez,10B\n';
const BANCO =
  'enunciado,opcion_a,opcion_b,opcion_c,opcion_d,correcta\n' +
  Array.from({ length: 25 }, (_, i) => `¿P${i}?,a,b,c,d,A`).join('\n') +
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
  cookieDocente = alta.headers.getSetCookie()[0].split(';')[0];

  await docente('/api/docente/estudiantes/confirmar', { contenido: ESTUDIANTES });
  await docente('/api/docente/bancos/confirmar', { contenido: BANCO, nombre: 'Ciencias' });
});

afterEach(async () => {
  await new Promise((listo) => servidor.close(listo));
  cerrarBd(db);
});

const docente = (ruta, cuerpo) =>
  fetch(`${base}${ruta}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie: cookieDocente },
    body: JSON.stringify(cuerpo),
  }).then((r) => r.json());

const alumno = (ruta, cuerpo, cookie) =>
  fetch(`${base}${ruta}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}) },
    body: JSON.stringify(cuerpo),
  });

async function sesionAbierta(cursos = ['10A'], extra = {}) {
  const { sesion } = await docente('/api/docente/sesiones', {
    nombre: 'Parcial', banco_id: 1, cursos, n_preguntas: 20, ...extra,
  });
  await docente(`/api/docente/sesiones/${sesion.id}/abrir`, {});
  return sesion;
}

const cookieDe = (res) =>
  res.headers.getSetCookie()?.find((c) => c.startsWith(`${NOMBRE_COOKIE_ESTUDIANTE}=`));

test('el estudiante ve solo las evaluaciones de su curso', async () => {
  await sesionAbierta(['10A']);
  await sesionAbierta(['10B'], { nombre: 'Otra' });

  const res = await alumno('/api/examen/sesiones', { codigo: '2024001' });
  const cuerpo = await res.json();

  assert.equal(cuerpo.estudiante.nombres, 'Ana');
  assert.deepEqual(cuerpo.sesiones.map((s) => s.nombre), ['Parcial']);
});

test('un código inexistente no revela nada', async () => {
  await sesionAbierta();
  const res = await alumno('/api/examen/sesiones', { codigo: '9999999' });

  assert.equal(res.status, 404);
  assert.equal((await res.json()).mensaje, 'No encontramos ese código. Revísalo con tu docente.');
});

test('sin evaluaciones abiertas la lista viene vacía, no es un error', async () => {
  const res = await alumno('/api/examen/sesiones', { codigo: '2024001' });

  assert.equal(res.status, 200);
  assert.deepEqual((await res.json()).sesiones, []);
});

test('el código se recorta: los espacios sobrantes no impiden entrar', async () => {
  const sesion = await sesionAbierta();
  const res = await alumno('/api/examen/entrar', { codigo: '  2024001  ', sesionId: sesion.id });

  assert.equal(res.status, 200);
  assert.equal((await res.json()).estado.estudiante, 'Ana Gómez');
});

test('entrar entrega una cookie HttpOnly', async () => {
  const sesion = await sesionAbierta();
  const res = await alumno('/api/examen/entrar', { codigo: '2024001', sesionId: sesion.id });

  const cookie = cookieDe(res);
  assert.ok(cookie, 'debe venir la cookie del estudiante');
  assert.match(cookie, /HttpOnly/i);
  assert.match(cookie, /SameSite=Lax/i);
});

test('un estudiante de otro curso no entra', async () => {
  const sesion = await sesionAbierta(['10A']);
  const res = await alumno('/api/examen/entrar', { codigo: '2024002', sesionId: sesion.id });

  assert.equal(res.status, 409);
  assert.match((await res.json()).mensaje, /no es para tu curso/);
});

test('no se entra a una evaluación en borrador', async () => {
  const { sesion } = await docente('/api/docente/sesiones', {
    nombre: 'Sin abrir', banco_id: 1, cursos: ['10A'],
  });
  const res = await alumno('/api/examen/entrar', { codigo: '2024001', sesionId: sesion.id });

  assert.equal(res.status, 409);
  assert.match((await res.json()).mensaje, /todavía no está abierta/);
});

test('reanudar con el código devuelve el mismo intento', async () => {
  const sesion = await sesionAbierta();

  const primera = await (await alumno('/api/examen/entrar', { codigo: '2024001', sesionId: sesion.id })).json();
  const segunda = await (await alumno('/api/examen/entrar', { codigo: '2024001', sesionId: sesion.id })).json();

  assert.equal(primera.nuevo, true);
  assert.equal(segunda.nuevo, false);
  assert.equal(segunda.estado.intentoId, primera.estado.intentoId);
});

test('el estado se consulta con la cookie y refleja la sesión', async () => {
  const sesion = await sesionAbierta();
  const entrada = await alumno('/api/examen/entrar', { codigo: '2024001', sesionId: sesion.id });
  const cookie = cookieDe(entrada).split(';')[0];

  const res = await fetch(`${base}/api/examen/estado`, { headers: { cookie } });
  const { estado } = await res.json();

  assert.equal(estado.estudiante, 'Ana Gómez');
  assert.equal(estado.curso, '10A');
  assert.equal(estado.sesion.estado, 'abierta');
  assert.equal(estado.entregado, false);
  assert.equal(estado.nPreguntas, 20);
});

test('sin cookie válida, el estado pide volver a escribir el código', async () => {
  await sesionAbierta();

  const sinCookie = await fetch(`${base}/api/examen/estado`);
  assert.equal(sinCookie.status, 401);
  assert.match((await sinCookie.json()).mensaje, /escribir tu código/i);

  const inventada = await fetch(`${base}/api/examen/estado`, {
    headers: { cookie: `${NOMBRE_COOKIE_ESTUDIANTE}=${'a'.repeat(64)}` },
  });
  assert.equal(inventada.status, 401);
});

test('dos entradas simultáneas no crean dos intentos', async () => {
  const sesion = await sesionAbierta();

  const respuestas = await Promise.all(
    Array.from({ length: 5 }, () =>
      alumno('/api/examen/entrar', { codigo: '2024001', sesionId: sesion.id }),
    ),
  );

  for (const res of respuestas) assert.equal(res.status, 200);
  assert.equal(db.prepare('SELECT count(*) AS t FROM intentos').get().t, 1);
});

test('el estado del estudiante no filtra nada del banco ni de las respuestas', async () => {
  const sesion = await sesionAbierta();
  const entrada = await alumno('/api/examen/entrar', { codigo: '2024001', sesionId: sesion.id });
  const cookie = cookieDe(entrada).split(';')[0];

  for (const ruta of ['/api/examen/estado']) {
    const texto = await (await fetch(`${base}${ruta}`, { headers: { cookie } })).text();
    assert.doesNotMatch(texto, /es_correcta|correcta|semilla|token/i, `${ruta} filtra información`);
  }
});

test('el estudiante no necesita contraseña, pero el panel de sesiones sí', async () => {
  await sesionAbierta();

  assert.equal((await alumno('/api/examen/sesiones', { codigo: '2024001' })).status, 200);
  assert.equal((await fetch(`${base}/api/docente/sesiones`)).status, 401);
});
