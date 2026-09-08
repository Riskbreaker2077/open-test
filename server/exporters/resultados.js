import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { crearLibroXlsx } from './xlsx.js';
import { crearZip } from './zip-escritor.js';
import { calificarIntento } from '../services/calificacion.js';
import { cursosDe, obtenerSesion } from '../services/sesiones.js';
import { analizarBloques, textoPlano } from '../services/bloques.js';
import { carpetaDeImagenes, imagenesDeSesion } from '../services/imagenes.js';

const error = (mensaje, estado = 400) => Object.assign(new Error(mensaje), { estado });

export const CABECERAS_RESUMEN = [
  'formato_version', 'sesion', 'codigo', 'nombres', 'apellidos', 'curso',
  'total_preguntas', 'respondidas', 'saltadas', 'aciertos', 'puntaje',
  'porcentaje', 'inicio', 'entrega', 'motivo_entrega',
];

export const CABECERAS_DETALLE = [
  'formato_version', 'sesion', 'curso', 'codigo', 'nombres', 'apellidos',
  'n_pregunta', 'pregunta_id',
  'competencia', 'componente', 'afirmacion', 'evidencia', 'estandar_asociado', 'que_evalua',
  'opcion_a_id', 'opcion_a_texto', 'opcion_a_es_correcta',
  'opcion_b_id', 'opcion_b_texto', 'opcion_b_es_correcta',
  'opcion_c_id', 'opcion_c_texto', 'opcion_c_es_correcta',
  'opcion_d_id', 'opcion_d_texto', 'opcion_d_es_correcta',
  'opcion_elegida_id', 'acierto', 'saltada', 'segundos',
];

export const CABECERAS_BANCO = [
  'pregunta_id',
  'competencia', 'componente', 'afirmacion', 'evidencia', 'estandar_asociado', 'que_evalua',
  'opcion_a_texto', 'opcion_b_texto', 'opcion_c_texto', 'opcion_d_texto',
  'veces_presentada', 'veces_acertada', 'veces_saltada',
];

const NUMERICAS_RESUMEN = new Set(['total_preguntas', 'respondidas', 'saltadas', 'aciertos', 'puntaje', 'porcentaje']);
const NUMERICAS_DETALLE = new Set(['n_pregunta', 'pregunta_id', 'opcion_a_id', 'opcion_b_id', 'opcion_c_id', 'opcion_d_id', 'opcion_a_es_correcta', 'opcion_b_es_correcta', 'opcion_c_es_correcta', 'opcion_d_es_correcta', 'opcion_elegida_id', 'acierto', 'saltada', 'segundos']);
const NUMERICAS_BANCO = new Set(['pregunta_id', 'veces_presentada', 'veces_acertada', 'veces_saltada']);

function aFilaExcel(cabeceras, numericas, fila) {
  return cabeceras.map((campo) => {
    const valor = fila[campo];
    return numericas.has(campo) ? Number(valor) : String(valor ?? '');
  });
}

