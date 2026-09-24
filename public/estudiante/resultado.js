import { renderizarPregunta, textoPlano } from '/shared/pregunta.js';
import {
  colorDePunto, esPerfecto, etiquetaDeEstado, hashDePregunta, mensajeDeFelicitacion, ordenDesdeHash,
} from '/estudiante/resultado-logica.js';

const contenido = document.getElementById('contenido');
const espera = document.getElementById('espera');
const mensaje = document.getElementById('mensaje');
const volver = document.getElementById('volver');
const volverInicio = document.getElementById('volver-inicio');
const fin = document.getElementById('fin');
const avisoAnulada = document.getElementById('aviso-anulada');
const titulo = document.getElementById('titulo');
const resumen = document.getElementById('resumen');
const perfecto = document.getElementById('perfecto');
const puntajeMarco = document.getElementById('puntaje-marco');
const celebracion = document.getElementById('celebracion');
const puntaje = document.getElementById('puntaje');
const porcentaje = document.getElementById('porcentaje');
const mapa = document.getElementById('mapa');
const puntos = document.getElementById('puntos');
const leyenda = document.getElementById('leyenda');
const vistaResumen = document.getElementById('vista-resumen');
const vistaPergamino = document.getElementById('vista-pergamino');
const pergamino = document.getElementById('pergamino');
const volverResumen = document.getElementById('volver-resumen');
const pergaminoAnterior = document.getElementById('pergamino-anterior');
const pergaminoSiguiente = document.getElementById('pergamino-siguiente');

const sinMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

let resultado = null;
let preguntas = [];
// Si el pergamino se abrió desde la rejilla, "Volver" es un paso atrás en el
// historial (así el botón atrás de la tablet y el de la página coinciden).
let abiertoDesdeResumen = false;
let scrollResumen = 0;
let ultimoOrden = null;

const numero = (valor) => (Number.isInteger(valor) ? String(valor) : String(Number(valor.toFixed(1))));

// ---- Contenido de cada pregunta --------------------------------------------

function contenidoCompleto(pregunta) {
  // En matching la correcta es una entrada del banco (respuestaPoolId),
  // no una opción propia.
  const esMatching = pregunta.tipoItem === 'miembro_banco_opciones';
  const idCorrecto = esMatching ? pregunta.respuestaPoolId : pregunta.opcionCorrectaId;
  const correcta = pregunta.opciones.findIndex(
    (opcion) => opcion && String(opcion.id) === String(idCorrecto),
  );
  const elegida = esMatching ? (pregunta.respuestaBancoId ?? undefined) : (pregunta.opcionId ?? undefined);
  const guia = document.createElement('p');
  guia.className = 'pergamino__guia';
  const guias = {
    acertada: 'Acertaste: tu respuesta es la que está en verde.',
    fallada: 'Tu respuesta está marcada con ✓ en dorado; la correcta, en verde.',
  };
  guia.textContent = guias[pregunta.estado] ?? 'No respondiste esta pregunta; la correcta está en verde.';
  return [
    renderizarPregunta(pregunta, { elegida, correcta, mostrarJustificacion: true }),
    guia,
  ];
}

function contenidoResumido(pregunta) {
  const partes = [];
  const contextoTexto = textoPlano(pregunta.contexto);
  if (contextoTexto) {
    const contexto = document.createElement('p');
    contexto.className = 'pregunta__contexto';
    contexto.textContent = contextoTexto;
    partes.push(contexto);
  }
  const enunciado = document.createElement('div');
  enunciado.className = 'pregunta__enunciado';
  const parrafo = document.createElement('p');
  parrafo.className = 'pregunta__bloque-texto';
  parrafo.textContent = textoPlano(pregunta.enunciado);
  enunciado.append(parrafo);
  partes.push(enunciado);
  const respuesta = document.createElement('p');
  respuesta.className = 'pergamino__respuesta';
  respuesta.textContent = pregunta.respuesta
    ? `Tu respuesta: ${textoPlano(pregunta.respuesta.contenido)}`
    : 'No marcaste una respuesta.';
  partes.push(respuesta);
  return partes;
}

