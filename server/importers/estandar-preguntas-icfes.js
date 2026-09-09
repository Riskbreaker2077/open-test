// Validador de referencia del estándar externo "preguntas-icfes" v1.4.0
// (https://github.com/riskbreaker2077/preguntas-icfes), copiado tal cual
// porque es JavaScript puro sin dependencias. Si el estándar sube de
// versión, este archivo se reemplaza entero por la nueva copia; no se edita
// a mano para no perder la sincronía con la fuente.
//
// server/importers/preguntas.js es quien lo usa para validar el contenido de
// un banco de preguntas antes de guardarlo.

const TIPOS_BLOQUE = new Set(["texto", "imagen", "tabla"]);
const TIPOS_GRUPO = new Set(["contexto_compartido", "banco_opciones", "texto_con_blancos"]);
const TIPO_ITEM_ESPERADO_POR_GRUPO = {
  contexto_compartido: "estandar",
  banco_opciones: "miembro_banco_opciones",
  texto_con_blancos: "miembro_texto_con_blancos",
};
const NIVELES_MCER = new Set(["Pre A1", "A1", "A2", "B1", "B2", "C1", "C2"]);

function error(errores, pregunta_id, campo, mensaje) {
  errores.push({ pregunta_id, campo, mensaje });
}

function esStringNoVacio(valor) {
  return typeof valor === "string" && valor.trim().length > 0;
}

// Compara dos SemVer "x.y.z" numéricamente (no lexicográficamente: "1.10.0"
// > "1.2.0"). Devuelve <0, 0 o >0, como Array.prototype.sort.
function compararVersiones(a, b) {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    if (pa[i] !== pb[i]) return pa[i] - pb[i];
  }
  return 0;
}

// Versión mínima del estándar que exige el conjunto de campos que trae una
// pregunta, aunque la pregunta misma no declare "version_estandar". Se usa
// para (a) el mensaje de ayuda de migración y (b) rechazar un
// "version_estandar" declarado que sea menor de lo que la pregunta necesita.
// Cada entrada corresponde a un campo introducido en una versión menor
// concreta del estándar (ver CHANGELOG.md) — mantener sincronizado si se
// agregan campos nuevos en el futuro.
function calcularVersionMinima(pregunta) {
  let minima = "1.0.0";
  const exige = (v) => {
    if (compararVersiones(v, minima) > 0) minima = v;
  };

  if (
    pregunta?.grado !== undefined ||
    pregunta?.prueba !== undefined ||
    pregunta?.procedencia !== undefined ||
    pregunta?.verificado !== undefined ||
    pregunta?.fuentes !== undefined
  ) {
    exige("1.1.0");
  }
  if (
    Array.isArray(pregunta?.opciones) &&
    pregunta.opciones.some((o) => o?.procedencia_justificacion !== undefined || o?.justificacion_verificada !== undefined)
  ) {
    exige("1.1.0");
  }
  if (
    pregunta?.grupo_id !== undefined ||
    pregunta?.tipo_item !== undefined ||
    pregunta?.nivel_mcer !== undefined ||
    pregunta?.valor !== undefined
  ) {
    exige("1.2.0");
  }
  if (Array.isArray(pregunta?.opciones) && pregunta.opciones.length >= 2 && pregunta.opciones.length !== 4) {
    exige("1.2.0");
  }

  return minima;
}

function validarBloque(bloque, ruta, preguntaId, campo, errores, nombresImagenes) {
  if (typeof bloque !== "object" || bloque === null || Array.isArray(bloque)) {
    error(errores, preguntaId, campo, `${ruta}: debe ser un objeto de bloque.`);
    return;
  }
  if (!TIPOS_BLOQUE.has(bloque.tipo)) {
    error(
      errores,
      preguntaId,
      campo,
      `${ruta}: tipo de bloque "${bloque.tipo}" no reconocido. Debe ser "texto", "imagen" o "tabla".`
    );
    return;
  }
  if (bloque.tipo === "texto") {
    if (!esStringNoVacio(bloque.texto)) {
      error(errores, preguntaId, campo, `${ruta}: el bloque de texto no puede estar vacío.`);
    }
  } else if (bloque.tipo === "imagen") {
    if (!esStringNoVacio(bloque.archivo)) {
      error(errores, preguntaId, campo, `${ruta}: falta "archivo" en el bloque de imagen.`);
    } else {
      nombresImagenes.add(bloque.archivo);
    }
  } else if (bloque.tipo === "tabla") {
    if (!Array.isArray(bloque.encabezados) || bloque.encabezados.length === 0) {
      error(errores, preguntaId, campo, `${ruta}: la tabla necesita al menos un encabezado.`);
      return;
    }
    if (!Array.isArray(bloque.filas)) {
      error(errores, preguntaId, campo, `${ruta}: "filas" debe ser un array.`);
      return;
    }
    bloque.filas.forEach((fila, i) => {
      if (!Array.isArray(fila) || fila.length !== bloque.encabezados.length) {
        error(
          errores,
          preguntaId,
          campo,
          `${ruta}: la fila ${i + 1} tiene ${Array.isArray(fila) ? fila.length : "?"} columnas, ` +
            `pero hay ${bloque.encabezados.length} encabezados. Todas las filas deben ser rectangulares.`
        );
      }
    });
  }
}

