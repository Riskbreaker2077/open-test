import { crearPrng } from './prng.js';

/**
 * El mecanismo que resuelve el problema del encargo: a partir de la semilla de
 * un intento decide qué preguntas le tocan a ese estudiante y en qué orden van
 * sus opciones.
 *
 * Módulo puro, sin base de datos: es lo que permite probarlo con miles de
 * iteraciones, y aquí los tests valen más que en ninguna otra parte.
 */

/**
 * Fisher-Yates. El `sort(() => Math.random() - 0.5)` que suele escribirse en
 * su lugar produce permutaciones sesgadas: sobre cuatro opciones, eso haría
 * que la correcta cayera más en unas posiciones que en otras, que es
 * exactamente lo que un estudiante espabilado detecta.
 */
export function barajar(elementos, prng) {
  const copia = [...elementos];

  for (let i = copia.length - 1; i > 0; i -= 1) {
    const j = Math.floor(prng() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

/** Muestreo sin reemplazo: barajado parcial y corte. Nunca repite. */
export function muestrear(elementos, cuantos, prng) {
  const copia = [...elementos];
  const total = Math.min(cuantos, copia.length);

  for (let i = 0; i < total; i += 1) {
    const j = i + Math.floor(prng() * (copia.length - i));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia.slice(0, total);
}

/**
 * @param preguntas   [{ id, opciones: [{ id }] }] — el banco entero
 * @param nPreguntas  cuántas sortear
 * @param semilla     determina íntegramente el resultado
 * @returns [{ orden, preguntaId, ordenOpciones: [idOpcion] }]
 */
export function generarPrueba({ preguntas, nPreguntas, semilla }) {
  if (!Array.isArray(preguntas)) throw new Error('Hacen falta las preguntas del banco.');

  if (preguntas.length < nPreguntas) {
    throw Object.assign(
      new Error(
        `El banco tiene ${preguntas.length} pregunta(s) y la evaluación sortea ${nPreguntas}.`,
      ),
      { estado: 409 },
    );
  }

  const prng = crearPrng(semilla);

  return muestrear(preguntas, nPreguntas, prng).map((pregunta, i) => ({
    orden: i + 1,
    preguntaId: pregunta.id,
    ordenOpciones: barajar(pregunta.opciones.map((o) => o.id), prng),
  }));
}

/**
 * Cuántas preguntas compartirán, de media, dos estudiantes cualesquiera.
 * Sirve para que el docente vea el efecto del tamaño de su banco **antes** de
 * abrir la evaluación, en lugar de descubrirlo después.
 */
export function solapamientoEsperado(tamanoBanco, nPreguntas) {
  if (!tamanoBanco || tamanoBanco < nPreguntas) return nPreguntas;
  return (nPreguntas * nPreguntas) / tamanoBanco;
}
