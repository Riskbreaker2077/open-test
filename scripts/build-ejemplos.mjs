import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, basename } from 'node:path';
import { leerZip } from '../server/importers/paquete-zip.js';
import { textoPlano } from '../server/services/bloques.js';
import { crearLibroXlsx } from '../server/exporters/xlsx.js';
import { crearZip } from '../server/exporters/zip-escritor.js';

const RAIZ_PRUEBA = '/home/camilo/projects/prueba';
const EJEMPLOS = '/home/camilo/projects/open-test/ejemplos';
const CARPETA_IMAGENES = '/home/camilo/projects/open-test/data/uploads/imagenes';

mkdirSync(CARPETA_IMAGENES, { recursive: true });

// --- Cargar banco (40 preguntas) y JSON de la sesión simulada (35 intentos) ---
const paqueteBytes = leerZip(readFileSync(join(RAIZ_PRUEBA, 'paquete-completo.zip')));
const preguntasBanco = paqueteBytes
  .filter(a => /^banco\/ciencias-sociales\/cs-\d+\.json$/.test(a.nombre))
  .sort((a, b) => a.nombre.localeCompare(b.nombre))
  .map(a => JSON.parse(a.contenido.toString('utf8')));
const imagenesBanco = paqueteBytes.filter(a => /^banco\/ciencias-sociales\/imagenes\//.test(a.nombre));

// paquete.zip (entrada OpenTest, formato actual)
const paqueteNuevo = {
  estandar: 'preguntas-icfes',
  version_estandar: '1.0.0',
  nombre: 'Ciencias sociales — Banco de prueba',
  preguntas: preguntasBanco,
};
writeFileSync(
  join(EJEMPLOS, 'paquete-ciencias-sociales-40.zip'),
  crearZip([
    { nombre: 'paquete.json', contenido: JSON.stringify(paqueteNuevo, null, 2) + '\n' },
    ...imagenesBanco.map(a => ({ nombre: a.nombre.replace('banco/ciencias-sociales/', ''), contenido: a.contenido })),
  ]),
);

// Cargar imágenes al disco para el ZIP de salida.
for (const a of imagenesBanco) {
  writeFileSync(join(CARPETA_IMAGENES, basename(a.nombre)), a.contenido);
}

// Cargar la sesión simulada.
const sesionJson = JSON.parse(readFileSync(join(RAIZ_PRUEBA, 'resultados-prueba.json'), 'utf8'));

// --- Construir el XLSX con tres hojas: Resumen, Detalle, Banco ---

const CABECERAS_RESUMEN = [
  'formato_version', 'sesion', 'codigo', 'nombres', 'apellidos', 'curso',
  'total_preguntas', 'respondidas', 'saltadas', 'aciertos', 'puntaje',
  'porcentaje', 'inicio', 'entrega', 'motivo_entrega',
];
const CABECERAS_DETALLE = [
  'formato_version', 'sesion', 'curso', 'codigo', 'nombres', 'apellidos',
  'n_pregunta', 'pregunta_id',
  'competencia', 'componente', 'afirmacion', 'evidencia', 'estandar_asociado', 'que_evalua',
  'opcion_a_id', 'opcion_a_texto', 'opcion_a_es_correcta',
  'opcion_b_id', 'opcion_b_texto', 'opcion_b_es_correcta',
  'opcion_c_id', 'opcion_c_texto', 'opcion_c_es_correcta',
  'opcion_d_id', 'opcion_d_texto', 'opcion_d_es_correcta',
  'opcion_elegida_id', 'acierto', 'saltada', 'segundos',
];
const CABECERAS_BANCO = [
  'pregunta_id',
  'competencia', 'componente', 'afirmacion', 'evidencia', 'estandar_asociado', 'que_evalua',
  'opcion_a_texto', 'opcion_b_texto', 'opcion_c_texto', 'opcion_d_texto',
  'veces_presentada', 'veces_acertada', 'veces_saltada',
];

const NUMERICAS_RESUMEN = new Set(['total_preguntas', 'respondidas', 'saltadas', 'aciertos', 'puntaje', 'porcentaje']);
const NUMERICAS_DETALLE = new Set([
  'n_pregunta', 'pregunta_id',
  'opcion_a_id', 'opcion_b_id', 'opcion_c_id', 'opcion_d_id',
  'opcion_a_es_correcta', 'opcion_b_es_correcta', 'opcion_c_es_correcta', 'opcion_d_es_correcta',
  'opcion_elegida_id', 'acierto', 'saltada', 'segundos',
]);
const NUMERICAS_BANCO = new Set(['pregunta_id', 'veces_presentada', 'veces_acertada', 'veces_saltada']);

const aFilaExcel = (cabeceras, numericas, fila) =>
  cabeceras.map(campo => numericas.has(campo) ? Number(fila[campo]) : String(fila[campo] ?? ''));

// Hoja Resumen
const filasResumen = sesionJson.intentos.map(i => ({
  formato_version: sesionJson.formato_version,
  sesion: sesionJson.sesion.nombre,
  codigo: i.codigo,
  nombres: i.nombres,
  apellidos: i.apellidos,
  curso: i.curso,
  total_preguntas: i.preguntas.length,
  respondidas: i.respondidas ?? 0,
  saltadas: i.saltadas ?? 0,
  aciertos: i.aciertos,
  puntaje: i.puntaje,
  porcentaje: Number(i.porcentaje.toFixed(1)),
  inicio: i.inicio,
  entrega: i.entrega,
  motivo_entrega: i.motivo_entrega,
}));

// Hoja Detalle
const filasDetalle = [];
for (const i of sesionJson.intentos) {
  for (const p of i.preguntas) {
    const [a, b, c, d] = p.opciones_mostradas ?? [];
    filasDetalle.push({
      formato_version: sesionJson.formato_version,
      sesion: sesionJson.sesion.nombre,
      curso: i.curso,
      codigo: i.codigo,
      nombres: i.nombres,
      apellidos: i.apellidos,
      n_pregunta: p.n_pregunta,
      pregunta_id: p.pregunta_id,
      competencia: p.competencia,
      componente: p.componente,
      afirmacion: p.afirmacion,
      evidencia: p.evidencia,
      estandar_asociado: p.estandar_asociado,
      que_evalua: p.que_evalua,
      opcion_a_id: a?.opcion_id ?? '',
      opcion_a_texto: a ? textoPlano(a.contenido) : '',
      opcion_a_es_correcta: a ? Number(a.es_correcta) : 0,
      opcion_b_id: b?.opcion_id ?? '',
      opcion_b_texto: b ? textoPlano(b.contenido) : '',
      opcion_b_es_correcta: b ? Number(b.es_correcta) : 0,
      opcion_c_id: c?.opcion_id ?? '',
      opcion_c_texto: c ? textoPlano(c.contenido) : '',
      opcion_c_es_correcta: c ? Number(c.es_correcta) : 0,
      opcion_d_id: d?.opcion_id ?? '',
      opcion_d_texto: d ? textoPlano(d.contenido) : '',
      opcion_d_es_correcta: d ? Number(d.es_correcta) : 0,
      opcion_elegida_id: p.opcion_elegida_id ?? '',
      acierto: Number(p.acierto),
      saltada: Number(p.saltada),
      segundos: p.segundos,
    });
  }
}

// Hoja Banco: contar presentaciones/aciertos/saltadas desde la sesión.
const conteo = new Map();
for (const i of sesionJson.intentos) {
  for (const p of i.preguntas) {
    const actual = conteo.get(p.pregunta_id) ?? { presentada: 0, acertada: 0, saltada: 0 };
    actual.presentada += 1;
    if (p.saltada) actual.saltada += 1;
    else if (p.acierto) actual.acertada += 1;
    conteo.set(p.pregunta_id, actual);
  }
}
const indiceBanco = new Map(preguntasBanco.map((p, idx) => [idx + 1, p]));
const filasBanco = preguntasBanco.map((p, idx) => {
  const preguntaId = idx + 1;
  const opcionTexto = (letra) => {
    const opcion = p.opciones.find(o => o.id === letra);
    return opcion ? textoPlano(opcion.contenido) : '';
  };
  const c = conteo.get(preguntaId) ?? { presentada: 0, acertada: 0, saltada: 0 };
  return {
    pregunta_id: p.id,
    competencia: p.competencia,
    componente: p.componente,
    afirmacion: p.afirmacion,
    evidencia: p.evidencia,
    estandar_asociado: p.estandar_asociado,
    que_evalua: p.que_evalua,
    opcion_a_texto: opcionTexto('A'),
    opcion_b_texto: opcionTexto('B'),
    opcion_c_texto: opcionTexto('C'),
    opcion_d_texto: opcionTexto('D'),
    veces_presentada: c.presentada,
    veces_acertada: c.acertada,
    veces_saltada: c.saltada,
  };
});

const xlsx = crearLibroXlsx([
  { nombre: 'Resumen', cabeceras: CABECERAS_RESUMEN, filas: filasResumen.map(f => aFilaExcel(CABECERAS_RESUMEN, NUMERICAS_RESUMEN, f)) },
  { nombre: 'Detalle', cabeceras: CABECERAS_DETALLE, filas: filasDetalle.map(f => aFilaExcel(CABECERAS_DETALLE, NUMERICAS_DETALLE, f)) },
  { nombre: 'Banco', cabeceras: CABECERAS_BANCO, filas: filasBanco.map(f => aFilaExcel(CABECERAS_BANCO, NUMERICAS_BANCO, f)) },
]);
writeFileSync(join(EJEMPLOS, 'resultados-ejemplo.xlsx'), xlsx);

// --- Construir el reproduccion.zip (output ZIP de OpenTest) ---
const entradasZip = [{ nombre: 'resultados.json', contenido: JSON.stringify(sesionJson, null, 2) + '\n' }];
const imagenesReferenciadas = new Set();
for (const i of sesionJson.intentos) {
  for (const p of i.preguntas) {
    const walk = (bloques) => {
      if (!Array.isArray(bloques)) return;
      for (const b of bloques) if (b.tipo === 'imagen' && b.archivo) imagenesReferenciadas.add(b.archivo);
    };
    walk(p.contexto); walk(p.enunciado);
    for (const o of p.opciones_mostradas ?? []) walk(o.contenido);
  }
}
const empaquetadas = new Set();
const faltantes = [];
for (const nombre of [...imagenesReferenciadas].sort()) {
  const ruta = join(CARPETA_IMAGENES, nombre);
  try {
    entradasZip.push({ nombre: `imagenes/${nombre}`, contenido: readFileSync(ruta) });
    empaquetadas.add(nombre);
  } catch {
    faltantes.push(nombre);
  }
}
if (faltantes.length > 0) {
  entradasZip.push({ nombre: 'imagenes_faltantes.txt', contenido: faltantes.join('\n') + '\n' });
}
writeFileSync(join(EJEMPLOS, 'reproduccion-ejemplo.zip'), crearZip(entradasZip));

console.log('Generados en', EJEMPLOS);
console.log('  paquete-ciencias-sociales-40.zip');
console.log('  resultados-ejemplo.xlsx');
console.log('  reproduccion-ejemplo.zip');
console.log('  estudiantes-ejemplo.csv (ya existía)');