function validarArrayDeBloques(bloques, ruta, preguntaId, campo, errores, nombresImagenes) {
  if (!Array.isArray(bloques)) {
    error(errores, preguntaId, campo, `${ruta}: debe ser un array de bloques.`);
    return;
  }
  bloques.forEach((bloque, i) => {
    validarBloque(bloque, `${ruta}[${i}]`, preguntaId, campo, errores, nombresImagenes);
  });
}

const CAMPOS_METADATA = [
  "competencia",
  "componente",
  "afirmacion",
  "evidencia",
  "estandar_asociado",
  "que_evalua",
];

const BUCKETS_PROCEDENCIA = ["contenido", "clasificacion", "respuesta_correcta"];

function validarFuentes(pregunta, preguntaId, errores, nombresFuentes) {
  const fuentes = pregunta?.fuentes;
  if (fuentes === undefined) return;
  for (const bucket of BUCKETS_PROCEDENCIA) {
    const archivo = fuentes[bucket];
    if (archivo === undefined) continue;
    if (!esStringNoVacio(archivo)) {
      error(errores, preguntaId, "fuentes", `Pregunta ${preguntaId}: "fuentes.${bucket}" no puede estar vacío.`);
      continue;
    }
    nombresFuentes.add(archivo);
  }
}

// Valida un grupo de preguntas (paquete.grupos[i]). A diferencia de una
// pregunta suelta, un grupo no tiene "pregunta_id" propio en los errores que
// reporta (pregunta_id: null) porque no es una pregunta — es el contenedor
// de contexto/banco/pasaje compartido que una o más preguntas referencian
// vía "grupo_id".
function validarGrupo(grupo, indice, errores, nombresImagenes, nombresFuentes, idsGrupoVistos) {
  const grupoId = esStringNoVacio(grupo?.id) ? grupo.id : `#${indice + 1}`;

  if (!esStringNoVacio(grupo?.id)) {
    error(errores, null, "grupos", `Grupo en posición ${indice + 1}: falta "id".`);
  } else if (idsGrupoVistos.has(grupo.id)) {
    error(errores, null, "grupos", `El id de grupo "${grupo.id}" está repetido; debe ser único en el paquete.`);
  } else {
    idsGrupoVistos.add(grupo.id);
  }

  if (!TIPOS_GRUPO.has(grupo?.tipo)) {
    error(
      errores,
      null,
      "grupos",
      `Grupo ${grupoId}: tipo "${grupo?.tipo}" no reconocido. Debe ser "contexto_compartido", "banco_opciones" o "texto_con_blancos".`
    );
    return;
  }

  validarArrayDeBloques(grupo.contexto ?? [], `grupos[${grupoId}].contexto`, null, "grupos", errores, nombresImagenes);

  if (grupo.tipo === "banco_opciones") {
    if (!Array.isArray(grupo.banco) || grupo.banco.length < 2) {
      error(errores, null, "grupos", `Grupo ${grupoId}: "banco" necesita al menos 2 entradas.`);
    } else {
      const idsBanco = new Set();
      grupo.banco.forEach((entrada, i) => {
        const entradaRef = esStringNoVacio(entrada?.id) ? entrada.id : `#${i + 1}`;
        if (!esStringNoVacio(entrada?.id)) {
          error(errores, null, "grupos", `Grupo ${grupoId}, entrada de banco en posición ${i + 1}: falta "id".`);
        } else if (idsBanco.has(entrada.id)) {
          error(errores, null, "grupos", `Grupo ${grupoId}: el id de banco "${entrada.id}" está repetido.`);
        } else {
          idsBanco.add(entrada.id);
        }
        if (!Array.isArray(entrada?.contenido) || entrada.contenido.length === 0) {
          error(errores, null, "grupos", `Grupo ${grupoId}, entrada de banco "${entradaRef}": "contenido" no puede estar vacío.`);
        } else {
          validarArrayDeBloques(entrada.contenido, `grupos[${grupoId}].banco[${entradaRef}]`, null, "grupos", errores, nombresImagenes);
        }
      });
    }
  }

  if (grupo.metadata_pedagogica !== undefined) {
    for (const campo of CAMPOS_METADATA) {
      if (!esStringNoVacio(grupo.metadata_pedagogica?.[campo])) {
        error(errores, null, "grupos", `Grupo ${grupoId}: "metadata_pedagogica.${campo}" falta o está vacío.`);
      }
    }
  }

  if (esStringNoVacio(grupo.fuentes_contenido)) {
    nombresFuentes.add(grupo.fuentes_contenido);
  }
}

