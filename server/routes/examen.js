import { Router } from 'express';
import { entregado, iniciarOReanudarIntento, intentoPorToken } from '../services/intentos.js';
import { obtenerSesion, sesionesDisponiblesPara } from '../services/sesiones.js';

export const NOMBRE_COOKIE_ESTUDIANTE = 'opentest_estudiante';

/** El código identifica; no es una credencial. Se recorta antes de comparar. */
function buscarEstudiante(db, codigo) {
  const limpio = String(codigo ?? '').trim();
  if (limpio === '') return null;
  return db.prepare('SELECT * FROM estudiantes WHERE codigo = ?').get(limpio) ?? null;
}

const NO_ENCONTRADO = 'No encontramos ese código. Revísalo con tu docente.';

export function rutasExamen(db) {
  const router = Router();

  // Qué evaluaciones tiene disponibles este estudiante. Exige el código: el
  // portal no es un catálogo de los exámenes que hay hoy en el colegio.
  router.post('/sesiones', (req, res) => {
    const estudiante = buscarEstudiante(db, req.body?.codigo);
    if (!estudiante) return res.status(404).json({ ok: false, mensaje: NO_ENCONTRADO });

    res.json({
      ok: true,
      estudiante: {
        codigo: estudiante.codigo,
        nombres: estudiante.nombres,
        apellidos: estudiante.apellidos,
        curso: estudiante.curso,
      },
      sesiones: sesionesDisponiblesPara(db, estudiante),
    });
  });

  router.post('/entrar', (req, res) => {
    const estudiante = buscarEstudiante(db, req.body?.codigo);
    if (!estudiante) return res.status(404).json({ ok: false, mensaje: NO_ENCONTRADO });

    let sesion;
    try {
      sesion = obtenerSesion(db, Number(req.body?.sesionId));
    } catch (err) {
      return res.status(err.estado ?? 400).json({ ok: false, mensaje: err.message });
    }

    try {
      const { intento, nuevo } = iniciarOReanudarIntento(db, sesion, estudiante);

      res.cookie(NOMBRE_COOKIE_ESTUDIANTE, intento.token, {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
      });

      res.json({ ok: true, nuevo, estado: estadoDeIntento(db, intento) });
    } catch (err) {
      res.status(err.estado ?? 400).json({ ok: false, mensaje: err.message });
    }
  });

  router.get('/estado', conIntento(db), (req, res) => {
    res.json({ ok: true, estado: estadoDeIntento(db, req.intento) });
  });

  router.post('/salir', (req, res) => {
    res.clearCookie(NOMBRE_COOKIE_ESTUDIANTE, { path: '/' });
    res.json({ ok: true });
  });

  return router;
}

/** Resuelve la cookie del estudiante a su intento, o corta con un 401. */
export function conIntento(db) {
  return (req, res, next) => {
    const intento = intentoPorToken(db, req.cookies?.[NOMBRE_COOKIE_ESTUDIANTE]);

    if (!intento) {
      return res
        .status(401)
        .json({ ok: false, mensaje: 'Vuelve a escribir tu código para continuar.' });
    }

    req.intento = intento;
    next();
  };
}

/**
 * Lo que la tablet necesita saber para decidir qué pintar. Nunca incluye nada
 * de lo que se deduzca una respuesta correcta.
 */
export function estadoDeIntento(db, intento) {
  const sesion = db.prepare('SELECT * FROM sesiones WHERE id = ?').get(intento.sesion_id);
  const estudiante = db
    .prepare('SELECT * FROM estudiantes WHERE codigo = ?')
    .get(intento.codigo_estudiante);

  return {
    intentoId: intento.id,
    estudiante: `${estudiante.nombres} ${estudiante.apellidos}`,
    curso: estudiante.curso,
    sesion: { id: sesion.id, nombre: sesion.nombre, estado: sesion.estado },
    entregado: entregado(intento),
    entregadoEn: intento.entregado_en,
    nPreguntas: sesion.n_preguntas,
    segundosMinimosPregunta: sesion.segundos_minimos_pregunta,
  };
}
