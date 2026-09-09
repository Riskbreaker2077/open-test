import test from 'node:test';
import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { abrirBd, cerrarBd } from '../db.js';
import { guardarBanco } from '../services/bancos.js';
import {
  grupoBancoOpciones,
  preguntaDeEjemplo,
  preguntaMiembroBancoOpciones,
} from '../fixtures-preguntas.js';
import { guardarEstudiantes } from '../services/estudiantes.js';
import { iniciarOReanudarIntento } from '../services/intentos.js';
import { abrirSesion, cerrarSesion, crearSesion, obtenerSesion } from '../services/sesiones.js';
import {
  aExcelRico,
  aJson,
  armarExportacion,
  filasDetalle,
  filasResumen,
  CABECERAS_RESUMEN,
  CABECERAS_DETALLE,
  CABECERAS_BANCO,
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

test('el JSON conserva formato_version 3 y los bloques completos', () => {
  const { db, sesionId } = preparar();
  cerrarSesion(db, sesionId);
  const exportacion = armarExportacion(db, sesionId);
  const json = JSON.parse(aJson(exportacion));
  assert.equal(json.formato_version, 3);
  assert.ok(Array.isArray(json.intentos[0].preguntas[0].opciones_mostradas));
  assert.ok(json.intentos[0].preguntas[0].opciones_mostradas[0].contenido.length > 0);
  cerrarBd(db);
});

test('las cabeceras del Excel rico son las publicadas', () => {
  assert.ok(CABECERAS_RESUMEN.includes('porcentaje'));
  assert.ok(CABECERAS_DETALLE.includes('opcion_a_texto') && CABECERAS_DETALLE.includes('opcion_a_es_correcta'));
  assert.ok(CABECERAS_BANCO.includes('veces_presentada') && CABECERAS_BANCO.includes('opcion_a_texto'));
});

test('filasDetalle incluye las 4 opciones con sus ids en el orden mostrado al estudiante', () => {
  const { db, sesionId } = preparar();
  cerrarSesion(db, sesionId);
  const exportacion = armarExportacion(db, sesionId);
  const filas = filasDetalle(exportacion);
  assert.ok(filas.length > 0);
  const fila = filas[0];
  assert.ok(fila.opcion_a_id !== '' && fila.opcion_a_id !== undefined);
  assert.equal(typeof fila.opcion_a_texto, 'string');
  assert.ok(fila.opcion_a_es_correcta === 0 || fila.opcion_a_es_correcta === 1);
  const ids = [fila.opcion_a_id, fila.opcion_b_id, fila.opcion_c_id, fila.opcion_d_id];
  assert.deepEqual(
    ids,
    exportacion.intentos[0].preguntas[0].opciones_mostradas.map((o) => o.opcion_id),
    'el orden de las opciones en Detalle coincide con el orden mostrado al estudiante',
  );
  cerrarBd(db);
});

test('filasResumen cuadra con los totales calculados', () => {
  const { db, sesionId, intentos } = preparar();
  const primera = db.prepare('SELECT * FROM intento_preguntas WHERE intento_id = ? ORDER BY orden LIMIT 1')
    .get(intentos[0].id);
  db.prepare(`
    INSERT INTO respuestas (intento_pregunta_id, opcion_id, segundos_en_pantalla, respondido_en)
    VALUES (?, ?, 7, '2026-08-26T10:00:07Z')
  `).run(primera.id, Number(primera.orden_opciones.split(',')[0]));
  cerrarSesion(db, sesionId);
  const filas = filasResumen(armarExportacion(db, sesionId));
  assert.equal(filas[0].respondidas + filas[0].saltadas, filas[0].total_preguntas);
  cerrarBd(db);
});

test('aExcelRico produce tres hojas en orden Resumen, Detalle, Banco', () => {
  const { db, sesionId, intentos } = preparar();
  cerrarSesion(db, sesionId);
  db.prepare('UPDATE intentos SET entregado_en = NULL, motivo_entrega = NULL WHERE id = ?').run(intentos[1].id);
  const exportacion = armarExportacion(db, sesionId);

  const buffer = aExcelRico(db, exportacion);
  const archivos = leerZip(buffer);
  const workbook = archivos.find((archivo) => archivo.nombre === 'xl/workbook.xml').contenido.toString('utf-8');
  const posResumen = workbook.indexOf('name="Resumen"');
  const posDetalle = workbook.indexOf('name="Detalle"');
  const posBanco = workbook.indexOf('name="Banco"');
  assert.ok(posResumen >= 0 && posDetalle > posResumen && posBanco > posDetalle);
  cerrarBd(db);
});

test('la hoja Detalle tiene las 4 opciones por pregunta con sus textos e ids', () => {
  const { db, sesionId } = preparar();
  cerrarSesion(db, sesionId);
  const exportacion = armarExportacion(db, sesionId);
  const buffer = aExcelRico(db, exportacion);
  const archivos = leerZip(buffer);
  const hoja = archivos.find((archivo) => archivo.nombre === 'xl/worksheets/sheet2.xml').contenido.toString('utf-8');
  for (const columna of ['opcion_a_texto', 'opcion_b_texto', 'opcion_c_texto', 'opcion_d_texto', 'opcion_elegida_id']) {
    assert.match(hoja, new RegExp(columna));
  }
  cerrarBd(db);
});

test('la hoja Banco enumera las preguntas del banco con metadata y conteos', () => {
  const { db, sesionId, intentos } = preparar();
  const primera = db.prepare('SELECT * FROM intento_preguntas WHERE intento_id = ? ORDER BY orden LIMIT 1')
    .get(intentos[0].id);
  const elegida = Number(primera.orden_opciones.split(',')[0]);
  db.prepare(`
    INSERT INTO respuestas (intento_pregunta_id, opcion_id, segundos_en_pantalla, respondido_en)
    VALUES (?, ?, 7, '2026-08-26T10:00:07Z')
  `).run(primera.id, elegida);
  cerrarSesion(db, sesionId);

  const exportacion = armarExportacion(db, sesionId);
  const buffer = aExcelRico(db, exportacion);
  const archivos = leerZip(buffer);
  const hoja = archivos.find((archivo) => archivo.nombre === 'xl/worksheets/sheet3.xml').contenido.toString('utf-8');
  assert.match(hoja, /veces_presentada/);
  assert.match(hoja, /veces_acertada/);
  assert.match(hoja, /veces_saltada/);
  assert.match(hoja, /competencia/);
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

test('aExcelRico de 40 intentos por 20 preguntas tarda menos de 2 segundos', () => {
  const { db, sesionId } = preparar({ cantidad: 40, nPreguntas: 20 });
  cerrarSesion(db, sesionId);
  const exportacion = armarExportacion(db, sesionId);
  const inicio = performance.now();
  const buffer = aExcelRico(db, exportacion);
  const duracion = performance.now() - inicio;
  assert.ok(buffer.length > 0);
  assert.ok(duracion < 2000, `tardó ${duracion.toFixed(1)} ms`);
  cerrarBd(db);
});

// --- Grupos y campos informativos (feature 026) ----------------------------

test('formato_version 3 trae grupo_id, tipo_item, respuesta_banco_id y banco.grupos en el JSON', () => {
  const db = abrirBd(':memory:');
  const grupo = grupoBancoOpciones({ id: 'g-bo' });
  const m1 = preguntaMiembroBancoOpciones('g-bo', grupo.banco, {
    respuesta_pool_id: 'p1',
    competencia: grupo.metadata_pedagogica.competencia,
    valor: 2,
    grado: '9',
    prueba: 'saber11',
  });
  guardarBanco(
    db,
    'Inglés',
    [m1, ...Array.from({ length: 19 }, (_, i) => preguntaDeEjemplo({ id: `p-${i}` }))],
    [grupo],
  );
  const estudiantes = [{ codigo: '2001', nombres: 'A', apellidos: 'B', curso: '10A' }];
  guardarEstudiantes(db, estudiantes);
  const sesion = crearSesion(db, { nombre: 'S', banco_id: 1, cursos: ['10A'], n_preguntas: 20 });
  abrirSesion(db, sesion.id);
  const abierta = obtenerSesion(db, sesion.id);
  const intento = iniciarOReanudarIntento(db, abierta, estudiantes[0]).intento;

  // Responder el matching con la correcta.
  const fila = db.prepare(`
    SELECT ip.id FROM intento_preguntas ip
    JOIN preguntas p ON p.id = ip.pregunta_id
    WHERE ip.intento_id = ? AND p.tipo_item = 'miembro_banco_opciones'
  `).get(intento.id);
  db.prepare(`
    INSERT INTO respuestas (intento_pregunta_id, segundos_en_pantalla, respondido_en)
    VALUES (?, 5, '2026-09-08T08:00:00Z')
  `).run(fila.id);
  db.prepare('UPDATE intento_preguntas SET respuesta_banco_id = ? WHERE id = ?').run('p1', fila.id);

  cerrarSesion(db, sesion.id);
  const json = JSON.parse(aJson(armarExportacion(db, sesion.id)));
  assert.equal(json.formato_version, 3);
  assert.ok(Array.isArray(json.banco.grupos));
  assert.equal(json.banco.grupos[0].id, 'g-bo');

  const matching = json.intentos[0].preguntas.find((p) => p.tipo_item === 'miembro_banco_opciones');
  assert.equal(matching.grupo_id, 'g-bo');
  assert.equal(matching.valor, 2);
  assert.equal(matching.grado, '9');
  assert.equal(matching.prueba, 'saber11');
  assert.equal(matching.respuesta_banco_id, 'p1');
  assert.equal(matching.acierto, true);
  assert.equal(matching.opciones_mostradas.length, 4, 'el banco sin el ejemplo: 4 entradas');

  const filas = filasDetalle(armarExportacion(db, sesion.id));
  const filaMatching = filas.find((f) => f.tipo_item === 'miembro_banco_opciones');
  assert.equal(filaMatching.respuesta_banco_id, 'p1');
  assert.equal(filaMatching.grupo_id, 'g-bo');
  assert.equal(filaMatching.valor, 2);
  cerrarBd(db);
});

test('la hoja Detalle gana las columnas nuevas del contrato v3', () => {
  for (const cabecera of [
    'grupo_id', 'tipo_item', 'valor', 'nivel_mcer', 'grado', 'prueba', 'version_estandar',
    'procedencia_contenido', 'verificado_contenido', 'fuentes_respuesta_correcta',
    'opcion_a_procedencia_justificacion', 'opcion_b_justificacion_verificada',
    'respuesta_banco_id',
  ]) {
    assert.ok(CABECERAS_DETALLE.includes(cabecera), `falta ${cabecera} en Detalle`);
  }
  for (const cabecera of ['grupo_id', 'tipo_item', 'valor', 'nivel_mcer', 'grado', 'prueba', 'version_estandar']) {
    assert.ok(CABECERAS_BANCO.includes(cabecera), `falta ${cabecera} en Banco`);
  }
});
