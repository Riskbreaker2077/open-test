import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

// Parámetros explícitos: el coste tiene que ser una decisión visible, no un
// valor por defecto que cambie con la versión de Node.
const PARAMS = { N: 16384, r: 8, p: 1 };
const LONGITUD_CLAVE = 64;

export const LONGITUD_MINIMA = 6;

export function derivar(contrasena, salt) {
  return scryptSync(contrasena, salt, LONGITUD_CLAVE, PARAMS);
}

function leerConfig(db, clave) {
  return db.prepare('SELECT valor FROM config WHERE clave = ?').get(clave)?.valor ?? null;
}

function escribirConfig(db, clave, valor) {
  db.prepare(
    'INSERT INTO config (clave, valor) VALUES (?, ?) ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor',
  ).run(clave, valor);
}

export function hayContrasena(db) {
  return leerConfig(db, 'docente_hash') !== null;
}

/**
 * Fija la contraseña del panel. La sal es por instalación, así que la misma
 * contraseña en dos colegios produce hashes distintos.
 */
export function establecerContrasena(db, contrasena) {
  if (typeof contrasena !== 'string' || contrasena.length < LONGITUD_MINIMA) {
    throw new Error(`La contraseña debe tener al menos ${LONGITUD_MINIMA} caracteres.`);
  }

  const salt = randomBytes(16);
  const hash = derivar(contrasena, salt);

  db.transaction(() => {
    escribirConfig(db, 'docente_salt', salt.toString('hex'));
    escribirConfig(db, 'docente_hash', hash.toString('hex'));
  })();
}

/** Comparación en tiempo constante: una respuesta más rápida no debe delatar nada. */
export function verificar(db, contrasena) {
  const hashGuardado = leerConfig(db, 'docente_hash');
  const saltGuardado = leerConfig(db, 'docente_salt');
  if (!hashGuardado || !saltGuardado) return false;
  if (typeof contrasena !== 'string' || contrasena.length === 0) return false;

  const esperado = Buffer.from(hashGuardado, 'hex');
  const obtenido = derivar(contrasena, Buffer.from(saltGuardado, 'hex'));
  return esperado.length === obtenido.length && timingSafeEqual(esperado, obtenido);
}

export function cambiarContrasena(db, actual, nueva) {
  if (!verificar(db, actual)) throw new Error('La contraseña actual no es correcta.');
  establecerContrasena(db, nueva);
}
