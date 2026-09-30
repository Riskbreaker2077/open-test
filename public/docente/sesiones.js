import { api } from './panel.js';
import { crearIcono } from './iconos.js';

const editor = document.getElementById('editor');
const formulario = document.getElementById('formulario');
const nueva = document.getElementById('nueva');
const editorCancelar = document.getElementById('editor-cancelar');
const banco = document.getElementById('banco');
const cursos = document.getElementById('cursos');
const sinCursos = document.getElementById('sin-cursos');
const nivelFeedback = document.getElementById('nivel_feedback');
const avisoFeedback = document.getElementById('aviso-feedback');
const error = document.getElementById('error');
const solapamiento = document.getElementById('solapamiento');
const listado = document.getElementById('listado');
const listaEnvoltura = document.getElementById('lista-envoltura');
const vacio = document.getElementById('vacio');
const vacioNueva = document.getElementById('vacio-nueva');

const botonPapelera = document.getElementById('boton-papelera');
botonPapelera.prepend(crearIcono('borrar'));
const papeleraContador = document.getElementById('papelera-contador');
const papelera = document.getElementById('papelera');
const papeleraVacio = document.getElementById('papelera-vacio');
const listadoPapelera = document.getElementById('listado-papelera');

const feedbackDialogo = document.getElementById('feedback');
const feedbackNombre = document.getElementById('feedback-nombre');
const feedbackSelect = document.getElementById('feedback-select');
const feedbackAviso = document.getElementById('feedback-aviso');
const feedbackError = document.getElementById('feedback-error');
const feedbackGuardar = document.getElementById('feedback-guardar');

const enviarPortalDialogo = document.getElementById('enviar-portal');
const enviarPortalNombre = document.getElementById('enviar-portal-nombre');
const enviarPortalError = document.getElementById('enviar-portal-error');
const enviarPortalExito = document.getElementById('enviar-portal-exito');
const enviarPortalCampo = document.getElementById('enviar-portal-campo');
const enviarPortalSelect = document.getElementById('enviar-portal-select');
const enviarPortalBoton = document.getElementById('enviar-portal-enviar');

const CAMPOS = ['nombre', 'n_preguntas', 'duracion_minutos', 'segundos_minimos_pregunta'];

const ETIQUETAS = {
  borrador: 'Borrador',
  abierta: 'Abierta — esperando',
  en_curso: 'En curso',
  pausada: 'En pausa',
  cerrada: 'Cerrada',
};

// Color de la pastilla de estado: un vistazo basta, sin tener que leer la
// palabra completa fila por fila.
const PASTILLA_ESTADO = {
  borrador: 'neutro',
  abierta: 'ambar',
  en_curso: 'verde',
  pausada: 'rojo',
  cerrada: 'azul',
};

function mostrarError(mensaje) {
  error.textContent = mensaje;
  error.hidden = false;
}

nivelFeedback.addEventListener('change', () => {
  avisoFeedback.hidden = nivelFeedback.value !== 'completo';
});

let preguntasPorBanco = new Map();

/**
 * El docente tiene que ver el efecto del tamaño de su banco antes de abrir,
 * no descubrirlo el día del examen: con 25 preguntas y 20 sorteadas, dos
 * compañeros comparten 16 y la protección se desploma.
 */
function actualizarSolapamiento() {
  const total = preguntasPorBanco.get(Number(banco.value));
  const n = Number(document.getElementById('n_preguntas').value);

  if (!total || !n) {
    solapamiento.textContent = '';
    return;
  }

  if (total < n) {
    solapamiento.textContent =
      `Este banco tiene ${total} preguntas y no alcanza para sortear ${n}. No podrás abrirla.`;
    return;
  }

  const comunes = (n * n) / total;
  solapamiento.textContent =
    `Con ${total} preguntas en el banco y ${n} por estudiante, dos compañeros ` +
    `compartirán unas ${comunes.toFixed(1)} preguntas de ${n}` +
    (comunes > n / 2 ? ' — un banco más grande protegería bastante más.' : '.');
}

banco.addEventListener('change', actualizarSolapamiento);
document.getElementById('n_preguntas').addEventListener('input', actualizarSolapamiento);