// ---- Rejilla de puntos -----------------------------------------------------

function pintarPuntos() {
  const dorados = esPerfecto(resultado);
  puntos.classList.toggle('puntos--dorados', dorados);
  puntos.replaceChildren(...preguntas.map((pregunta, i) => {
    const punto = document.createElement('a');
    punto.href = hashDePregunta(pregunta.orden);
    punto.className = `punto punto--${colorDePunto(pregunta.estado)}`;
    punto.style.setProperty('--i', i);
    punto.dataset.orden = pregunta.orden;
    punto.textContent = pregunta.orden;
    punto.setAttribute('aria-label', `Pregunta ${pregunta.orden}: ${etiquetaDeEstado(pregunta.estado).toLowerCase()}`);
    punto.addEventListener('click', () => {
      abiertoDesdeResumen = true;
      scrollResumen = window.scrollY;
    });
    return punto;
  }));
  leyenda.hidden = dorados;
  mapa.hidden = preguntas.length === 0;
}

// ---- Pergamino ---------------------------------------------------------------

function pintarPergamino(orden) {
  const indice = preguntas.findIndex((pregunta) => pregunta.orden === orden);
  const pregunta = preguntas[indice];
  const color = esPerfecto(resultado) ? 'dorado' : colorDePunto(pregunta.estado);

  const cabecera = document.createElement('header');
  cabecera.className = 'pergamino__cabecera';
  const sello = document.createElement('span');
  sello.className = `sello sello--${color}`;
  sello.textContent = pregunta.orden;
  sello.setAttribute('aria-hidden', 'true');
  const textos = document.createElement('div');
  const encabezado = document.createElement('h1');
  encabezado.className = 'pergamino__titulo';
  encabezado.tabIndex = -1;
  encabezado.textContent = `Pregunta ${pregunta.orden}`;
  const estado = document.createElement('p');
  estado.className = `pergamino__estado pergamino__estado--${color}`;
  estado.textContent = etiquetaDeEstado(pregunta.estado);
  textos.append(encabezado, estado);
  cabecera.append(sello, textos);

  const adorno = document.createElement('p');
  adorno.className = 'pergamino__adorno';
  adorno.setAttribute('aria-hidden', 'true');
  adorno.textContent = '❦';

  const cuerpo = resultado.nivel === 'completo' ? contenidoCompleto(pregunta) : contenidoResumido(pregunta);
  pergamino.replaceChildren(cabecera, adorno, ...cuerpo);

  pergaminoAnterior.disabled = indice === 0;
  pergaminoSiguiente.disabled = indice === preguntas.length - 1;
  pergaminoAnterior.dataset.orden = preguntas[indice - 1]?.orden ?? '';
  pergaminoSiguiente.dataset.orden = preguntas[indice + 1]?.orden ?? '';
  return encabezado;
}

function mostrarVista() {
  const orden = ordenDesdeHash(window.location.hash, preguntas.map((pregunta) => pregunta.orden));
  if (orden === null) {
    vistaPergamino.hidden = true;
    vistaResumen.hidden = false;
    window.scrollTo(0, scrollResumen);
    if (ultimoOrden !== null) {
      puntos.querySelector(`[data-orden="${ultimoOrden}"]`)?.focus({ preventScroll: true });
    }
    return;
  }
  ultimoOrden = orden;
  const encabezado = pintarPergamino(orden);
  vistaResumen.hidden = true;
  vistaPergamino.hidden = false;
  window.scrollTo(0, 0);
  encabezado.focus({ preventScroll: true });
}

function irAlResumen() {
  if (abiertoDesdeResumen) {
    abiertoDesdeResumen = false;
    window.history.back();
    return;
  }
  // Se entró directo al pergamino (p. ej. recargando): no hay a dónde volver
  // en el historial, así que se reemplaza la entrada actual.
  window.history.replaceState(null, '', window.location.pathname);
  mostrarVista();
}

function irAPregunta(boton) {
  if (!boton.dataset.orden) return;
  // replace: el botón atrás vuelve a la rejilla, no recorre cada pregunta vista.
  window.location.replace(hashDePregunta(boton.dataset.orden));
}

