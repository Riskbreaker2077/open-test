import { NOMBRE_COOKIE, validarSesion } from '../sesion.js';

/** Parseo de cookies sin dependencia: solo necesitamos leer una. */
export function leerCookies(cabecera = '') {
  const cookies = {};
  for (const parte of cabecera.split(';')) {
    const corte = parte.indexOf('=');
    if (corte < 0) continue;
    const nombre = parte.slice(0, corte).trim();
    if (!nombre) continue;
    try {
      cookies[nombre] = decodeURIComponent(parte.slice(corte + 1).trim());
    } catch {
      cookies[nombre] = parte.slice(corte + 1).trim();
    }
  }
  return cookies;
}

export function cookies(req, res, next) {
  req.cookies = leerCookies(req.headers.cookie ?? '');
  next();
}

export function haySesionDocente(req) {
  return validarSesion(req.cookies?.[NOMBRE_COOKIE]);
}

/** Para /api/docente/*: responde 401 en JSON. */
export function protegerApi(req, res, next) {
  if (haySesionDocente(req)) return next();
  res.status(401).json({ ok: false, mensaje: 'Necesitas iniciar sesión como docente.' });
}

/**
 * Para las páginas de /docente y /proyeccion: lleva al inicio de sesión.
 * La página de entrada queda fuera, o no habría forma de llegar a ella.
 */
const ABIERTAS = new Set(['/entrar.html', '/entrar.js']);

export function protegerPaginas(req, res, next) {
  if (ABIERTAS.has(req.path) || haySesionDocente(req)) return next();
  res.redirect('/docente/entrar.html');
}
