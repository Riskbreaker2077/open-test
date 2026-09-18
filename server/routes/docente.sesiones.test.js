import test, { afterEach, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { crearApp } from '../app.js';
import { abrirBd, cerrarBd } from '../db.js';
import { _reiniciar } from '../sesion.js';
import { _reiniciar as _reiniciarPresencia } from '../presencia.js';
import { _reiniciarLimitador } from './auth.js';
import { guardarBanco } from '../services/bancos.js';
import { preguntasDeEjemplo } from '../fixtures-preguntas.js';

let db;
let servidor;
let base;
let cookie;

const ESTUDIANTES = 'codigo,nombres,apellidos,curso\n2024001,Ana,Gómez,10A\n2024002,Luis,Pérez,10B\n';

beforeEach(async () => {
  _reiniciar();
  _reiniciarPresencia();
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
  guardarBanco(db, 'Ciencias', preguntasDeEjemplo(25));
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
  assert.equal(sesion.segundos_minimos_pregunta, 60);
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

test('comienza, pausa y reanuda la evaluación desde la API', async () => {
  const { sesion } = await post('/api/docente/sesiones', NUEVA);
  await post(`/api/docente/sesiones/${sesion.id}/abrir`);

  assert.equal((await post(`/api/docente/sesiones/${sesion.id}/comenzar`)).sesion.estado, 'en_curso');
  assert.equal((await post(`/api/docente/sesiones/${sesion.id}/pausar`)).sesion.estado, 'pausada');
  assert.equal((await post(`/api/docente/sesiones/${sesion.id}/reanudar`)).sesion.estado, 'en_curso');
});

test('la proyección devuelve la asistencia sin datos reservados y un QR local', async () => {
  const { sesion } = await post('/api/docente/sesiones', NUEVA);
  await post(`/api/docente/sesiones/${sesion.id}/abrir`);
  const entrada = await fetch(`${base}/api/examen/entrar`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ codigo: '2024001', sesionId: sesion.id }),
  });
  const cookieAna = entrada.headers.getSetCookie()[0].split(';')[0];
  const proyeccionDe = async (id) => (await (await llamar(`/api/docente/proyeccion/${id}`)).json()).proyeccion;

  const respuesta = await llamar(`/api/docente/proyeccion/${sesion.id}`);
  const texto = await respuesta.text();
  const cuerpo = JSON.parse(texto);
  assert.equal(respuesta.status, 200);
  assert.equal(cuerpo.proyeccion.nombre, 'Parcial');
  assert.equal(cuerpo.proyeccion.estado, 'abierta');
  assert.equal(cuerpo.proyeccion.segundosRestantes, 3600);
  assert.equal(cuerpo.proyeccion.dentro, 1);
  assert.equal(cuerpo.proyeccion.entregados, 0);
  assert.match(cuerpo.proyeccion.direccion, /^http:\/\//);
  assert.equal(cuerpo.proyeccion.nombresCortos, false);
  // `intentoId` y `nombreCompleto` viajan para poder anular sobre el cuadro
  // (038); ninguno de los dos se pinta ni es un dato reservado del aula.
  assert.deepEqual(cuerpo.proyeccion.estudiantes, [{
    intentoId: 1, nombre: 'Ana Gómez', nombreCompleto: 'Ana Gómez', curso: '10A', estado: 'conectado',
  }]);
  assert.doesNotMatch(texto, /Luis|puntaje|aciertos|pregunta|respuesta|codigo|2024001/i);

  await fetch(`${base}/api/examen/salir`, { method: 'POST', headers: { cookie: cookieAna } });
  assert.equal((await proyeccionDe(sesion.id)).estudiantes[0].estado, 'desconectado');

  const { monitoreo } = await (await llamar(`/api/docente/sesiones/${sesion.id}/monitoreo`)).json();
  await post(`/api/docente/intentos/${monitoreo.estudiantes[0].intentoId}/forzar-entrega`);
  assert.equal((await proyeccionDe(sesion.id)).estudiantes[0].estado, 'entregado');

  const { sesion: dosCursos } = await post('/api/docente/sesiones', {
    ...NUEVA, nombre: 'Final', cursos: ['10B', '10A'],
  });
  await post(`/api/docente/sesiones/${dosCursos.id}/abrir`);
  assert.deepEqual((await proyeccionDe(dosCursos.id)).estudiantes, [
    {
      intentoId: null, nombre: 'Ana Gómez', nombreCompleto: 'Ana Gómez',
      curso: '10A', estado: 'sin_entrar',
    },
    {
      intentoId: null, nombre: 'Luis Pérez', nombreCompleto: 'Luis Pérez',
      curso: '10B', estado: 'sin_entrar',
    },
  ]);

  const qr = await llamar(`/api/docente/qr.svg?texto=${encodeURIComponent(cuerpo.proyeccion.direccion)}`);
  assert.equal(qr.status, 200);
  assert.match(qr.headers.get('content-type'), /image\/svg\+xml/);
  assert.match(await qr.text(), /^<svg/);
});

test('con más de 30 convocados la proyección usa primer nombre y primer apellido', async () => {
  const filas = ['codigo,nombres,apellidos,curso', '3000,María Fernanda,Rodríguez Castañeda,11A'];
  for (let i = 1; i <= 30; i += 1) filas.push(`${3000 + i},Estudiante${i} Segundo,Apellido${i} Otro,11A`);
  await post('/api/docente/estudiantes/confirmar', { contenido: `${filas.join('\n')}\n` });
  const { sesion } = await post('/api/docente/sesiones', { ...NUEVA, cursos: ['11A'] });
  await post(`/api/docente/sesiones/${sesion.id}/abrir`);

  const { proyeccion } = await (await llamar(`/api/docente/proyeccion/${sesion.id}`)).json();
  assert.equal(proyeccion.estudiantes.length, 31);
  assert.equal(proyeccion.nombresCortos, true);
  assert.ok(proyeccion.estudiantes.some((e) => e.nombre === 'María Rodríguez'));
  assert.ok(proyeccion.estudiantes.every((e) => e.nombre.split(' ').length === 2));
});

test('apagar desde el panel responde y después llama al apagado del servidor', async () => {
  const sinApagado = await llamar('/api/docente/apagar', { method: 'POST' });
  assert.equal(sinApagado.status, 501);

  const app = crearApp(db);
  let apagado = false;
  app.locals.apagar = () => { apagado = true; };
  const otro = app.listen(0);
  await new Promise((listo) => otro.once('listening', listo));
  try {
    const respuesta = await fetch(`http://127.0.0.1:${otro.address().port}/api/docente/apagar`, {
      method: 'POST',
      headers: { cookie },
    });
    assert.equal(respuesta.status, 200);
    assert.equal((await respuesta.json()).ok, true);
    await new Promise((listo) => setTimeout(listo, 20));
    assert.equal(apagado, true);
  } finally {
    await new Promise((listo) => otro.close(listo));
  }
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

test('monitorea convocados y permite forzar una entrega calificada', async () => {
  const { sesion } = await post('/api/docente/sesiones', NUEVA);
  await post(`/api/docente/sesiones/${sesion.id}/abrir`);
  await fetch(`${base}/api/examen/entrar`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ codigo: '2024001', sesionId: sesion.id }),
  });
  await post(`/api/docente/sesiones/${sesion.id}/comenzar`);

  const inicial = await (await llamar(`/api/docente/sesiones/${sesion.id}/monitoreo`)).json();
  assert.equal(inicial.monitoreo.contadores.convocados, 1);
  assert.equal(inicial.monitoreo.contadores.presentando, 1);
  assert.match(inicial.monitoreo.direccion, /^http:\/\//);
  const intentoId = inicial.monitoreo.estudiantes[0].intentoId;

  const forzada = await post(`/api/docente/intentos/${intentoId}/forzar-entrega`);
  assert.equal(forzada.entrega.intento.motivo_entrega, 'forzada_docente');
  assert.equal(forzada.entrega.intento.puntaje, 0);
  const final = await (await llamar(`/api/docente/sesiones/${sesion.id}/monitoreo`)).json();
  assert.equal(final.monitoreo.contadores.entregados, 1);
});

test('descarga los dos formatos de una sesión cerrada con nombre saneado', async () => {
  const { sesion } = await post('/api/docente/sesiones', { ...NUEVA, nombre: 'Ciencias, período 2' });
  await post(`/api/docente/sesiones/${sesion.id}/abrir`);
  await fetch(`${base}/api/examen/entrar`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ codigo: '2024001', sesionId: sesion.id }),
  });
  await post(`/api/docente/sesiones/${sesion.id}/cerrar`);

  const excel = await llamar(`/api/docente/sesiones/${sesion.id}/export/excel?curso=10A`);
  assert.equal(excel.status, 200);
  assert.match(
    excel.headers.get('content-disposition'),
    /opentest_ciencias_periodo_2_10a_resultados_\d{4}-\d{2}-\d{2}\.xlsx/,
  );
  assert.deepEqual([...new Uint8Array(await excel.arrayBuffer()).slice(0, 2)], [0x50, 0x4b]);

  const zip = await llamar(`/api/docente/sesiones/${sesion.id}/export/zip?curso=10A`);
  assert.equal(zip.status, 200);
  assert.match(
    zip.headers.get('content-disposition'),
    /opentest_ciencias_periodo_2_10a_reproduccion_\d{4}-\d{2}-\d{2}\.zip/,
  );
  assert.equal(zip.headers.get('content-type'), 'application/zip');
});

