// Renderizado de una pregunta. Lo usan la vista previa del docente y la app
// del estudiante: si divergieran, la vista previa dejaría de servir para lo
// único que sirve, que es comprobar lo que verá el estudiante en la tablet.
//
// Sigue el estándar preguntas-icfes: contexto, enunciado y el contenido de
// cada opción son arrays de bloques ({tipo: "texto"|"imagen"|"tabla", ...}),
// nunca strings planos.

export const LETRAS = ['A', 'B', 'C', 'D'];

/**
 * Letras para N opciones. Sigue el alfabeto más allá de la D para las
 * preguntas de 5+ opciones que el estándar admite desde v1.2.0.
 */
export function letrasDeOpciones(n) {
  return Array.from({ length: Math.max(0, n) }, (_, i) =>
    i < LETRAS.length ? LETRAS[i] : String.fromCharCode(65 + i));
}

/** Concatena solo los bloques de texto, para resúmenes que no pueden mostrar imágenes ni tablas. */
export function textoPlano(bloques) {
  return (bloques ?? [])
    .filter((bloque) => bloque?.tipo === 'texto')
    .map((bloque) => bloque.texto)
    .join(' ');
}

function elementoDeBloque(bloque) {
  if (bloque.tipo === 'imagen') {
    const imagen = document.createElement('img');
    imagen.className = 'pregunta__imagen';
    imagen.src = `/imagenes/${encodeURIComponent(bloque.archivo)}`;
    imagen.alt = bloque.descripcion_accesible ?? '';
    imagen.loading = 'lazy';
    return imagen;
  }
  if (bloque.tipo === 'tabla') {
    const tabla = document.createElement('table');
    tabla.className = 'pregunta__tabla';
    const encabezado = document.createElement('tr');
    for (const columna of bloque.encabezados) {
      const th = document.createElement('th');
      th.textContent = columna;
      encabezado.append(th);
    }
    const thead = document.createElement('thead');
    thead.append(encabezado);
    const tbody = document.createElement('tbody');
    for (const fila of bloque.filas) {
      const tr = document.createElement('tr');
      for (const valor of fila) {
        const td = document.createElement('td');
        td.textContent = valor;
        tr.append(td);
      }
      tbody.append(tr);
    }
    tabla.append(thead, tbody);
    return tabla;
  }
  // tipo "texto" (o desconocido, tratado igual: nunca reventar por un bloque raro)
  const parrafo = document.createElement('p');
  parrafo.className = 'pregunta__bloque-texto';
  parrafo.textContent = bloque.texto ?? '';
  return parrafo;
}

function renderizarBloques(bloques, contenedor) {
  for (const bloque of bloques ?? []) contenedor.append(elementoDeBloque(bloque));
  return contenedor;
}

/**
 * @param pregunta  { contexto: bloque[], enunciado: bloque[], opciones: [{id, contenido: bloque[], justificacion?}] }
 * @param opciones  {
 *   elegida               id de la opción marcada, si la hay
 *   correcta              índice de la correcta; SOLO en el panel del docente
 *   alElegir              callback(indice, opcion); si falta, la pregunta es de lectura
 *   mostrarJustificacion  si es true, pinta la `justificacion` de cada opción (vista previa docente y resultado nivel completo)
 * }
 */
export function renderizarPregunta(pregunta, { elegida, correcta, alElegir, mostrarJustificacion } = {}) {
  const tarjeta = document.createElement('article');
  tarjeta.className = 'pregunta';

  if (pregunta.contexto?.length > 0) {
    const contexto = document.createElement('div');
    contexto.className = 'pregunta__contexto';
    tarjeta.append(renderizarBloques(pregunta.contexto, contexto));
  }

  const enunciado = document.createElement('div');
  enunciado.className = 'pregunta__enunciado';
  tarjeta.append(renderizarBloques(pregunta.enunciado, enunciado));

  const lista = document.createElement('div');
  lista.className = 'opciones';

  pregunta.opciones.forEach((opcion, i) => {
    const envoltura = document.createElement('div');
    envoltura.className = 'opcion-envoltura';

    const boton = document.createElement('button');
    boton.type = 'button';
    boton.className = 'opcion';

    const letra = document.createElement('span');
    letra.className = 'opcion__letra';
    letra.textContent = letrasDeOpciones(pregunta.opciones.length)[i];

    const cuerpo = document.createElement('div');
    cuerpo.className = 'opcion__cuerpo';
    renderizarBloques(opcion.contenido, cuerpo);

    boton.append(letra, cuerpo);

    if (elegida !== undefined && elegida === opcion.id) {
      boton.classList.add('opcion--elegida');
      boton.setAttribute('aria-pressed', 'true');
    }

    // La correcta solo se marca en el panel: la API del estudiante nunca la
    // envía mientras el examen está abierto.
    if (correcta !== undefined && correcta === i) {
      boton.classList.add('opcion--correcta');
      const marca = document.createElement('span');
      marca.className = 'opcion__marca';
      marca.textContent = 'Correcta';
      boton.append(marca);
    }

    if (alElegir) boton.addEventListener('click', () => alElegir(i, opcion));
    else boton.disabled = true;

    envoltura.append(boton);

    if (mostrarJustificacion && opcion.justificacion) {
      const justificacion = document.createElement('p');
      justificacion.className = 'opcion__justificacion';
      justificacion.textContent = opcion.justificacion;
      envoltura.append(justificacion);
    }

    lista.append(envoltura);
  });

  tarjeta.append(lista);
  return tarjeta;
}

