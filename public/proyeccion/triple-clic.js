/**
 * Cuenta clics seguidos por estudiante para el gesto de anular (042).
 *
 * Cuenta por clave y no por elemento: el tablero se reconstruye cada vez que
 * cambia la asistencia, así que el cuadro sobre el que cayó el primer clic
 * puede no ser el mismo nodo que recibe el tercero.
 */
export function crearContadorDeClics({ clics = 3, ventanaMs = 600 } = {}) {
  let ultimaClave = null;
  let ultimoInstante = -Infinity;
  let cuenta = 0;

  /** Registra un clic y devuelve `true` cuando completa la serie. */
  return function registrar(clave, instante) {
    const seguido = clave === ultimaClave && instante - ultimoInstante <= ventanaMs;
    cuenta = seguido ? cuenta + 1 : 1;
    ultimaClave = clave;
    ultimoInstante = instante;
    if (cuenta < clics) return false;
    // La serie se consume: un cuarto clic empieza una nueva, no reabre el cuadro.
    ultimaClave = null;
    cuenta = 0;
    return true;
  };
}