test('rechaza exportar una evaluación que todavía está abierta', async () => {
  const { sesion } = await post('/api/docente/sesiones', NUEVA);
  await post(`/api/docente/sesiones/${sesion.id}/abrir`);
  const respuesta = await llamar(`/api/docente/sesiones/${sesion.id}/export/excel`);
  assert.equal(respuesta.status, 409);
});

test('descargar escribe descargado_en la primera vez y la deja igual las siguientes', async () => {
  const { sesion } = await post('/api/docente/sesiones', NUEVA);
  await post(`/api/docente/sesiones/${sesion.id}/abrir`);
  await fetch(`${base}/api/examen/entrar`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ codigo: '2024001', sesionId: sesion.id }),
  });
  await post(`/api/docente/sesiones/${sesion.id}/cerrar`);

  assert.equal(db.prepare('SELECT descargado_en FROM sesiones WHERE id = ?').get(sesion.id).descargado_en, null);

  const primera = await llamar(`/api/docente/sesiones/${sesion.id}/export/excel`);
  assert.equal(primera.status, 200);
  const primeraMarca = db.prepare('SELECT descargado_en FROM sesiones WHERE id = ?').get(sesion.id).descargado_en;
  assert.ok(primeraMarca, 'la primera descarga debe escribir la marca');
  assert.doesNotMatch(primeraMarca, /^1970|^null$/);

  await new Promise((resolver) => setTimeout(resolver, 20));
  const segunda = await llamar(`/api/docente/sesiones/${sesion.id}/export/zip`);
  assert.equal(segunda.status, 200);
  const segundaMarca = db.prepare('SELECT descargado_en FROM sesiones WHERE id = ?').get(sesion.id).descargado_en;
  assert.equal(segundaMarca, primeraMarca, 'descargas siguientes no mueven la marca');
});

