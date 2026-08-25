import { api } from './panel.js';

const archivo = document.getElementById('archivo');
const errores = document.getElementById('errores');
const listaErrores = document.getElementById('lista-errores');
const previsualizacion = document.getElementById('previsualizacion');
const resumenCarga = document.getElementById('resumen-carga');
const muestra = document.getElementById('muestra');
const confirmar = document.getElementById('confirmar');
const cancelar = document.getElementById('cancelar');
const filtroCurso = document.getElementById('filtro-curso');
const listado = document.getElementById('listado');
const vacio = document.getElementById('vacio');

const MAX_BYTES = 2 * 1024 * 1024;

let contenidoPendiente = null;

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

function botonEliminar(estudiante) {
  const boton = document.createElement('button');
  boton.className = 'boton boton--secundario boton--pequeno';
  boton.textContent = 'Eliminar';
  boton.addEventListener('click', async () => {
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
  return boton;
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
  tabla(listado, COLUMNAS, estudiantes, botonEliminar);
}

recargar();
