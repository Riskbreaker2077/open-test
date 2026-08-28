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
let cookieEstudiante;
let sesionId;

const ESTUDIANTES = 'codigo,nombres,apellidos,curso\n1001,Ana,Gómez,10A\n';

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
  guardarBanco(db, 'Ciencias', preguntasDeEjemplo(4));
  const creada = await docente('/api/docente/sesiones', {
    nombre: 'Parcial', banco_id: 1, cursos: ['10A'], n_preguntas: 4,
    segundos_minimos_pregunta: 0,
  });
  sesionId = creada.sesion.id;
  await docente(`/api/docente/sesiones/${sesionId}/abrir`, {});

  const entrada = await fetch(`${base}/api/examen/entrar`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ codigo: '1001', sesionId }),
  });
  cookieEstudiante = entrada.headers.getSetCookie()
    .find((valor) => valor.startsWith(`${NOMBRE_COOKIE_ESTUDIANTE}=`)).split(';')[0];
  await docente(`/api/docente/sesiones/${sesionId}/comenzar`, {});
});

afterEach(async () => {
  await new Promise((listo) => servidor.close(listo));
  cerrarBd(db);
});

const docente = (ruta, cuerpo) => fetch(`${base}${ruta}`, {
  method: 'POST', headers: { 'content-type': 'application/json', cookie: cookieDocente },
  body: JSON.stringify(cuerpo),
}).then((respuesta) => respuesta.json());

const examen = (ruta, opciones = {}) => fetch(`${base}${ruta}`, {
  ...opciones,
  headers: { 'content-type': 'application/json', cookie: cookieEstudiante, ...opciones.headers },
});

test('consulta una pregunta, guarda antes de avanzar y reanuda en la misma', async () => {
  const primera = await (await examen('/api/examen/pregunta/3')).json();
  const opcionId = primera.pregunta.opciones[0].id;
  const guardada = await examen('/api/examen/responder', {
    method: 'POST', body: JSON.stringify({ n: 3, opcionId, segundos: 0 }),
  });
  assert.equal(guardada.status, 200);

  const estado = await (await examen('/api/examen/estado')).json();
  assert.equal(estado.estado.preguntaActual, 3);
  assert.equal(estado.estado.respondidas, 1);
  assert.equal(estado.estado.sinResponder, 3);

  const recarga = await (await examen('/api/examen/pregunta/3')).json();
  assert.equal(recarga.pregunta.opcionId, opcionId);
  assert.equal(recarga.pregunta.respondida, true);
});

test('saltar guarda NULL y no cuenta como respondida', async () => {
  await examen('/api/examen/pregunta/1');
  const res = await examen('/api/examen/responder', {
    method: 'POST', body: JSON.stringify({ n: 1, opcionId: null, segundos: 0 }),
  });
  assert.equal(res.status, 200);
  const estado = await (await examen('/api/examen/estado')).json();
  assert.equal(estado.estado.respondidas, 0);
  assert.equal(estado.estado.sinResponder, 4);
});

test('la pausa bloquea respuestas desde la API del estudiante', async () => {
  const pregunta = await (await examen('/api/examen/pregunta/1')).json();
  await docente(`/api/docente/sesiones/${sesionId}/pausar`, {});
  const res = await examen('/api/examen/responder', {
    method: 'POST',
    body: JSON.stringify({ n: 1, opcionId: pregunta.pregunta.opciones[0].id, segundos: 1 }),
  });
  assert.equal(res.status, 409);
  assert.match((await res.json()).mensaje, /en pausa/);
});

test('entregar manualmente es idempotente y bloquea nuevas respuestas', async () => {
  await examen('/api/examen/pregunta/1');
  const primera = await examen('/api/examen/entregar', {
    method: 'POST', body: JSON.stringify({ motivo: 'manual' }),
  });
  const segunda = await examen('/api/examen/entregar', {
    method: 'POST', body: JSON.stringify({ motivo: 'manual' }),
  });
  assert.equal((await primera.json()).nueva, true);
  assert.equal((await segunda.json()).nueva, false);

  const respuesta = await examen('/api/examen/responder', {
    method: 'POST', body: JSON.stringify({ n: 1, opcionId: null, segundos: 1 }),
  });
  assert.equal(respuesta.status, 409);
});

