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
 * Reparte `total` cupos entre grupos de tamaño `tamanosPorGrupo`, en
 * proporción al tamaño de cada grupo dentro del banco (método del resto
 * mayor: primero la parte entera de la cuota, y lo que sobra se lo lleva
 * quien tenga el resto más alto). Ningún grupo recibe más cupos de los que
 * tiene preguntas.
 */
export function cuotasPorCompetencia(tamanosPorGrupo, total) {
  const nombres = [...tamanosPorGrupo.keys()].sort();
  const totalBanco = nombres.reduce((suma, nombre) => suma + tamanosPorGrupo.get(nombre), 0);

  const grupos = nombres.map((nombre) => {
    const tamano = tamanosPorGrupo.get(nombre);
    const cuotaExacta = totalBanco === 0 ? 0 : (tamano / totalBanco) * total;
    const entero = Math.min(tamano, Math.floor(cuotaExacta));
    return { nombre, tamano, entero, resto: cuotaExacta - entero };
  });

  let asignado = grupos.reduce((suma, grupo) => suma + grupo.entero, 0);
  const porResto = [...grupos].sort((a, b) => b.resto - a.resto || a.nombre.localeCompare(b.nombre));
  for (const grupo of porResto) {
    if (asignado >= total) break;
    if (grupo.entero < grupo.tamano) {
      grupo.entero += 1;
      asignado += 1;
    }
  }
  // Puede sobrar cupo por asignar si el resto mayor tocó un grupo ya lleno;
  // se completa con cualquier grupo que todavía tenga preguntas disponibles.
  while (asignado < total) {
    const conCupo = grupos.find((grupo) => grupo.entero < grupo.tamano);
    if (!conCupo) break;
    conCupo.entero += 1;
    asignado += 1;
  }

  return new Map(grupos.map((grupo) => [grupo.nombre, grupo.entero]));
}

/**
 * @param preguntas   [{ id, opciones: [{ id }], competencia? }] — el banco entero.
 *                    `competencia` es opcional: sin ella (o en un banco anterior
 *                    a la 016, donde queda en blanco) todo el banco cae en un
 *                    único grupo y el sorteo es puramente al azar, como antes.
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

  const grupos = new Map();
  for (const pregunta of preguntas) {
    const clave = pregunta.competencia ?? '';
    if (!grupos.has(clave)) grupos.set(clave, []);
    grupos.get(clave).push(pregunta);
  }
  const tamanos = new Map([...grupos].map(([clave, del]) => [clave, del.length]));
  const cuotas = cuotasPorCompetencia(tamanos, nPreguntas);

  const seleccionadas = [...cuotas].flatMap(([clave, cuota]) => muestrear(grupos.get(clave), cuota, prng));

  return barajar(seleccionadas, prng).map((pregunta, i) => ({
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
