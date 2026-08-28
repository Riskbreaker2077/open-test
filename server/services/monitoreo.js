import { cursosDe, obtenerSesion, tiempoRestante } from './sesiones.js';

export function estadoDeSesion(db, sesionId, ahora = new Date()) {
  let sesion = obtenerSesion(db, sesionId);
  const segundosRestantes = tiempoRestante(db, sesion, ahora);
  sesion = obtenerSesion(db, sesionId);
  const cursos = new Set(cursosDe(sesion));
  const estudiantes = db.prepare(`
    SELECT e.codigo, e.nombres, e.apellidos, e.curso,
           i.id AS intento_id, i.pregunta_actual, i.entregado_en,
           i.motivo_entrega, i.puntaje, i.aciertos,
           (SELECT count(*) FROM respuestas r
            JOIN intento_preguntas ip ON ip.id = r.intento_pregunta_id
            WHERE ip.intento_id = i.id AND r.opcion_id IS NOT NULL) AS respondidas
    FROM estudiantes e
    LEFT JOIN intentos i ON i.codigo_estudiante = e.codigo AND i.sesion_id = ?
    ORDER BY e.apellidos, e.nombres, e.codigo
  `).all(sesion.id)
    .filter((estudiante) => cursos.has(estudiante.curso))
    .map((estudiante) => {
      const estado = !estudiante.intento_id
        ? 'sin_entrar'
        : estudiante.entregado_en ? 'entregado' : 'presentando';
      return {
        codigo: estudiante.codigo,
        nombre: `${estudiante.nombres} ${estudiante.apellidos}`,
        curso: estudiante.curso,
        estado,
        intentoId: estudiante.intento_id,
        preguntaActual: estado === 'presentando' ? estudiante.pregunta_actual : null,
        respondidas: estudiante.intento_id ? estudiante.respondidas : 0,
        segundosRestantes: estado === 'presentando' ? segundosRestantes : null,
        puntaje: estado === 'entregado' ? estudiante.puntaje : null,
        porcentaje: estado === 'entregado'
          ? Number(((estudiante.puntaje / sesion.n_preguntas) * 100).toFixed(1))
          : null,
        motivoEntrega: estado === 'entregado' ? estudiante.motivo_entrega : null,
      };
    });

  const total = (estado) => estudiantes.filter((item) => item.estado === estado).length;
  return {
    sesion: {
      id: sesion.id,
      nombre: sesion.nombre,
      bancoId: sesion.banco_id,
      banco: db.prepare('SELECT nombre FROM bancos WHERE id = ?').get(sesion.banco_id).nombre,
      cursos: cursosDe(sesion),
      estado: sesion.estado,
      nPreguntas: sesion.n_preguntas,
      duracionMinutos: sesion.duracion_minutos,
      segundosMinimosPregunta: sesion.segundos_minimos_pregunta,
      nivelFeedback: sesion.nivel_feedback,
      segundosRestantes,
    },
    contadores: {
      convocados: estudiantes.length,
      dentro: estudiantes.length - total('sin_entrar'),
      entregados: total('entregado'),
      sinEntrar: total('sin_entrar'),
      presentando: total('presentando'),
    },
    estudiantes,
  };
}