volverResumen.addEventListener('click', irAlResumen);
pergaminoAnterior.addEventListener('click', () => irAPregunta(pergaminoAnterior));
pergaminoSiguiente.addEventListener('click', () => irAPregunta(pergaminoSiguiente));
window.addEventListener('hashchange', mostrarVista);

// ---- Celebración del puntaje perfecto ----------------------------------------

function lanzarChispas() {
  const chispas = [];
  for (let i = 0; i < 44; i += 1) {
    const chispa = document.createElement('span');
    chispa.className = i % 3 === 0 ? 'chispa chispa--estrella' : 'chispa';
    const angulo = Math.random() * Math.PI * 2;
    const distancia = 70 + Math.random() * 190;
    chispa.style.setProperty('--x', `${Math.cos(angulo) * distancia}px`);
    chispa.style.setProperty('--y', `${Math.sin(angulo) * distancia * 0.75}px`);
    chispa.style.setProperty('--retardo', `${900 + Math.random() * 500}ms`);
    chispa.style.setProperty('--tam', `${6 + Math.random() * 12}px`);
    chispa.style.setProperty('--giro', `${Math.random() * 540 - 270}deg`);
    chispas.push(chispa);
  }
  // Estrellas que siguen titilando alrededor del puntaje.
  for (let i = 0; i < 10; i += 1) {
    const estrella = document.createElement('span');
    estrella.className = 'chispa chispa--titila';
    estrella.style.setProperty('--izq', `${5 + Math.random() * 90}%`);
    estrella.style.setProperty('--arr', `${Math.random() * 100}%`);
    estrella.style.setProperty('--retardo', `${1500 + Math.random() * 2500}ms`);
    estrella.style.setProperty('--tam', `${8 + Math.random() * 10}px`);
    chispas.push(estrella);
  }
  celebracion.replaceChildren(...chispas);
}

function contarHasta(final, total) {
  const texto = (valor) => `${numero(valor)} / ${numero(total)}`;
  if (sinMovimiento) {
    puntaje.textContent = texto(final);
    return;
  }
  const duracion = 1100;
  const inicio = performance.now();
  const paso = (ahora) => {
    const avance = Math.min(1, (ahora - inicio) / duracion);
    const suavizado = 1 - (1 - avance) ** 3;
    puntaje.textContent = texto(avance < 1 ? Math.floor(final * suavizado) : final);
    if (avance < 1) window.requestAnimationFrame(paso);
  };
  window.requestAnimationFrame(paso);
}

function celebrar() {
  perfecto.textContent = mensajeDeFelicitacion(resultado);
  perfecto.hidden = false;
  resumen.classList.add('resultado__resumen--perfecto');
  puntajeMarco.classList.add('puntaje-marco--dorado');
  puntaje.classList.add('resultado__puntaje--dorado');
  contarHasta(resultado.puntaje, resultado.total);
  if (!sinMovimiento) lanzarChispas();
}

// ---- Carga -------------------------------------------------------------------

async function cargar() {
  try {
    const respuesta = await fetch('/api/examen/resultado');
    const cuerpo = await respuesta.json();
    if (!respuesta.ok) throw new Error(cuerpo.mensaje ?? 'No pudimos consultar el resultado.');
    resultado = cuerpo.resultado;
    preguntas = resultado.preguntas ?? [];
    // Una prueba anulada no trae detalle en ningún nivel de feedback (038):
    // el servidor ya lo dejó fuera, aquí solo se explica lo que pasó.
    if (resultado.anulado) {
      fin.textContent = 'Prueba anulada';
      avisoAnulada.hidden = false;
    }
    titulo.textContent = resultado.anulado
      ? `${resultado.estudiante}, tu prueba fue anulada`
      : `${resultado.estudiante}, este es tu resultado`;
    puntaje.textContent = `${numero(resultado.puntaje)} / ${numero(resultado.total)}`;
    porcentaje.textContent = `${resultado.porcentaje} %`;
    pintarPuntos();
    contenido.hidden = false;
    espera.hidden = true;
    if (esPerfecto(resultado)) celebrar();
    mostrarVista();
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
