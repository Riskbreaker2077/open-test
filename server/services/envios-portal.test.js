import test from 'node:test';
import assert from 'node:assert/strict';
import { abrirBd, cerrarBd } from '../db.js';
import { guardarBanco } from './bancos.js';
import { preguntaDeEjemplo } from '../fixtures-preguntas.js';
import { guardarEstudiantes } from './estudiantes.js';
import { anularIntento, iniciarOReanudarIntento, revertirAnulacion } from './intentos.js';
import { abrirSesion, borrarSesion, cerrarSesion, comenzarSesion, crearSesion, obtenerSesion } from './sesiones.js';
import { aReproduccionZip, armarExportacion } from '../exporters/resultados.js';
import { leerZip } from '../importers/paquete-zip.js';
import {
  desvincularPortal,
  enviarPendientes,
  estadoVinculo,
  evaluacionesDisponibles,
  fijarCodigoPortal,
  listarEnvios,
  normalizarUrlPortal,
  vincularPortal,
} from './envios-portal.js';

const CLAVE = `mcp_${'a'.repeat(16)}.${'b'.repeat(43)}`;
const DESTINO = { codigo: 'EV-1', modulo: 'Módulo 1', asignatura: 'Sociales', periodo: 'P1', cursos: ['10A'] };

function preparar({ cerrar = true } = {}) {
  const db = abrirBd(':memory:');
  guardarBanco(db, 'Ciencias', [preguntaDeEjemplo({ id: 'p-1' }), preguntaDeEjemplo({ id: 'p-2' })]);
  guardarEstudiantes(db, [{ codigo: '1001', nombres: 'Ana', apellidos: 'Gómez', curso: '10A' }]);
  const sesion = crearSesion(db, { nombre: 'Parcial', banco_id: 1, cursos: ['10A'], n_preguntas: 2 });
  abrirSesion(db, sesion.id);
  const { intento } = iniciarOReanudarIntento(db, obtenerSesion(db, sesion.id), { codigo: '1001', curso: '10A' });
  if (cerrar) cerrarSesion(db, sesion.id);
  return { db, sesionId: sesion.id, intentoId: intento.id };
}

/** Un portal falso (feature 030): registra cada petición y responde lo que se le indique. */
function portalFalso({ destino = 200, envio = 201, listado = 200, sinRed = false } = {}) {
  const peticiones = [];
  const fetchFn = async (url, opciones = {}) => {
    peticiones.push({ url, metodo: opciones.method ?? 'GET', cabeceras: opciones.headers, cuerpo: opciones.body });
    if (sinRed) throw new TypeError('fetch failed');
    const esEnvio = url.includes('/api/opentest/envios');
    const esListado = url.endsWith('/api/opentest/evaluaciones');
    const estado = esEnvio ? envio : esListado ? listado : destino;
    const cuerpo = estado >= 400
      ? { ok: false, mensaje: 'Error del portal' }
      : esEnvio
        ? { ok: true, estado: 'PROPUESTA_CREADA', propuestaId: 'p1' }
        : esListado
          ? { ok: true, evaluaciones: [DESTINO, { ...DESTINO, codigo: 'EV-2', modulo: 'Módulo 2' }] }
          : { ok: true, destino: DESTINO };
    return new Response(JSON.stringify(cuerpo), { status: estado, headers: { 'content-type': 'application/json' } });
  };
  return { peticiones, fetchFn };
}

test('la dirección del portal exige https, salvo localhost', () => {
  assert.equal(normalizarUrlPortal('https://portal.colegio.edu.co/profesor'), 'https://portal.colegio.edu.co');
  assert.equal(normalizarUrlPortal('http://localhost:3000'), 'http://localhost:3000');
  assert.throws(() => normalizarUrlPortal('http://portal.colegio.edu.co'), /https/);
  assert.throws(() => normalizarUrlPortal('portal'), /dirección completa/);
});

