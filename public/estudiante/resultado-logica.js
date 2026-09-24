// Lógica pura de la pantalla de resultado (031). Sin DOM, para poder
// probarla con node:test.

export const ETIQUETAS = {
  acertada: 'Acertada',
  fallada: 'Fallada',
  saltada: 'Saltada',
  sin_llegar: 'No alcanzaste a verla',
};

/** Todas acertadas. `aciertos` y `total` vienen en todos los niveles. */
export function esPerfecto(resultado) {
  return Number(resultado?.total) > 0 && resultado.aciertos === resultado.total;
}

/** Verde, rojo o gris: saltada y sin llegar comparten el gris. */
export function colorDePunto(estado) {
  if (estado === 'acertada') return 'verde';
  if (estado === 'fallada') return 'rojo';
  return 'gris';
}

export function etiquetaDeEstado(estado) {
  return ETIQUETAS[estado] ?? 'Sin información';
}

export const hashDePregunta = (orden) => `#pregunta-${orden}`;

/** Orden de la pregunta pedida en el hash, o null si el hash no nombra una existente. */
export function ordenDesdeHash(hash, ordenes) {
  const coincidencia = /^#pregunta-(\d+)$/.exec(hash ?? '');
  if (!coincidencia) return null;
  const orden = Number(coincidencia[1]);
  return ordenes.includes(orden) ? orden : null;
}

// Mensajes de la celebración del puntaje perfecto (031).
export const MENSAJES_PERFECTO = [
  'Excellent!',
  'Felicitaciones',
  '¡Buena!',
  '¡Increíble!',
  '¡Magnánimo!',
  '¡Máaaaagicoooo!',
  'Cooooooool',
  'Me encanta <3',
  '¡El/La mejor!',
  'Booooonoooo para empanadaaaaa',
];

/** FNV-1a de 32 bits: reparte bien cadenas cortas y es estable entre navegadores. */
function hash(texto) {
  let h = 0x811c9dc5;
  for (const caracter of texto) {
    h ^= caracter.codePointAt(0);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h;
}

/**
 * Mensaje "al azar" pero fijo para cada entrega: se deriva de datos que no
 * cambian tras entregar, así el estudiante ve siempre el mismo al volver.
 */
export function mensajeDeFelicitacion(resultado) {
  const semilla = `${resultado?.estudiante ?? ''}|${resultado?.sesion ?? ''}|${resultado?.entregadoEn ?? ''}`;
  return MENSAJES_PERFECTO[hash(semilla) % MENSAJES_PERFECTO.length];
}
