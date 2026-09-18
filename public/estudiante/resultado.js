import { renderizarPregunta, textoPlano } from '/shared/pregunta.js';

const contenido = document.getElementById('contenido');
const espera = document.getElementById('espera');
const mensaje = document.getElementById('mensaje');
const volver = document.getElementById('volver');
const volverInicio = document.getElementById('volver-inicio');
const titulo = document.getElementById('titulo');
const puntaje = document.getElementById('puntaje');
const porcentaje = document.getElementById('porcentaje');
const detalle = document.getElementById('detalle');
const fin = document.getElementById('fin');
const avisoAnulada = document.getElementById('aviso-anulada');

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
    // En matching la correcta es una entrada del banco (respuestaPoolId),
    // no una opción propia.
    const esMatching = pregunta.tipoItem === 'miembro_banco_opciones';
    const idCorrecto = esMatching ? pregunta.respuestaPoolId : pregunta.opcionCorrectaId;
    const correcta = pregunta.opciones.findIndex(
      (opcion) => opcion && String(opcion.id) === String(idCorrecto),
    );
    const elegida = esMatching ? (pregunta.respuestaBancoId ?? undefined) : (pregunta.opcionId ?? undefined);
    envoltura.append(renderizarPregunta(pregunta, {
      elegida,
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
    // Una prueba anulada no trae detalle en ningún nivel de feedback (038):
    // el servidor ya lo dejó fuera, aquí solo se explica lo que pasó.
    if (resultado.anulado) {
      fin.textContent = 'Prueba anulada';
      avisoAnulada.hidden = false;
    }
    titulo.textContent = resultado.anulado
      ? `${resultado.estudiante}, tu prueba fue anulada`
      : `${resultado.estudiante}, este es tu resultado`;
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

async function volverAlInicio() {
  // Sin cerrar la sesión, el portal devolvería aquí a quien ya entregó.
  volver.disabled = true;
  volverInicio.disabled = true;
  try {
    await fetch('/api/examen/salir', { method: 'POST' });
  } catch {
    // Sin conexión igual intentamos volver; el portal decide qué mostrar.
  }
  window.location.replace('/');
}

volver.addEventListener('click', volverAlInicio);
volverInicio.addEventListener('click', volverAlInicio);

/**
 * Si el docente deshace una anulación (038), la prueba vuelve a estar viva:
 * la tablet regresa sola al examen, sin que el estudiante tenga que hacer
 * nada ni volver a escribir su código.
 */
async function vigilarReapertura() {
  try {
    const respuesta = await fetch('/api/examen/estado');
    if (!respuesta.ok) return;
    const { estado } = await respuesta.json();
    if (!estado.entregado) window.location.replace('/estudiante/examen.html');
  } catch {
    // Sin conexión no hay nada que decidir: se reintenta en el siguiente sondeo.
  }
}

window.setInterval(vigilarReapertura, 5000);

await cargar();
