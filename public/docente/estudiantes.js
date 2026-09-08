import { api } from './panel.js';

const archivo = document.getElementById('archivo');
const errores = document.getElementById('errores');
const listaErrores = document.getElementById('lista-errores');
const previsualizacion = document.getElementById('previsualizacion');
const resumenCarga = document.getElementById('resumen-carga');
const muestra = document.getElementById('muestra');
const confirmar = document.getElementById('confirmar');
const cancelar = document.getElementById('cancelar');
const nuevo = document.getElementById('nuevo');
const filtroCurso = document.getElementById('filtro-curso');
const listado = document.getElementById('listado');
const vacio = document.getElementById('vacio');

const editor = document.getElementById('editor');
const editorTitulo = document.getElementById('editor-titulo');
const editorAyuda = document.getElementById('editor-ayuda');
const editorCodigo = document.getElementById('editor-codigo');
const editorNombres = document.getElementById('editor-nombres');
const editorApellidos = document.getElementById('editor-apellidos');
const editorCurso = document.getElementById('editor-curso');
const editorFormulario = document.getElementById('formulario-estudiante');
const editorErrores = document.getElementById('editor-errores');
const editorListaErrores = document.getElementById('editor-lista-errores');
const editorCancelar = document.getElementById('editor-cancelar');

const MAX_BYTES = 2 * 1024 * 1024;

let contenidoPendiente = null;
let disparadorEditor = null;

