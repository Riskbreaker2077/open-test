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
  'n_pregunta', 'pregunta_id', 'grupo_id', 'tipo_item', 'valor',
  'nivel_mcer', 'grado', 'prueba', 'version_estandar',
  'competencia', 'componente', 'afirmacion', 'evidencia', 'estandar_asociado', 'que_evalua',
  'procedencia_contenido', 'procedencia_clasificacion', 'procedencia_respuesta_correcta',
  'verificado_contenido', 'verificado_clasificacion', 'verificado_respuesta_correcta',
  'fuentes_contenido', 'fuentes_clasificacion', 'fuentes_respuesta_correcta',
  'opcion_a_id', 'opcion_a_texto', 'opcion_a_es_correcta',
  'opcion_a_procedencia_justificacion', 'opcion_a_justificacion_verificada',
  'opcion_b_id', 'opcion_b_texto', 'opcion_b_es_correcta',
  'opcion_b_procedencia_justificacion', 'opcion_b_justificacion_verificada',
  'opcion_c_id', 'opcion_c_texto', 'opcion_c_es_correcta',
  'opcion_c_procedencia_justificacion', 'opcion_c_justificacion_verificada',
  'opcion_d_id', 'opcion_d_texto', 'opcion_d_es_correcta',
  'opcion_d_procedencia_justificacion', 'opcion_d_justificacion_verificada',
  'respuesta_banco_id', 'opcion_elegida_id', 'acierto', 'saltada', 'segundos',
];

export const CABECERAS_BANCO = [
  'pregunta_id', 'grupo_id', 'tipo_item', 'valor',
  'nivel_mcer', 'grado', 'prueba', 'version_estandar',
  'competencia', 'componente', 'afirmacion', 'evidencia', 'estandar_asociado', 'que_evalua',
  'procedencia_contenido', 'procedencia_clasificacion', 'procedencia_respuesta_correcta',
  'verificado_contenido', 'verificado_clasificacion', 'verificado_respuesta_correcta',
  'fuentes_contenido', 'fuentes_clasificacion', 'fuentes_respuesta_correcta',
  'opcion_a_texto', 'opcion_b_texto', 'opcion_c_texto', 'opcion_d_texto',
  'veces_presentada', 'veces_acertada', 'veces_saltada',
];

const NUMERICAS_RESUMEN = new Set(['total_preguntas', 'respondidas', 'saltadas', 'aciertos', 'puntaje', 'porcentaje']);
const NUMERICAS_DETALLE = new Set([
  'n_pregunta', 'pregunta_id', 'valor',
  'opcion_a_id', 'opcion_b_id', 'opcion_c_id', 'opcion_d_id',
  'opcion_a_es_correcta', 'opcion_b_es_correcta', 'opcion_c_es_correcta', 'opcion_d_es_correcta',
  'opcion_elegida_id', 'acierto', 'saltada', 'segundos',
]);
const NUMERICAS_BANCO = new Set(['pregunta_id', 'valor', 'veces_presentada', 'veces_acertada', 'veces_saltada']);

function aFilaExcel(cabeceras, numericas, fila) {
  return cabeceras.map((campo) => {
    const valor = fila[campo];
    return numericas.has(campo) ? Number(valor) : String(valor ?? '');
  });
}

function jsonDe(contrato) {
  try {
    return JSON.parse(contrato ?? '{}');
  } catch {
    return {};
  }
}

/** Los campos informativos v1.1.0/v1.2.0+ de una fila de pregunta, aplanados. */
function camposInformativos(pregunta) {
  const procedencia = jsonDe(pregunta.procedencia);
  const verificado = jsonDe(pregunta.verificado);
  const fuentes = jsonDe(pregunta.fuentes);
  return {
    grupo_id: pregunta.grupo_id ?? '',
    tipo_item: pregunta.tipo_item ?? 'estandar',
    valor: pregunta.valor ?? 1,
    nivel_mcer: pregunta.nivel_mcer ?? '',
    grado: pregunta.grado ?? '',
    prueba: pregunta.prueba ?? '',
    version_estandar: pregunta.version_estandar ?? '',
    procedencia_contenido: procedencia.contenido ?? '',
    procedencia_clasificacion: procedencia.clasificacion ?? '',
    procedencia_respuesta_correcta: procedencia.respuesta_correcta ?? '',
    verificado_contenido: verificado.contenido ?? '',
    verificado_clasificacion: verificado.clasificacion ?? '',
    verificado_respuesta_correcta: verificado.respuesta_correcta ?? '',
    fuentes_contenido: fuentes.contenido ?? '',
    fuentes_clasificacion: fuentes.clasificacion ?? '',
    fuentes_respuesta_correcta: fuentes.respuesta_correcta ?? '',
  };
}