// Los cursos salen de los estudiantes que existen de verdad: escribirlos a
// mano acabaría en «10 A» contra «10A» y en un aula entera que no puede entrar.
async function cargarOpciones() {
  const [{ bancos }, { cursos: disponibles }] = await Promise.all([
    api('/api/docente/bancos'),
    api('/api/docente/estudiantes'),
  ]);

  preguntasPorBanco = new Map(bancos.map((b) => [b.id, b.preguntas]));
  banco.replaceChildren(
    ...bancos.map((b) => new Option(`${b.nombre} (${b.preguntas} preguntas)`, b.id)),
  );
  actualizarSolapamiento();
  if (bancos.length === 0) banco.append(new Option('Carga un banco primero', ''));

  sinCursos.hidden = disponibles.length > 0;
  cursos.replaceChildren(
    ...disponibles.map(({ curso, total }) => {
      const etiqueta = document.createElement('label');
      etiqueta.className = 'casilla';

      const casilla = document.createElement('input');
      casilla.type = 'checkbox';
      casilla.value = curso;
      casilla.name = 'curso';

      const texto = document.createElement('span');
      texto.textContent = `${curso} (${total})`;

      etiqueta.append(casilla, texto);
      return etiqueta;
    }),
  );
}

// --- Diálogo "Nueva evaluación" -------------------------------------------

function abrirNuevaEvaluacion() {
  error.hidden = true;
  editor.showModal();
}

nueva.addEventListener('click', abrirNuevaEvaluacion);
vacioNueva.addEventListener('click', abrirNuevaEvaluacion);

editorCancelar.addEventListener('click', () => editor.close());

formulario.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  error.hidden = true;

  const datos = { banco_id: banco.value, nivel_feedback: nivelFeedback.value };
  for (const campo of CAMPOS) datos[campo] = document.getElementById(campo).value;
  datos.cursos = [...cursos.querySelectorAll('input:checked')].map((c) => c.value);

  const respuesta = await api('/api/docente/sesiones', {
    method: 'POST',
    body: JSON.stringify(datos),
  });

  if (!respuesta.ok) {
    mostrarError(respuesta.mensaje);
    return;
  }
  formulario.reset();
  avisoFeedback.hidden = true;
  actualizarSolapamiento();
  editor.close();
  await recargar();
});

// --- Listado ----------------------------------------------------------------

function accion(texto, alPulsar) {
  const boton = document.createElement('button');
  boton.className = 'boton boton--secundario boton--pequeno';
  boton.type = 'button';
  boton.textContent = texto;
  boton.addEventListener('click', alPulsar);
  return boton;
}

// Acciones repetidas en toda fila (cualquier estado): íconos, no texto, para
// que la columna no compita en ancho con los datos de la evaluación.
function botonIcono(nombreIcono, titulo, alPulsar, claseExtra = '') {
  const boton = document.createElement('button');
  boton.type = 'button';
  boton.className = `boton-fila ${claseExtra}`.trim();
  boton.append(crearIcono(nombreIcono));
  boton.title = titulo;
  boton.setAttribute('aria-label', titulo);
  boton.addEventListener('click', alPulsar);
  return boton;
}

function enlaceIcono(nombreIcono, titulo, href) {
  const enlace = document.createElement('a');
  enlace.className = 'boton-fila';
  enlace.append(crearIcono(nombreIcono));
  enlace.title = titulo;
  enlace.setAttribute('aria-label', titulo);
  enlace.href = href;
  return enlace;
}

function botonRenombrar(sesion) {
  return botonIcono('editar', 'Renombrar', async () => {
    const nombre = window.prompt('Nuevo nombre de la evaluación:', sesion.nombre);
    if (nombre === null || nombre.trim() === '' || nombre.trim() === sesion.nombre) return;
    const respuesta = await api(`/api/docente/sesiones/${sesion.id}/nombre`, {
      method: 'PATCH',
      body: JSON.stringify({ nombre }),
    });
    if (!respuesta.ok) window.alert(respuesta.mensaje);
    await recargar();
  });
}

function botonBorrar(sesion) {
  return botonIcono('borrar', 'Borrar', async () => {
    if (!window.confirm(
      `¿Borrar "${sesion.nombre}"? Irá a la papelera durante 30 días por si hace falta restaurarla.`,
    )) return;
    const respuesta = await api(`/api/docente/sesiones/${sesion.id}`, { method: 'DELETE' });
    if (!respuesta.ok) window.alert(respuesta.mensaje);
    await recargar();
  }, 'boton-fila--peligro');
}

