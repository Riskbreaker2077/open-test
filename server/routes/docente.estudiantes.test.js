import test, { afterEach, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { crearApp } from '../app.js';
import { abrirBd, cerrarBd } from '../db.js';
import { NOMBRE_COOKIE, _reiniciar } from '../sesion.js';
import { _reiniciarLimitador } from './auth.js';

let db;
let servidor;
let base;
let cookie;

const CABECERA = 'codigo,nombres,apellidos,curso';
const CSV = `${CABECERA}\n2024001,María Fernanda,Gómez Ruiz,10A\n2024002,Juan,Pérez,10B\n`;

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
});

function llamar(ruta, opciones = {}) {
  return fetch(`${base}${ruta}`, {
    ...opciones,
    headers: { 'content-type': 'application/json', cookie, ...opciones.headers },
  });
}

const enviar = (ruta, contenido) =>
  llamar(ruta, { method: 'POST', body: JSON.stringify({ contenido }) });

test('validar no escribe nada en la base', async () => {
  const res = await enviar('/api/docente/estudiantes/validar', CSV);
  const cuerpo = await res.json();

  assert.equal(cuerpo.ok, true);
  assert.deepEqual(cuerpo.resumen, { total: 2, creados: 2, actualizados: 0 });
  assert.equal(cuerpo.muestra.length, 2);

  const lista = await (await llamar('/api/docente/estudiantes')).json();
  assert.equal(lista.estudiantes.length, 0, 'previsualizar no debe guardar');
});

test('confirmar importa la lista completa', async () => {
  const cuerpo = await (await enviar('/api/docente/estudiantes/confirmar', CSV)).json();
  assert.deepEqual(cuerpo.resumen, { creados: 2, actualizados: 0, total: 2 });

  const lista = await (await llamar('/api/docente/estudiantes')).json();
  assert.equal(lista.estudiantes.length, 2);
  assert.deepEqual(lista.cursos, [
    { curso: '10A', total: 1 },
    { curso: '10B', total: 1 },
  ]);
});

test('importa el CSV tal cual lo exporta el Excel en español', async () => {
  const excel = '﻿codigo;nombres;apellidos;curso\r\n2024001;María;Gómez Ruiz;10A\r\n';
  const cuerpo = await (await enviar('/api/docente/estudiantes/confirmar', excel)).json();

  assert.equal(cuerpo.ok, true);

  const lista = await (await llamar('/api/docente/estudiantes')).json();
  assert.equal(lista.estudiantes[0].nombres, 'María', 'las tildes deben sobrevivir');
  assert.equal(lista.estudiantes[0].apellidos, 'Gómez Ruiz');
});

test('un archivo con errores no importa ni una fila', async () => {
  const malo = `${CABECERA}\n2024001,Ana,Gómez,10A\n,Luis,Pérez,10A\n`;
  const res = await enviar('/api/docente/estudiantes/confirmar', malo);

  assert.equal(res.status, 400);
  const cuerpo = await res.json();
  assert.equal(cuerpo.ok, false);
  assert.match(cuerpo.errores[0], /Fila 3/);

  const lista = await (await llamar('/api/docente/estudiantes')).json();
  assert.equal(lista.estudiantes.length, 0);
});

test('reimportar actualiza sin duplicar', async () => {
  await enviar('/api/docente/estudiantes/confirmar', CSV);
  const segunda = `${CABECERA}\n2024001,María Fernanda,Gómez Ruiz,11A\n`;
  await enviar('/api/docente/estudiantes/confirmar', segunda);

  const lista = await (await llamar('/api/docente/estudiantes')).json();
  assert.equal(lista.estudiantes.length, 2, 'sigue habiendo dos, no tres');
  assert.equal(lista.estudiantes.find((e) => e.codigo === '2024001').curso, '11A');
});

test('filtra el listado por curso', async () => {
  await enviar('/api/docente/estudiantes/confirmar', CSV);
  const lista = await (await llamar('/api/docente/estudiantes?curso=10A')).json();

  assert.equal(lista.estudiantes.length, 1);
  assert.equal(lista.estudiantes[0].curso, '10A');
});

test('elimina a un estudiante', async () => {
  await enviar('/api/docente/estudiantes/confirmar', CSV);
  const res = await llamar('/api/docente/estudiantes/2024001', { method: 'DELETE' });

  assert.equal(res.status, 200);
  const lista = await (await llamar('/api/docente/estudiantes')).json();
  assert.equal(lista.estudiantes.length, 1);
});

test('eliminar a quien no existe da 404', async () => {
  const res = await llamar('/api/docente/estudiantes/inventado', { method: 'DELETE' });
  assert.equal(res.status, 404);
});

test('todo el flujo de estudiantes exige contraseña', async () => {
  const rutas = [
    ['/api/docente/estudiantes/validar', 'POST'],
    ['/api/docente/estudiantes/confirmar', 'POST'],
    ['/api/docente/estudiantes', 'GET'],
    ['/api/docente/estudiantes/2024001', 'DELETE'],
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