export function armarExportacion(db, sesionId, curso, ahora = new Date()) {
  const sesion = obtenerSesion(db, sesionId);
  if (sesion.estado !== 'cerrada') throw error('Solo se exportan evaluaciones cerradas.', 409);
  const cursos = cursosDe(sesion);
  if (curso && !cursos.includes(curso)) throw error('Ese curso no fue convocado a la evaluación.');
  const banco = db.prepare('SELECT nombre FROM bancos WHERE id = ?').get(sesion.banco_id).nombre;
  const intentos = db.prepare(`
    SELECT i.*, e.nombres, e.apellidos, e.curso
    FROM intentos i JOIN estudiantes e ON e.codigo = i.codigo_estudiante
    WHERE i.sesion_id = ? AND (? = '' OR e.curso = ?)
    ORDER BY e.curso, e.apellidos, e.nombres, e.codigo
  `).all(sesion.id, curso ?? '', curso ?? '');

  const filasPreguntas = db.prepare(`
    SELECT ip.orden, ip.pregunta_id, ip.orden_opciones,
           p.contexto, p.enunciado,
           p.competencia, p.componente, p.afirmacion, p.evidencia,
           p.estandar_asociado, p.que_evalua,
           r.id AS respuesta_id, r.opcion_id, r.segundos_en_pantalla
    FROM intento_preguntas ip
    JOIN preguntas p ON p.id = ip.pregunta_id
    LEFT JOIN respuestas r ON r.intento_pregunta_id = ip.id
    WHERE ip.intento_id = ? ORDER BY ip.orden
  `);
  const opciones = db.prepare('SELECT id, texto, es_correcta, justificacion FROM opciones WHERE pregunta_id = ?');

  return {
    formato_version: 2,
    exportado_en: (ahora instanceof Date ? ahora : new Date(ahora)).toISOString(),
    sesion: {
      id: sesion.id,
      nombre: sesion.nombre,
      banco,
      cursos: curso ? [curso] : cursos,
      n_preguntas: sesion.n_preguntas,
      duracion_minutos: sesion.duracion_minutos,
      segundos_minimos_pregunta: sesion.segundos_minimos_pregunta,
    },
    intentos: intentos.map((intento) => {
      const preguntas = filasPreguntas.all(intento.id).map((pregunta) => {
        const ids = pregunta.orden_opciones.split(',').map(Number);
        const porId = new Map(opciones.all(pregunta.pregunta_id).map((opcion) => [opcion.id, opcion]));
        const mostradas = ids.map((id) => porId.get(id)).map((opcion) => ({
          opcion_id: opcion.id,
          contenido: analizarBloques(opcion.texto),
          es_correcta: Boolean(opcion.es_correcta),
          justificacion: opcion.justificacion,
        }));
        const elegida = mostradas.find((opcion) => opcion.opcion_id === pregunta.opcion_id) ?? null;
        const correcta = mostradas.find((opcion) => opcion.es_correcta);
        if (!correcta) {
          throw error(
            `La pregunta ${pregunta.pregunta_id} no tiene ninguna opción correcta entre las que se mostraron a ${intento.codigo_estudiante}.`,
            500,
          );
        }
        return {
          n_pregunta: pregunta.orden,
          pregunta_id: pregunta.pregunta_id,
          competencia: pregunta.competencia,
          componente: pregunta.componente,
          afirmacion: pregunta.afirmacion,
          evidencia: pregunta.evidencia,
          estandar_asociado: pregunta.estandar_asociado,
          que_evalua: pregunta.que_evalua,
          contexto: analizarBloques(pregunta.contexto),
          enunciado: analizarBloques(pregunta.enunciado),
          opciones_mostradas: mostradas,
          opcion_elegida_id: pregunta.opcion_id,
          opcion_elegida_texto: elegida ? textoPlano(elegida.contenido) : '',
          opcion_correcta_texto: textoPlano(correcta.contenido),
          acierto: Boolean(elegida?.es_correcta),
          saltada: !elegida,
          segundos: pregunta.respuesta_id ? pregunta.segundos_en_pantalla : 0,
        };
      });
      const calculada = calificarIntento(preguntas.map((pregunta) => ({
        opcion_id: pregunta.opcion_elegida_id,
        opcion_correcta_id: pregunta.opciones_mostradas.find((opcion) => opcion.es_correcta).opcion_id,
      })));
      const respondidas = preguntas.filter((pregunta) => !pregunta.saltada).length;
      const aciertos = intento.aciertos ?? calculada.aciertos;
      const puntaje = intento.puntaje ?? calculada.puntaje;
      return {
        codigo: intento.codigo_estudiante,
        nombres: intento.nombres,
        apellidos: intento.apellidos,
        curso: intento.curso,
        inicio: intento.iniciado_en,
        entrega: intento.entregado_en ?? '',
        motivo_entrega: intento.motivo_entrega ?? '',
        aciertos,
        puntaje,
        porcentaje: Number(((aciertos / preguntas.length) * 100).toFixed(1)),
        respondidas,
        saltadas: preguntas.length - respondidas,
        preguntas,
      };
    }),
  };
}

export function filasResumen(exportacion) {
  return exportacion.intentos.map((intento) => ({
    formato_version: exportacion.formato_version,
    sesion: exportacion.sesion.nombre,
    codigo: intento.codigo,
    nombres: intento.nombres,
    apellidos: intento.apellidos,
    curso: intento.curso,
    total_preguntas: intento.preguntas.length,
    respondidas: intento.respondidas,
    saltadas: intento.saltadas,
    aciertos: intento.aciertos,
    puntaje: intento.puntaje,
    porcentaje: intento.porcentaje.toFixed(1),
    inicio: intento.inicio,
    entrega: intento.entrega,
    motivo_entrega: intento.motivo_entrega,
  }));
}

function opcionPorPosicion(opciones, indice) {
  return opciones[indice] ?? null;
}

export function filasDetalle(exportacion) {
  return exportacion.intentos.flatMap((intento) => intento.preguntas.map((pregunta) => {
    const a = opcionPorPosicion(pregunta.opciones_mostradas, 0);
    const b = opcionPorPosicion(pregunta.opciones_mostradas, 1);
    const c = opcionPorPosicion(pregunta.opciones_mostradas, 2);
    const d = opcionPorPosicion(pregunta.opciones_mostradas, 3);
    return {
      formato_version: exportacion.formato_version,
      sesion: exportacion.sesion.nombre,
      curso: intento.curso,
      codigo: intento.codigo,
      nombres: intento.nombres,
      apellidos: intento.apellidos,
      n_pregunta: pregunta.n_pregunta,
      pregunta_id: pregunta.pregunta_id,
      competencia: pregunta.competencia,
      componente: pregunta.componente,
      afirmacion: pregunta.afirmacion,
      evidencia: pregunta.evidencia,
      estandar_asociado: pregunta.estandar_asociado,
      que_evalua: pregunta.que_evalua,
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
      opcion_elegida_id: pregunta.opcion_elegida_id ?? '',
      acierto: Number(pregunta.acierto),
      saltada: Number(pregunta.saltada),
      segundos: pregunta.segundos,
    };
  }));
}

