import { api } from './panel.js';
import { renderizarPregunta } from '/shared/pregunta.js';

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
const cancelar = document.getElementById('cancelar');
const listado = document.getElementById('listado');
const vacio = document.getElementById('vacio');
const detalle = document.getElementById('detalle');
const detalleTitulo = document.getElementById('detalle-titulo');
const detallePreguntas = document.getElementById('detalle-preguntas');
const cerrarDetalle = document.getElementById('cerrar-detalle');

let paquetePendiente = null;

function limpiar() {
  errores.hidden = true;
  previsualizacion.hidden = true;
  avisos.hidden = true;
  listaErrores.replaceChildren();
  muestra.replaceChildren();
  paquetePendiente = null;
}

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
    limpiar();
    paquete.value = '';
    nombre.value = '';
    await recargar();
  } finally {
    confirmar.disabled = false;
  }
});

cancelar.addEventListener('click', () => {
  limpiar();
  paquete.value = '';
});

cerrarDetalle.addEventListener('click', () => {
  detalle.hidden = true;
});

async function verBanco(id) {
  const { banco } = await api(`/api/docente/bancos/${id}`);

  detalleTitulo.textContent = `${banco.nombre} — ${banco.preguntas.length} preguntas`;
  detallePreguntas.replaceChildren(
    ...banco.preguntas.map((pregunta) =>
      renderizarPregunta(pregunta, {
        correcta: pregunta.opciones.findIndex((o) => o.es_correcta === 1),
        mostrarJustificacion: true,
      }),
    ),
  );
  detalle.hidden = false;
  detalle.scrollIntoView({ block: 'start' });
}

function acciones(banco) {
  const grupo = document.createElement('div');

  const ver = document.createElement('button');
  ver.className = 'boton boton--secundario boton--pequeno';
  ver.textContent = 'Ver';
  ver.addEventListener('click', () => verBanco(banco.id));

  const borrar = document.createElement('button');
  borrar.className = 'boton boton--secundario boton--pequeno';
  borrar.textContent = 'Borrar';
  borrar.addEventListener('click', async () => {
    if (!window.confirm(`¿Borrar el banco "${banco.nombre}"?`)) return;

    const respuesta = await api(`/api/docente/bancos/${banco.id}`, { method: 'DELETE' });
    if (!respuesta.ok) {
      window.alert(respuesta.mensaje);
      return;
    }
    detalle.hidden = true;
    await recargar();
  });

  grupo.append(ver, borrar);
  return grupo;
}

async function recargar() {
  const { bancos } = await api('/api/docente/bancos');
  vacio.hidden = bancos.length > 0;

  const thead = document.createElement('thead');
  thead.innerHTML =
    '<tr><th>Banco</th><th>Preguntas</th><th>Cargado</th><th>Usado en</th><th></th></tr>';

  const tbody = document.createElement('tbody');
  for (const banco of bancos) {
    const tr = document.createElement('tr');
    for (const valor of [
      banco.nombre,
      banco.preguntas,
      new Date(banco.creado_en).toLocaleDateString('es'),
      `${banco.sesiones} evaluación(es)`,
    ]) {
      const td = document.createElement('td');
      td.textContent = valor;
      tr.append(td);
    }
    const td = document.createElement('td');
    td.append(acciones(banco));
    tr.append(td);
    tbody.append(tr);
  }

  listado.replaceChildren(thead, tbody);
}

recargar();
