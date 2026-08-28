import { renderizarPregunta, textoPlano } from '/shared/pregunta.js';

const contenido = document.getElementById('contenido');
const espera = document.getElementById('espera');
const mensaje = document.getElementById('mensaje');
const volver = document.getElementById('volver');
const titulo = document.getElementById('titulo');
const puntaje = document.getElementById('puntaje');
const porcentaje = document.getElementById('porcentaje');
const detalle = document.getElementById('detalle');

const ETIQUETAS = {
  acertada: 'Acertada',
  fallada: 'Fallada',
  saltada: 'Saltada',
  sin_llegar: 'No alcanzaste a verla',
};

function tarjetaDe(pregunta, nivel) {
  const envoltura = document.createElement('section');
  envoltura.className = 'tarjeta resultado__pregunta';
  const estado = document.createElement('p');
  estado.className = `resultado__estado resultado__estado--${pregunta.estado}`;
  estado.textContent = `Pregunta ${pregunta.orden} · ${ETIQUETAS[pregunta.estado]}`;
  envoltura.append(estado);

  if (nivel === 'completo') {
    const correcta = pregunta.opciones.findIndex((opcion) => opcion.id === pregunta.opcionCorrectaId);
    envoltura.append(renderizarPregunta(pregunta, {
      elegida: pregunta.opcionId ?? undefined,
      correcta,
      mostrarJustificacion: true,
    }));
  } else {
    const contextoTexto = textoPlano(pregunta.contexto);
    if (contextoTexto) {
      const contexto = document.createElement('p');
      contexto.textContent = contextoTexto;
      envoltura.append(contexto);
    }
    const enunciado = document.createElement('h2');
    enunciado.textContent = textoPlano(pregunta.enunciado);
    envoltura.append(enunciado);
    const respuesta = document.createElement('p');
    respuesta.textContent = pregunta.respuesta
      ? `Tu respuesta: ${textoPlano(pregunta.respuesta.contenido)}`
      : 'No marcaste una respuesta.';
    envoltura.append(respuesta);
  }
  return envoltura;
}

async function cargar() {
  try {
    const respuesta = await fetch('/api/examen/resultado');
    const cuerpo = await respuesta.json();
    if (!respuesta.ok) throw new Error(cuerpo.mensaje ?? 'No pudimos consultar el resultado.');
    const resultado = cuerpo.resultado;
    titulo.textContent = `${resultado.estudiante}, este es tu resultado`;
    puntaje.textContent = `${resultado.puntaje} / ${resultado.total}`;
    porcentaje.textContent = `${resultado.porcentaje} %`;
    detalle.replaceChildren(...(resultado.preguntas ?? []).map(
      (pregunta) => tarjetaDe(pregunta, resultado.nivel),
    ));
    contenido.hidden = false;
    espera.hidden = true;
  } catch (err) {
    mensaje.textContent = err.message;
    volver.hidden = false;
  }
}

await cargar();
