// Renderizado de una pregunta. Lo usan la vista previa del docente y la app
// del estudiante: si divergieran, la vista previa dejaría de servir para lo
// único que sirve, que es comprobar lo que verá el estudiante en la tablet.
//
// Sigue el estándar preguntas-icfes: contexto, enunciado y el contenido de
// cada opción son arrays de bloques ({tipo: "texto"|"imagen"|"tabla", ...}),
// nunca strings planos.

export const LETRAS = ['A', 'B', 'C', 'D'];

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
    letra.textContent = LETRAS[i];

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
