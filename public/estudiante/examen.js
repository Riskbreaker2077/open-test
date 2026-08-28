import { renderizarPregunta } from '/shared/pregunta.js';

const elementos = {
  examen: document.getElementById('examen'),
  espera: document.getElementById('espera'),
  tituloEspera: document.getElementById('titulo-espera'),
  textoEspera: document.getElementById('texto-espera'),
  progreso: document.getElementById('progreso'),
  reloj: document.getElementById('reloj'),
  pregunta: document.getElementById('pregunta'),
  estadoGuardado: document.getElementById('estado-guardado'),
  error: document.getElementById('error'),
  anterior: document.getElementById('anterior'),
  saltar: document.getElementById('saltar'),
  siguiente: document.getElementById('siguiente'),
  cuentaMinima: document.getElementById('cuenta-minima'),
  terminar: document.getElementById('terminar'),
};

let actual = null;
let opcionElegida = null;
let opcionOriginal = null;
let inicioVista = 0;
let desbloqueoEn = 0;
let relojServidor = null;
let ocupada = false;

const esperar = (ms) => new Promise((resolver) => window.setTimeout(resolver, ms));

async function pedir(ruta, opciones = {}, reintentarRed = false) {
  let ultimoError;
  for (let intento = 0; intento < (reintentarRed ? 2 : 1); intento += 1) {
    try {
      const respuesta = await fetch(ruta, opciones);
      const cuerpo = await respuesta.json();
      if (!respuesta.ok) {
        const fallo = new Error(cuerpo.mensaje ?? 'No pudimos completar la acción.');
        fallo.estado = respuesta.status;
        throw fallo;
      }
      return cuerpo;
    } catch (err) {
      ultimoError = err;
      if (err.estado || intento > 0) break;
      elementos.estadoGuardado.textContent = 'Se perdió la conexión. Reintentando…';
      await esperar(900);
    }
  }
  throw ultimoError;
}

function sincronizarReloj(segundos) {
  relojServidor = { segundos, instante: performance.now() };
}

function formatearTiempo(segundos) {
  const total = Math.max(0, Math.ceil(segundos));
  const horas = Math.floor(total / 3600);
  const minutos = Math.floor((total % 3600) / 60);
  const resto = total % 60;
  return horas > 0
    ? `${horas}:${String(minutos).padStart(2, '0')}:${String(resto).padStart(2, '0')}`
    : `${String(minutos).padStart(2, '0')}:${String(resto).padStart(2, '0')}`;
}

function pintarReloj() {
  if (!relojServidor) return;
  const transcurridos = (performance.now() - relojServidor.instante) / 1000;
  elementos.reloj.textContent = formatearTiempo(relojServidor.segundos - transcurridos);
}

function segundosTotales() {
  return actual.segundosEnPantalla + Math.max(0, Math.floor((performance.now() - inicioVista) / 1000));
}

function mostrarError(mensaje) {
  elementos.error.textContent = mensaje;
  elementos.error.hidden = false;
}

function limpiarError() {
  elementos.error.hidden = true;
  elementos.error.textContent = '';
}

function pintarPregunta() {
  const tarjeta = renderizarPregunta(actual, {
    elegida: opcionElegida,
    alElegir: (indice, opcion) => {
      opcionElegida = opcion.id;
      limpiarError();
      pintarPregunta();
    },
  });
  elementos.pregunta.replaceChildren(tarjeta);
  elementos.progreso.textContent = `Pregunta ${actual.orden} de ${actual.total}`;
  elementos.anterior.disabled = actual.orden === 1 || ocupada;
  elementos.siguiente.textContent = actual.orden === actual.total ? 'Guardar y terminar' : 'Siguiente';
  elementos.saltar.textContent = actual.orden === actual.total ? 'Saltar y terminar' : 'Saltar';
  actualizarBloqueo();
}

function actualizarBloqueo() {
  if (!actual) return;
  const faltan = Math.max(0, Math.ceil((desbloqueoEn - performance.now()) / 1000));
  const bloqueada = faltan > 0 || ocupada;
  elementos.siguiente.disabled = bloqueada || opcionElegida === null;
  elementos.saltar.disabled = bloqueada;
  elementos.anterior.disabled = actual.orden === 1 || ocupada;
  elementos.terminar.disabled = ocupada;
  elementos.cuentaMinima.textContent = faltan > 0
    ? `Podrás avanzar en ${faltan} segundo(s).`
    : '';
}

