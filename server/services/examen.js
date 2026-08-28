import { tiempoRestante } from './sesiones.js';
import { entregarIntentoCalificado } from './calificacion.js';
import { analizarBloques } from './bloques.js';

const error = (mensaje, estado = 400) => Object.assign(new Error(mensaje), { estado });
const iso = (ahora) => (ahora instanceof Date ? ahora : new Date(ahora)).toISOString();

function recargarIntento(db, intento) {
  return db.prepare('SELECT * FROM intentos WHERE id = ?').get(intento.id);
}

function sesionDelIntento(db, intento) {
  return db.prepare('SELECT * FROM sesiones WHERE id = ?').get(intento.sesion_id);
}

/** Aplica el vencimiento global y devuelve copias actuales de sesión e intento. */
export function verificarTiempo(db, intento, ahora = new Date()) {
  let sesion = sesionDelIntento(db, intento);
  const segundosRestantes = tiempoRestante(db, sesion, ahora);
  sesion = sesionDelIntento(db, intento);
  return { sesion, intento: recargarIntento(db, intento), segundosRestantes };
}

export function estadoDelExamen(db, intento, ahora = new Date()) {
  const vigente = verificarTiempo(db, intento, ahora);
  const respondidas = db.prepare(`
    SELECT count(*) AS total
    FROM respuestas r
    JOIN intento_preguntas ip ON ip.id = r.intento_pregunta_id
    WHERE ip.intento_id = ? AND r.opcion_id IS NOT NULL
  `).get(intento.id).total;

  return {
    ...vigente,
    preguntaActual: vigente.intento.pregunta_actual,
    respondidas,
    sinResponder: vigente.sesion.n_preguntas - respondidas,
  };
}

function exigirEnCurso(vigente) {
  if (vigente.intento.entregado_en) {
    throw error('Esta prueba ya fue entregada.', 409);
  }
  if (vigente.sesion.estado === 'pausada') {
    throw error('La prueba está en pausa. Espera indicaciones de tu docente.', 409);
  }
  if (vigente.sesion.estado !== 'en_curso') {
    throw error('La prueba todavía no está en curso.', 409);
  }
}

function filaPregunta(db, intentoId, orden) {
  return db.prepare(`
    SELECT ip.id AS intento_pregunta_id, ip.orden, ip.orden_opciones,
           p.contexto, p.enunciado
    FROM intento_preguntas ip
    JOIN preguntas p ON p.id = ip.pregunta_id
    WHERE ip.intento_id = ? AND ip.orden = ?
  `).get(intentoId, orden);
}

export function obtenerPregunta(db, intento, orden, ahora = new Date()) {
  const vigente = verificarTiempo(db, intento, ahora);
  exigirEnCurso(vigente);

  const numero = Number(orden);
  if (!Number.isInteger(numero) || numero < 1 || numero > vigente.sesion.n_preguntas) {
    throw error(`La pregunta debe estar entre 1 y ${vigente.sesion.n_preguntas}.`, 404);
  }
  const fila = filaPregunta(db, intento.id, numero);
  if (!fila) throw error('Esa pregunta no forma parte de tu prueba.', 404);

  let mostradaEn = vigente.intento.pregunta_mostrada_en;
  if (vigente.intento.pregunta_actual !== numero || !mostradaEn) {
    mostradaEn = iso(ahora);
    db.prepare(`
      UPDATE intentos SET pregunta_actual = ?, pregunta_mostrada_en = ? WHERE id = ?
    `).run(numero, mostradaEn, intento.id);
  }

  const ids = fila.orden_opciones.split(',').map(Number);
  const opciones = db.prepare(`
    SELECT id, texto FROM opciones
    WHERE pregunta_id = (SELECT pregunta_id FROM intento_preguntas WHERE id = ?)
  `).all(fila.intento_pregunta_id);
  const porId = new Map(opciones.map((opcion) => [opcion.id, { id: opcion.id, contenido: analizarBloques(opcion.texto) }]));
  const respuesta = db.prepare(`
    SELECT opcion_id, segundos_en_pantalla FROM respuestas WHERE intento_pregunta_id = ?
  `).get(fila.intento_pregunta_id);

  const segundosVista = Math.max(0, Math.floor(
    ((ahora instanceof Date ? ahora : new Date(ahora)) - new Date(mostradaEn)) / 1000,
  ));
  return {
    orden: numero,
    total: vigente.sesion.n_preguntas,
    contexto: analizarBloques(fila.contexto),
    enunciado: analizarBloques(fila.enunciado),
    opciones: ids.map((id) => porId.get(id)),
    respondida: Boolean(respuesta),
    opcionId: respuesta?.opcion_id ?? null,
    segundosEnPantalla: respuesta?.segundos_en_pantalla ?? 0,
    segundosMinimos: vigente.sesion.segundos_minimos_pregunta,
    segundosParaAvanzar: Math.max(0, vigente.sesion.segundos_minimos_pregunta - segundosVista),
    segundosRestantes: vigente.segundosRestantes,
  };
}

