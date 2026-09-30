export const NIVELES_FEEDBACK = ['solo_puntaje', 'aciertos', 'completo'];

/** Estados desde los que el estudiante puede ver la sesión en su portal. */
export const ESTADOS_VISIBLES = ['abierta', 'en_curso', 'pausada'];

export const POR_DEFECTO = {
  n_preguntas: 20,
  duracion_minutos: 60,
  segundos_minimos_pregunta: 45,
  nivel_feedback: 'aciertos',
};

const error = (mensaje, estado = 400) => Object.assign(new Error(mensaje), { estado });

/** Los cursos se guardan como texto separado por comas. */
export function cursosDe(sesion) {
  return String(sesion?.cursos ?? '')
    .split(',')
    .map((c) => c.trim())
    .filter((c) => c !== '');
}

export function convoca(sesion, curso) {
  return cursosDe(sesion).includes(String(curso ?? '').trim());
}

function normalizar(datos) {
  const cursos = Array.isArray(datos.cursos)
    ? datos.cursos
    : String(datos.cursos ?? '').split(',');
  const limpios = cursos.map((c) => String(c).trim()).filter((c) => c !== '');

  const nombre = String(datos.nombre ?? '').trim();
  if (nombre === '') throw error('La evaluación necesita un nombre.');
  if (limpios.length === 0) throw error('Elige al menos un curso.');

  const entero = (valor, defecto, etiqueta, minimo) => {
    const numero = valor === undefined || valor === '' ? defecto : Number(valor);
    if (!Number.isInteger(numero) || numero < minimo) {
      throw error(`"${etiqueta}" debe ser un número entero de ${minimo} o más.`);
    }
    return numero;
  };

  const nivel = datos.nivel_feedback ?? POR_DEFECTO.nivel_feedback;
  if (!NIVELES_FEEDBACK.includes(nivel)) {
    throw error(`El nivel de retroalimentación "${nivel}" no existe.`);
  }

  return {
    nombre,
    cursos: limpios.join(','),
    n_preguntas: entero(datos.n_preguntas, POR_DEFECTO.n_preguntas, 'Número de preguntas', 1),
    duracion_minutos: entero(datos.duracion_minutos, POR_DEFECTO.duracion_minutos, 'Duración', 1),
    segundos_minimos_pregunta: entero(
      datos.segundos_minimos_pregunta,
      POR_DEFECTO.segundos_minimos_pregunta,
      'Segundos mínimos por pregunta',
      0,
    ),
    nivel_feedback: nivel,
  };
}

function preguntasDelBanco(db, bancoId) {
  return db.prepare('SELECT count(*) AS total FROM preguntas WHERE banco_id = ?').get(bancoId).total;
}

export function crearSesion(db, datos) {
  const campos = normalizar(datos);
  const bancoId = Number(datos.banco_id);

  const banco = db.prepare('SELECT * FROM bancos WHERE id = ?').get(bancoId);
  if (!banco) throw error('Ese banco de preguntas no existe.', 404);

  const id = db
    .prepare(`
      INSERT INTO sesiones
        (nombre, banco_id, cursos, n_preguntas, duracion_minutos,
         segundos_minimos_pregunta, nivel_feedback, estado, creado_en)
      VALUES
        (@nombre, @banco_id, @cursos, @n_preguntas, @duracion_minutos,
         @segundos_minimos_pregunta, @nivel_feedback, 'borrador', @creado_en)
    `)
    .run({ ...campos, banco_id: bancoId, creado_en: new Date().toISOString() }).lastInsertRowid;

  return obtenerSesion(db, id);
}

export function obtenerSesion(db, id) {
  const sesion = db.prepare('SELECT * FROM sesiones WHERE id = ? AND en_papelera_en IS NULL').get(id);
  if (!sesion) throw error('Esa evaluación no existe.', 404);
  return sesion;
}

/**
 * Los parámetros se congelan al abrir: cambiarlos con el examen en marcha
 * produciría pruebas incomparables entre estudiantes.
 */
