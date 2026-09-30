import { api } from './panel.js';
import { LETRAS, renderizarGrupo, renderizarPregunta } from '/shared/pregunta.js';
import { crearIcono } from './iconos.js';

const importarDialogo = document.getElementById('importar');
const abrirImportar = document.getElementById('abrir-importar');
const imagenes = document.getElementById('imagenes');
const estadoImagenes = document.getElementById('estado-imagenes');
const nombre = document.getElementById('nombre');
const paquete = document.getElementById('paquete');
const errores = document.getElementById('errores');
const listaErrores = document.getElementById('lista-errores');
const previsualizacion = document.getElementById('previsualizacion');
const resumenCarga = document.getElementById('resumen-carga');
const avisos = document.getElementById('avisos');
const muestra = document.getElementById('muestra');
const confirmar = document.getElementById('confirmar');
const listado = document.getElementById('listado');
const listaCabecera = document.getElementById('lista-cabecera');
const listaEnvoltura = document.getElementById('lista-envoltura');
const vacio = document.getElementById('vacio');
const vacioImportar = document.getElementById('vacio-importar');
const seccionLista = document.getElementById('seccion-lista');
const detalle = document.getElementById('detalle');
const detalleTitulo = document.getElementById('detalle-titulo');
const detallePreguntas = document.getElementById('detalle-preguntas');
const cerrarDetalle = document.getElementById('cerrar-detalle');
const nuevoBanco = document.getElementById('nuevo-banco');
const errorNuevoBanco = document.getElementById('error-nuevo-banco');
const agregarPregunta = document.getElementById('agregar-pregunta');

const editorPregunta = document.getElementById('editor-pregunta');
const editorPreguntaTitulo = document.getElementById('editor-pregunta-titulo');
const editorContexto = document.getElementById('editor-contexto');
const editorImagen = document.getElementById('editor-imagen');
const editorImagenEstado = document.getElementById('editor-imagen-estado');
const editorEnunciado = document.getElementById('editor-enunciado');
const editorOpcionesContenedor = document.getElementById('editor-opciones');
const formularioPregunta = document.getElementById('formulario-pregunta');
const editorPreguntaErrores = document.getElementById('editor-pregunta-errores');
const editorPreguntaListaErrores = document.getElementById('editor-pregunta-lista-errores');
const editorPreguntaCancelar = document.getElementById('editor-pregunta-cancelar');

let paquetePendiente = null;

function limpiar() {
  errores.hidden = true;
  previsualizacion.hidden = true;
  confirmar.hidden = true;
  avisos.hidden = true;
  listaErrores.replaceChildren();
  muestra.replaceChildren();
  paquetePendiente = null;
}

abrirImportar.addEventListener('click', () => importarDialogo.showModal());
vacioImportar.addEventListener('click', () => importarDialogo.showModal());
importarDialogo.addEventListener('close', () => {
  limpiar();
  paquete.value = '';
  nombre.value = '';
});
importarDialogo.querySelectorAll('[data-cerrar]').forEach((el) => {
  el.addEventListener('click', () => importarDialogo.close());
});

function mostrarPrevisualizacion(respuesta) {
  if (!nombre.value) nombre.value = respuesta.nombre;

  const { total, conContexto, conImagen, imagenesIncluidas } = respuesta.resumen;
  resumenCarga.textContent =
    `${total} pregunta(s): ${conContexto} con contexto y ${conImagen} con imagen.` +
    (imagenesIncluidas === undefined ? '' : ` El ZIP incluye ${imagenesIncluidas} imagen(es).`);

  if (respuesta.avisos.length > 0) {
    avisos.textContent = respuesta.avisos.join(' ');
    avisos.hidden = false;
  }

  muestra.replaceChildren(
    ...respuesta.muestra.map((pregunta) =>
      renderizarPregunta(pregunta, {
        correcta: pregunta.opciones.findIndex((o) => o.es_correcta),
        mostrarJustificacion: true,
      }),
    ),
  );
  previsualizacion.hidden = false;
  confirmar.hidden = false;
}

