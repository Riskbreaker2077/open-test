// Validador de referencia del estándar externo "preguntas-icfes" v1.0.0
// (https://github.com/riskbreaker2077/preguntas-icfes), copiado tal cual
// porque es JavaScript puro sin dependencias. Si el estándar sube de
// versión, este archivo se reemplaza entero por la nueva copia; no se edita
// a mano para no perder la sincronía con la fuente.
//
// server/importers/preguntas.js es quien lo usa para validar el contenido de
// un banco de preguntas antes de guardarlo.

const TIPOS_BLOQUE = new Set(['texto', 'imagen', 'tabla']);

function error(errores, pregunta_id, campo, mensaje) {
  errores.push({ pregunta_id, campo, mensaje });
}

function esStringNoVacio(valor) {
  return typeof valor === 'string' && valor.trim().length > 0;
}

function validarBloque(bloque, ruta, preguntaId, campo, errores, nombresImagenes) {
  if (typeof bloque !== 'object' || bloque === null || Array.isArray(bloque)) {
    error(errores, preguntaId, campo, `${ruta}: debe ser un objeto de bloque.`);
    return;
  }
  if (!TIPOS_BLOQUE.has(bloque.tipo)) {
    error(
      errores,
      preguntaId,
      campo,
      `${ruta}: tipo de bloque "${bloque.tipo}" no reconocido. Debe ser "texto", "imagen" o "tabla".`,
    );
    return;
  }
  if (bloque.tipo === 'texto') {
    if (!esStringNoVacio(bloque.texto)) {
      error(errores, preguntaId, campo, `${ruta}: el bloque de texto no puede estar vacío.`);
    }
  } else if (bloque.tipo === 'imagen') {
    if (!esStringNoVacio(bloque.archivo)) {
      error(errores, preguntaId, campo, `${ruta}: falta "archivo" en el bloque de imagen.`);
    } else {
      nombresImagenes.add(bloque.archivo);
    }
  } else if (bloque.tipo === 'tabla') {
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
          `${ruta}: la fila ${i + 1} tiene ${Array.isArray(fila) ? fila.length : '?'} columnas, ` +
            `pero hay ${bloque.encabezados.length} encabezados. Todas las filas deben ser rectangulares.`,
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
  'competencia',
  'componente',
  'afirmacion',
  'evidencia',
  'estandar_asociado',
  'que_evalua',
];

function validarPregunta(pregunta, indice, errores, nombresImagenes, idsVistos) {
  const preguntaId = esStringNoVacio(pregunta?.id) ? pregunta.id : `#${indice + 1}`;

  if (!esStringNoVacio(pregunta?.id)) {
    error(errores, preguntaId, 'id', `Pregunta en posición ${indice + 1}: falta "id".`);
  } else if (idsVistos.has(pregunta.id)) {
    error(errores, preguntaId, 'id', `El id "${pregunta.id}" está repetido; debe ser único en el paquete.`);
  } else {
    idsVistos.add(pregunta.id);
  }

  for (const campo of CAMPOS_METADATA) {
    if (!esStringNoVacio(pregunta?.[campo])) {
      error(errores, preguntaId, campo, `Pregunta ${preguntaId}: falta "${campo}" o está vacío.`);
    }
  }

  validarArrayDeBloques(pregunta?.contexto ?? [], 'contexto', preguntaId, 'contexto', errores, nombresImagenes);

  if (!Array.isArray(pregunta?.enunciado) || pregunta.enunciado.length === 0) {
    error(errores, preguntaId, 'enunciado', `Pregunta ${preguntaId}: "enunciado" no puede estar vacío.`);
  } else {
    validarArrayDeBloques(pregunta.enunciado, 'enunciado', preguntaId, 'enunciado', errores, nombresImagenes);
  }

  const opciones = Array.isArray(pregunta?.opciones) ? pregunta.opciones : [];
  if (opciones.length !== 4) {
    error(
      errores,
      preguntaId,
      'opciones',
      `Pregunta ${preguntaId}: tiene ${opciones.length} opciones; debe tener exactamente 4.`,
    );
  }

  let correctas = 0;
  opciones.forEach((opcion, i) => {
    const opcionRef = esStringNoVacio(opcion?.id) ? opcion.id : `#${i + 1}`;
    const campo = `opciones[${opcionRef}]`;

    if (!esStringNoVacio(opcion?.id)) {
      error(errores, preguntaId, campo, `Pregunta ${preguntaId}, opción en posición ${i + 1}: falta "id".`);
    }
    if (typeof opcion?.es_correcta !== 'boolean') {
      error(errores, preguntaId, campo, `Pregunta ${preguntaId}, opción ${opcionRef}: "es_correcta" debe ser true o false.`);
    } else if (opcion.es_correcta) {
      correctas += 1;
    }
    if (!esStringNoVacio(opcion?.justificacion)) {
      error(
        errores,
        preguntaId,
        campo,
        `Pregunta ${preguntaId}, opción ${opcionRef}: falta "justificacion" (obligatoria incluso si es incorrecta).`,
      );
    }
    if (!Array.isArray(opcion?.contenido) || opcion.contenido.length === 0) {
      error(errores, preguntaId, campo, `Pregunta ${preguntaId}, opción ${opcionRef}: "contenido" no puede estar vacío.`);
    } else {
      validarArrayDeBloques(opcion.contenido, campo, preguntaId, campo, errores, nombresImagenes);
    }
  });

  if (opciones.length === 4 && correctas !== 1) {
    error(
      errores,
      preguntaId,
      'opciones',
      `Pregunta ${preguntaId}: tiene ${correctas} opciones marcadas como correctas; debe tener exactamente 1.`,
    );
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
 * @returns {{ valido: boolean, errores: { pregunta_id: string|null, campo: string, mensaje: string }[] }}
 */
export function validarPaquete(paquete, opciones = {}) {
  const errores = [];
  const nombresImagenes = new Set();

  if (typeof paquete !== 'object' || paquete === null) {
    return { valido: false, errores: [{ pregunta_id: null, campo: 'paquete', mensaje: 'El paquete debe ser un objeto JSON.' }] };
  }

  if (paquete.estandar !== 'preguntas-icfes') {
    error(errores, null, 'estandar', `"estandar" debe ser exactamente "preguntas-icfes" (recibido: ${JSON.stringify(paquete.estandar)}).`);
  }
  if (!/^\d+\.\d+\.\d+$/.test(paquete.version_estandar ?? '')) {
    error(errores, null, 'version_estandar', `"version_estandar" debe seguir SemVer, p. ej. "1.0.0" (recibido: ${JSON.stringify(paquete.version_estandar)}).`);
  }
  if (!esStringNoVacio(paquete.nombre)) {
    error(errores, null, 'nombre', 'Falta "nombre" del paquete.');
  }

  const preguntas = Array.isArray(paquete.preguntas) ? paquete.preguntas : [];
  if (preguntas.length === 0) {
    error(errores, null, 'preguntas', 'El paquete no tiene preguntas.');
  }

  const idsVistos = new Set();
  preguntas.forEach((pregunta, i) => validarPregunta(pregunta, i, errores, nombresImagenes, idsVistos));

  const imagenesDisponibles = opciones.imagenesDisponibles
    ? new Set(opciones.imagenesDisponibles)
    : null;
  if (imagenesDisponibles) {
    for (const archivo of nombresImagenes) {
      if (!imagenesDisponibles.has(archivo)) {
        error(errores, null, 'imagenes', `La imagen "${archivo}" está referenciada pero no existe en imagenes/ dentro del paquete.`);
      }
    }
  }

  return { valido: errores.length === 0, errores };
}