export function actualizarSesion(db, id, datos) {
  const sesion = obtenerSesion(db, id);
  if (sesion.estado !== 'borrador') {
    throw error(
      'Esta evaluación ya se abrió y sus parámetros no se pueden cambiar. ' +
        'Crea una nueva si necesitas otros ajustes.',
      409,
    );
  }

  const campos = normalizar(datos);
  const bancoId = datos.banco_id === undefined ? sesion.banco_id : Number(datos.banco_id);
  if (!db.prepare('SELECT 1 FROM bancos WHERE id = ?').get(bancoId)) {
    throw error('Ese banco de preguntas no existe.', 404);
  }

  db.prepare(`
    UPDATE sesiones SET
      nombre = @nombre, banco_id = @banco_id, cursos = @cursos,
      n_preguntas = @n_preguntas, duracion_minutos = @duracion_minutos,
      segundos_minimos_pregunta = @segundos_minimos_pregunta,
      nivel_feedback = @nivel_feedback
    WHERE id = @id
  `).run({ ...campos, banco_id: bancoId, id });

  return obtenerSesion(db, id);
}

export function abrirSesion(db, id) {
  const sesion = obtenerSesion(db, id);
  if (sesion.estado !== 'borrador') {
    throw error(`Esta evaluación ya no está en borrador (está "${sesion.estado}").`, 409);
  }

  const disponibles = preguntasDelBanco(db, sesion.banco_id);
  if (disponibles < sesion.n_preguntas) {
    throw error(
      `El banco tiene ${disponibles} pregunta(s) y la evaluación sortea ${sesion.n_preguntas}. ` +
        'Carga más preguntas o baja el número.',
      409,
    );
  }

  db.prepare("UPDATE sesiones SET estado = 'abierta' WHERE id = ?").run(id);
  return obtenerSesion(db, id);
}

function fechaIso(ahora) {
  return (ahora instanceof Date ? ahora : new Date(ahora)).toISOString();
}

export function comenzarSesion(db, id, ahora = new Date()) {
  const sesion = obtenerSesion(db, id);
  if (sesion.estado !== 'abierta') {
    throw error(`Solo se puede comenzar una evaluación abierta (está "${sesion.estado}").`, 409);
  }

  db.prepare(`
    UPDATE sesiones
    SET estado = 'en_curso', comenzada_en = ?, pausada_en = NULL
    WHERE id = ?
  `).run(fechaIso(ahora), id);
  return obtenerSesion(db, id);
}

export function pausarSesion(db, id, ahora = new Date()) {
  const sesion = obtenerSesion(db, id);
  if (sesion.estado !== 'en_curso') {
    throw error(`Solo se puede pausar una evaluación en curso (está "${sesion.estado}").`, 409);
  }

  const instante = ahora instanceof Date ? ahora : new Date(ahora);
  if (calcularRestantes(sesion, instante) <= 0) {
    return cerrarSesion(db, id, { motivo: 'tiempo', ahora: instante });
  }

  db.prepare("UPDATE sesiones SET estado = 'pausada', pausada_en = ? WHERE id = ?")
    .run(fechaIso(instante), id);
  return obtenerSesion(db, id);
}

export function reanudarSesion(db, id, ahora = new Date()) {
  const sesion = obtenerSesion(db, id);
  if (sesion.estado !== 'pausada') {
    throw error(`Solo se puede reanudar una evaluación pausada (está "${sesion.estado}").`, 409);
  }

  const instante = ahora instanceof Date ? ahora : new Date(ahora);
  const pausa = Math.max(0, Math.floor((instante.getTime() - new Date(sesion.pausada_en).getTime()) / 1000));
  db.prepare(`
    UPDATE sesiones
    SET estado = 'en_curso', pausada_en = NULL,
        segundos_pausados = segundos_pausados + ?
    WHERE id = ?
  `).run(pausa, id);
  return obtenerSesion(db, id);
}

export function cerrarSesion(db, id, { motivo = 'forzada_docente', ahora = new Date() } = {}) {
  const sesion = obtenerSesion(db, id);
  if (sesion.estado === 'cerrada') return sesion;
  if (sesion.estado === 'borrador') {
    throw error('Esta evaluación todavía no se ha abierto.', 409);
  }

  const entregadoEn = fechaIso(ahora);
  db.transaction(() => {
    db.prepare("UPDATE sesiones SET estado = 'cerrada', pausada_en = NULL WHERE id = ?").run(id);
    const pendientes = db.prepare(`
      SELECT id FROM intentos WHERE sesion_id = ? AND entregado_en IS NULL
    `).all(id);
    for (const intento of pendientes) {
      calificarYMarcarIntento(db, intento.id, motivo, entregadoEn);
    }
  })();
  return obtenerSesion(db, id);
}