function mostrarErrores(lista) {
  listaErrores.replaceChildren(
    ...lista.map((mensaje) => {
      const li = document.createElement('li');
      li.textContent = mensaje;
      return li;
    }),
  );
  errores.hidden = false;
}

imagenes.addEventListener('change', async () => {
  const ficheros = [...imagenes.files];
  if (ficheros.length === 0) return;

  const pesadas = [];
  for (const fichero of ficheros) {
    estadoImagenes.textContent = `Subiendo ${fichero.name}…`;
    const res = await fetch(`/api/docente/imagenes?nombre=${encodeURIComponent(fichero.name)}`, {
      method: 'POST',
      headers: { 'content-type': fichero.type || 'application/octet-stream' },
      body: fichero,
    });
    const cuerpo = await res.json();

    if (!cuerpo.ok) {
      estadoImagenes.textContent = `${fichero.name}: ${cuerpo.mensaje}`;
      return;
    }
    if (cuerpo.imagen.pesada) pesadas.push(fichero.name);
  }

  const total = (await api('/api/docente/imagenes')).imagenes.length;
  estadoImagenes.textContent =
    `${ficheros.length} imagen(es) subida(s). Hay ${total} disponible(s).` +
    (pesadas.length > 0
      ? ` Ojo: ${pesadas.join(', ')} pesa(n) bastante y puede(n) ir lenta(s) en tablets modestas.`
      : '');
  imagenes.value = '';
});

paquete.addEventListener('change', async () => {
  limpiar();
  const fichero = paquete.files[0];
  if (!fichero) return;

  const respuesta = await api(
    `/api/docente/bancos/paquete/validar?nombre=${encodeURIComponent(nombre.value)}`,
    { method: 'POST', headers: { 'content-type': 'application/zip' }, body: fichero },
  );
  if (!respuesta.ok) {
    mostrarErrores(respuesta.errores);
    return;
  }
  paquetePendiente = fichero;
  mostrarPrevisualizacion(respuesta);
});

confirmar.addEventListener('click', async () => {
  if (!paquetePendiente) return;

  confirmar.disabled = true;
  try {
    const respuesta = await api(
      `/api/docente/bancos/paquete/confirmar?nombre=${encodeURIComponent(nombre.value)}`,
      { method: 'POST', headers: { 'content-type': 'application/zip' }, body: paquetePendiente },
    );

    if (!respuesta.ok) {
      mostrarErrores(respuesta.errores);
      return;
    }
    importarDialogo.close(); // dispara 'close', que ya limpia el formulario
    await recargar();
  } finally {
    confirmar.disabled = false;
  }
});

function cerrarDetalleBanco() {
  detalle.hidden = true;
  seccionLista.hidden = false;
}

cerrarDetalle.addEventListener('click', cerrarDetalleBanco);

// --- Nuevo banco vacío (028) -------------------------------------------

nuevoBanco.addEventListener('click', async () => {
  errorNuevoBanco.hidden = true;
  const nombreBanco = window.prompt('Nombre del banco:');
  if (nombreBanco === null) return; // canceló

  const respuesta = await api('/api/docente/bancos', {
    method: 'POST',
    body: JSON.stringify({ nombre: nombreBanco }),
  });

  if (!respuesta.ok) {
    errorNuevoBanco.textContent = respuesta.errores?.join(' ') ?? respuesta.mensaje;
    errorNuevoBanco.hidden = false;
    return;
  }

  await recargar();
  await verBanco(respuesta.banco.id);
});

// --- Modal de pregunta manual: crear/editar (028) -----------------------

const NUM_OPCIONES = 4;
let bancoActualId = null;
let preguntaEnEdicion = null; // null = crear; id = editar
let disparadorEditorPregunta = null;
let imagenAdjunta = null; // nombre de archivo ya subido, o null

