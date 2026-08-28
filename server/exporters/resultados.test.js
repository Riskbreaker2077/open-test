import test from 'node:test';
import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { abrirBd, cerrarBd } from '../db.js';
import { guardarBanco } from '../services/bancos.js';
import { preguntaDeEjemplo } from '../fixtures-preguntas.js';
import { guardarEstudiantes } from '../services/estudiantes.js';
import { iniciarOReanudarIntento } from '../services/intentos.js';
import { abrirSesion, cerrarSesion, crearSesion, obtenerSesion } from '../services/sesiones.js';
import {
  aDetalleCsv,
  aExcel,
  aJson,
  armarExportacion,
  aResumenCsv,
  CABECERAS_DETALLE,
  CABECERAS_RESUMEN,
} from './resultados.js';
import { leerZip } from '../importers/paquete-zip.js';

function preparar({ cantidad = 2, nPreguntas = 4 } = {}) {
  const db = abrirBd(':memory:');
  guardarBanco(db, 'Ciencias', Array.from({ length: Math.max(20, nPreguntas) }, (_, i) => preguntaDeEjemplo({
    id: `pregunta-${i}`,
    contexto: i === 0 ? [{ tipo: 'texto', texto: 'Texto, con coma' }] : [],
    enunciado: [{ tipo: 'texto', texto: `¿Pregunta "${i}"?` }],
  })));
  const estudiantes = Array.from({ length: cantidad }, (_, i) => ({
    codigo: String(1000 + i), nombres: `María ${i}`, apellidos: `Gómez ${i}`, curso: i % 2 ? '10B' : '10A',
  }));
  guardarEstudiantes(db, estudiantes);
  const sesion = crearSesion(db, {
    nombre: 'Ciencias P2', banco_id: 1, cursos: ['10A', '10B'], n_preguntas: nPreguntas,
  });
  abrirSesion(db, sesion.id);
  const abierta = obtenerSesion(db, sesion.id);
  const intentos = estudiantes.map((estudiante) => iniciarOReanudarIntento(db, abierta, estudiante).intento);
  return { db, sesionId: sesion.id, intentos };
}

test('cabeceras literales, BOM y formato_version coinciden con el contrato', () => {
  assert.equal(CABECERAS_DETALLE.join(','),
    'formato_version,sesion,curso,codigo,nombres,apellidos,n_pregunta,pregunta_id,enunciado,opcion_elegida_texto,opcion_correcta_texto,acierto,saltada,segundos,competencia');
  assert.equal(CABECERAS_RESUMEN.join(','),
    'formato_version,sesion,codigo,nombres,apellidos,curso,total_preguntas,respondidas,saltadas,aciertos,puntaje,porcentaje,inicio,entrega,motivo_entrega');
  const { db, sesionId } = preparar();
  cerrarSesion(db, sesionId);
  const exportacion = armarExportacion(db, sesionId);
  assert.ok(aDetalleCsv(exportacion).startsWith(`\uFEFF${CABECERAS_DETALLE.join(',')}\r\n2,`));
  assert.ok(aResumenCsv(exportacion).startsWith(`\uFEFF${CABECERAS_RESUMEN.join(',')}\r\n2,`));
  assert.equal(JSON.parse(aJson(exportacion)).formato_version, 2);
  cerrarBd(db);
});

test('una pregunta sin opción correcta entre las mostradas da un error claro', () => {
  const { db, sesionId } = preparar();
  const primera = db.prepare('SELECT pregunta_id FROM intento_preguntas LIMIT 1').get();
  db.prepare('UPDATE opciones SET es_correcta = 0 WHERE pregunta_id = ?').run(primera.pregunta_id);
  cerrarSesion(db, sesionId);
  assert.throws(() => armarExportacion(db, sesionId), /no tiene ninguna opción correcta/);
  cerrarBd(db);
});