function limpiar() {
  errores.hidden = true;
  previsualizacion.hidden = true;
  listaErrores.replaceChildren();
  contenidoPendiente = null;
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

function tabla(destino, columnas, filas, acciones) {
  const thead = document.createElement('thead');
  const filaCabecera = document.createElement('tr');
  for (const columna of columnas) {
    const th = document.createElement('th');
    th.textContent = columna.titulo;
    filaCabecera.append(th);
  }
  if (acciones) filaCabecera.append(document.createElement('th'));
  thead.append(filaCabecera);

  const tbody = document.createElement('tbody');
  for (const fila of filas) {
    const tr = document.createElement('tr');
    for (const columna of columnas) {
      const td = document.createElement('td');
      td.textContent = fila[columna.clave];
      tr.append(td);
    }
    if (acciones) {
      const td = document.createElement('td');
      td.append(acciones(fila));
      tr.append(td);
    }
    tbody.append(tr);
  }

  destino.replaceChildren(thead, tbody);
}

const COLUMNAS = [
  { clave: 'codigo', titulo: 'Código' },
  { clave: 'nombres', titulo: 'Nombres' },
  { clave: 'apellidos', titulo: 'Apellidos' },
  { clave: 'curso', titulo: 'Curso' },
];

archivo.addEventListener('change', async () => {
  limpiar();
  const fichero = archivo.files[0];
  if (!fichero) return;

  if (fichero.size > MAX_BYTES) {
    mostrarErrores([`El archivo pesa demasiado (máximo ${MAX_BYTES / 1024 / 1024} MB).`]);
    return;
  }

  const contenido = await fichero.text();
  const respuesta = await api('/api/docente/estudiantes/validar', {
    method: 'POST',
    body: JSON.stringify({ contenido }),
  });

  if (!respuesta.ok) {
    mostrarErrores(respuesta.errores);
    return;
  }

  contenidoPendiente = contenido;
  const { total, creados, actualizados } = respuesta.resumen;
  resumenCarga.textContent =
    `${total} estudiante(s) en el archivo: ${creados} nuevo(s) y ` +
    `${actualizados} que ya estaban y se actualizarán.`;
  tabla(muestra, COLUMNAS, respuesta.muestra);
  previsualizacion.hidden = false;
});

confirmar.addEventListener('click', async () => {
  if (!contenidoPendiente) return;

  confirmar.disabled = true;
  try {
    const respuesta = await api('/api/docente/estudiantes/confirmar', {
      method: 'POST',
      body: JSON.stringify({ contenido: contenidoPendiente }),
    });

    if (!respuesta.ok) {
      mostrarErrores(respuesta.errores);
      return;
    }
    limpiar();
    archivo.value = '';
    await recargar();
  } finally {
    confirmar.disabled = false;
  }
});

cancelar.addEventListener('click', () => {
  limpiar();
  archivo.value = '';
});

filtroCurso.addEventListener('change', recargar);

// --- Modal de creación / edición -----------------------------------------

function limpiarEditor() {
  editorErrores.hidden = true;
  editorListaErrores.replaceChildren();
  [editorCodigo, editorNombres, editorApellidos, editorCurso].forEach((input) => {
    input.value = '';
    input.removeAttribute('readonly');
  });
}

function abrirEditor(estudiante, desde) {
  limpiarEditor();
  disparadorEditor = desde ?? null;

  if (estudiante) {
    editorTitulo.textContent = 'Editar estudiante';
    editorAyuda.textContent = 'El código no se puede cambiar.';
    editorCodigo.value = estudiante.codigo;
    editorCodigo.setAttribute('readonly', 'readonly');
    editorNombres.value = estudiante.nombres;
    editorApellidos.value = estudiante.apellidos;
    editorCurso.value = estudiante.curso;
  } else {
    editorTitulo.textContent = 'Nuevo estudiante';
    editorAyuda.textContent = '';
  }

  editor.showModal();
  const focoInicial = estudiante ? editorNombres : editorCodigo;
  focoInicial.focus();
}

function cerrarEditor() {
  if (editor.open) editor.close();
  disparadorEditor = null;
}

function mostrarErroresEditor(errores) {
  editorListaErrores.replaceChildren(
    ...errores.map((mensaje) => {
      const li = document.createElement('li');
      li.textContent = mensaje;
      return li;
    }),
  );
  editorErrores.hidden = false;
}

editorCancelar.addEventListener('click', cerrarEditor);

editor.addEventListener('close', () => {
  if (disparadorEditor && typeof disparadorEditor.focus === 'function') {
    disparadorEditor.focus();
  }
});

editorFormulario.addEventListener('submit', async (ev) => {
  ev.preventDefault();

  const esEdicion = editorCodigo.hasAttribute('readonly');
  const datos = {
    codigo: editorCodigo.value,
    nombres: editorNombres.value,
    apellidos: editorApellidos.value,
    curso: editorCurso.value,
  };

  const boton = editor.querySelector('#editor-guardar');
  boton.disabled = true;
  try {
    const respuesta = await api(
      esEdicion
        ? `/api/docente/estudiantes/${encodeURIComponent(datos.codigo)}`
        : '/api/docente/estudiantes',
      {
        method: esEdicion ? 'PUT' : 'POST',
        body: JSON.stringify(esEdicion ? {
          nombres: datos.nombres,
          apellidos: datos.apellidos,
          curso: datos.curso,
        } : datos),
      },
    );

    if (!respuesta.ok) {
      if (respuesta.errores) mostrarErroresEditor(respuesta.errores);
      else window.alert(respuesta.mensaje ?? 'No se pudo guardar el estudiante.');
      return;
    }

    cerrarEditor();
    await recargar();
  } finally {
    boton.disabled = false;
  }
});

nuevo.addEventListener('click', () => abrirEditor(null, nuevo));

// --- Listado --------------------------------------------------------------

function accionesDeFila(estudiante) {
  const contenedor = document.createElement('div');
  contenedor.className = 'acciones-fila';

  const editar = document.createElement('button');
  editar.className = 'boton boton--secundario boton--pequeno';
  editar.type = 'button';
  editar.textContent = 'Editar';
  editar.addEventListener('click', () => abrirEditor(estudiante, editar));

  const eliminar = document.createElement('button');
  eliminar.className = 'boton boton--secundario boton--pequeno';
  eliminar.type = 'button';
  eliminar.textContent = 'Eliminar';
  eliminar.addEventListener('click', async () => {
    const nombre = `${estudiante.nombres} ${estudiante.apellidos}`;
    if (!window.confirm(`¿Eliminar a ${nombre} de la lista?`)) return;

    const respuesta = await api(`/api/docente/estudiantes/${encodeURIComponent(estudiante.codigo)}`, {
      method: 'DELETE',
    });
    if (!respuesta.ok) {
      window.alert(respuesta.mensaje);
      return;
    }
    await recargar();
  });

  contenedor.append(editar, eliminar);
  return contenedor;
}

async function recargar() {
  const curso = filtroCurso.value;
  const { estudiantes, cursos } = await api(
    `/api/docente/estudiantes${curso ? `?curso=${encodeURIComponent(curso)}` : ''}`,
  );

  const seleccionado = filtroCurso.value;
  filtroCurso.replaceChildren(new Option('Todos', ''));
  for (const { curso: nombre, total } of cursos) {
    filtroCurso.append(new Option(`${nombre} (${total})`, nombre));
  }
  filtroCurso.value = seleccionado;

  vacio.hidden = estudiantes.length > 0;
  tabla(listado, COLUMNAS, estudiantes, accionesDeFila);
}

recargar();
