import test, { afterEach, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { crearApp } from '../app.js';
import { abrirBd, cerrarBd } from '../db.js';
import { _reiniciar } from '../sesion.js';
import { _reiniciarLimitador } from './auth.js';
import { NOMBRE_COOKIE_ESTUDIANTE } from './examen.js';
import { guardarBanco } from '../services/bancos.js';
import { preguntasDeEjemplo } from '../fixtures-preguntas.js';

const CLAVE = `mcp_${'a'.repeat(16)}.${'b'.repeat(43)}`;
const DESTINO = { codigo: 'STJ / EVA / 1', modulo: 'Módulo 1', asignatura: 'Sociales', periodo: 'P1', cursos: ['10A'] };

let db;
let servidor;
let base;
let cookieDocente;
let sesionId;
let fetchOriginal;
/** Toda petición que salga del proceso hacia algo que no sea el propio OpenTest. */
let salientes;

beforeEach(async () => {
  _reiniciar();
  _reiniciarLimitador();
  db = abrirBd(':memory:');
  servidor = crearApp(db).listen(0);
  await new Promise((listo) => servidor.once('listening', listo));
  base = `http://127.0.0.1:${servidor.address().port}`;

  salientes = [];
  fetchOriginal = globalThis.fetch;
  globalThis.fetch = (url, opciones) => {
    if (!String(url).startsWith(base)) salientes.push(String(url));
    return fetchOriginal(url, opciones);
  };

  const alta = await fetch(`${base}/api/auth/establecer`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ contrasena: 'colegio2026' }),
  });
  cookieDocente = alta.headers.getSetCookie()[0].split(';')[0];
  await docente('POST', '/api/docente/estudiantes/confirmar', { contenido: 'codigo,nombres,apellidos,curso\n1001,Ana,Gómez,10A\n' });
  guardarBanco(db, 'Ciencias', preguntasDeEjemplo(4));
  const creada = await docente('POST', '/api/docente/sesiones', {
    nombre: 'Parcial', banco_id: 1, cursos: ['10A'], n_preguntas: 4, segundos_minimos_pregunta: 0,
  });
  sesionId = creada.sesion.id;
});

afterEach(async () => {
  globalThis.fetch = fetchOriginal;
  await new Promise((listo) => servidor.close(listo));
  cerrarBd(db);
});

function docente(metodo, ruta, cuerpo) {
  return fetch(`${base}${ruta}`, {
    method: metodo,
    headers: { 'content-type': 'application/json', cookie: cookieDocente },
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
  }).then((respuesta) => respuesta.json());
}

/** Un estudiante presenta la prueba entera por la API, como lo haría la tablet. */
async function presentarExamenCompleto() {
  await docente('POST', `/api/docente/sesiones/${sesionId}/abrir`, {});
  const entrada = await fetch(`${base}/api/examen/entrar`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ codigo: '1001', sesionId }),
  });
  const cookie = entrada.headers.getSetCookie()
    .find((valor) => valor.startsWith(`${NOMBRE_COOKIE_ESTUDIANTE}=`)).split(';')[0];
  const examen = (ruta, opciones = {}) => fetch(`${base}${ruta}`, {
    ...opciones, headers: { 'content-type': 'application/json', cookie },
  }).then((respuesta) => respuesta.json());
  await docente('POST', `/api/docente/sesiones/${sesionId}/comenzar`, {});

  // Con el examen en marcha, «Enviar ahora» no sale a la red.
  const durante = await docente('POST', '/api/docente/portal/enviar');
  assert.equal(durante.ok, false);
  assert.match(durante.mensaje, /en curso o en pausa/);

  for (let n = 1; n <= 4; n += 1) {
    const { pregunta } = await examen(`/api/examen/pregunta/${n}`);
    await examen('/api/examen/responder', {
      method: 'POST', body: JSON.stringify({ n, opcionId: pregunta.opciones[0].id, segundos: 1 }),
    });
    await examen('/api/examen/latido', { method: 'POST' });
  }
  await examen('/api/examen/entregar', { method: 'POST' });
  await examen('/api/examen/resultado');
  await docente('POST', `/api/docente/sesiones/${sesionId}/cerrar`, {});
}