test('ninguna ruta del examen revela respuestas correctas ni la semilla', async () => {
  const textos = [];
  textos.push(await (await examen('/api/examen/estado')).text());
  textos.push(await (await examen('/api/examen/pregunta/1')).text());
  textos.push(await (await examen('/api/examen/responder', {
    method: 'POST', body: JSON.stringify({ n: 1, opcionId: null, segundos: 0 }),
  })).text());

  for (const texto of textos) {
    assert.doesNotMatch(texto, /es_correcta|correcta|semilla|explicacion|justificacion|orden_opciones/i);
  }
});

test('resultado aplica en servidor los tres niveles sin recalcular la nota', async () => {
  const intento = db.prepare('SELECT * FROM intentos').get();
  const filas = db.prepare(`
    SELECT ip.id, ip.orden, o.id AS correcta_id, o.texto AS correcta_texto
    FROM intento_preguntas ip
    JOIN opciones o ON o.pregunta_id = ip.pregunta_id AND o.es_correcta = 1
    WHERE ip.intento_id = ? ORDER BY ip.orden LIMIT 2
  `).all(intento.id);
  const incorrecta = db.prepare(`
    SELECT id FROM opciones
    WHERE pregunta_id = (SELECT pregunta_id FROM intento_preguntas WHERE id = ?)
      AND es_correcta = 0 LIMIT 1
  `).get(filas[1].id);
  const insertar = db.prepare(`
    INSERT INTO respuestas (intento_pregunta_id, opcion_id, segundos_en_pantalla, respondido_en)
    VALUES (?, ?, 1, '2026-08-26T10:00:01Z')
  `);
  insertar.run(filas[0].id, filas[0].correcta_id);
  insertar.run(filas[1].id, incorrecta.id);
  await examen('/api/examen/entregar', {
    method: 'POST', body: JSON.stringify({ motivo: 'manual' }),
  });

  const aciertos = await (await examen('/api/examen/resultado')).json();
  assert.equal(aciertos.resultado.puntaje, 1);
  assert.equal(aciertos.resultado.porcentaje, 25);
  assert.equal(aciertos.resultado.preguntas[1].estado, 'fallada');
  assert.equal(aciertos.resultado.preguntas[1].respuesta.id, incorrecta.id);
  assert.ok(!('opciones' in aciertos.resultado.preguntas[1]));
  assert.ok(!('opcionCorrectaId' in aciertos.resultado.preguntas[1]));

  await docente(`/api/docente/sesiones/${sesionId}/cerrar`, {});
  const cambiar = async (nivel) => fetch(`${base}/api/docente/sesiones/${sesionId}/feedback`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json', cookie: cookieDocente },
    body: JSON.stringify({ nivel_feedback: nivel }),
  });
  assert.equal((await cambiar('solo_puntaje')).status, 200);
  const solo = await (await examen('/api/examen/resultado')).json();
  assert.ok(!('preguntas' in solo.resultado));

  assert.equal((await cambiar('completo')).status, 200);
  const completo = await (await examen('/api/examen/resultado')).json();
  assert.equal(completo.resultado.preguntas[1].opcionCorrectaId, filas[1].correcta_id);
  assert.equal(completo.resultado.puntaje, 1);
  assert.equal(db.prepare('SELECT puntaje FROM intentos WHERE id = ?').get(intento.id).puntaje, 1);
});

test('las rutas nuevas exigen la cookie del estudiante', async () => {
  for (const [ruta, metodo] of [
    ['/api/examen/pregunta/1', 'GET'],
    ['/api/examen/responder', 'POST'],
    ['/api/examen/entregar', 'POST'],
    ['/api/examen/resultado', 'GET'],
  ]) {
    const res = await fetch(`${base}${ruta}`, {
      method: metodo,
      headers: { 'content-type': 'application/json' },
      body: metodo === 'POST' ? '{}' : undefined,
    });
    assert.equal(res.status, 401);
  }
});