async function transicion(ruta, confirmacion) {
  if (confirmacion && !window.confirm(confirmacion)) return;

  const respuesta = await api(ruta, { method: 'POST' });
  if (!respuesta.ok) {
    window.alert(respuesta.mensaje);
    return;
  }
  await recargar();
}

function acciones(sesion) {
  const grupo = document.createElement('div');
  grupo.className = 'acciones-fila';
  grupo.append(botonRenombrar(sesion));

  if (sesion.estado === 'borrador') {
    grupo.append(accion('Abrir', () => transicion(`/api/docente/sesiones/${sesion.id}/abrir`)));
  } else if (sesion.estado !== 'cerrada') {
    grupo.append(
      accion('Monitorear', () => {
        window.location.href = `/docente/monitoreo.html?sesion=${sesion.id}`;
      }),
      accion('Proyectar', () => {
        window.location.href = `/proyeccion/?sesion=${sesion.id}`;
      }),
      accion('Cerrar', () =>
        transicion(
          `/api/docente/sesiones/${sesion.id}/cerrar`,
          `${sesion.dentro - sesion.entregados} estudiante(s) siguen presentando. ` +
            '¿Cerrar la evaluación de todas formas?',
        ),
      ),
    );
  } else {
    grupo.append(
      enlaceIcono('descargar', 'Descargar resultados', `/docente/resultados.html?sesion=${sesion.id}`),
      botonIcono('enviar', 'Enviar al portal', () => abrirEnvioPortal(sesion)),
      botonIcono('comentario', 'Retroalimentación', () => abrirFeedback(sesion)),
    );
  }

  // El ícono de borrar va en toda fila, sin importar el estado: si no se
  // puede (evaluación abierta/en curso/pausada), el servidor lo rechaza y
  // el mensaje ("Cierra la evaluación antes de borrarla") ya lo explica.
  grupo.append(botonBorrar(sesion));

  return grupo;
}

// Lo que identifica la fila (negrita, oscuro) + lo que solo la describe
// (tenue, debajo): banco y cursos no compiten con el nombre de la prueba.
function celdaEvaluacion(sesion) {
  const td = document.createElement('td');
  const caja = document.createElement('div');
  caja.className = 'celda-titulo';
  const nombre = document.createElement('strong');
  nombre.textContent = sesion.nombre;
  nombre.title = sesion.nombre;

  // Dos líneas fijas (banco, cursos), cada una truncada con "…" si es muy
  // larga, en vez de una sola línea combinada que se parte donde alcance:
  // así toda fila mide siempre lo mismo, sin importar el largo real.
  const cursos = sesion.cursos.replaceAll(',', ', ');
  const lineaBanco = document.createElement('small');
  lineaBanco.textContent = sesion.banco;
  lineaBanco.title = sesion.banco;
  const lineaCursos = document.createElement('small');
  lineaCursos.textContent = cursos;
  lineaCursos.title = cursos;

  caja.append(nombre, lineaBanco, lineaCursos);
  td.append(caja);
  return td;
}

// Datos de apoyo (cuántas preguntas, cuánto comparten dos estudiantes): se
// consultan, no se escanean fila a fila, así que van tenues y en una sola
// celda en vez de dos columnas separadas peleando por atención.
function celdaPreguntas(sesion) {
  const td = document.createElement('td');
  const caja = document.createElement('div');
  caja.className = 'celda-apoyo';
  const principal = document.createElement('strong');
  principal.textContent = `${sesion.n_preguntas} de ${sesion.preguntas_banco}`;
  const secundaria = document.createElement('small');
  secundaria.textContent = `~${sesion.solapamiento} en común entre dos`;
  caja.append(principal, secundaria);
  td.append(caja);
  return td;
}

function celdaEstado(sesion) {
  const td = document.createElement('td');
  const pastilla = document.createElement('span');
  pastilla.className = `pastilla pastilla--${PASTILLA_ESTADO[sesion.estado] ?? 'neutro'}`;
  pastilla.textContent = ETIQUETAS[sesion.estado] ?? sesion.estado;
  td.append(pastilla);
  return td;
}

