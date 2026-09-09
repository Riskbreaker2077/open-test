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
 * @param preguntas   [{ id, opciones: [{ id }], competencia?, grupo_id? }] — el banco entero.
 *                    `competencia` es opcional: sin ella (o en un banco anterior
 *                    a la 016, donde queda en blanco) todo el banco cae en un
 *                    único grupo y el sorteo es puramente al azar, como antes.
 *                    `grupo_id`, presente desde la 026, marca a una pregunta
 *                    como miembro de un grupo; el muestreador trata un grupo
 *                    como una unidad indivisible: si entra una pregunta del
 *                    grupo, entran todas, y la cuota por competencia se reparte
 *                    por el peso del grupo (cantidad de miembros).
 * @param nPreguntas  cuántas sortear
 * @param semilla     determina íntegramente el resultado
 * @returns [{ orden, preguntaId, ordenOpciones: [idOpcion|banco_id] }]
 */
export function generarPrueba({ preguntas, nPreguntas, semilla }) {
  if (!Array.isArray(preguntas)) throw new Error('Hacen falta las preguntas del banco.');

  // Total de preguntas en el banco contando cada miembro de grupo como 1.
  const totalPreguntas = preguntas.length;
  if (totalPreguntas < nPreguntas) {
    throw Object.assign(
      new Error(
        `El banco tiene ${totalPreguntas} pregunta(s) y la evaluación sortea ${nPreguntas}.`,
      ),
      { estado: 409 },
    );
  }

  const prng = crearPrng(semilla);

  // Cada pregunta standalone es una unidad con peso 1; cada grupo se
  // consolida en una sola unidad con peso = cantidad de miembros, para que
  // entre o salga entero. Las cuotas por competencia reparten `nPreguntas`
  // proporcionalmente al peso total de cada competencia (cada pregunta
  // cuenta como 1; un grupo cuenta como su cantidad de miembros).
  const standalone = [];
  const gruposPorId = new Map();
  for (const pregunta of preguntas) {
    if (pregunta.grupo_id) {
      if (!gruposPorId.has(pregunta.grupo_id)) {
        gruposPorId.set(pregunta.grupo_id, []);
      }
      gruposPorId.get(pregunta.grupo_id).push(pregunta);
    } else {
      standalone.push(pregunta);
    }
  }

  const unidades = [];
  for (const pregunta of standalone) {
    unidades.push({
      competencia: pregunta.competencia ?? '',
      peso: 1,
      miembros: [pregunta],
    });
  }
  for (const miembros of gruposPorId.values()) {
    unidades.push({
      competencia: miembros[0].competencia ?? '',
      peso: miembros.length,
      miembros,
    });
  }

  const pesosPorCompetencia = new Map();
  for (const u of unidades) {
    pesosPorCompetencia.set(
      u.competencia,
      (pesosPorCompetencia.get(u.competencia) ?? 0) + u.peso,
    );
  }

  // `cuotasPorCompetencia` reparte `nPreguntas` entre los grupos por peso.
  // Eso puede pedir más unidades de las que hay (cap improbable pero posible
  // si una competencia tiene muy poco peso); se trunca al techo.
  const cuotas = cuotasPorCompetencia(pesosPorCompetencia, nPreguntas);

  // Para cada competencia, sortea unidades hasta sumar la cuota en peso.
  const seleccionadas = [];
  for (const [competencia, cupoEnUnidades] of cuotas) {
    const candidatas = unidades.filter((u) => u.competencia === competencia);
    const elegidas = muestrearUnidades(candidatas, cupoEnUnidades, prng);
    for (const u of elegidas) {
      for (const m of u.miembros) seleccionadas.push(m);
    }
  }

  // Si las cuotas suman menos de nPreguntas (porque un grupo consumió
  // sobrantes o una cuota se truncó), agregamos unidades al azar hasta
  // llegar al total — pero sin pasarnos: un grupo que ya no cabe entero
  // se omite antes que partirlo.
  while (seleccionadas.length < nPreguntas) {
    const restantes = preguntas.filter((p) => !seleccionadas.includes(p));
    if (restantes.length === 0) break;
    const candidato = muestrear(restantes, 1, prng)[0];
    if (!candidato) break;
    const hermanos = candidato.grupo_id
      ? preguntas.filter((p) => p.grupo_id === candidato.grupo_id && !seleccionadas.includes(p))
      : [];
    if (seleccionadas.length + 1 + hermanos.length > nPreguntas) break;
    seleccionadas.push(candidato);
    for (const hermano of hermanos) seleccionadas.push(hermano);
  }

  return barajar(seleccionadas, prng).map((pregunta, i) => ({
    orden: i + 1,
    preguntaId: pregunta.id,
    ordenOpciones: barajar(pregunta.opciones.map((o) => o.id), prng),
  }));
}

/**
 * Sortea unidades de un banco hasta sumar `cupo` puntos de peso, sin
 * partir unidades: si la siguiente no entra, se omite.
 *
 * Los grupos (peso = cantidad de miembros) entran antes que las preguntas
 * standalone (peso = 1) cuando caben: así un grupo nunca queda partido y
 * las standalone rellenan lo que sobra del cupo. Dentro de cada categoría
 * el orden es aleatorio.
 */
function muestrearUnidades(unidades, cupo, prng) {
  const grupos = unidades.filter((u) => u.miembros.length > 1);
  const standalone = unidades.filter((u) => u.miembros.length === 1);

  const gruposBarajados = barajar(grupos, prng);
  const standaloneBarajados = barajar(standalone, prng);

  const elegidas = [];
  let pesoAcumulado = 0;
  for (const unidad of gruposBarajados) {
    if (pesoAcumulado + unidad.peso <= cupo) {
      elegidas.push(unidad);
      pesoAcumulado += unidad.peso;
    }
  }
  for (const unidad of standaloneBarajados) {
    if (pesoAcumulado + unidad.peso <= cupo) {
      elegidas.push(unidad);
      pesoAcumulado += unidad.peso;
    }
  }
  return elegidas;
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