// Valida las opciones de una pregunta (rama "estandar" o
// "miembro_texto_con_blancos" — ambas tienen un array de opciones propio con
// la misma forma). Antes de v1.2.0 exigía exactamente 4; ahora exige al
// menos 2, sin tope superior.
function validarOpciones(pregunta, preguntaId, errores, nombresImagenes) {
  const opciones = Array.isArray(pregunta?.opciones) ? pregunta.opciones : [];
  if (opciones.length < 2) {
    error(
      errores,
      preguntaId,
      "opciones",
      `Pregunta ${preguntaId}: tiene ${opciones.length} opciones; debe tener al menos 2.`
    );
  }

  let correctas = 0;
  opciones.forEach((opcion, i) => {
    const opcionRef = esStringNoVacio(opcion?.id) ? opcion.id : `#${i + 1}`;
    const campo = `opciones[${opcionRef}]`;

    if (!esStringNoVacio(opcion?.id)) {
      error(errores, preguntaId, campo, `Pregunta ${preguntaId}, opción en posición ${i + 1}: falta "id".`);
    }
    if (typeof opcion?.es_correcta !== "boolean") {
      error(errores, preguntaId, campo, `Pregunta ${preguntaId}, opción ${opcionRef}: "es_correcta" debe ser true o false.`);
    } else if (opcion.es_correcta) {
      correctas += 1;
    }
    if (!esStringNoVacio(opcion?.justificacion)) {
      error(
        errores,
        preguntaId,
        campo,
        `Pregunta ${preguntaId}, opción ${opcionRef}: falta "justificacion" (obligatoria incluso si es incorrecta).`
      );
    }
    if (!Array.isArray(opcion?.contenido) || opcion.contenido.length === 0) {
      error(errores, preguntaId, campo, `Pregunta ${preguntaId}, opción ${opcionRef}: "contenido" no puede estar vacío.`);
    } else {
      validarArrayDeBloques(opcion.contenido, campo, preguntaId, campo, errores, nombresImagenes);
    }
  });

  if (opciones.length >= 2 && correctas !== 1) {
    error(
      errores,
      preguntaId,
      "opciones",
      `Pregunta ${preguntaId}: tiene ${correctas} opciones marcadas como correctas; debe tener exactamente 1.`
    );
  }
}