// Antes de convocar (borrador) no hay nada que progresar todavía: un guion
// dice eso mejor que un "0 dentro · 0 entregados" que parece un error.
function celdaProgreso(sesion) {
  const td = document.createElement('td');
  td.className = 'texto-discreto';
  if (sesion.estado === 'borrador') {
    td.textContent = '—';
  } else if (sesion.estado === 'cerrada') {
    td.textContent = `${sesion.entregados ?? 0} entregaron`;
  } else {
    td.textContent = `${sesion.dentro} dentro · ${sesion.entregados ?? 0} entregados`;
  }
  return td;
}

async function recargar() {
  const { sesiones } = await api('/api/docente/sesiones');
  listaEnvoltura.hidden = sesiones.length === 0;
  vacio.hidden = sesiones.length > 0;

  const filas = sesiones.map((sesion) => {
    const tr = document.createElement('tr');
    const tdAcciones = document.createElement('td');
    tdAcciones.append(acciones(sesion));
    tr.append(celdaEvaluacion(sesion), celdaPreguntas(sesion), celdaEstado(sesion), celdaProgreso(sesion), tdAcciones);
    return tr;
  });

  listado.replaceChildren(...filas);
  await recargarPapelera();
}

const fecha = (iso) => new Date(iso).toLocaleDateString('es-CO', { day: 'numeric', month: 'long' });

// --- Retroalimentación de una evaluación cerrada --------------------------

let sesionParaFeedback = null;

function abrirFeedback(sesion) {
  sesionParaFeedback = sesion;
  feedbackNombre.textContent = `"${sesion.nombre}"`;
  feedbackSelect.value = sesion.nivel_feedback;
  feedbackAviso.hidden = sesion.nivel_feedback !== 'completo';
  mostrarTexto(feedbackError, '');
  feedbackDialogo.showModal();
}

feedbackSelect.addEventListener('change', () => {
  feedbackAviso.hidden = feedbackSelect.value !== 'completo';
});

feedbackGuardar.addEventListener('click', async () => {
  if (!sesionParaFeedback) return;
  if (feedbackSelect.value === 'completo' && !window.confirm(
    'La retroalimentación completa revela las respuestas correctas. ¿Continuar?',
  )) return;

  const respuesta = await api(`/api/docente/sesiones/${sesionParaFeedback.id}/feedback`, {
    method: 'PATCH',
    body: JSON.stringify({ nivel_feedback: feedbackSelect.value }),
  });
  if (!respuesta.ok) {
    mostrarTexto(feedbackError, respuesta.mensaje);
    return;
  }
  feedbackDialogo.close();
  await recargar();
});

feedbackDialogo.querySelectorAll('[data-cerrar]').forEach((el) => {
  el.addEventListener('click', () => feedbackDialogo.close());
});

// --- Enviar al portal (043/044): el ícono de enviar hace en un diálogo lo mismo
// que la página "Enviar al portal", pero sin salir de Evaluaciones. -------

function mostrarTexto(elemento, texto) {
  elemento.textContent = texto ?? '';
  elemento.hidden = !texto;
}

let sesionParaEnviar = null;

function etiquetaEvaluacionPortal(evaluacion) {
  return `${evaluacion.periodo} · ${evaluacion.asignatura} · ${evaluacion.modulo} (${evaluacion.codigo})`;
}

async function abrirEnvioPortal(sesion) {
  sesionParaEnviar = sesion;
  enviarPortalNombre.textContent = `"${sesion.nombre}" (${sesion.cursos.replaceAll(',', ', ')})`;
  mostrarTexto(enviarPortalError, '');
  mostrarTexto(enviarPortalExito, '');
  enviarPortalCampo.hidden = false;
  enviarPortalBoton.hidden = false;
  enviarPortalSelect.replaceChildren(new Option('Buscando…', ''));
  enviarPortalDialogo.showModal();

  const respuesta = await api('/api/docente/portal/evaluaciones-disponibles');
  if (!respuesta.ok) {
    enviarPortalCampo.hidden = true;
    enviarPortalBoton.hidden = true;
    mostrarTexto(enviarPortalError, respuesta.mensaje);
    return;
  }
  if (respuesta.evaluaciones.length === 0) {
    enviarPortalCampo.hidden = true;
    enviarPortalBoton.hidden = true;
    mostrarTexto(enviarPortalError, 'El portal no tiene ninguna evaluación disponible para recibir esta.');
    return;
  }
  enviarPortalSelect.replaceChildren(
    new Option('Elige a cuál se va a cargar…', ''),
    ...respuesta.evaluaciones.map((ev) => new Option(etiquetaEvaluacionPortal(ev), ev.codigo)),
  );
}

