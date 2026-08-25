/**
 * Generador de números pseudoaleatorios **con semilla**.
 *
 * `Math.random()` no acepta semilla, y sin semilla no hay reproducibilidad:
 * ni se puede reanudar un examen caído sin regenerar otra prueba distinta, ni
 * se puede auditar meses después qué vio exactamente un estudiante. No hace
 * falta calidad criptográfica —solo hay que repartir preguntas—, así que
 * mulberry32 con un hash xmur3 delante es de sobra y cabe en veinte líneas.
 */

/** Hash de la cadena semilla a un entero de 32 bits. */
function xmur3(texto) {
  let h = 1779033703 ^ texto.length;

  for (let i = 0; i < texto.length; i += 1) {
    h = Math.imul(h ^ texto.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }

  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return h >>> 0;
  };
}

function mulberry32(estado) {
  let a = estado;

  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Devuelve una función `() => [0, 1)` determinista para esa semilla. */
export function crearPrng(semilla) {
  return mulberry32(xmur3(String(semilla))());
}