function validarPregunta(pregunta, indice, errores, nombresImagenes, idsVistos, nombresFuentes, gruposPorId) {
  const preguntaId = esStringNoVacio(pregunta?.id) ? pregunta.id : `#${indice + 1}`;

  if (!esStringNoVacio(pregunta?.id)) {
    error(errores, preguntaId, "id", `Pregunta en posición ${indice + 1}: falta "id".`);
  } else if (idsVistos.has(pregunta.id)) {
    error(errores, preguntaId, "id", `El id "${pregunta.id}" está repetido; debe ser único en el paquete.`);
  } else {
    idsVistos.add(pregunta.id);
  }

  // Resolución del grupo (si aplica) — antes de todo lo demás, porque la
  // metadata pedagógica y la forma esperada de la pregunta dependen de él.
  let grupo;
  if (pregunta?.grupo_id != null) {
    if (!esStringNoVacio(pregunta.grupo_id)) {
      error(errores, preguntaId, "grupo_id", `Pregunta ${preguntaId}: "grupo_id" no puede estar vacío.`);
    } else {
      grupo = gruposPorId.get(pregunta.grupo_id);
      if (!grupo) {
        error(
          errores,
          preguntaId,
          "grupo_id",
          `Pregunta ${preguntaId}: "grupo_id" referencia "${pregunta.grupo_id}", que no existe en paquete.grupos.`
        );
      }
    }
  }

  const tipoItem = pregunta?.tipo_item ?? "estandar";

  if (grupo) {
    const esperado = TIPO_ITEM_ESPERADO_POR_GRUPO[grupo.tipo];
    if (esperado && tipoItem !== esperado) {
      error(
        errores,
        preguntaId,
        "tipo_item",
        `Pregunta ${preguntaId}: referencia un grupo de tipo "${grupo.tipo}" pero tiene tipo_item "${tipoItem}"; debe ser "${esperado}".`
      );
    }
  }

  // Metadata pedagógica: valor propio, o heredado de grupo.metadata_pedagogica
  // si la pregunta no trae el suyo. Ausencia de ambos es error.
  for (const campo of CAMPOS_METADATA) {
    const valorPropio = pregunta?.[campo];
    const valorEfectivo = esStringNoVacio(valorPropio) ? valorPropio : grupo?.metadata_pedagogica?.[campo];
    if (!esStringNoVacio(valorEfectivo)) {
      error(
        errores,
        preguntaId,
        campo,
        `Pregunta ${preguntaId}: falta "${campo}" o está vacío (ni propio ni heredado de un grupo).`
      );
    }
  }

  if (pregunta?.nivel_mcer !== undefined && !NIVELES_MCER.has(pregunta.nivel_mcer)) {
    error(errores, preguntaId, "nivel_mcer", `Pregunta ${preguntaId}: "nivel_mcer" no reconocido.`);
  }

  if (pregunta?.valor !== undefined && !(typeof pregunta.valor === "number" && pregunta.valor > 0)) {
    error(errores, preguntaId, "valor", `Pregunta ${preguntaId}: "valor" debe ser un número mayor que 0.`);
  }

  if (pregunta?.version_estandar !== undefined) {
    if (!/^\d+\.\d+\.\d+$/.test(pregunta.version_estandar)) {
      error(
        errores,
        preguntaId,
        "version_estandar",
        `Pregunta ${preguntaId}: "version_estandar" debe seguir SemVer, p. ej. "1.2.0" (recibido: ${JSON.stringify(pregunta.version_estandar)}).`
      );
    } else {
      const minima = calcularVersionMinima(pregunta);
      if (compararVersiones(pregunta.version_estandar, minima) < 0) {
        error(
          errores,
          preguntaId,
          "version_estandar",
          `Pregunta ${preguntaId}: "version_estandar" ("${pregunta.version_estandar}") es menor que "${minima}", la versión mínima que exigen los campos que esta pregunta usa.`
        );
      }
    }
  }

  validarFuentes(pregunta, preguntaId, errores, nombresFuentes);

  validarArrayDeBloques(pregunta?.contexto ?? [], "contexto", preguntaId, "contexto", errores, nombresImagenes);

  if (tipoItem === "miembro_banco_opciones") {
    if (!esStringNoVacio(pregunta?.grupo_id)) {
      error(errores, preguntaId, "grupo_id", `Pregunta ${preguntaId}: tipo_item "miembro_banco_opciones" requiere "grupo_id".`);
    }
    if (pregunta.opciones !== undefined) {
      error(
        errores,
        preguntaId,
        "opciones",
        `Pregunta ${preguntaId}: no debe traer "opciones" propias (tipo_item "miembro_banco_opciones" usa el banco del grupo).`
      );
    }
    if (!Array.isArray(pregunta?.enunciado) || pregunta.enunciado.length === 0) {
      error(errores, preguntaId, "enunciado", `Pregunta ${preguntaId}: "enunciado" no puede estar vacío.`);
    } else {
      validarArrayDeBloques(pregunta.enunciado, "enunciado", preguntaId, "enunciado", errores, nombresImagenes);
    }
    if (!esStringNoVacio(pregunta?.respuesta_pool_id)) {
      error(errores, preguntaId, "respuesta_pool_id", `Pregunta ${preguntaId}: falta "respuesta_pool_id".`);
    } else if (grupo && Array.isArray(grupo.banco)) {
      const entrada = grupo.banco.find((e) => e?.id === pregunta.respuesta_pool_id);
      if (!entrada) {
        error(
          errores,
          preguntaId,
          "respuesta_pool_id",
          `Pregunta ${preguntaId}: "respuesta_pool_id" ("${pregunta.respuesta_pool_id}") no existe en el banco del grupo "${pregunta.grupo_id}".`
        );
      } else if (entrada.es_ejemplo) {
        error(
          errores,
          preguntaId,
          "respuesta_pool_id",
          `Pregunta ${preguntaId}: "respuesta_pool_id" ("${pregunta.respuesta_pool_id}") es el ejemplo resuelto del grupo y no puede ser la respuesta de una pregunta real.`
        );
      }
    }
    if (!esStringNoVacio(pregunta?.justificacion)) {
      error(errores, preguntaId, "justificacion", `Pregunta ${preguntaId}: falta "justificacion".`);
    }
  } else if (tipoItem === "miembro_texto_con_blancos") {
    if (!esStringNoVacio(pregunta?.grupo_id)) {
      error(errores, preguntaId, "grupo_id", `Pregunta ${preguntaId}: tipo_item "miembro_texto_con_blancos" requiere "grupo_id".`);
    }
    if (pregunta.enunciado !== undefined) {
      error(
        errores,
        preguntaId,
        "enunciado",
        `Pregunta ${preguntaId}: no debe traer "enunciado" propio (tipo_item "miembro_texto_con_blancos" usa el pasaje del grupo).`
      );
    }
    if (!Number.isInteger(pregunta?.numero_blanco) || pregunta.numero_blanco < 1) {
      error(errores, preguntaId, "numero_blanco", `Pregunta ${preguntaId}: "numero_blanco" debe ser un entero mayor o igual a 1.`);
    }
    validarOpciones(pregunta, preguntaId, errores, nombresImagenes);
  } else {
    if (!Array.isArray(pregunta?.enunciado) || pregunta.enunciado.length === 0) {
      error(errores, preguntaId, "enunciado", `Pregunta ${preguntaId}: "enunciado" no puede estar vacío.`);
    } else {
      validarArrayDeBloques(pregunta.enunciado, "enunciado", preguntaId, "enunciado", errores, nombresImagenes);
    }
    validarOpciones(pregunta, preguntaId, errores, nombresImagenes);
  }
}