test('vincular guarda la clave pero nunca la devuelve', () => {
  const { db } = preparar();
  assert.throws(() => vincularPortal(db, { url: 'https://p.test', clave: 'otra-cosa' }), /formato/);
  const vinculo = vincularPortal(db, { url: 'https://p.test/', clave: CLAVE });
  assert.deepEqual(vinculo, { vinculado: true, url: 'https://p.test', finClave: 'bbbb' });
  assert.ok(!JSON.stringify(estadoVinculo(db)).includes(CLAVE));
  assert.deepEqual(desvincularPortal(db), { vinculado: false, url: null, finClave: null });
  cerrarBd(db);
});

test('sin código no hay nada pendiente; con código y intentos, sí', () => {
  const { db, sesionId } = preparar();
  assert.equal(listarEnvios(db)[0].estado, 'sin_codigo');
  fijarCodigoPortal(db, sesionId, ' EV-1 ');
  assert.equal(obtenerSesion(db, sesionId).codigo_portal, 'EV-1');
  assert.equal(listarEnvios(db)[0].estado, 'pendiente');
  fijarCodigoPortal(db, sesionId, 'STJ / EVA / 10 / EC / 3 / M1');
  assert.equal(obtenerSesion(db, sesionId).codigo_portal, 'STJ / EVA / 10 / EC / 3 / M1');
  assert.throws(() => fijarCodigoPortal(db, sesionId, 'dos\nlíneas'), /una sola línea/);
  assert.throws(() => fijarCodigoPortal(db, sesionId, 'x'.repeat(101)), /100 caracteres/);
  fijarCodigoPortal(db, sesionId, '');
  assert.equal(listarEnvios(db)[0].estado, 'sin_codigo');
  cerrarBd(db);
});

test('buscar evaluaciones disponibles trae la lista del portal', async () => {
  const { db } = preparar();
  vincularPortal(db, { url: 'https://p.test', clave: CLAVE });
  const portal = portalFalso();
  const evaluaciones = await evaluacionesDisponibles(db, { fetchFn: portal.fetchFn });
  assert.deepEqual(evaluaciones.map((e) => e.codigo), ['EV-1', 'EV-2']);
  assert.equal(portal.peticiones[0].cabeceras.authorization, `Bearer ${CLAVE}`);
  cerrarBd(db);
});

test('sin vincular, buscar evaluaciones disponibles no llama a nada', async () => {
  const { db } = preparar();
  await assert.rejects(evaluacionesDisponibles(db), /vincula/);
  cerrarBd(db);
});

test('envía el mismo ZIP de la descarga manual, con la clave, y lo marca enviado', async () => {
  const { db, sesionId } = preparar();
  vincularPortal(db, { url: 'https://p.test', clave: CLAVE });
  fijarCodigoPortal(db, sesionId, 'EV-1');
  const portal = portalFalso();
  const resultado = await enviarPendientes(db, { fetchFn: portal.fetchFn });

  assert.equal(resultado.enviados, 1);
  assert.deepEqual(portal.peticiones.map((p) => `${p.metodo} ${p.url}`), [
    'GET https://p.test/api/opentest/evaluaciones?codigo=EV-1',
    'POST https://p.test/api/opentest/envios?evaluacion=EV-1',
  ]);
  assert.equal(portal.peticiones[1].cabeceras.authorization, `Bearer ${CLAVE}`);
  assert.equal(portal.peticiones[1].cabeceras['content-type'], 'application/zip');
  // Mismo contenido que la descarga manual (el JSON solo difiere en exportado_en).
  const enviado = JSON.parse(leerZip(portal.peticiones[1].cuerpo)
    .find((a) => a.nombre === 'resultados.json').contenido.toString('utf-8'));
  const manual = JSON.parse(leerZip(aReproduccionZip(db, armarExportacion(db, sesionId)))
    .find((a) => a.nombre === 'resultados.json').contenido.toString('utf-8'));
  assert.equal(enviado.formato_version, 3);
  assert.deepEqual({ ...enviado, exportado_en: null }, { ...manual, exportado_en: null });

  const [fila] = listarEnvios(db);
  assert.equal(fila.estado, 'enviado');
  assert.ok(fila.enviadoEn);
  assert.equal(fila.destino.modulo, 'Módulo 1');

  // Nada más que enviar: no hay otra petición.
  await enviarPendientes(db, { fetchFn: portal.fetchFn });
  assert.equal(portal.peticiones.length, 2);
  cerrarBd(db);
});