const filasOpcion = Array.from({ length: NUM_OPCIONES }, (_, i) => {
  const letra = LETRAS[i];

  const contenedor = document.createElement('div');
  contenedor.className = 'editor-opcion';

  const cabecera = document.createElement('div');
  cabecera.className = 'editor-opcion__cabecera';
  const radio = document.createElement('input');
  radio.type = 'radio';
  radio.name = 'editor-opcion-correcta';
  radio.id = `editor-opcion-correcta-${i}`;
  radio.value = String(i);
  const etiquetaRadio = document.createElement('label');
  etiquetaRadio.setAttribute('for', radio.id);
  etiquetaRadio.textContent = `Opción ${letra} — correcta`;
  cabecera.append(radio, etiquetaRadio);

  const campoTexto = document.createElement('label');
  campoTexto.className = 'campo';
  const spanTexto = document.createElement('span');
  spanTexto.textContent = `Texto de la opción ${letra}`;
  const texto = document.createElement('textarea');
  texto.maxLength = 2000;
  campoTexto.append(spanTexto, texto);

  const campoJustificacion = document.createElement('label');
  campoJustificacion.className = 'campo';
  const spanJustificacion = document.createElement('span');
  spanJustificacion.textContent = 'Justificación (opcional)';
  const justificacion = document.createElement('textarea');
  justificacion.maxLength = 2000;
  campoJustificacion.append(spanJustificacion, justificacion);

  contenedor.append(cabecera, campoTexto, campoJustificacion);
  editorOpcionesContenedor.append(contenedor);

  return { radio, texto, justificacion };
});

function limpiarEditorPregunta() {
  editorPreguntaErrores.hidden = true;
  editorPreguntaListaErrores.replaceChildren();
  editorContexto.value = '';
  editorEnunciado.value = '';
  editorImagen.value = '';
  editorImagenEstado.textContent = '';
  imagenAdjunta = null;
  for (const fila of filasOpcion) {
    fila.radio.checked = false;
    fila.texto.value = '';
    fila.justificacion.value = '';
  }
}

/** `pregunta` viene con `contexto`/`enunciado` ya como array de bloques (forma de la API). */
function abrirEditorPregunta(pregunta, desde) {
  limpiarEditorPregunta();
  disparadorEditorPregunta = desde ?? null;
  preguntaEnEdicion = pregunta?.id ?? null;

  if (pregunta) {
    editorPreguntaTitulo.textContent = 'Editar pregunta';
    editorContexto.value = (pregunta.contexto ?? []).filter((b) => b.tipo === 'texto').map((b) => b.texto).join('\n');
    const bloqueImagen = (pregunta.contexto ?? []).find((b) => b.tipo === 'imagen');
    if (bloqueImagen) {
      imagenAdjunta = bloqueImagen.archivo;
      editorImagenEstado.textContent = `Imagen adjunta: ${bloqueImagen.archivo} (elige otra para reemplazarla).`;
    }
    editorEnunciado.value = (pregunta.enunciado ?? []).filter((b) => b.tipo === 'texto').map((b) => b.texto).join('\n');
    pregunta.opciones.forEach((opcion, i) => {
      if (!filasOpcion[i]) return;
      filasOpcion[i].texto.value = (opcion.contenido ?? []).filter((b) => b.tipo === 'texto').map((b) => b.texto).join('\n');
      filasOpcion[i].justificacion.value = opcion.justificacion ?? '';
      filasOpcion[i].radio.checked = opcion.es_correcta === 1;
    });
  } else {
    editorPreguntaTitulo.textContent = 'Nueva pregunta';
  }

  editorPregunta.showModal();
  editorEnunciado.focus();
}

function cerrarEditorPregunta() {
  if (editorPregunta.open) editorPregunta.close();
  disparadorEditorPregunta = null;
}

function mostrarErroresEditorPregunta(lista) {
  editorPreguntaListaErrores.replaceChildren(
    ...lista.map((mensaje) => {
      const li = document.createElement('li');
      li.textContent = mensaje;
      return li;
    }),
  );
  editorPreguntaErrores.hidden = false;
}

