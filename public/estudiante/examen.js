import { renderizarPregunta, renderizarGrupo } from '/shared/pregunta.js';

const elementos = {
  examen: document.getElementById('examen'),
  espera: document.getElementById('espera'),
  tituloEspera: document.getElementById('titulo-espera'),
  textoEspera: document.getElementById('texto-espera'),
  progreso: document.getElementById('progreso'),
  reloj: document.getElementById('reloj'),
  pregunta: document.getElementById('pregunta'),
  grupo: document.getElementById('grupo'),
  estadoGuardado: document.getElementById('estado-guardado'),
  error: document.getElementById('error'),
  anterior: document.getElementById('anterior'),
  saltar: document.getElementById('saltar'),
  siguiente: document.getElementById('siguiente'),
  cuentaMinima: document.getElementById('cuenta-minima'),
  pausarSalir: document.getElementById('pausar-salir'),
};

let actual = null;
let opcionElegida = null;
let opcionOriginal = null;
let inicioVista = 0;
let desbloqueoEn = 0;
let relojServidor = null;
let ocupada = false;
// Selecciones de la pantalla de grupo: { [pregunta_id]: idElegido }.
// El id elegido es un opcion_id (cloze, contexto compartido) o un id de
// entrada del banco (matching).
let elegidasGrupo = {};

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

/** Miembros de la pantalla actual: solo la pregunta, o todo el grupo. */
function miembrosDePantalla() {
  if (actual.grupo && (actual.grupo.tipo === 'banco_opciones' || actual.grupo.tipo === 'texto_con_blancos')) {
    return [actual, ...actual.grupo.preguntas].sort((a, b) => a.orden - b.orden);
  }
  return [actual];
}

function estaEnPantallaDeGrupo() {
  return Boolean(actual?.grupo && actual.grupo.tipo !== 'contexto_compartido');
}

function pintarPregunta() {
  if (actual.grupo && actual.grupo.tipo === 'contexto_compartido') {
    // Una pregunta por pantalla, con el contexto del grupo pintado una sola
    // vez encima (el contexto propio de la miembro viene vacío del servidor).
    elementos.grupo.replaceChildren(renderizarGrupo(actual.grupo, { preguntas: [] }));
    elementos.grupo.hidden = false;
    const tarjeta = renderizarPregunta({ ...actual, contexto: [] }, {
      elegida: opcionElegida,
      alElegir: (indice, opcion) => {
        opcionElegida = opcion.id;
        limpiarError();
        pintarPregunta();
      },
    });
    elementos.pregunta.replaceChildren(tarjeta);
    elementos.pregunta.hidden = false;
    elementos.progreso.textContent = `Pregunta ${actual.orden} de ${actual.total}`;
  } else if (actual.grupo) {
    const miembros = miembrosDePantalla();
    const tarjeta = renderizarGrupo(actual.grupo, {
      preguntas: miembros,
      elegidas: elegidasGrupo,
      alElegir: (miembro, idElegido) => {
        elegidasGrupo[miembro.pregunta_id] = idElegido;
        limpiarError();
        pintarPregunta();
      },
    });
    elementos.grupo.replaceChildren(tarjeta);
    elementos.grupo.hidden = false;
    elementos.pregunta.replaceChildren();
    elementos.pregunta.hidden = true;
    elementos.progreso.textContent = `Pregunta ${actual.orden} de ${actual.total}`;
  } else {
    const tarjeta = renderizarPregunta(actual, {
      elegida: opcionElegida,
      alElegir: (indice, opcion) => {
        opcionElegida = opcion.id;
        limpiarError();
        pintarPregunta();
      },
    });
    elementos.pregunta.replaceChildren(tarjeta);
    elementos.pregunta.hidden = false;
    elementos.grupo.replaceChildren();
    elementos.grupo.hidden = true;
    elementos.progreso.textContent = `Pregunta ${actual.orden} de ${actual.total}`;
  }

  const esUltima = ultimoOrdenDePantalla() === actual.total;
  elementos.siguiente.textContent = esUltima ? 'Guardar y terminar' : 'Siguiente';
  elementos.saltar.textContent = esUltima ? 'Saltar y terminar' : 'Saltar';
  actualizarBloqueo();
}

/** El último orden visible de la pantalla actual (para saber si es la final). */
function ultimoOrdenDePantalla() {
  if (estaEnPantallaDeGrupo()) {
    return Math.max(...miembrosDePantalla().map((m) => m.orden));
  }
  return actual.orden;
}

function todosRespondidos() {
  if (!estaEnPantallaDeGrupo()) return opcionElegida !== null;
  return miembrosDePantalla().every((m) => elegidasGrupo[m.pregunta_id] !== undefined);
}