test('DELETE borra una evaluación con intentos sin exigir descarga previa', async () => {
  const { sesion } = await post('/api/docente/sesiones', NUEVA);
  await post(`/api/docente/sesiones/${sesion.id}/abrir`);
  await fetch(`${base}/api/examen/entrar`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ codigo: '2024001', sesionId: sesion.id }),
  });
  await post(`/api/docente/sesiones/${sesion.id}/cerrar`);
  assert.equal(db.prepare('SELECT descargado_en FROM sesiones WHERE id = ?').get(sesion.id).descargado_en, null);

  const respuesta = await llamar(`/api/docente/sesiones/${sesion.id}`, { method: 'DELETE' });
  assert.equal(respuesta.status, 200);
  assert.equal(db.prepare('SELECT count(*) AS t FROM sesiones WHERE id = ?').get(sesion.id).t, 0);
  assert.equal(db.prepare('SELECT count(*) AS t FROM intentos WHERE sesion_id = ?').get(sesion.id).t, 0);
});

test('todas las rutas de evaluaciones exigen contraseña', async () => {
  const rutas = [
    ['/api/docente/sesiones', 'GET'],
    ['/api/docente/sesiones', 'POST'],
    ['/api/docente/sesiones/1', 'GET'],
    ['/api/docente/sesiones/1', 'PUT'],
    ['/api/docente/sesiones/1/abrir', 'POST'],
    ['/api/docente/sesiones/1/comenzar', 'POST'],
    ['/api/docente/sesiones/1/pausar', 'POST'],
    ['/api/docente/sesiones/1/reanudar', 'POST'],
    ['/api/docente/sesiones/1/cerrar', 'POST'],
    ['/api/docente/sesiones/1/monitoreo', 'GET'],
    ['/api/docente/intentos/1/forzar-entrega', 'POST'],
    ['/api/docente/sesiones/1/export/excel', 'GET'],
    ['/api/docente/sesiones/1/export/zip', 'GET'],
    ['/api/docente/sesiones/1/export/json', 'GET'],
    ['/api/docente/proyeccion/1', 'GET'],
    ['/api/docente/qr.svg?texto=http%3A%2F%2Flocalhost', 'GET'],
    ['/api/docente/apagar', 'POST'],
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

test('el panel muestra el solapamiento esperado según el tamaño del banco', async () => {
  await post('/api/docente/sesiones', { ...NUEVA, n_preguntas: 20 });
  const { sesiones } = await (await llamar('/api/docente/sesiones')).json();

  // 20 sorteadas de un banco de 25: comparten 16 de 20.
  assert.equal(sesiones[0].solapamiento, 16);
});

test('al entrar, el estudiante recibe su prueba ya materializada', async () => {
  const { sesion } = await post('/api/docente/sesiones', NUEVA);
  await post(`/api/docente/sesiones/${sesion.id}/abrir`);

  await fetch(`${base}/api/examen/entrar`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ codigo: '2024001', sesionId: sesion.id }),
  });

  const filas = db.prepare('SELECT * FROM intento_preguntas ORDER BY orden').all();
  assert.equal(filas.length, 20);
  assert.match(filas[0].orden_opciones, /^\d+,\d+,\d+,\d+$/);
});
