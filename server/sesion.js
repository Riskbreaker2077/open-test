import { randomBytes } from 'node:crypto';

// Las sesiones viven en memoria: el servidor es un proceso que el docente abre
// por la mañana y cierra por la tarde. Reiniciarlo cierra su sesión, que es lo
// esperable, y evita una tabla y un barrido en la base.
const sesiones = new Map();

export const NOMBRE_COOKIE = 'opentest_docente';
export const DURACION_MS = 12 * 60 * 60 * 1000; // Una jornada escolar larga.

export function crearSesion(ahora = Date.now()) {
  const id = randomBytes(32).toString('hex');
  sesiones.set(id, { creada: ahora, expira: ahora + DURACION_MS });
  return id;
}

export function validarSesion(id, ahora = Date.now()) {
  if (typeof id !== 'string' || id.length === 0) return false;

  const sesion = sesiones.get(id);
  if (!sesion) return false;

  if (sesion.expira <= ahora) {
    sesiones.delete(id);
    return false;
  }
  return true;
}

export function destruirSesion(id) {
  return sesiones.delete(id);
}

export function limpiarCaducadas(ahora = Date.now()) {
  let borradas = 0;
  for (const [id, sesion] of sesiones) {
    if (sesion.expira <= ahora) {
      sesiones.delete(id);
      borradas += 1;
    }
  }
  return borradas;
}

/** Solo para tests: deja el almacén vacío. */
export function _reiniciar() {
  sesiones.clear();
}