export function actualizarNivelFeedback(db, id, nivel) {
  const sesion = obtenerSesion(db, id);
  if (sesion.estado !== 'cerrada') {
    throw error('El nivel de retroalimentación solo se ajusta aquí después de cerrar.', 409);
  }
  if (!NIVELES_FEEDBACK.includes(nivel)) {
    throw error(`El nivel de retroalimentación "${nivel}" no existe.`);
  }
  db.prepare('UPDATE sesiones SET nivel_feedback = ? WHERE id = ?').run(nivel, id);
  return obtenerSesion(db, id);
}

/**
 * El nombre es una etiqueta, no un parámetro de la prueba (049): a
 * diferencia de duración/preguntas/mínimo, cambiarlo después de abierta no
 * afecta la comparabilidad entre estudiantes, así que se permite en
 * cualquier estado.
 */
export function renombrarSesion(db, id, nombre) {
  obtenerSesion(db, id);
  const limpio = String(nombre ?? '').trim();
  if (limpio === '') throw error('La evaluación necesita un nombre.');
  db.prepare('UPDATE sesiones SET nombre = ? WHERE id = ?').run(limpio, id);
  return obtenerSesion(db, id);
}

/** Segundos que le quedan a una sesión ya comenzada, sin efectos secundarios. */
function calcularRestantes(sesion, referencia) {
  if (!sesion.comenzada_en) return sesion.duracion_minutos * 60;
  const transcurridos = Math.floor((referencia.getTime() - new Date(sesion.comenzada_en).getTime()) / 1000);
  return sesion.duracion_minutos * 60 + sesion.segundos_pausados - transcurridos;
}

/**
 * Segundos del reloj global. Si vence, cierra la sesión y entrega los intentos
 * pendientes; así cualquier cliente que consulte el reloj aplica el plazo.
 */
export function tiempoRestante(db, sesionOId, ahora = new Date()) {
  let sesion = typeof sesionOId === 'object' ? sesionOId : obtenerSesion(db, sesionOId);
  if (sesion.estado === 'cerrada') return 0;
  if (!sesion.comenzada_en) return sesion.duracion_minutos * 60;

  const referencia = sesion.estado === 'pausada' ? new Date(sesion.pausada_en) :
    (ahora instanceof Date ? ahora : new Date(ahora));
  const restantes = calcularRestantes(sesion, referencia);

  if (restantes <= 0 && sesion.estado !== 'cerrada') {
    sesion = cerrarSesion(db, sesion.id, { motivo: 'tiempo', ahora: referencia });
    return sesion.estado === 'cerrada' ? 0 : Math.max(0, restantes);
  }
  return Math.max(0, restantes);
}

export function listarSesiones(db) {
  return db
    .prepare(`
      SELECT s.*, b.nombre AS banco,
             (SELECT count(*) FROM intentos i WHERE i.sesion_id = s.id) AS intentos,
             (SELECT count(*) FROM preguntas p WHERE p.banco_id = s.banco_id) AS preguntas_banco
      FROM sesiones s
      JOIN bancos b ON b.id = s.banco_id
      WHERE s.en_papelera_en IS NULL
      ORDER BY s.creado_en DESC
    `)
    .all();
}

/** Días que una evaluación borrada espera en la papelera antes de eliminarse sola (046). */
export const DIAS_PAPELERA = 30;
const MS_DIA = 24 * 60 * 60 * 1000;

const iso = (ahora) => (ahora instanceof Date ? ahora : new Date(ahora)).toISOString();

/**
 * Borrar una evaluación siempre la manda a la papelera (046, ampliado por
 * 049): con o sin intentos, para que "Restaurar" funcione igual en
 * cualquier caso y el docente no pierda un borrador por error de un clic.
 * Solo se bloquea mientras está abierta, en curso o pausada.
 */