function gruposDeBanco(db, bancoId) {
  const filas = db.prepare(`
    SELECT id, tipo, contexto, banco, metadata_pedagogica
    FROM grupos WHERE banco_id = ? ORDER BY id
  `).all(bancoId);
  return filas.map((fila) => ({
    id: fila.id,
    tipo: fila.tipo,
    contexto: analizarBloques(fila.contexto),
    banco: (() => {
      try {
        return JSON.parse(fila.banco ?? '[]');
      } catch {
        return [];
      }
    })(),
    metadata_pedagogica: jsonDe(fila.metadata_pedagogica),
  }));
}

export function armarExportacion(db, sesionId, curso, ahora = new Date()) {
  const sesion = obtenerSesion(db, sesionId);
  if (sesion.estado !== 'cerrada') throw error('Solo se exportan evaluaciones cerradas.', 409);
  const cursos = cursosDe(sesion);
  if (curso && !cursos.includes(curso)) throw error('Ese curso no fue convocado a la evaluación.');
  const bancoFila = db.prepare('SELECT id, nombre FROM bancos WHERE id = ?').get(sesion.banco_id);
  const intentos = db.prepare(`
    SELECT i.*, e.nombres, e.apellidos, e.curso
    FROM intentos i JOIN estudiantes e ON e.codigo = i.codigo_estudiante
    WHERE i.sesion_id = ? AND (? = '' OR e.curso = ?)
    ORDER BY e.curso, e.apellidos, e.nombres, e.codigo
  `).all(sesion.id, curso ?? '', curso ?? '');

  const filasPreguntas = db.prepare(`
    SELECT ip.orden, ip.pregunta_id, ip.orden_opciones, ip.respuesta_banco_id,
           p.contexto, p.enunciado,
           p.competencia, p.componente, p.afirmacion, p.evidencia,
           p.estandar_asociado, p.que_evalua,
           p.grupo_id, p.tipo_item, p.respuesta_pool_id, p.numero_blanco,
           p.nivel_mcer, p.valor, p.grado, p.prueba,
           p.procedencia, p.verificado, p.fuentes, p.version_estandar,
           r.id AS respuesta_id, r.opcion_id, r.segundos_en_pantalla
    FROM intento_preguntas ip
    JOIN preguntas p ON p.id = ip.pregunta_id
    LEFT JOIN respuestas r ON r.intento_pregunta_id = ip.id
    WHERE ip.intento_id = ? ORDER BY ip.orden
  `);
  const opciones = db.prepare(`
    SELECT id, texto, es_correcta, justificacion,
           procedencia_justificacion, justificacion_verificada
    FROM opciones WHERE pregunta_id = ?
  `);

  return {
    formato_version: 3,
    exportado_en: (ahora instanceof Date ? ahora : new Date(ahora)).toISOString(),
    sesion: {
      id: sesion.id,
      nombre: sesion.nombre,
      banco: bancoFila.nombre,
      cursos: curso ? [curso] : cursos,
      n_preguntas: sesion.n_preguntas,
      duracion_minutos: sesion.duracion_minutos,
      segundos_minimos_pregunta: sesion.segundos_minimos_pregunta,
    },
    banco: {
      id: bancoFila.id,
      nombre: bancoFila.nombre,
      grupos: gruposDeBanco(db, sesion.banco_id),
    },
    intentos: intentos.map((intento) => {
      const preguntas = filasPreguntas.all(intento.id).map((pregunta) => {
        const comunes = {
          n_pregunta: pregunta.orden,
          pregunta_id: pregunta.pregunta_id,
          ...camposInformativos(pregunta),
          competencia: pregunta.competencia,
          componente: pregunta.componente,
          afirmacion: pregunta.afirmacion,
          evidencia: pregunta.evidencia,
          estandar_asociado: pregunta.estandar_asociado,
          que_evalua: pregunta.que_evalua,
          contexto: analizarBloques(pregunta.contexto),
          enunciado: analizarBloques(pregunta.enunciado),
        };

        if (pregunta.tipo_item === 'miembro_banco_opciones') {
          // Las entradas mostradas son las del banco del grupo (sin ejemplo).
          const grupo = pregunta.grupo_id
            ? db.prepare('SELECT banco FROM grupos WHERE id = ?').get(pregunta.grupo_id)
            : null;
          const bancoGrupo = (() => {
            try {
              return JSON.parse(grupo?.banco ?? '[]');
            } catch {
              return [];
            }
          })();
          const mostradas = bancoGrupo
            .filter((entrada) => !entrada.es_ejemplo)
            .map((entrada) => ({
              banco_id: entrada.id,
              contenido: Array.isArray(entrada.contenido) ? entrada.contenido : [],
              es_correcta: entrada.id === pregunta.respuesta_pool_id,
            }));
          const elegida = mostradas.find((m) => String(m.banco_id) === String(pregunta.respuesta_banco_id)) ?? null;
          const correcta = mostradas.find((m) => m.es_correcta) ?? null;
          return {
            ...comunes,
            opciones_mostradas: mostradas,
            opcion_elegida_id: null,
            opcion_elegida_texto: '',
            opcion_correcta_texto: correcta ? textoPlano(correcta.contenido) : '',
            respuesta_banco_id: pregunta.respuesta_banco_id ?? null,
            acierto: Boolean(elegida?.es_correcta),
            saltada: !elegida,
            segundos: pregunta.respuesta_id ? pregunta.segundos_en_pantalla : 0,
          };
        }

        const ids = pregunta.orden_opciones.split(',').map(Number);
        const porId = new Map(opciones.all(pregunta.pregunta_id).map((opcion) => [opcion.id, opcion]));
        const mostradas = ids.map((id) => porId.get(id)).map((opcion) => ({
          opcion_id: opcion.id,
          contenido: analizarBloques(opcion.texto),
          es_correcta: Boolean(opcion.es_correcta),
          justificacion: opcion.justificacion,
          procedencia_justificacion: opcion.procedencia_justificacion ?? null,
          justificacion_verificada: opcion.justificacion_verificada ?? null,
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
          ...comunes,
          opciones_mostradas: mostradas,
          opcion_elegida_id: pregunta.opcion_id,
          opcion_elegida_texto: elegida ? textoPlano(elegida.contenido) : '',
          opcion_correcta_texto: textoPlano(correcta.contenido),
          respuesta_banco_id: null,
          acierto: Boolean(elegida?.es_correcta),
          saltada: !elegida,
          segundos: pregunta.respuesta_id ? pregunta.segundos_en_pantalla : 0,
        };
      });
      const calculada = calificarIntento(preguntas.map((pregunta) => ({
        tipo_item: pregunta.tipo_item,
        valor: pregunta.valor,
        opcion_id: pregunta.opcion_elegida_id,
        respuesta_banco_id: pregunta.respuesta_banco_id,
        respuesta_pool_id: pregunta.tipo_item === 'miembro_banco_opciones'
          ? (pregunta.opciones_mostradas.find((opcion) => opcion.es_correcta)?.banco_id ?? null)
          : null,
        opcion_correcta_id: pregunta.tipo_item === 'miembro_banco_opciones'
          ? null
          : pregunta.opciones_mostradas.find((opcion) => opcion.es_correcta)?.opcion_id ?? null,
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
        porcentaje: Number(((puntaje / preguntas.length) * 100).toFixed(1)),
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
    // En matching las entradas no llevan opcion_id; llevan banco_id.
    const idDe = (opcion) => (opcion
      ? (opcion.opcion_id ?? opcion.banco_id ?? '')
      : '');
    return {
      formato_version: exportacion.formato_version,
      sesion: exportacion.sesion.nombre,
      curso: intento.curso,
      codigo: intento.codigo,
      nombres: intento.nombres,
      apellidos: intento.apellidos,
      n_pregunta: pregunta.n_pregunta,
      pregunta_id: pregunta.pregunta_id,
      grupo_id: pregunta.grupo_id,
      tipo_item: pregunta.tipo_item,
      valor: pregunta.valor,
      nivel_mcer: pregunta.nivel_mcer,
      grado: pregunta.grado,
      prueba: pregunta.prueba,
      version_estandar: pregunta.version_estandar,
      competencia: pregunta.competencia,
      componente: pregunta.componente,
      afirmacion: pregunta.afirmacion,
      evidencia: pregunta.evidencia,
      estandar_asociado: pregunta.estandar_asociado,
      que_evalua: pregunta.que_evalua,
      procedencia_contenido: pregunta.procedencia_contenido,
      procedencia_clasificacion: pregunta.procedencia_clasificacion,
      procedencia_respuesta_correcta: pregunta.procedencia_respuesta_correcta,
      verificado_contenido: pregunta.verificado_contenido,
      verificado_clasificacion: pregunta.verificado_clasificacion,
      verificado_respuesta_correcta: pregunta.verificado_respuesta_correcta,
      fuentes_contenido: pregunta.fuentes_contenido,
      fuentes_clasificacion: pregunta.fuentes_clasificacion,
      fuentes_respuesta_correcta: pregunta.fuentes_respuesta_correcta,
      opcion_a_id: idDe(a),
      opcion_a_texto: a ? textoPlano(a.contenido) : '',
      opcion_a_es_correcta: a ? Number(a.es_correcta) : 0,
      opcion_a_procedencia_justificacion: a?.procedencia_justificacion ?? '',
      opcion_a_justificacion_verificada: a?.justificacion_verificada ?? '',
      opcion_b_id: idDe(b),
      opcion_b_texto: b ? textoPlano(b.contenido) : '',
      opcion_b_es_correcta: b ? Number(b.es_correcta) : 0,
      opcion_b_procedencia_justificacion: b?.procedencia_justificacion ?? '',
      opcion_b_justificacion_verificada: b?.justificacion_verificada ?? '',
      opcion_c_id: idDe(c),
      opcion_c_texto: c ? textoPlano(c.contenido) : '',
      opcion_c_es_correcta: c ? Number(c.es_correcta) : 0,
      opcion_c_procedencia_justificacion: c?.procedencia_justificacion ?? '',
      opcion_c_justificacion_verificada: c?.justificacion_verificada ?? '',
      opcion_d_id: idDe(d),
      opcion_d_texto: d ? textoPlano(d.contenido) : '',
      opcion_d_es_correcta: d ? Number(d.es_correcta) : 0,
      opcion_d_procedencia_justificacion: d?.procedencia_justificacion ?? '',
      opcion_d_justificacion_verificada: d?.justificacion_verificada ?? '',
      respuesta_banco_id: pregunta.respuesta_banco_id ?? '',
      opcion_elegida_id: pregunta.opcion_elegida_id ?? '',
      acierto: Number(pregunta.acierto),
      saltada: Number(pregunta.saltada),
      segundos: pregunta.segundos,
    };
  }));
}

function filasBanco(db, exportacion) {
  const preguntas = db.prepare(`
    SELECT id, grupo_id, tipo_item, valor, nivel_mcer, grado, prueba, version_estandar,
           contexto, enunciado,
           competencia, componente, afirmacion, evidencia,
           estandar_asociado, que_evalua,
           procedencia, verificado, fuentes,
           respuesta_pool_id
    FROM preguntas WHERE banco_id = ?
    ORDER BY id
  `).all(exportacion.banco.id);

  const opcionesPorPregunta = (preguntaId) => db.prepare(
    'SELECT id, texto FROM opciones WHERE pregunta_id = ? ORDER BY id',
  ).all(preguntaId);

  const intentos = db.prepare(
    'SELECT id FROM intentos WHERE sesion_id = ?',
  ).all(exportacion.sesion.id);

  const conteoPorPregunta = new Map();
  for (const intento of intentos) {
    const filas = db.prepare(`
      SELECT ip.pregunta_id, ip.respuesta_banco_id, r.opcion_id
      FROM intento_preguntas ip
      LEFT JOIN respuestas r ON r.intento_pregunta_id = ip.id
      WHERE ip.intento_id = ?
    `).all(intento.id);
    for (const fila of filas) {
      const actual = conteoPorPregunta.get(fila.pregunta_id) ?? { presentada: 0, acertada: 0, saltada: 0 };
      actual.presentada += 1;
      if (fila.opcion_id === null && fila.respuesta_banco_id === null) actual.saltada += 1;
      else {
        const correcta = db.prepare(
          'SELECT respuesta_pool_id FROM preguntas WHERE id = ?',
        ).get(fila.pregunta_id);
        if (fila.respuesta_banco_id !== null) {
          if (correcta && correcta.respuesta_pool_id === fila.respuesta_banco_id) actual.acertada += 1;
        } else {
          const opcionCorrecta = db.prepare(
            'SELECT id FROM opciones WHERE pregunta_id = ? AND es_correcta = 1',
          ).get(fila.pregunta_id);
          if (opcionCorrecta && opcionCorrecta.id === fila.opcion_id) actual.acertada += 1;
        }
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
      grupo_id: pregunta.grupo_id ?? '',
      tipo_item: pregunta.tipo_item ?? 'estandar',
      valor: pregunta.valor ?? 1,
      nivel_mcer: pregunta.nivel_mcer ?? '',
      grado: pregunta.grado ?? '',
      prueba: pregunta.prueba ?? '',
      version_estandar: pregunta.version_estandar ?? '',
      competencia: pregunta.competencia,
      componente: pregunta.componente,
      afirmacion: pregunta.afirmacion,
      evidencia: pregunta.evidencia,
      estandar_asociado: pregunta.estandar_asociado,
      que_evalua: pregunta.que_evalua,
      ...camposInformativos(pregunta),
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
