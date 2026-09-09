import { tiempoRestante, pausarSesion, obtenerSesion } from './sesiones.js';
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
    SELECT ip.id AS intento_pregunta_id, ip.orden, ip.orden_opciones, ip.pregunta_id,
           p.contexto, p.enunciado,
           p.grupo_id, p.tipo_item, p.respuesta_pool_id, p.numero_blanco
    FROM intento_preguntas ip
    JOIN preguntas p ON p.id = ip.pregunta_id
    WHERE ip.intento_id = ? AND ip.orden = ?
  `).get(intentoId, orden);
}

function cargarGrupo(db, grupoId) {
  const fila = db.prepare(`
    SELECT id, tipo, contexto, banco, metadata_pedagogica
    FROM grupos WHERE id = ?
  `).get(grupoId);
  if (!fila) return null;
  let banco = [];
  try {
    banco = JSON.parse(fila.banco ?? '[]');
  } catch {
    banco = [];
  }
  const grupo = {
    id: fila.id,
    tipo: fila.tipo,
    contexto: analizarBloques(fila.contexto),
    metadata_pedagogica: (() => {
      try {
        return JSON.parse(fila.metadata_pedagogica ?? '{}');
      } catch {
        return {};
      }
    })(),
  };
  // El banco solo aplica al matching: para los otros tipos la clave no va.
  // Las entradas ya vienen parseadas del JSON del grupo; no se vuelven a pasar
  // por analizarBloques (que envolvería un array en un bloque de texto).
  if (fila.tipo === 'banco_opciones') {
    grupo.banco = banco
      .filter((entrada) => !entrada.es_ejemplo)
      .map((entrada) => ({
        id: entrada.id,
        contenido: Array.isArray(entrada.contenido) ? entrada.contenido : [],
      }));
  }
  return grupo;
}

/** Devuelve las preguntas miembro de un grupo, con sus opciones y la respuesta propia ya dada. */
function preguntasHermanas(db, grupoId, intentoPreguntaIdExcluir) {
  const filas = db.prepare(`
    SELECT ip.id AS intento_pregunta_id, ip.orden, ip.orden_opciones, ip.respuesta_banco_id,
           ip.pregunta_id, p.enunciado, p.tipo_item, p.numero_blanco,
           r.opcion_id AS respuesta_opcion_id
    FROM intento_preguntas ip
    JOIN preguntas p ON p.id = ip.pregunta_id
    LEFT JOIN respuestas r ON r.intento_pregunta_id = ip.id
    WHERE p.grupo_id = ?
      AND ip.id != COALESCE(?, -1)
    ORDER BY ip.orden
  `).all(grupoId, intentoPreguntaIdExcluir);

  return filas.map((fila) => {
    const base = {
      orden: fila.orden,
      pregunta_id: fila.pregunta_id,
      tipo_item: fila.tipo_item ?? 'estandar',
      enunciado: analizarBloques(fila.enunciado),
      numero_blanco: fila.numero_blanco ?? null,
      respuestaBancoId: fila.respuesta_banco_id ?? null,
      opcionId: fila.respuesta_opcion_id ?? null,
    };
    // Ojo: `respuesta_pool_id` (la entrada correcta del banco) NUNCA sale
    // hacia la tablet — es la pista de la respuesta.
    if (fila.tipo_item === 'miembro_banco_opciones') {
      // Las opciones son las entradas del banco: el caller las añade desde
      // el grupo, no desde esta fila.
      return base;
    }
    const ids = fila.orden_opciones.split(',').map(Number);
    const opciones = db.prepare('SELECT id, texto FROM opciones WHERE pregunta_id = ?').all(fila.pregunta_id);
    const porId = new Map(opciones.map((opcion) => [
      opcion.id,
      { id: opcion.id, contenido: analizarBloques(opcion.texto) },
    ]));
    return { ...base, opciones: ids.map((id) => porId.get(id)) };
  });
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
  } else if (
    (fila.tipo_item === 'miembro_banco_opciones' || fila.tipo_item === 'miembro_texto_con_blancos')
    && fila.grupo_id
  ) {
    // Reanudación en mitad de una pantalla de grupo: mientras quede algún
    // miembro sin enviar, el mínimo vuelve a correr desde ahora (decisión
    // confirmada en el plan de la 026).
    const pendientes = db.prepare(`
      SELECT count(*) AS t
      FROM intento_preguntas ipg
      LEFT JOIN respuestas r ON r.intento_pregunta_id = ipg.id
      WHERE ipg.intento_id = ?
        AND ipg.pregunta_id IN (SELECT id FROM preguntas WHERE grupo_id = ?)
        AND r.id IS NULL
    `).get(intento.id, fila.grupo_id).t;
    if (pendientes > 0) {
      mostradaEn = iso(ahora);
      db.prepare('UPDATE intentos SET pregunta_mostrada_en = ? WHERE id = ?').run(mostradaEn, intento.id);
    }
  }

  const preguntaActual = (() => {
    const base = {
      pregunta_id: fila.pregunta_id,
      tipo_item: fila.tipo_item ?? 'estandar',
      enunciado: analizarBloques(fila.enunciado),
    };
    if (fila.tipo_item === 'miembro_banco_opciones') return base;
    const ids = fila.orden_opciones.split(',').map(Number);
    const opciones = db.prepare('SELECT id, texto FROM opciones WHERE pregunta_id = ?').all(fila.pregunta_id);
    const porId = new Map(opciones.map((opcion) => [
      opcion.id,
      { id: opcion.id, contenido: analizarBloques(opcion.texto) },
    ]));
    return { ...base, opciones: ids.map((id) => porId.get(id)) };
  })();

  const respuesta = db.prepare(`
    SELECT opcion_id, segundos_en_pantalla FROM respuestas WHERE intento_pregunta_id = ?
  `).get(fila.intento_pregunta_id);
  const respuestaBanco = fila.tipo_item === 'miembro_banco_opciones'
    ? db.prepare('SELECT respuesta_banco_id FROM intento_preguntas WHERE id = ?').get(fila.intento_pregunta_id)
    : null;

  const segundosVista = Math.max(0, Math.floor(
    ((ahora instanceof Date ? ahora : new Date(ahora)) - new Date(mostradaEn)) / 1000,
  ));

  const base = {
    orden: numero,
    total: vigente.sesion.n_preguntas,
    pregunta_id: fila.pregunta_id,
    tipo_item: preguntaActual.tipo_item,
    contexto: analizarBloques(fila.contexto),
    enunciado: preguntaActual.enunciado,
    opciones: preguntaActual.opciones ?? [],
    respondida: Boolean(respuesta) || Boolean(respuestaBanco?.respuesta_banco_id),
    opcionId: respuesta?.opcion_id ?? null,
    respuestaBancoId: respuestaBanco?.respuesta_banco_id ?? null,
    segundosEnPantalla: respuesta?.segundos_en_pantalla ?? 0,
    segundosMinimos: vigente.sesion.segundos_minimos_pregunta,
    segundosParaAvanzar: Math.max(0, vigente.sesion.segundos_minimos_pregunta - segundosVista),
    segundosRestantes: vigente.segundosRestantes,
  };

  // Si la pregunta pertenece a un grupo, devolvemos el grupo resuelto
  // (contexto siempre; banco + hermanos para matching y cloze). El renderer
  // del estudiante decide cómo pintarlo según el tipo.
  if (fila.grupo_id) {
    base.grupo = cargarGrupo(db, fila.grupo_id);
    if (base.grupo && (base.grupo.tipo === 'banco_opciones' || base.grupo.tipo === 'texto_con_blancos')) {
      base.grupo.preguntas = preguntasHermanas(db, fila.grupo_id, fila.intento_pregunta_id);
    }
  }

  return base;
}

export function guardarRespuesta(db, intento, datos, ahora = new Date()) {
  const vigente = verificarTiempo(db, intento, ahora);
  exigirEnCurso(vigente);

  const numero = Number(datos.n);
  const fila = filaPregunta(db, intento.id, numero);
  if (!fila) throw error('Esa pregunta no forma parte de tu prueba.', 404);
  // La pantalla de un grupo (matching/cloze) muestra a todos sus miembros
  // con `pregunta_actual` apuntando al primero: se puede responder a
  // cualquier miembro mientras ese grupo siga en pantalla.
  let enPantalla = vigente.intento.pregunta_actual === numero;
  if (!enPantalla && fila.grupo_id) {
    const actual = filaPregunta(db, intento.id, vigente.intento.pregunta_actual);
    enPantalla = Boolean(actual) && actual.grupo_id === fila.grupo_id;
  }
  if (!enPantalla || !vigente.intento.pregunta_mostrada_en) {
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

  const esMatching = fila.tipo_item === 'miembro_banco_opciones';
  let opcionId = null;
  let respuestaBancoId = null;
  if (esMatching) {
    respuestaBancoId = datos.respuestaBancoId === null || datos.respuestaBancoId === undefined
      ? null
      : String(datos.respuestaBancoId);
    if (respuestaBancoId !== null) {
      // El id debe estar en el banco del grupo.
      const banco = JSON.parse(
        db.prepare('SELECT banco FROM grupos WHERE id = ?').get(fila.grupo_id)?.banco ?? '[]',
      );
      const idsValidos = new Set(
        banco.filter((e) => !e.es_ejemplo).map((e) => String(e.id)),
      );
      if (!idsValidos.has(respuestaBancoId)) {
        throw error('Esa opción no pertenece al banco de esta pregunta.');
      }
    }
    db.prepare('UPDATE intento_preguntas SET respuesta_banco_id = ? WHERE id = ?').run(
      respuestaBancoId, fila.intento_pregunta_id,
    );
  } else {
    opcionId = datos.opcionId === null ? null : Number(datos.opcionId);
    if (opcionId !== null) {
      const permitidas = new Set(fila.orden_opciones.split(',').map(Number));
      if (!Number.isInteger(opcionId) || !permitidas.has(opcionId)) {
        throw error('Esa opción no pertenece a esta pregunta.');
      }
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

  return {
    n: numero,
    opcionId,
    respuestaBancoId,
    segundosEnPantalla: segundos,
    segundosRestantes: vigente.segundosRestantes,
  };
}

/**
 * Pausa la sesión del intento a pedido del estudiante.
 *
 * - Si la sesión está `en_curso`: la pausa (efecto `pausarSesion`).
 * - Si ya está `pausada`: no-op. La idempotencia evita que dos
 *   estudiantes que pulsen el botón "Pausar y salir" a la vez se
 *   pisen y produzcan un 409 visible.
 * - Cualquier otro estado (`borrador`, `abierta`, `cerrada`): 409. El
 *   cliente no debería estar en la pantalla de examen si la sesión no
 *   está en curso o pausada, pero si pasa (carrera con el docente
 *   cerrando), el mensaje es accionable.
 */
export function pausarIntentoComoEstudiante(db, intento, ahora = new Date()) {
  const sesion = sesionDelIntento(db, intento);
  if (sesion.estado === 'en_curso') {
    pausarSesion(db, sesion.id, ahora);
  } else if (sesion.estado !== 'pausada') {
    throw error(
      `No se puede pausar una evaluación en estado "${sesion.estado}".`,
      409,
    );
  }
  return obtenerSesion(db, sesion.id);
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

  const respondidas = estadoDelExamen(db, vigente.intento, ahora).respondidas;
  const pendientes = vigente.sesion.n_preguntas - respondidas;
  if (pendientes > 0) {
    throw error(
      `Aún te quedan ${pendientes} pregunta(s) sin responder.`,
      409,
    );
  }

  const calificado = entregarIntentoCalificado(db, intento.id, motivo, iso(ahora));
  return { intento: calificado, nueva: true };
}
