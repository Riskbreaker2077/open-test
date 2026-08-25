// Renderizado de una pregunta. Lo usan la vista previa del docente y la app
// del estudiante: si divergieran, la vista previa dejaría de servir para lo
// único que sirve, que es comprobar lo que verá el estudiante en la tablet.

export const LETRAS = ['A', 'B', 'C', 'D'];

/**
 * @param pregunta  { contexto, imagen, enunciado, opciones: [{id?, texto}] }
 * @param opciones  {
 *   elegida        id de la opción marcada, si la hay
 *   correcta       índice de la correcta; SOLO en el panel del docente
 *   alElegir       callback(indice, opcion); si falta, la pregunta es de lectura
 * }
 */
export function renderizarPregunta(pregunta, { elegida, correcta, alElegir } = {}) {
  const tarjeta = document.createElement('article');
  tarjeta.className = 'pregunta';

  if (pregunta.contexto) {
    const contexto = document.createElement('div');
    contexto.className = 'pregunta__contexto';
    contexto.textContent = pregunta.contexto;
    tarjeta.append(contexto);
  }

  if (pregunta.imagen) {
    const imagen = document.createElement('img');
    imagen.className = 'pregunta__imagen';
    imagen.src = `/imagenes/${encodeURIComponent(pregunta.imagen)}`;
    imagen.alt = '';
    imagen.loading = 'lazy';
    tarjeta.append(imagen);
  }

  const enunciado = document.createElement('h2');
  enunciado.className = 'pregunta__enunciado';
  enunciado.textContent = pregunta.enunciado;
  tarjeta.append(enunciado);

  const lista = document.createElement('div');
  lista.className = 'opciones';

  pregunta.opciones.forEach((opcion, i) => {
    const texto = typeof opcion === 'string' ? opcion : opcion.texto;
    const boton = document.createElement('button');
    boton.type = 'button';
    boton.className = 'opcion';

    const letra = document.createElement('span');
    letra.className = 'opcion__letra';
    letra.textContent = LETRAS[i];

    const cuerpo = document.createElement('span');
    cuerpo.textContent = texto;

    boton.append(letra, cuerpo);

    const id = typeof opcion === 'string' ? i : opcion.id;
    if (elegida !== undefined && elegida === id) {
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

    lista.append(boton);
  });

  tarjeta.append(lista);
  return tarjeta;
}
