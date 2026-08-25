import { Router } from 'express';
import {
  cambiarContrasena,
  establecerContrasena,
  hayContrasena,
  verificar,
} from '../services/auth.js';
import { crearSesion, destruirSesion, DURACION_MS, NOMBRE_COOKIE } from '../sesion.js';
import { haySesionDocente } from '../middleware/protegido.js';

// Espera creciente por IP. Frena probar contraseñas a ciegas desde una tablet
// sin llegar a bloquear: un bloqueo duro dejaría a cualquier estudiante con el
// poder de echar al docente de su propio panel a mitad de examen.
const fallos = new Map();
const ESPERA_BASE_MS = 1000;
const ESPERA_MAXIMA_MS = 30_000;

function esperaDe(ip) {
  const registro = fallos.get(ip);
  if (!registro) return 0;
  const espera = Math.min(ESPERA_BASE_MS * 2 ** (registro.contador - 1), ESPERA_MAXIMA_MS);
  const transcurrido = Date.now() - registro.ultimo;
  return Math.max(0, espera - transcurrido);
}

function anotarFallo(ip) {
  const registro = fallos.get(ip) ?? { contador: 0, ultimo: 0 };
  registro.contador += 1;
  registro.ultimo = Date.now();
  fallos.set(ip, registro);
}

export function _reiniciarLimitador() {
  fallos.clear();
}

function ponerCookie(res, id) {
  res.cookie(NOMBRE_COOKIE, id, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: DURACION_MS,
    path: '/',
  });
}

export function rutasAuth(db) {
  const router = Router();

  // Le dice a la pantalla de entrada si toca crear la contraseña o pedirla.
  router.get('/estado', (req, res) => {
    res.json({
      ok: true,
      configurado: hayContrasena(db),
      autenticado: haySesionDocente(req),
    });
  });

  router.post('/establecer', (req, res) => {
    if (hayContrasena(db)) {
      return res
        .status(409)
        .json({ ok: false, mensaje: 'Este equipo ya tiene una contraseña configurada.' });
    }

    try {
      establecerContrasena(db, req.body?.contrasena);
    } catch (err) {
      return res.status(400).json({ ok: false, mensaje: err.message });
    }

    ponerCookie(res, crearSesion());
    res.json({ ok: true });
  });

  router.post('/entrar', (req, res) => {
    const ip = req.ip ?? 'desconocida';
    const espera = esperaDe(ip);
    if (espera > 0) {
      return res.status(429).json({
        ok: false,
        mensaje: `Demasiados intentos. Espera ${Math.ceil(espera / 1000)} segundos.`,
      });
    }

    if (!verificar(db, req.body?.contrasena)) {
      anotarFallo(ip);
      // El mismo mensaje tanto si no hay contraseña configurada como si es
      // incorrecta: no revelamos en qué estado está el equipo.
      return res.status(401).json({ ok: false, mensaje: 'Contraseña incorrecta.' });
    }

    fallos.delete(ip);
    ponerCookie(res, crearSesion());
    res.json({ ok: true });
  });

  router.post('/salir', (req, res) => {
    destruirSesion(req.cookies?.[NOMBRE_COOKIE]);
    res.clearCookie(NOMBRE_COOKIE, { path: '/' });
    res.json({ ok: true });
  });

  router.post('/cambiar', (req, res) => {
    if (!haySesionDocente(req)) {
      return res.status(401).json({ ok: false, mensaje: 'Necesitas iniciar sesión como docente.' });
    }

    try {
      cambiarContrasena(db, req.body?.actual, req.body?.nueva);
    } catch (err) {
      return res.status(400).json({ ok: false, mensaje: err.message });
    }
    res.json({ ok: true });
  });

  return router;
}
