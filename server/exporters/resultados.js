import { aCsv } from './csv.js';
import { calificarIntento } from '../services/calificacion.js';
import { cursosDe, obtenerSesion } from '../services/sesiones.js';
import { analizarBloques, textoPlano } from '../services/bloques.js';

// v2: reemplaza la `explicacion` general de la pregunta por una
// `justificacion` propia de cada opción mostrada, y añade la metadata
// pedagógica del estándar preguntas-icfes (competencia, componente,
// afirmación, evidencia, estándar asociado, qué evalúa). Ver
// spec/contracts/export-resultados-v2.md; v1 queda documentado como
// referencia histórica en export-resultados-v1.md.
export const CABECERAS_DETALLE = [
  'formato_version', 'sesion', 'curso', 'codigo', 'nombres', 'apellidos',
  'n_pregunta', 'pregunta_id', 'enunciado', 'opcion_elegida_texto',
  'opcion_correcta_texto', 'acierto', 'saltada', 'segundos', 'competencia',
];

export const CABECERAS_RESUMEN = [
  'formato_version', 'sesion', 'codigo', 'nombres', 'apellidos', 'curso',
  'total_preguntas', 'respondidas', 'saltadas', 'aciertos', 'puntaje',
  'porcentaje', 'inicio', 'entrega', 'motivo_entrega',
];

const error = (mensaje, estado = 400) => Object.assign(new Error(mensaje), { estado });

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

export function aDetalleCsv(exportacion) {
  const filas = exportacion.intentos.flatMap((intento) => intento.preguntas.map((pregunta) => ({
    formato_version: exportacion.formato_version,
    sesion: exportacion.sesion.nombre,
    curso: intento.curso,
    codigo: intento.codigo,
    nombres: intento.nombres,
    apellidos: intento.apellidos,
    n_pregunta: pregunta.n_pregunta,
    pregunta_id: pregunta.pregunta_id,
    enunciado: textoPlano(pregunta.enunciado),
    opcion_elegida_texto: pregunta.opcion_elegida_texto,
    opcion_correcta_texto: pregunta.opcion_correcta_texto,
    acierto: Number(pregunta.acierto),
    saltada: Number(pregunta.saltada),
    segundos: pregunta.segundos,
    competencia: pregunta.competencia,
  })));
  return aCsv(CABECERAS_DETALLE, filas);
}

export function aResumenCsv(exportacion) {
  return aCsv(CABECERAS_RESUMEN, exportacion.intentos.map((intento) => ({
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
  })));
}

export const aJson = (exportacion) => JSON.stringify(exportacion, null, 2) + '\n';