export function borrarSesion(db, id, ahora = new Date()) {
  const sesion = obtenerSesion(db, id);
  if (ESTADOS_VISIBLES.includes(sesion.estado)) {
    throw error('Cierra la evaluación antes de borrarla.', 409);
  }
  db.prepare('UPDATE sesiones SET en_papelera_en = ? WHERE id = ?').run(iso(ahora), id);
  return { ...sesion, enPapelera: true };
}

function enPapelera(db, id) {
  const sesion = db.prepare('SELECT * FROM sesiones WHERE id = ? AND en_papelera_en IS NOT NULL').get(id);
  if (!sesion) throw error('Esa evaluación no está en la papelera.', 404);
  return sesion;
}

export function listarPapelera(db) {
  return db
    .prepare(`
      SELECT s.id, s.nombre, s.cursos, s.en_papelera_en, b.nombre AS banco,
             (SELECT count(*) FROM intentos i WHERE i.sesion_id = s.id) AS intentos
      FROM sesiones s
      JOIN bancos b ON b.id = s.banco_id
      WHERE s.en_papelera_en IS NOT NULL
      ORDER BY s.en_papelera_en DESC
    `)
    .all()
    .map((fila) => ({
      ...fila,
      se_elimina_en: new Date(Date.parse(fila.en_papelera_en) + DIAS_PAPELERA * MS_DIA).toISOString(),
    }));
}

/** La devuelve tal como estaba: nada de lo que cuelga de ella se tocó al borrarla. */
export function restaurarSesion(db, id) {
  enPapelera(db, id);
  db.prepare('UPDATE sesiones SET en_papelera_en = NULL WHERE id = ?').run(id);
  return obtenerSesion(db, id);
}

/** Eliminación definitiva desde la papelera, en cascada. */
export function eliminarDePapelera(db, id) {
  const sesion = enPapelera(db, id);
  db.prepare('DELETE FROM sesiones WHERE id = ?').run(id);
  return sesion;
}

/** Elimina lo que lleva más de `DIAS_PAPELERA` en la papelera. Devuelve cuántas. */
export function vaciarPapeleraVencida(db, ahora = new Date()) {
  const limite = new Date(Date.parse(iso(ahora)) - DIAS_PAPELERA * MS_DIA).toISOString();
  return db
    .prepare('DELETE FROM sesiones WHERE en_papelera_en IS NOT NULL AND en_papelera_en <= ?')
    .run(limite).changes;
}

/**
 * Lo que el estudiante ve en su portal: sesiones activas de su curso que
 * todavía no ha entregado. Las ya presentadas no vuelven a aparecer (045).
 */
export function sesionesDisponiblesPara(db, estudiante) {
  const marcadores = ESTADOS_VISIBLES.map(() => '?').join(', ');

  return db
    .prepare(`
      SELECT s.id, s.nombre, s.estado, s.cursos, s.duracion_minutos, s.n_preguntas,
             b.nombre AS banco
      FROM sesiones s
      JOIN bancos b ON b.id = s.banco_id
      WHERE s.estado IN (${marcadores}) AND s.en_papelera_en IS NULL AND NOT EXISTS (
        SELECT 1 FROM intentos i
        WHERE i.sesion_id = s.id AND i.codigo_estudiante = ? AND i.entregado_en IS NOT NULL
      )
      ORDER BY s.creado_en DESC
    `)
    .all(...ESTADOS_VISIBLES, estudiante.codigo)
    .filter((sesion) => convoca(sesion, estudiante.curso))
    .map(({ cursos, ...visible }) => visible);
}

/** ¿Puede este estudiante entrar a esta sesión? */
export function puedeEntrar(sesion, estudiante) {
  if (!ESTADOS_VISIBLES.includes(sesion.estado)) {
    return sesion.estado === 'cerrada'
      ? 'Esta evaluación ya se cerró.'
      : 'Esta evaluación todavía no está abierta.';
  }
  if (!convoca(sesion, estudiante.curso)) {
    return `Esta evaluación no es para tu curso (${estudiante.curso}).`;
  }
  return null;
}
import { calificarYMarcarIntento } from './calificacion.js';