editorImagen.addEventListener('change', async () => {
  const fichero = editorImagen.files[0];
  if (!fichero) return;

  editorImagenEstado.textContent = `Subiendo ${fichero.name}…`;
  const res = await fetch(`/api/docente/imagenes?nombre=${encodeURIComponent(fichero.name)}`, {
    method: 'POST',
    headers: { 'content-type': fichero.type || 'application/octet-stream' },
    body: fichero,
  });
  const cuerpo = await res.json();

  if (!cuerpo.ok) {
    editorImagenEstado.textContent = `${fichero.name}: ${cuerpo.mensaje}`;
    return;
  }
  imagenAdjunta = cuerpo.imagen.nombre;
  editorImagenEstado.textContent = `Imagen adjunta: ${cuerpo.imagen.nombre}.`;
});

editorPreguntaCancelar.addEventListener('click', cerrarEditorPregunta);

editorPregunta.addEventListener('close', () => {
  if (disparadorEditorPregunta && typeof disparadorEditorPregunta.focus === 'function') {
    disparadorEditorPregunta.focus();
  }
});

formularioPregunta.addEventListener('submit', async (ev) => {
  ev.preventDefault();

  const datos = {
    contexto: editorContexto.value,
    archivoImagen: imagenAdjunta,
    enunciado: editorEnunciado.value,
    opciones: filasOpcion.map((fila) => ({
      texto: fila.texto.value,
      esCorrecta: fila.radio.checked,
      justificacion: fila.justificacion.value,
    })),
  };

  const boton = document.getElementById('editor-pregunta-guardar');
  boton.disabled = true;
  try {
    const respuesta = await api(
      preguntaEnEdicion
        ? `/api/docente/preguntas/${preguntaEnEdicion}`
        : `/api/docente/bancos/${bancoActualId}/preguntas`,
      { method: preguntaEnEdicion ? 'PUT' : 'POST', body: JSON.stringify(datos) },
    );

    if (!respuesta.ok) {
      if (respuesta.errores) mostrarErroresEditorPregunta(respuesta.errores);
      else window.alert(respuesta.mensaje ?? 'No se pudo guardar la pregunta.');
      return;
    }

    cerrarEditorPregunta();
    await verBanco(bancoActualId);
    await recargar();
  } finally {
    boton.disabled = false;
  }
});

agregarPregunta.addEventListener('click', () => abrirEditorPregunta(null, agregarPregunta));

function accionesDePregunta(pregunta) {
  const contenedor = document.createElement('div');
  contenedor.className = 'acciones-fila';

  contenedor.append(
    botonIcono('editar', 'Editar', (ev) => abrirEditorPregunta(pregunta, ev.currentTarget)),
    botonIcono('borrar', 'Eliminar', async () => {
      if (!window.confirm('¿Eliminar esta pregunta del banco?')) return;

      const respuesta = await api(`/api/docente/preguntas/${pregunta.id}`, { method: 'DELETE' });
      if (!respuesta.ok) {
        window.alert(respuesta.mensaje);
        return;
      }
      await verBanco(bancoActualId);
      await recargar();
    }, 'boton-fila--peligro'),
  );
  return contenedor;
}

const ETIQUETA_TIPO_GRUPO = {
  contexto_compartido: 'Contexto compartido',
  banco_opciones: 'Emparejamiento (banco de opciones)',
  texto_con_blancos: 'Completar espacios (texto con blancos)',
};

function seccionDeGrupo(grupo) {
  const seccion = document.createElement('details');
  seccion.className = 'grupo-docente';
  seccion.dataset.grupoId = grupo.id ?? '';

  const resumen = document.createElement('summary');
  resumen.textContent = `${ETIQUETA_TIPO_GRUPO[grupo.tipo] ?? grupo.tipo} — ${grupo.preguntas.length} pregunta(s)`;
  seccion.append(resumen);

  // La correcta de cada miembro: la entrada del banco en matching, o la
  // opción marcada en los miembros con opciones propias.
  const correctas = {};
  for (const miembro of grupo.preguntas) {
    if (miembro.tipo_item === 'miembro_banco_opciones') {
      if (miembro.respuesta_pool_id) correctas[miembro.pregunta_id] = miembro.respuesta_pool_id;
    } else {
      const correcta = (miembro.opciones ?? []).find((o) => o.es_correcta === 1);
      if (correcta) correctas[miembro.pregunta_id] = correcta.id;
    }
  }

  seccion.append(renderizarGrupo(grupo, {
    preguntas: grupo.preguntas,
    mostrarJustificacion: true,
    correctas,
  }));
  return seccion;
}