function filasBanco(db, exportacion) {
  const preguntas = db.prepare(`
    SELECT id, contexto, enunciado,
           competencia, componente, afirmacion, evidencia,
           estandar_asociado, que_evalua
    FROM preguntas WHERE banco_id = ?
    ORDER BY id
  `).all(exportacion.sesion.id && db.prepare('SELECT banco_id FROM sesiones WHERE id = ?').get(exportacion.sesion.id).banco_id);

  const opcionesPorPregunta = (preguntaId) => db.prepare(
    'SELECT id, texto FROM opciones WHERE pregunta_id = ? ORDER BY id',
  ).all(preguntaId);

  const intentos = db.prepare(
    'SELECT id FROM intentos WHERE sesion_id = ?',
  ).all(exportacion.sesion.id);

  const conteoPorPregunta = new Map();
  for (const intento of intentos) {
    const filas = db.prepare(`
      SELECT ip.pregunta_id, r.opcion_id
      FROM intento_preguntas ip
      LEFT JOIN respuestas r ON r.intento_pregunta_id = ip.id
      WHERE ip.intento_id = ?
    `).all(intento.id);
    for (const fila of filas) {
      const actual = conteoPorPregunta.get(fila.pregunta_id) ?? { presentada: 0, acertada: 0, saltada: 0 };
      actual.presentada += 1;
      if (fila.opcion_id === null) actual.saltada += 1;
      else {
        const correcta = db.prepare(
          'SELECT id FROM opciones WHERE pregunta_id = ? AND es_correcta = 1',
        ).get(fila.pregunta_id);
        if (correcta && correcta.id === fila.opcion_id) actual.acertada += 1;
      }
      conteoPorPregunta.set(fila.pregunta_id, actual);
    }
  }

  return preguntas.map((pregunta) => {
    const opciones = opcionesPorPregunta(pregunta.id);
    const porId = new Map(opciones.map((o) => [o.id, o]));
    const conteo = conteoPorPregunta.get(pregunta.id) ?? { presentada: 0, acertada: 0, saltada: 0 };
    const opcion = (letra) => {
      const o = porId.get(letra);
      return o ? textoPlano(analizarBloques(o.texto)) : '';
    };
    return {
      pregunta_id: pregunta.id,
      competencia: pregunta.competencia,
      componente: pregunta.componente,
      afirmacion: pregunta.afirmacion,
      evidencia: pregunta.evidencia,
      estandar_asociado: pregunta.estandar_asociado,
      que_evalua: pregunta.que_evalua,
      opcion_a_texto: opcion('A'),
      opcion_b_texto: opcion('B'),
      opcion_c_texto: opcion('C'),
      opcion_d_texto: opcion('D'),
      veces_presentada: conteo.presentada,
      veces_acertada: conteo.acertada,
      veces_saltada: conteo.saltada,
    };
  });
}

export function aJson(exportacion) {
  return JSON.stringify(exportacion, null, 2) + '\n';
}

export function aExcelRico(db, exportacion) {
  return crearLibroXlsx([
    {
      nombre: 'Resumen',
      cabeceras: CABECERAS_RESUMEN,
      filas: filasResumen(exportacion).map((fila) => aFilaExcel(CABECERAS_RESUMEN, NUMERICAS_RESUMEN, fila)),
    },
    {
      nombre: 'Detalle',
      cabeceras: CABECERAS_DETALLE,
      filas: filasDetalle(exportacion).map((fila) => aFilaExcel(CABECERAS_DETALLE, NUMERICAS_DETALLE, fila)),
    },
    {
      nombre: 'Banco',
      cabeceras: CABECERAS_BANCO,
      filas: filasBanco(db, exportacion).map((fila) => aFilaExcel(CABECERAS_BANCO, NUMERICAS_BANCO, fila)),
    },
  ]);
}

export function aReproduccionZip(db, exportacion) {
  const entradas = [{ nombre: 'resultados.json', contenido: aJson(exportacion) }];

  const referenciadas = imagenesDeSesion(db, exportacion.sesion.id);
  const empaquetadas = new Set();
  for (const nombre of referenciadas) {
    const ruta = join(carpetaDeImagenes(), nombre);
    if (existsSync(ruta)) {
      entradas.push({ nombre: `imagenes/${nombre}`, contenido: readFileSync(ruta) });
      empaquetadas.add(nombre);
    }
  }

  const faltantes = [...referenciadas].filter((n) => !empaquetadas.has(n)).sort();
  if (faltantes.length > 0) {
    entradas.push({ nombre: 'imagenes_faltantes.txt', contenido: faltantes.join('\n') + '\n' });
  }

  return crearZip(entradas);
}

