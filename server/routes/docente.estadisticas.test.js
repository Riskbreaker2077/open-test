import test, { afterEach, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { crearApp } from '../app.js';
import { abrirBd, cerrarBd } from '../db.js';
import { _reiniciar } from '../sesion.js';
import { _reiniciarLimitador } from './auth.js';
import { NOMBRE_COOKIE_ESTUDIANTE } from './examen.js';
import { guardarBanco } from '../services/bancos.js';
import { preguntasDeEjemplo } from '../fixtures-preguntas.js';

let db;
let servidor;
let base;
let cookieDocente;
let sesionId;
let bancoId;

const ESTUDIANTES = 'codigo,nombres,apellidos,curso\n1001,Ana,Gómez,10A\n1002,Luis,Pérez,10A\n';

beforeEach(async () => {
  _reiniciar();
  _reiniciarLimitador();
  db = abrirBd(':memory:');
  servidor = crearApp(db).listen(0);
  await new Promise((listo) => servidor.once('listening', listo));
  base = `http://127.0.0.1:${servidor.address().port}`;

  const alta = await fetch(`${base}/api/auth/establecer`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ contrasena: 'colegio2026' }),
  });
  cookieDocente = alta.headers.getSetCookie()[0].split(';')[0];
  await docente('/api/docente/estudiantes/confirmar', { contenido: ESTUDIANTES });
  bancoId = guardarBanco(db, 'Ciencias', preguntasDeEjemplo(2, (i) => ({ competencia: i === 0 ? 'Comp A' : 'Comp B' }))).bancoId;
  const creada = await docente('/api/docente/sesiones', {
    nombre: 'Parcial', banco_id: bancoId, cursos: ['10A'], n_preguntas: 2,
    segundos_minimos_pregunta: 0,
  });
  sesionId = creada.sesion.id;
  await docente(`/api/docente/sesiones/${sesionId}/abrir`, {});
  await docente(`/api/docente/sesiones/${sesionId}/comenzar`, {});

  for (const [codigo, acertarTodas] of [['1001', true], ['1002', false]]) {
    const entrada = await fetch(`${base}/api/examen/entrar`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ codigo, sesionId }),
    });
    const cookieEstudiante = entrada.headers.getSetCookie()
      .find((valor) => valor.startsWith(`${NOMBRE_COOKIE_ESTUDIANTE}=`)).split(';')[0];
    const examen = (ruta, opciones = {}) => fetch(`${base}${ruta}`, {
      ...opciones,
      headers: { 'content-type': 'application/json', cookie: cookieEstudiante, ...opciones.headers },
    });
    for (const n of [1, 2]) {
      const pregunta = await (await examen(`/api/examen/pregunta/${n}`)).json();
      const idsMostrados = pregunta.pregunta.opciones.map((o) => o.id);
      const opcion = acertarTodas
        ? pregunta.pregunta.opciones.find((o) => o.id === correctaEntre(db, idsMostrados))
        : pregunta.pregunta.opciones.find((o) => o.id !== correctaEntre(db, idsMostrados));
      await examen('/api/examen/responder', {
        method: 'POST', body: JSON.stringify({ n, opcionId: opcion.id, segundos: 5 }),
      });
    }
  }
  await docente(`/api/docente/sesiones/${sesionId}/cerrar`, {});
});

/** Entre los ids de opción que el estudiante vio, cuál es la correcta según la base. */
function correctaEntre(basedatos, ids) {
  const marcadores = ids.map(() => '?').join(',');
  return basedatos.prepare(`SELECT id FROM opciones WHERE id IN (${marcadores}) AND es_correcta = 1`).get(...ids).id;
}

afterEach(async () => {
  await new Promise((listo) => servidor.close(listo));
  cerrarBd(db);
});

const docente = (ruta, cuerpo) => fetch(`${base}${ruta}`, {
  method: 'POST', headers: { 'content-type': 'application/json', cookie: cookieDocente },
  body: JSON.stringify(cuerpo),
}).then((respuesta) => respuesta.json());

const llamar = (ruta) => fetch(`${base}${ruta}`, { headers: { cookie: cookieDocente } });

test('lista las sesiones cerradas del banco', async () => {
  const { sesiones } = await (await llamar(`/api/docente/bancos/${bancoId}/sesiones-cerradas`)).json();
  assert.equal(sesiones.length, 1);
  assert.equal(sesiones[0].id, sesionId);
  assert.deepEqual(sesiones[0].cursos, ['10A']);
});

test('las estadísticas por defecto ("todas") traen las dos preguntas y las dos competencias', async () => {
  const { estadisticas } = await (await llamar(`/api/docente/bancos/${bancoId}/estadisticas`)).json();
  assert.equal(estadisticas.preguntas.length, 2);
  assert.equal(estadisticas.competencias.length, 2);
  for (const pregunta of estadisticas.preguntas) assert.equal(pregunta.vecesMostrada, 2);
});

test('filtrar por la sesión concreta y por curso funciona vía HTTP', async () => {
  const { estadisticas } = await (await llamar(
    `/api/docente/bancos/${bancoId}/estadisticas?sesion=${sesionId}&curso=10A`,
  )).json();
  assert.equal(estadisticas.preguntas.length, 2);
});

test('una sesión que no existe da un error claro, no un 500 críptico', async () => {
  const res = await llamar(`/api/docente/bancos/${bancoId}/estadisticas?sesion=99999`);
  assert.equal(res.status, 400);
  assert.match((await res.json()).mensaje, /no es una evaluación cerrada/);
});

test('ambas rutas exigen contraseña de docente', async () => {
  for (const ruta of [
    `/api/docente/bancos/${bancoId}/sesiones-cerradas`,
    `/api/docente/bancos/${bancoId}/estadisticas`,
  ]) {
    const res = await fetch(`${base}${ruta}`);
    assert.equal(res.status, 401);
  }
});