test('un examen completo, vinculado y con código, no abre ninguna conexión hacia afuera', async () => {
  await docente('PUT', '/api/docente/portal/vinculo', { url: 'https://portal.ejemplo.test', clave: CLAVE });
  await docente('PATCH', `/api/docente/sesiones/${sesionId}/codigo-portal`, { codigo: 'EV-1' });
  await presentarExamenCompleto();
  const estado = await docente('GET', '/api/docente/portal');
  assert.equal(estado.envios[0].estado, 'pendiente');
  assert.deepEqual(salientes, []);
});

test('la API del panel nunca devuelve la clave del portal', async () => {
  const vinculado = await docente('PUT', '/api/docente/portal/vinculo', { url: 'https://portal.ejemplo.test', clave: CLAVE });
  assert.deepEqual(vinculado.vinculo, { vinculado: true, url: 'https://portal.ejemplo.test', finClave: 'bbbb' });
  const crudo = await fetch(`${base}/api/docente/portal`, { headers: { cookie: cookieDocente } }).then((r) => r.text());
  assert.ok(!crudo.includes(CLAVE));
  const sinSesion = await fetch(`${base}/api/docente/portal`);
  assert.equal(sinSesion.status, 401);
});

/** Un portal real y mínimo por HTTP plano (feature 030 del portal). */
function portalFalso() {
  const recibidas = [];
  const portal = createServer((req, res) => {
    const partes = [];
    req.on('data', (parte) => partes.push(parte));
    req.on('end', () => {
      recibidas.push({ metodo: req.method, url: req.url, auth: req.headers.authorization, bytes: Buffer.concat(partes).length });
      res.setHeader('content-type', 'application/json');
      const url = new URL(req.url, 'http://localhost');
      if (req.method === 'GET' && !url.searchParams.has('codigo')) {
        res.end(JSON.stringify({ ok: true, evaluaciones: [DESTINO] }));
      } else if (req.method === 'GET') {
        res.end(JSON.stringify({ ok: true, destino: DESTINO }));
      } else {
        res.end(JSON.stringify({ ok: true, estado: 'PROPUESTA_CREADA', propuestaId: 'p1' }));
      }
    });
  }).listen(0, '127.0.0.1');
  return { portal, recibidas };
}

test('«Buscar evaluaciones disponibles» trae la lista del portal', async () => {
  const { portal, recibidas } = portalFalso();
  await new Promise((listo) => portal.once('listening', listo));
  try {
    await docente('PUT', '/api/docente/portal/vinculo', { url: `http://127.0.0.1:${portal.address().port}`, clave: CLAVE });
    const respuesta = await docente('GET', '/api/docente/portal/evaluaciones-disponibles');
    assert.equal(respuesta.ok, true);
    assert.deepEqual(respuesta.evaluaciones, [DESTINO]);
    assert.equal(recibidas[0].auth, `Bearer ${CLAVE}`);
  } finally {
    await new Promise((listo) => portal.close(listo));
  }
});

test('sin vincular, «Buscar evaluaciones disponibles» no llama a nada', async () => {
  const respuesta = await docente('GET', '/api/docente/portal/evaluaciones-disponibles');
  assert.equal(respuesta.ok, false);
  assert.match(respuesta.mensaje, /vincula/);
});

test('«Enviar ahora» entrega el ZIP a un portal real por HTTP y lo marca enviado', async () => {
  const { portal, recibidas } = portalFalso();
  await new Promise((listo) => portal.once('listening', listo));
  try {
    await presentarExamenCompleto();
    await docente('PUT', '/api/docente/portal/vinculo', { url: `http://127.0.0.1:${portal.address().port}`, clave: CLAVE });
    const conCodigo = await docente('PATCH', `/api/docente/sesiones/${sesionId}/codigo-portal`, { codigo: DESTINO.codigo });
    assert.equal(conCodigo.envios[0].estado, 'pendiente');

    const envio = await docente('POST', '/api/docente/portal/enviar');
    assert.equal(envio.ok, true);
    assert.equal(envio.enviados, 1);
    assert.equal(envio.envios[0].estado, 'enviado');
    assert.deepEqual(recibidas.map((r) => `${r.metodo} ${r.url}`), [
      'GET /api/opentest/evaluaciones?codigo=STJ%20%2F%20EVA%20%2F%201',
      'POST /api/opentest/envios?evaluacion=STJ%20%2F%20EVA%20%2F%201',
    ]);
    assert.ok(recibidas.every((r) => r.auth === `Bearer ${CLAVE}`));
    assert.ok(recibidas[1].bytes > 0);
  } finally {
    await new Promise((listo) => portal.close(listo));
  }
});
