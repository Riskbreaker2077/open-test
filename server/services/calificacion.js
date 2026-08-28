import { analizarBloques } from './bloques.js';

const error = (mensaje, estado = 400) => Object.assign(new Error(mensaje), { estado });

/** Calcula sobre toda la prueba asignada, incluidas las preguntas no vistas. */
export function calificarIntento(preguntas) {
  const total = preguntas.length;
  const aciertos = preguntas.filter(
    (pregunta) => pregunta.opcion_id !== null && pregunta.opcion_id === pregunta.opcion_correcta_id,
  ).length;
  return {
    aciertos,
    puntaje: aciertos,
    total,
    porcentaje: total === 0 ? 0 : Number(((aciertos / total) * 100).toFixed(1)),
  };
}

/** Lee la prueba materializada sin perder el orden que vio el estudiante. */
export function preguntasCalificables(db, intentoId) {
  const filas = db.prepare(`
    SELECT ip.orden, ip.orden_opciones, p.contexto, p.enunciado,
           p.competencia, p.componente, p.afirmacion, p.evidencia,
           p.estandar_asociado, p.que_evalua,
           r.id AS respuesta_id, r.opcion_id,
           (SELECT id FROM opciones WHERE pregunta_id = p.id AND es_correcta = 1) AS opcion_correcta_id
    FROM intento_preguntas ip
    JOIN preguntas p ON p.id = ip.pregunta_id
    LEFT JOIN respuestas r ON r.intento_pregunta_id = ip.id
    WHERE ip.intento_id = ?
    ORDER BY ip.orden
  `).all(intentoId);

  const opciones = db.prepare('SELECT id, texto, justificacion FROM opciones WHERE id IN (?, ?, ?, ?)');
  return filas.map((fila) => {
    const ids = fila.orden_opciones.split(',').map(Number);
    const porId = new Map(opciones.all(...ids).map((opcion) => [
      opcion.id,
      { id: opcion.id, contenido: analizarBloques(opcion.texto), justificacion: opcion.justificacion },
    ]));
    return {
      ...fila,
      contexto: analizarBloques(fila.contexto),
      enunciado: analizarBloques(fila.enunciado),
      opciones: ids.map((id) => porId.get(id)),
    };
  });
}

/** Persiste la nota solo si todavía no existe. Debe ejecutarse dentro de la transacción de entrega. */
export function calificarYMarcarIntento(db, intentoId, motivo, entregadoEn) {
  const intento = db.prepare('SELECT * FROM intentos WHERE id = ?').get(intentoId);
  if (!intento) throw error('Ese intento no existe.', 404);

  let calificacion = { aciertos: intento.aciertos, puntaje: intento.puntaje };
  if (intento.aciertos === null || intento.puntaje === null) {
    calificacion = calificarIntento(preguntasCalificables(db, intentoId));
  }

  db.prepare(`
    UPDATE intentos SET
      entregado_en = COALESCE(entregado_en, ?),
      motivo_entrega = COALESCE(motivo_entrega, ?),
      aciertos = COALESCE(aciertos, ?),
      puntaje = COALESCE(puntaje, ?)
    WHERE id = ?
  `).run(entregadoEn, motivo, calificacion.aciertos, calificacion.puntaje, intentoId);
  return db.prepare('SELECT * FROM intentos WHERE id = ?').get(intentoId);
}

export function entregarIntentoCalificado(db, intentoId, motivo, entregadoEn) {
  return db.transaction(() => calificarYMarcarIntento(db, intentoId, motivo, entregadoEn))();
}

function estadoDe(pregunta) {
  if (pregunta.respuesta_id === null) return 'sin_llegar';
  if (pregunta.opcion_id === null) return 'saltada';
  return pregunta.opcion_id === pregunta.opcion_correcta_id ? 'acertada' : 'fallada';
}

/** Único punto donde se decide qué información sale hacia la tablet. */
export function armarResultado(intento, preguntas, nivel) {
  const base = {
    puntaje: intento.puntaje,
    aciertos: intento.aciertos,
    total: preguntas.length,
    porcentaje: preguntas.length === 0
      ? 0
      : Number(((intento.puntaje / preguntas.length) * 100).toFixed(1)),
    nivel,
  };
  if (nivel === 'solo_puntaje') return base;

  return {
    ...base,
    preguntas: preguntas.map((pregunta) => {
      const elegida = pregunta.opciones.find((opcion) => opcion.id === pregunta.opcion_id) ?? null;
      // La justificación de la opción elegida es tan reveladora de la
      // correcta como `es_correcta`: se oculta salvo en nivel completo,
      // igual que `opciones`/`opcionCorrectaId` más abajo.
      const respuesta = elegida && nivel !== 'completo'
        ? { id: elegida.id, contenido: elegida.contenido }
        : elegida;
      const resultado = {
        orden: pregunta.orden,
        contexto: pregunta.contexto,
        enunciado: pregunta.enunciado,
        respuesta,
        estado: estadoDe(pregunta),
      };
      if (nivel === 'completo') {
        resultado.opciones = pregunta.opciones;
        resultado.opcionId = pregunta.opcion_id;
        resultado.opcionCorrectaId = pregunta.opcion_correcta_id;
        resultado.competencia = pregunta.competencia;
        resultado.componente = pregunta.componente;
        resultado.afirmacion = pregunta.afirmacion;
        resultado.evidencia = pregunta.evidencia;
        resultado.estandarAsociado = pregunta.estandar_asociado;
        resultado.queEvalua = pregunta.que_evalua;
      }
      return resultado;
    }),
  };
}

export function obtenerResultado(db, intentoId) {
  let intento = db.prepare('SELECT * FROM intentos WHERE id = ?').get(intentoId);
  if (!intento?.entregado_en) throw error('Esta prueba todavía no ha sido entregada.', 409);

  // Compatibilidad con intentos entregados por versiones anteriores a la 007.
  if (intento.aciertos === null || intento.puntaje === null) {
    intento = entregarIntentoCalificado(
      db,
      intento.id,
      intento.motivo_entrega,
      intento.entregado_en,
    );
  }
  const sesion = db.prepare('SELECT * FROM sesiones WHERE id = ?').get(intento.sesion_id);
  const estudiante = db.prepare('SELECT * FROM estudiantes WHERE codigo = ?')
    .get(intento.codigo_estudiante);
  return {
    estudiante: `${estudiante.nombres} ${estudiante.apellidos}`,
    sesion: sesion.nombre,
    entregadoEn: intento.entregado_en,
    ...armarResultado(intento, preguntasCalificables(db, intento.id), sesion.nivel_feedback),
  };
}