export function guardarRespuesta(db, intento, datos, ahora = new Date()) {
  const vigente = verificarTiempo(db, intento, ahora);
  exigirEnCurso(vigente);

  const numero = Number(datos.n);
  const fila = filaPregunta(db, intento.id, numero);
  if (!fila) throw error('Esa pregunta no forma parte de tu prueba.', 404);
  if (vigente.intento.pregunta_actual !== numero || !vigente.intento.pregunta_mostrada_en) {
    throw error('Abre esta pregunta antes de guardar la respuesta.', 409);
  }

  const transcurridos = Math.max(
    0,
    Math.floor(((ahora instanceof Date ? ahora : new Date(ahora)) - new Date(vigente.intento.pregunta_mostrada_en)) / 1000),
  );
  if (transcurridos < vigente.sesion.segundos_minimos_pregunta) {
    const faltan = vigente.sesion.segundos_minimos_pregunta - transcurridos;
    throw error(`Espera ${faltan} segundo(s) antes de avanzar.`, 409);
  }

  const opcionId = datos.opcionId === null ? null : Number(datos.opcionId);
  if (opcionId !== null) {
    const permitidas = new Set(fila.orden_opciones.split(',').map(Number));
    if (!Number.isInteger(opcionId) || !permitidas.has(opcionId)) {
      throw error('Esa opción no pertenece a esta pregunta.');
    }
  }

  const previa = db.prepare(`
    SELECT segundos_en_pantalla FROM respuestas WHERE intento_pregunta_id = ?
  `).get(fila.intento_pregunta_id);
  const anteriores = previa?.segundos_en_pantalla ?? 0;
  const reportados = Number(datos.segundos);
  const totalReportado = Number.isFinite(reportados) && reportados >= 0 ? Math.floor(reportados) : anteriores;
  const segundos = Math.max(anteriores, Math.min(totalReportado, anteriores + transcurridos));

  db.prepare(`
    INSERT INTO respuestas (intento_pregunta_id, opcion_id, segundos_en_pantalla, respondido_en)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(intento_pregunta_id) DO UPDATE SET
      opcion_id = excluded.opcion_id,
      segundos_en_pantalla = excluded.segundos_en_pantalla,
      respondido_en = excluded.respondido_en
  `).run(fila.intento_pregunta_id, opcionId, segundos, iso(ahora));

  return { n: numero, opcionId, segundosEnPantalla: segundos, segundosRestantes: vigente.segundosRestantes };
}

export function entregarIntento(db, intento, motivo, ahora = new Date()) {
  const vigente = verificarTiempo(db, intento, ahora);
  if (vigente.intento.entregado_en) return { intento: vigente.intento, nueva: false };
  exigirEnCurso(vigente);

  if (!['manual', 'ultima_pregunta'].includes(motivo)) {
    throw error('El motivo de entrega no es válido.');
  }
  if (motivo === 'ultima_pregunta' && vigente.intento.pregunta_actual !== vigente.sesion.n_preguntas) {
    throw error('La entrega desde la última pregunta solo se permite al final.', 409);
  }

  const calificado = entregarIntentoCalificado(db, intento.id, motivo, iso(ahora));
  return { intento: calificado, nueva: true };
}