test('anular o devolver una prueba después del envío la deja pendiente otra vez', async () => {
  const { db, sesionId, intentoId } = preparar();
  vincularPortal(db, { url: 'https://p.test', clave: CLAVE });
  fijarCodigoPortal(db, sesionId, 'EV-1');
  await enviarPendientes(db, { fetchFn: portalFalso().fetchFn });
  assert.equal(listarEnvios(db)[0].estado, 'enviado');

  anularIntento(db, intentoId);
  assert.equal(listarEnvios(db)[0].estado, 'pendiente');
  await enviarPendientes(db, { fetchFn: portalFalso().fetchFn });
  assert.equal(listarEnvios(db)[0].estado, 'enviado');

  revertirAnulacion(db, intentoId);
  assert.equal(listarEnvios(db)[0].estado, 'pendiente');
  fijarCodigoPortal(db, sesionId, 'EV-2');
  assert.equal(listarEnvios(db)[0].estado, 'pendiente');
  cerrarBd(db);
});

test('los fallos quedan con su mensaje en español y la evaluación sigue pendiente', async () => {
  const casos = [
    [{ sinRed: true }, /Sin conexión/],
    [{ destino: 401 }, /revocada/],
    [{ destino: 404 }, /código no corresponde/],
    [{ envio: 400 }, /Error del portal/],
  ];
  for (const [opciones, esperado] of casos) {
    const { db, sesionId } = preparar();
    vincularPortal(db, { url: 'https://p.test', clave: CLAVE });
    fijarCodigoPortal(db, sesionId, 'EV-1');
    const resultado = await enviarPendientes(db, { fetchFn: portalFalso(opciones).fetchFn });
    assert.equal(resultado.enviados, 0);
    assert.match(resultado.resultados[0].mensaje, esperado);
    const [fila] = listarEnvios(db);
    assert.equal(fila.estado, 'pendiente');
    assert.match(fila.ultimoError, esperado);
    cerrarBd(db);
  }
});

test('sin vincular, o con un examen en curso o en pausa, no se abre ninguna conexión', async () => {
  const { db, sesionId } = preparar();
  fijarCodigoPortal(db, sesionId, 'EV-1');
  const portal = portalFalso();
  await assert.rejects(enviarPendientes(db, { fetchFn: portal.fetchFn }), /vincula/);

  vincularPortal(db, { url: 'https://p.test', clave: CLAVE });
  const otra = crearSesion(db, { nombre: 'En curso', banco_id: 1, cursos: ['10A'], n_preguntas: 2 });
  abrirSesion(db, otra.id);
  comenzarSesion(db, otra.id);
  await assert.rejects(enviarPendientes(db, { fetchFn: portal.fetchFn }), /en curso o en pausa/);
  assert.equal(portal.peticiones.length, 0);
  cerrarBd(db);
});

test('lo que está en la papelera no aparece ni se envía (046)', async () => {
  const { db, sesionId } = preparar();
  vincularPortal(db, { url: 'https://p.test', clave: CLAVE });
  fijarCodigoPortal(db, sesionId, 'EV-1');
  borrarSesion(db, sesionId);
  assert.deepEqual(listarEnvios(db), []);
  const { peticiones, fetchFn } = portalFalso();
  await enviarPendientes(db, { fetchFn });
  assert.equal(peticiones.filter((p) => p.url.includes('/envios')).length, 0);
  cerrarBd(db);
});