function actualizarBloqueo() {
  if (!actual) return;
  const faltan = Math.max(0, Math.ceil((desbloqueoEn - performance.now()) / 1000));
  const bloqueada = faltan > 0 || ocupada;
  elementos.siguiente.disabled = bloqueada || !todosRespondidos();
  elementos.saltar.disabled = bloqueada;
  elementos.anterior.disabled = actual.orden === 1 || ocupada;
  elementos.pausarSalir.disabled = ocupada;
  elementos.cuentaMinima.textContent = faltan > 0
    ? `Podés avanzar en ${faltan} segundo(s).`
    : '';
}

/** { [pregunta_id]: idElegido } a partir de lo que trae la API. */
function leerElegidasDe(miembros) {
  const mapa = {};
  for (const miembro of miembros) {
    if (miembro.tipo_item === 'miembro_banco_opciones') {
      if (miembro.respuestaBancoId != null) mapa[miembro.pregunta_id] = miembro.respuestaBancoId;
    } else if (miembro.opcionId != null) {
      mapa[miembro.pregunta_id] = miembro.opcionId;
    }
  }
  return mapa;
}

async function cargarPregunta(numero) {
  ocupada = true;
  actualizarBloqueo();
  try {
    const { pregunta } = await pedir(`/api/examen/pregunta/${numero}`);
    actual = pregunta;
    opcionElegida = pregunta.opcionId;
    opcionOriginal = pregunta.opcionId;
    elegidasGrupo = pregunta.grupo
      ? leerElegidasDe([pregunta, ...miembrosDePantalla()])
      : {};
    inicioVista = performance.now();
    desbloqueoEn = performance.now() + pregunta.segundosParaAvanzar * 1000;
    sincronizarReloj(pregunta.segundosRestantes);
    const pendientes = estaEnPantallaDeGrupo()
      ? miembrosDePantalla().some((m) => elegidasGrupo[m.pregunta_id] === undefined)
      : !pregunta.respondida;
    elementos.estadoGuardado.textContent = pendientes ? 'Sin cambios pendientes.' : 'Respuesta guardada.';
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

async function guardarMiembro(miembro, idElegido) {
  const esMatching = miembro.tipo_item === 'miembro_banco_opciones';
  const cuerpo = esMatching
    ? { n: miembro.orden, respuestaBancoId: idElegido ?? null }
    : { n: miembro.orden, opcionId: idElegido ?? null };
  const { respuesta } = await pedir('/api/examen/responder', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ...cuerpo, segundos: segundosTotales() }),
  }, true);
  sincronizarReloj(respuesta.segundosRestantes);
  return respuesta;
}

async function guardar(opcionId = opcionElegida) {
  ocupada = true;
  actualizarBloqueo();
  limpiarError();
  elementos.estadoGuardado.textContent = 'Guardando…';
  elementos.estadoGuardado.className = 'estado-guardado estado-guardado--guardando';
  try {
    if (estaEnPantallaDeGrupo()) {
      const miembros = miembrosDePantalla();
      for (const miembro of miembros) {
        await guardarMiembro(miembro, elegidasGrupo[miembro.pregunta_id] ?? null);
      }
    } else {
      const respuesta = await guardarMiembro(actual, opcionId);
      actual.segundosEnPantalla = respuesta.segundosEnPantalla;
      opcionElegida = respuesta.opcionId;
      opcionOriginal = respuesta.opcionId;
    }
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
    mostrarError(`${err.message} Usa "Anterior" para revisar las preguntas que faltan.`);
    ocupada = false;
    actualizarBloqueo();
  }
}

async function pausarYSalir() {
  if (!window.confirm('Vas a pausar la evaluación para todos. ¿Continuar?')) return;

  ocupada = true;
  actualizarBloqueo();
  try {
    await pedir('/api/examen/pausar', { method: 'POST' }, true);
    window.location.replace('/');
  } catch (err) {
    mostrarError(`No se pudo pausar. ${err.message}`);
    ocupada = false;
    actualizarBloqueo();
  }
}

async function avanzar(idElegido) {
  if (!(await guardar(idElegido))) return;
  const siguienteOrden = ultimoOrdenDePantalla() + 1;
  if (ultimoOrdenDePantalla() === actual.total) {
    await confirmarEntrega('ultima_pregunta');
  } else {
    await cargarPregunta(siguienteOrden);
  }
}

async function volver() {
  if (estaEnPantallaDeGrupo()) {
    if (!(await guardar())) return;
    await cargarPregunta(actual.orden - 1);
    return;
  }
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
elementos.siguiente.addEventListener('click', () => avanzar(estaEnPantallaDeGrupo() ? undefined : opcionElegida));
elementos.pausarSalir.addEventListener('click', pausarYSalir);

window.setInterval(() => {
  pintarReloj();
  actualizarBloqueo();
}, 250);
window.setInterval(actualizarEstado, 5000);
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) actualizarEstado();
});

await actualizarEstado();