// ---- Numeración dinámica (v1.4.0) ----
// Marcador reservado dentro de un bloque de texto: "{{numero:<id-de-pregunta>}}"
// (p. ej. "the {{numero:in-016}}_______ word matters"). No es un campo nuevo
// del schema — "texto" sigue siendo un string cualquiera — es una convención
// de contenido que este validador sí interpreta: comprueba que cada id
// referenciado exista dentro de paquete.preguntas. Qué número se muestra ahí
// para un estudiante concreto es responsabilidad de quien arma/entrega ese
// examen, no de este validador ni del estándar — ver docs/especificacion.md,
// sección "Numeración dinámica", y docs/adopcion.md para el contrato de
// integración completo.
const MARCADOR_NUMERO_DINAMICO = /\{\{numero:([^}]+)\}\}/g;

function textosDeBloques(bloques) {
  const textos = [];
  for (const b of bloques || []) {
    if (b?.tipo === "texto" && typeof b.texto === "string") textos.push(b.texto);
  }
  return textos;
}

function recolectarTextosDelPaquete(paquete) {
  const textos = [];
  for (const p of paquete.preguntas || []) {
    textos.push(...textosDeBloques(p?.contexto));
    textos.push(...textosDeBloques(p?.enunciado));
    for (const o of p?.opciones || []) textos.push(...textosDeBloques(o?.contenido));
  }
  for (const g of paquete.grupos || []) {
    textos.push(...textosDeBloques(g?.contexto));
    for (const entrada of g?.banco || []) textos.push(...textosDeBloques(entrada?.contenido));
  }
  return textos;
}

function validarNumeracionDinamica(paquete, errores) {
  const idsPregunta = new Set((paquete.preguntas || []).filter((p) => esStringNoVacio(p?.id)).map((p) => p.id));
  for (const texto of recolectarTextosDelPaquete(paquete)) {
    MARCADOR_NUMERO_DINAMICO.lastIndex = 0;
    let m;
    while ((m = MARCADOR_NUMERO_DINAMICO.exec(texto))) {
      const idReferenciado = m[1];
      if (!idsPregunta.has(idReferenciado)) {
        error(
          errores,
          null,
          "numeracion_dinamica",
          `El marcador "{{numero:${idReferenciado}}}" referencia la pregunta "${idReferenciado}", que no existe en paquete.preguntas.`
        );
      }
    }
  }
}