async function verBanco(id) {
  const { banco } = await api(`/api/docente/bancos/${id}`);
  bancoActualId = id;

  const totalMiembros = (banco.grupos ?? []).reduce((suma, g) => suma + g.preguntas.length, 0);
  const total = banco.preguntas.length + totalMiembros;
  const conGrupos = (banco.grupos ?? []).length > 0;
  detalleTitulo.textContent = conGrupos
    ? `${banco.nombre} — ${total} preguntas en ${(banco.grupos ?? []).length} grupo(s)`
    : `${banco.nombre} — ${total} preguntas`;

  const piezas = banco.preguntas.map((pregunta) => {
    const envoltorio = document.createElement('div');
    envoltorio.className = 'pregunta-docente';
    envoltorio.append(
      renderizarPregunta(pregunta, {
        correcta: pregunta.opciones.findIndex((o) => o.es_correcta === 1),
        mostrarJustificacion: true,
      }),
      accionesDePregunta(pregunta),
    );
    return envoltorio;
  });
  for (const grupo of banco.grupos ?? []) piezas.push(seccionDeGrupo(grupo));
  detallePreguntas.replaceChildren(...piezas);
  seccionLista.hidden = true;
  detalle.hidden = false;
}

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

function acciones(banco) {
  const grupo = document.createElement('div');
  grupo.className = 'acciones-fila';

  grupo.append(
    botonIcono('ver', 'Ver', () => verBanco(banco.id)),
    botonIcono('borrar', 'Borrar', async () => {
      if (!window.confirm(`¿Borrar el banco "${banco.nombre}"?`)) return;

      const respuesta = await api(`/api/docente/bancos/${banco.id}`, { method: 'DELETE' });
      if (!respuesta.ok) {
        window.alert(respuesta.mensaje);
        return;
      }
      cerrarDetalleBanco();
      await recargar();
    }, 'boton-fila--peligro'),
  );
  return grupo;
}

// El nombre del banco identifica la fila (fuerte); cuándo se cargó es un
// dato de consulta ocasional, tenue debajo — igual que en Evaluaciones.
function celdaBanco(banco) {
  const td = document.createElement('td');
  const caja = document.createElement('div');
  caja.className = 'celda-titulo';
  const nombre = document.createElement('strong');
  nombre.textContent = banco.nombre;
  const meta = document.createElement('small');
  meta.textContent = `Cargado el ${new Date(banco.creado_en).toLocaleDateString('es')}`;
  caja.append(nombre, meta);
  td.append(caja);
  return td;
}

function celdaTexto(texto) {
  const td = document.createElement('td');
  td.className = 'texto-discreto';
  td.textContent = texto;
  return td;
}

async function recargar() {
  const { bancos } = await api('/api/docente/bancos');
  const hayBancos = bancos.length > 0;
  listaCabecera.hidden = !hayBancos;
  listaEnvoltura.hidden = !hayBancos;
  vacio.hidden = hayBancos;

  const filas = bancos.map((banco) => {
    const tr = document.createElement('tr');
    const tdAcciones = document.createElement('td');
    tdAcciones.append(acciones(banco));
    tr.append(
      celdaBanco(banco),
      celdaTexto(`${banco.preguntas} preguntas`),
      celdaTexto(`${banco.sesiones} evaluación(es)`),
      tdAcciones,
    );
    return tr;
  });

  listado.replaceChildren(...filas);
}

recargar();