async function cargarPregunta(numero) {
  ocupada = true;
  actualizarBloqueo();
  try {
    const { pregunta } = await pedir(`/api/examen/pregunta/${numero}`);
    actual = pregunta;
    opcionElegida = pregunta.opcionId;
    opcionOriginal = pregunta.opcionId;
    inicioVista = performance.now();
    desbloqueoEn = performance.now() + pregunta.segundosParaAvanzar * 1000;
    sincronizarReloj(pregunta.segundosRestantes);
    elementos.estadoGuardado.textContent = pregunta.respondida ? 'Respuesta guardada.' : 'Sin cambios pendientes.';
    elementos.estadoGuardado.className = 'estado-guardado';
    elementos.examen.hidden = false;
    elementos.espera.hidden = true;
    limpiarError();
  } catch (err) {
    mostrarError(err.message);
    await actualizarEstado();
  } finally {
    ocupada = false;
    if (actual) pintarPregunta();
  }
}

async function guardar(opcionId = opcionElegida) {
  ocupada = true;
  actualizarBloqueo();
  limpiarError();
  elementos.estadoGuardado.textContent = 'Guardando…';
  elementos.estadoGuardado.className = 'estado-guardado estado-guardado--guardando';
  try {
    const { respuesta } = await pedir('/api/examen/responder', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ n: actual.orden, opcionId, segundos: segundosTotales() }),
    }, true);
    actual.segundosEnPantalla = respuesta.segundosEnPantalla;
    opcionElegida = respuesta.opcionId;
    opcionOriginal = respuesta.opcionId;
    sincronizarReloj(respuesta.segundosRestantes);
    elementos.estadoGuardado.textContent = 'Respuesta guardada.';
    elementos.estadoGuardado.className = 'estado-guardado estado-guardado--guardado';
    return true;
  } catch (err) {
    elementos.estadoGuardado.textContent = 'No se guardó. Revisa la conexión y vuelve a intentarlo.';
    elementos.estadoGuardado.className = 'estado-guardado';
    mostrarError(err.message);
    return false;
  } finally {
    ocupada = false;
    actualizarBloqueo();
  }
}

async function confirmarEntrega(motivo) {
  const { estado } = await pedir('/api/examen/estado');
  sincronizarReloj(estado.segundosRestantes);
  const mensaje = estado.sinResponder === 0
    ? 'Respondiste todas las preguntas. ¿Entregar la prueba?'
    : `Te quedan ${estado.sinResponder} pregunta(s) sin responder. ¿Entregar de todas formas?`;
  if (!window.confirm(mensaje)) return;

  ocupada = true;
  actualizarBloqueo();
  try {
    await pedir('/api/examen/entregar', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ motivo }),
    }, true);
    window.location.replace('/estudiante/resultado.html');
  } catch (err) {
    mostrarError(`No se pudo entregar. ${err.message} Vuelve a intentarlo.`);
    ocupada = false;
    actualizarBloqueo();
  }
}

async function avanzar(opcionId) {
  if (!(await guardar(opcionId))) return;
  if (actual.orden === actual.total) {
    await confirmarEntrega('ultima_pregunta');
  } else {
    await cargarPregunta(actual.orden + 1);
  }
}

async function volver() {
  if (opcionElegida !== opcionOriginal && !(await guardar())) return;
  await cargarPregunta(actual.orden - 1);
}

function mostrarEspera(titulo, texto) {
  elementos.tituloEspera.textContent = titulo;
  elementos.textoEspera.textContent = texto;
  elementos.espera.hidden = false;
  elementos.examen.hidden = true;
}

async function actualizarEstado() {
  try {
    const { estado } = await pedir('/api/examen/estado');
    sincronizarReloj(estado.segundosRestantes);
    if (estado.entregado) {
      window.location.replace('/estudiante/resultado.html');
      return;
    }
    if (estado.sesion.estado === 'abierta') {
      actual = null;
      mostrarEspera('Espera a que tu docente inicie la prueba', `Ya estás dentro, ${estado.estudiante}.`);
    } else if (estado.sesion.estado === 'pausada') {
      actual = null;
      mostrarEspera('La prueba está en pausa', 'Espera indicaciones de tu docente.');
    } else if (estado.sesion.estado === 'en_curso' && !actual) {
      await cargarPregunta(estado.preguntaActual);
    }
  } catch (err) {
    if (err.estado === 401) window.location.replace('/');
    else mostrarEspera('No pudimos conectar con el servidor', 'La prueba no avanzará hasta recuperar la conexión.');
  }
}

elementos.anterior.addEventListener('click', volver);
elementos.saltar.addEventListener('click', () => avanzar(null));
elementos.siguiente.addEventListener('click', () => avanzar(opcionElegida));
elementos.terminar.addEventListener('click', () => confirmarEntrega('manual'));

window.setInterval(() => {
  pintarReloj();
  actualizarBloqueo();
}, 250);
window.setInterval(actualizarEstado, 5000);
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) actualizarEstado();
});

await actualizarEstado();
