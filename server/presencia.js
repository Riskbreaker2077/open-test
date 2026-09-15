// La conexión de cada tablet vive en memoria, igual que las sesiones del
// docente: es un dato de este instante que no se exporta ni debe sobrevivir a
// un reinicio. Ninguna tablet avisa al cerrarse o perder el wifi, así que se
// detecta por silencio: el examen late cada 2 s y la sala de espera consulta cada 2 s.
const vistos = new Map();

/**
 * Tres latidos seguidos perdidos (036). Más bajo daría rojos falsos con cualquier
 * parpadeo del wifi; más alto haría que el rojo llegara tarde a la proyección.
 */
export const UMBRAL_MS = 6 * 1000;

export function marcarVisto(intentoId, ahora = Date.now()) {
  vistos.set(intentoId, ahora);
}

export function marcarSalida(intentoId) {
  vistos.delete(intentoId);
}

export function estaConectado(intentoId, ahora = Date.now()) {
  const visto = vistos.get(intentoId);
  return visto !== undefined && ahora - visto <= UMBRAL_MS;
}

/** Solo para tests: deja el almacén vacío. */
export function _reiniciar() {
  vistos.clear();
}