// ---- Grupos de preguntas (estándar preguntas-icfes v1.2.0+) ---------------

/**
 * Renderiza una pregunta miembro de matching: su enunciado + un selector con
 * las entradas del banco del grupo. No usa letras — usa el contenido del
 * banco. La entrada elegida se marca; el `idElegido` es el id de la entrada.
 * `correcta` (id de entrada) solo llega del panel del docente.
 */
function renderizarMiembroMatching(pregunta, banco, { elegida, correcta, alElegir, mostrarJustificacion }) {
  const tarjeta = document.createElement('article');
  tarjeta.className = 'pregunta pregunta--miembro-grupo';
  tarjeta.dataset.preguntaId = pregunta.pregunta_id ?? '';

  const enunciado = document.createElement('div');
  enunciado.className = 'pregunta__enunciado';
  tarjeta.append(renderizarBloques(pregunta.enunciado, enunciado));

  const lista = document.createElement('div');
  lista.className = 'opciones opciones--banco';
  (banco ?? []).forEach((entrada) => {
    const boton = document.createElement('button');
    boton.type = 'button';
    boton.className = 'opcion opcion--banco';
    if (elegida !== undefined && elegida !== null && String(elegida) === String(entrada.id)) {
      boton.classList.add('opcion--elegida');
      boton.setAttribute('aria-pressed', 'true');
    }
    // La correcta solo se marca en el panel: la API del estudiante nunca la
    // envía mientras el examen está abierto.
    if (correcta !== undefined && correcta !== null && String(correcta) === String(entrada.id)) {
      boton.classList.add('opcion--correcta');
      const marca = document.createElement('span');
      marca.className = 'opcion__marca';
      marca.textContent = 'Correcta';
      boton.append(marca);
    }
    const cuerpo = document.createElement('div');
    cuerpo.className = 'opcion__cuerpo';
    renderizarBloques(entrada.contenido, cuerpo);
    boton.append(cuerpo);
    if (alElegir) boton.addEventListener('click', () => alElegir(pregunta, entrada.id));
    else boton.disabled = true;
    lista.append(boton);
  });
  tarjeta.append(lista);

  if (mostrarJustificacion && pregunta.justificacion) {
    const justificacion = document.createElement('p');
    justificacion.className = 'opcion__justificacion';
    justificacion.textContent = pregunta.justificacion;
    tarjeta.append(justificacion);
  }
  return tarjeta;
}

/**
 * Render de un grupo de preguntas. Lo usan el examen del estudiante y la
 * vista previa del docente.
 *
 * - `contexto_compartido`: pinta el contexto del grupo arriba y, debajo, las
 *   preguntas que se le pasen (en el examen se pasa solo la actual: cada
 *   miembro ocupa su propia pantalla).
 * - `banco_opciones` (matching): pinta el banco compartido arriba y todas
 *   las preguntas miembro en la misma pantalla; cada una elige una entrada.
 * - `texto_con_blancos` (cloze): pinta el pasaje compartido arriba y todas
 *   las preguntas miembro, cada hueco con sus opciones propias.
 *
 * @param grupo   { id, tipo, contexto: bloque[], banco?: [{id, contenido}] }
 * @param opciones {
 *   preguntas             miembros a renderizar
 *   elegidas              { [preguntaId]: idElegido } — opcion_id o id de entrada
 *   correctas             { [preguntaId]: idCorrecto } — SOLO panel docente
 *   alElegir              callback(pregunta, idElegido); si falta, es de lectura
 *   mostrarJustificacion  pinta las justificaciones (vista previa docente)
 * }
 */
export function renderizarGrupo(grupo, { preguntas = [], elegidas = {}, correctas = {}, alElegir, mostrarJustificacion } = {}) {
  const contenedor = document.createElement('article');
  contenedor.className = 'pregunta grupo-preguntas';
  contenedor.dataset.grupoId = grupo.id ?? '';
  contenedor.dataset.grupoTipo = grupo.tipo ?? '';

  if (grupo.contexto?.length > 0) {
    const contexto = document.createElement('div');
    contexto.className = 'pregunta__contexto';
    renderizarBloques(grupo.contexto, contexto);
    contenedor.append(contexto);
  }

  for (const pregunta of preguntas) {
    if (grupo.tipo === 'banco_opciones') {
      contenedor.append(
        renderizarMiembroMatching(pregunta, grupo.banco, {
          elegida: elegidas[pregunta.pregunta_id],
          correcta: correctas[pregunta.pregunta_id],
          alElegir,
          mostrarJustificacion,
        }),
      );
      continue;
    }
    // contexto_compartido y texto_con_blancos: la miembro tiene opciones
    // propias y se rinde con el render estándar (sin repetir contexto).
    const opcionesDe = pregunta.opciones ?? [];
    contenedor.append(renderizarPregunta(
      { ...pregunta, contexto: [] },
      {
        elegida: elegidas[pregunta.pregunta_id],
        correcta: correctas[pregunta.pregunta_id] !== undefined
          ? opcionesDe.findIndex((opcion) => String(opcion.id) === String(correctas[pregunta.pregunta_id]))
          : undefined,
        mostrarJustificacion,
        alElegir: alElegir
          ? (indice, opcion) => alElegir(pregunta, opcion.id)
          : undefined,
      },
    ));
  }

  return contenedor;
}
