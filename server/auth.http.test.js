import { readdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test, { afterEach, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { crearApp } from './app.js';
import { abrirBd, cerrarBd } from './db.js';
import { NOMBRE_COOKIE, _reiniciar } from './sesion.js';
import { _reiniciarLimitador } from './routes/auth.js';

let db;
let servidor;
let base;

beforeEach(async () => {
  _reiniciar();
  _reiniciarLimitador();
  db = abrirBd(':memory:');
  servidor = crearApp(db).listen(0);
  await new Promise((listo) => servidor.once('listening', listo));
  base = `http://127.0.0.1:${servidor.address().port}`;
});

afterEach(async () => {
  await new Promise((listo) => servidor.close(listo));
  cerrarBd(db);
});

const CLAVE = 'colegio2026';

function cookieDe(res) {
  const cabecera = res.headers.getSetCookie().find((c) => c.startsWith(`${NOMBRE_COOKIE}=`));
  return { cruda: cabecera, valor: cabecera?.split(';')[0] };
}

async function establecer(contrasena = CLAVE) {
  const res = await fetch(`${base}/api/auth/establecer`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ contrasena }),
  });
  return { res, cookie: cookieDe(res) };
}

async function entrar(contrasena = CLAVE) {
  const res = await fetch(`${base}/api/auth/entrar`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ contrasena }),
  });
  return { res, cuerpo: await res.json(), cookie: cookieDe(res) };
}

// Rutas inventadas a propósito: la protección es del prefijo, así que también
// tiene que cubrir endpoints que todavía no existen.
const RUTAS_DOCENTE = [
  '/api/docente/estado',
  '/api/docente/estudiantes',
  '/api/docente/bancos',
  '/api/docente/sesiones/1/monitoreo',
  '/api/docente/lo-que-sea',
];

test('sin sesión, TODO /api/docente/* responde 401', async () => {
  await establecer();

  for (const ruta of RUTAS_DOCENTE) {
    const res = await fetch(`${base}${ruta}`);
    assert.equal(res.status, 401, `${ruta} debería estar cerrada`);

    const cuerpo = await res.json();
    assert.equal(cuerpo.ok, false);
    assert.match(cuerpo.mensaje, /iniciar sesión/i);
  }
});

test('con sesión, /api/docente/* deja de responder 401', async () => {
  const { cookie } = await establecer();

  for (const ruta of RUTAS_DOCENTE) {
    const res = await fetch(`${base}${ruta}`, { headers: { cookie: cookie.valor } });
    assert.notEqual(res.status, 401, `${ruta} debería pasar la autenticación`);
  }
});

test('el primer arranque pide crear contraseña y luego ya no', async () => {
  const antes = await (await fetch(`${base}/api/auth/estado`)).json();
  assert.equal(antes.configurado, false);
  assert.equal(antes.autenticado, false);

  await establecer();

  const despues = await (await fetch(`${base}/api/auth/estado`)).json();
  assert.equal(despues.configurado, true);
});

test('no se puede establecer una segunda contraseña sin la actual', async () => {
  await establecer();
  const { res } = await establecer('otraDistinta');
  assert.equal(res.status, 409);
});

test('la contraseña correcta entra y la incorrecta no', async () => {
  await establecer();

  const bien = await entrar(CLAVE);
  assert.equal(bien.res.status, 200);
  assert.ok(bien.cookie.valor);

  const mal = await entrar('equivocada');
  assert.equal(mal.res.status, 401);
  assert.equal(mal.cuerpo.mensaje, 'Contraseña incorrecta.');
});

test('el error no revela si el equipo ya tenía contraseña configurada', async () => {
  const sinConfigurar = await entrar('loquesea');
  await establecer();
  _reiniciarLimitador(); // El límite de intentos no debe enmascarar la comparación.
  const configurado = await entrar('equivocada');

  assert.equal(sinConfigurar.cuerpo.mensaje, configurado.cuerpo.mensaje);
});

test('la cookie es HttpOnly, SameSite=Lax y caduca', async () => {
  const { cookie } = await establecer();

  assert.match(cookie.cruda, /HttpOnly/i);
  assert.match(cookie.cruda, /SameSite=Lax/i);
  assert.match(cookie.cruda, /Max-Age=\d+/i);
});

test('tras varios fallos seguidos se impone una espera', async () => {
  await establecer();

  await entrar('mala1');
  const segundo = await entrar('mala2');

  assert.equal(segundo.res.status, 429);
  assert.match(segundo.cuerpo.mensaje, /Espera \d+ segundos/);
});

test('cerrar sesión invalida la cookie', async () => {
  const { cookie } = await establecer();

  const dentro = await fetch(`${base}/api/docente/estado`, { headers: { cookie: cookie.valor } });
  assert.equal(dentro.status, 200);

  await fetch(`${base}/api/auth/salir`, { method: 'POST', headers: { cookie: cookie.valor } });

  const fuera = await fetch(`${base}/api/docente/estado`, { headers: { cookie: cookie.valor } });
  assert.equal(fuera.status, 401);
});

test('las páginas del docente y de proyección redirigen al inicio de sesión', async () => {
  await establecer();

  for (const ruta of ['/docente/', '/docente/index.html', '/proyeccion/']) {
    const res = await fetch(`${base}${ruta}`, { redirect: 'manual' });
    assert.equal(res.status, 302, `${ruta} debería redirigir`);
    assert.equal(res.headers.get('location'), '/docente/entrar.html');
  }
});

test('la página de entrada es alcanzable sin sesión', async () => {
  const res = await fetch(`${base}/docente/entrar.html`);
  assert.equal(res.status, 200);
});

test('el portal del estudiante sigue abierto sin contraseña', async () => {
  await establecer();

  for (const ruta of ['/', '/shared/base.css', '/api/salud']) {
    const res = await fetch(`${base}${ruta}`);
    assert.equal(res.status, 200, `${ruta} no debería exigir contraseña`);
  }
});

test('ninguna página del estudiante menciona el panel del docente', async () => {
  const raiz = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');
  const entradas = await readdir(raiz, { recursive: true, withFileTypes: true });

  for (const entrada of entradas) {
    if (!entrada.isFile() || !/\.(html|css|js)$/.test(entrada.name)) continue;

    const carpeta = entrada.parentPath ?? entrada.path;
    if (carpeta.includes('docente') || carpeta.includes('proyeccion')) continue;

    const contenido = await readFile(join(carpeta, entrada.name), 'utf8');
    assert.doesNotMatch(contenido, /\/docente|\/proyeccion/, `${entrada.name} delata el panel`);
  }
});