test('incluye no alcanzadas, conserva orden de opciones y los totales cuadran', () => {
  const { db, sesionId, intentos } = preparar();
  const primera = db.prepare('SELECT * FROM intento_preguntas WHERE intento_id = ? ORDER BY orden LIMIT 1')
    .get(intentos[0].id);
  const elegida = Number(primera.orden_opciones.split(',')[0]);
  db.prepare(`
    INSERT INTO respuestas (intento_pregunta_id, opcion_id, segundos_en_pantalla, respondido_en)
    VALUES (?, ?, 7, '2026-08-26T10:00:07Z')
  `).run(primera.id, elegida);
  cerrarSesion(db, sesionId);
  // Simula un intento histórico que todavía no tenía marca de entrega.
  db.prepare('UPDATE intentos SET entregado_en = NULL, motivo_entrega = NULL WHERE id = ?').run(intentos[1].id);

  const exportacion = armarExportacion(db, sesionId);
  const primero = exportacion.intentos.find((item) => item.codigo === '1000');
  assert.equal(primero.respondidas + primero.saltadas, primero.preguntas.length);
  assert.equal(primero.preguntas[1].saltada, true);
  assert.equal(primero.preguntas[1].segundos, 0);
  assert.equal(primero.preguntas[1].opcion_elegida_texto, '');
  assert.ok(primero.preguntas[1].opcion_correcta_texto);
  assert.deepEqual(
    primero.preguntas[0].opciones_mostradas.map((opcion) => opcion.opcion_id),
    primera.orden_opciones.split(',').map(Number),
  );
  const pendiente = exportacion.intentos.find((item) => item.codigo === '1001');
  assert.equal(pendiente.entrega, '');
  const solo10A = armarExportacion(db, sesionId, '10A');
  assert.deepEqual(solo10A.intentos.map((item) => item.curso), ['10A']);
  cerrarBd(db);
});

test('aExcel produce un libro válido con las hojas Resumen y Detalle, en ese orden', () => {
  const { db, sesionId, intentos } = preparar();
  cerrarSesion(db, sesionId);
  db.prepare('UPDATE intentos SET entregado_en = NULL, motivo_entrega = NULL WHERE id = ?').run(intentos[1].id);
  const exportacion = armarExportacion(db, sesionId);

  const buffer = aExcel(exportacion);
  const archivos = leerZip(buffer);
  const workbook = archivos.find((archivo) => archivo.nombre === 'xl/workbook.xml').contenido.toString('utf-8');
  const posicionResumen = workbook.indexOf('name="Resumen"');
  const posicionDetalle = workbook.indexOf('name="Detalle"');
  assert.ok(posicionResumen >= 0 && posicionDetalle >= 0 && posicionResumen < posicionDetalle);

  const hojaResumen = archivos.find((archivo) => archivo.nombre === 'xl/worksheets/sheet1.xml').contenido.toString('utf-8');
  const hojaDetalle = archivos.find((archivo) => archivo.nombre === 'xl/worksheets/sheet2.xml').contenido.toString('utf-8');
  for (const cabecera of CABECERAS_RESUMEN) assert.match(hojaResumen, new RegExp(cabecera));
  for (const cabecera of CABECERAS_DETALLE) assert.match(hojaDetalle, new RegExp(cabecera));
  // El intento sin entregar (código 1001) sigue presente, igual que en CSV/JSON.
  assert.match(hojaResumen, /1001/);
  cerrarBd(db);
});

test('arma 40 intentos por 20 preguntas en menos de 2 segundos', () => {
  const { db, sesionId } = preparar({ cantidad: 40, nPreguntas: 20 });
  cerrarSesion(db, sesionId);
  const inicio = performance.now();
  const exportacion = armarExportacion(db, sesionId);
  const duracion = performance.now() - inicio;
  assert.equal(exportacion.intentos.length, 40);
  assert.equal(exportacion.intentos.flatMap((item) => item.preguntas).length, 800);
  assert.ok(duracion < 2000, `tardó ${duracion.toFixed(1)} ms`);
  cerrarBd(db);
});

test('aExcel de 40 intentos por 20 preguntas tarda menos de 2 segundos', () => {
  const { db, sesionId } = preparar({ cantidad: 40, nPreguntas: 20 });
  cerrarSesion(db, sesionId);
  const exportacion = armarExportacion(db, sesionId);
  const inicio = performance.now();
  const buffer = aExcel(exportacion);
  const duracion = performance.now() - inicio;
  assert.ok(buffer.length > 0);
  assert.ok(duracion < 2000, `tardó ${duracion.toFixed(1)} ms`);
  cerrarBd(db);
});