enviarPortalBoton.addEventListener('click', async () => {
  if (!sesionParaEnviar) return;
  const codigo = enviarPortalSelect.value;
  if (!codigo) {
    mostrarTexto(enviarPortalError, 'Elige a cuál evaluación del portal se va a cargar.');
    return;
  }
  mostrarTexto(enviarPortalError, '');
  mostrarTexto(enviarPortalExito, '');
  enviarPortalBoton.disabled = true;
  enviarPortalBoton.textContent = 'Enviando…';
  try {
    const elegido = await api(`/api/docente/sesiones/${sesionParaEnviar.id}/codigo-portal`, {
      method: 'PATCH',
      body: JSON.stringify({ codigo }),
    });
    if (!elegido.ok) {
      mostrarTexto(enviarPortalError, elegido.mensaje);
      return;
    }
    const envio = await api('/api/docente/portal/enviar', { method: 'POST' });
    if (!envio.ok) {
      mostrarTexto(enviarPortalError, envio.mensaje);
      return;
    }
    const propio = envio.resultados.find((r) => r.id === sesionParaEnviar.id);
    if (propio?.ok) {
      mostrarTexto(enviarPortalExito, 'Cargado en la plataforma.');
    } else {
      mostrarTexto(enviarPortalError, propio?.mensaje ?? 'No se pudo enviar. Vuelve a intentarlo.');
    }
    await recargar();
  } finally {
    enviarPortalBoton.disabled = false;
    enviarPortalBoton.textContent = 'Enviar';
  }
});

enviarPortalDialogo.querySelectorAll('[data-cerrar]').forEach((el) => {
  el.addEventListener('click', () => enviarPortalDialogo.close());
});

// --- Papelera (diálogo aparte: es poco habitual, no compite por espacio) --

botonPapelera.addEventListener('click', () => papelera.showModal());
papelera.querySelectorAll('[data-cerrar]').forEach((el) => el.addEventListener('click', () => papelera.close()));

async function recargarPapelera() {
  const { papelera: filas = [] } = await api('/api/docente/papelera');
  papeleraContador.hidden = filas.length === 0;
  papeleraContador.textContent = filas.length;
  papeleraVacio.hidden = filas.length > 0;

  const thead = document.createElement('thead');
  thead.innerHTML = '<tr><th>Evaluación</th><th>Cursos</th><th>Intentos</th><th>Se elimina sola</th><th>Acciones</th></tr>';
  const tbody = document.createElement('tbody');
  for (const fila of filas) {
    const tr = document.createElement('tr');
    for (const valor of [fila.nombre, fila.cursos.replaceAll(',', ', '), fila.intentos, `el ${fecha(fila.se_elimina_en)}`]) {
      const td = document.createElement('td');
      td.textContent = valor;
      tr.append(td);
    }
    const td = document.createElement('td');
    const grupo = document.createElement('div');
    grupo.className = 'acciones-fila';
    grupo.append(
      accion('Restaurar', async () => {
        const respuesta = await api(`/api/docente/papelera/${fila.id}/restaurar`, { method: 'POST' });
        if (!respuesta.ok) window.alert(respuesta.mensaje);
        await recargar();
      }),
      accion('Borrar ya', async () => {
        if (!window.confirm(`¿Eliminar "${fila.nombre}" para siempre? Sus resultados no se podrán recuperar.`)) return;
        const respuesta = await api(`/api/docente/papelera/${fila.id}`, { method: 'DELETE' });
        if (!respuesta.ok) window.alert(respuesta.mensaje);
        await recargar();
      }),
    );
    td.append(grupo);
    tr.append(td);
    tbody.append(tr);
  }
  listadoPapelera.replaceChildren(thead, tbody);
}

await cargarOpciones();
await recargar();