/**
 * Valida un paquete de preguntas contra el estándar preguntas-icfes v1.
 *
 * @param {object} paquete - el JSON del paquete ya parseado (paquete.json).
 * @param {object} [opciones]
 * @param {Set<string>|string[]} [opciones.imagenesDisponibles] - nombres de archivo
 *   presentes en imagenes/ dentro del paquete ZIP, para validar que cada bloque
 *   de imagen referencia un archivo existente. Si se omite, esa comprobación se salta.
 * @param {Set<string>|string[]} [opciones.fuentesDisponibles] - nombres de archivo
 *   presentes en fuentes/ dentro del paquete ZIP, para validar que cada entrada de
 *   "fuentes" referencia un archivo existente. Si se omite, esa comprobación se salta.
 * @returns {{ valido: boolean, errores: { pregunta_id: string|null, campo: string, mensaje: string }[] }}
 */
export function validarPaquete(paquete, opciones = {}) {
  const errores = [];
  const nombresImagenes = new Set();
  const nombresFuentes = new Set();

  if (typeof paquete !== "object" || paquete === null) {
    return { valido: false, errores: [{ pregunta_id: null, campo: "paquete", mensaje: "El paquete debe ser un objeto JSON." }] };
  }

  if (paquete.estandar !== "preguntas-icfes") {
    error(errores, null, "estandar", `"estandar" debe ser exactamente "preguntas-icfes" (recibido: ${JSON.stringify(paquete.estandar)}).`);
  }
  if (!/^\d+\.\d+\.\d+$/.test(paquete.version_estandar ?? "")) {
    error(errores, null, "version_estandar", `"version_estandar" debe seguir SemVer, p. ej. "1.0.0" (recibido: ${JSON.stringify(paquete.version_estandar)}).`);
  }
  if (!esStringNoVacio(paquete.nombre)) {
    error(errores, null, "nombre", `Falta "nombre" del paquete.`);
  }

  const grupos = Array.isArray(paquete.grupos) ? paquete.grupos : [];
  const idsGrupoVistos = new Set();
  grupos.forEach((grupo, i) => validarGrupo(grupo, i, errores, nombresImagenes, nombresFuentes, idsGrupoVistos));
  const gruposPorId = new Map(grupos.filter((g) => esStringNoVacio(g?.id)).map((g) => [g.id, g]));

  const preguntas = Array.isArray(paquete.preguntas) ? paquete.preguntas : [];
  if (preguntas.length === 0) {
    error(errores, null, "preguntas", `El paquete no tiene preguntas.`);
  }

  const idsVistos = new Set();
  preguntas.forEach((pregunta, i) =>
    validarPregunta(pregunta, i, errores, nombresImagenes, idsVistos, nombresFuentes, gruposPorId)
  );

  // Unicidad de numero_blanco dentro de cada grupo — necesita ver todas las
  // preguntas hermanas a la vez, por eso vive aquí y no en validarPregunta.
  const numerosBlancoPorGrupo = new Map();
  preguntas.forEach((p) => {
    if (p?.tipo_item === "miembro_texto_con_blancos" && esStringNoVacio(p?.grupo_id) && Number.isInteger(p?.numero_blanco)) {
      if (!numerosBlancoPorGrupo.has(p.grupo_id)) {
        numerosBlancoPorGrupo.set(p.grupo_id, new Set());
      }
      const vistos = numerosBlancoPorGrupo.get(p.grupo_id);
      const preguntaId = esStringNoVacio(p.id) ? p.id : null;
      if (vistos.has(p.numero_blanco)) {
        error(errores, preguntaId, "numero_blanco", `El número de blanco ${p.numero_blanco} está repetido dentro del grupo "${p.grupo_id}".`);
      }
      vistos.add(p.numero_blanco);
    }
  });

  validarNumeracionDinamica(paquete, errores);

  const imagenesDisponibles = opciones.imagenesDisponibles
    ? new Set(opciones.imagenesDisponibles)
    : null;
  if (imagenesDisponibles) {
    for (const archivo of nombresImagenes) {
      if (!imagenesDisponibles.has(archivo)) {
        error(errores, null, "imagenes", `La imagen "${archivo}" está referenciada pero no existe en imagenes/ dentro del paquete.`);
      }
    }
  }

  const fuentesDisponibles = opciones.fuentesDisponibles
    ? new Set(opciones.fuentesDisponibles)
    : null;
  if (fuentesDisponibles) {
    for (const archivo of nombresFuentes) {
      if (!fuentesDisponibles.has(archivo)) {
        error(errores, null, "fuentes", `La fuente "${archivo}" está referenciada pero no existe en fuentes/ dentro del paquete.`);
      }
    }
  }

  return { valido: errores.length === 0, errores };
}
