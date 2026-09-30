import { api, iniciarEngranaje } from './panel.js';
import { crearIcono } from './iconos.js';

document.getElementById('engranaje').append(crearIcono('engranaje'));
iniciarEngranaje();

const elementos = {
  formVinculo: document.getElementById('form-vinculo'),
  url: document.getElementById('url'),
  clave: document.getElementById('clave'),
  vinculado: document.getElementById('vinculado'),
  desvincular: document.getElementById('desvincular'),
  errorVinculo: document.getElementById('error-vinculo'),
  buscarEvaluaciones: document.getElementById('buscar-evaluaciones'),
  errorEvaluaciones: document.getElementById('error-evaluaciones'),
  listaCabecera: document.getElementById('lista-cabecera'),
  listaEnvoltura: document.getElementById('lista-envoltura'),
  filas: document.getElementById('filas'),
  chipVinculo: document.getElementById('chip-vinculo'),
  dialogo: document.getElementById('ajustes'),
  vacio: document.getElementById('vacio'),
  enviar: document.getElementById('enviar'),
  errorEnvio: document.getElementById('error-envio'),
  exitoEnvio: document.getElementById('exito-envio'),
  sugerencia: document.getElementById('sugerencia'),
  sugerenciaLista: document.getElementById('sugerencia-lista'),
};

let evaluacionesPortal = [];
let ultimosEnvios = [];

const fecha = (iso) => new Date(iso).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' });

function mostrar(elemento, texto) {
  elemento.textContent = texto ?? '';
  elemento.hidden = !texto;
}

function etiquetaDe(evaluacion) {
  return `${evaluacion.periodo} · ${evaluacion.asignatura} · ${evaluacion.modulo} (${evaluacion.codigo})`;
}

function textoEstado(envio) {
  switch (envio.estado) {
    case 'sin_codigo': return 'Sin evaluación elegida: no se envía.';
    case 'sin_intentos': return 'Nadie presentó esta evaluación.';
    case 'enviado': {
      const destino = envio.destino ? ` → ${envio.destino.asignatura}, ${envio.destino.modulo}` : '';
      return `Enviada el ${fecha(envio.enviadoEn)}${destino}. Apruébala en la bandeja del portal.`;
    }
    default:
      return envio.ultimoError
        ? `Pendiente. Último intento: ${envio.ultimoError}`
        : envio.enviadoEn
          ? 'Pendiente: los resultados cambiaron desde el último envío.'
          : 'Pendiente de envío.';
  }
}

function pintarVinculo(vinculo) {
  mostrar(elementos.vinculado, vinculo.vinculado
    ? `Vinculado con ${vinculo.url} (clave terminada en ${vinculo.finClave}).`
    : '');
  elementos.desvincular.hidden = !vinculo.vinculado;
  elementos.chipVinculo.className = `pastilla vinculo-chip pastilla--${vinculo.vinculado ? 'verde' : 'ambar'}`;
  elementos.chipVinculo.textContent = vinculo.vinculado ? 'Vinculado' : 'Sin vincular';
  elementos.chipVinculo.title = vinculo.vinculado ? `Vinculado con ${vinculo.url}` : 'Vincular con el portal';
  if (vinculo.url) elementos.url.value = vinculo.url;
  elementos.clave.value = '';
  elementos.clave.placeholder = vinculo.vinculado ? 'Pega una clave nueva solo si la cambiaste' : 'mcp_…';
}

async function elegirCodigo(sesionId, select) {
  const respuesta = await api(`/api/docente/sesiones/${sesionId}/codigo-portal`, {
    method: 'PATCH', body: JSON.stringify({ codigo: select.value }),
  });
  if (!respuesta.ok) {
    mostrar(elementos.errorEnvio, respuesta.mensaje);
    return;
  }
  mostrar(elementos.errorEnvio, '');
  pintarEnvios(respuesta.envios);
}

// Color y palabra corta del estado; la frase completa va debajo, recortada.
function pastillaDeEnvio(envio) {
  switch (envio.estado) {
    case 'sin_codigo': return ['neutro', 'Sin elegir'];
    case 'sin_intentos': return ['neutro', 'Sin intentos'];
    case 'enviado': return ['verde', 'Enviada'];
    default: return envio.ultimoError ? ['rojo', 'Falló'] : ['ambar', 'Pendiente'];
  }
}

function filaEnvio(envio) {
  const fila = document.createElement('tr');
  const nombre = document.createElement('td');
  const caja = document.createElement('div');
  caja.className = 'celda-titulo';
  const titulo = document.createElement('strong');
  titulo.textContent = envio.nombre;
  titulo.title = envio.nombre;
  const cursos = document.createElement('small');
  cursos.textContent = envio.cursos;
  caja.append(titulo, cursos);
  nombre.append(caja);

  const celdaDestino = document.createElement('td');
  const select = document.createElement('select');
  select.setAttribute('aria-label', `Evaluación en el portal para ${envio.nombre}`);
  const vacia = document.createElement('option');
  vacia.value = '';
  vacia.textContent = evaluacionesPortal.length > 0 ? 'Sin elegir' : 'Busca evaluaciones disponibles primero';
  select.append(vacia);
  for (const evaluacion of evaluacionesPortal) {
    const opcion = document.createElement('option');
    opcion.value = evaluacion.codigo;
    opcion.textContent = etiquetaDe(evaluacion);
    if (envio.codigoPortal === evaluacion.codigo) opcion.selected = true;
    select.append(opcion);
  }
  if (envio.codigoPortal && !evaluacionesPortal.some((fila2) => fila2.codigo === envio.codigoPortal)) {
    const actual = document.createElement('option');
    actual.value = envio.codigoPortal;
    actual.textContent = `${envio.codigoPortal} (elegida antes)`;
    actual.selected = true;
    select.append(actual);
  }
  select.addEventListener('change', () => elegirCodigo(envio.id, select));
  celdaDestino.append(select);

  const estado = document.createElement('td');
  const cajaEstado = document.createElement('div');
  cajaEstado.className = 'celda-estado';
  const [color, etiqueta] = pastillaDeEnvio(envio);
  const pastilla = document.createElement('span');
  pastilla.className = `pastilla pastilla--${color}`;
  pastilla.textContent = etiqueta;
  const detalle = document.createElement('small');
  detalle.textContent = textoEstado(envio);
  detalle.title = textoEstado(envio);
  cajaEstado.append(pastilla, detalle);
  estado.append(cajaEstado);
  fila.append(nombre, celdaDestino, estado);
  return fila;
}

// Lo enviado ya está a salvo en el portal: se sugiere quitarlo de este equipo,
// que guarda datos de estudiantes y se mueve de aula en aula (046).
function pintarSugerencia(envios) {
  const enviadas = envios.filter((envio) => envio.estado === 'enviado');
  elementos.sugerencia.hidden = enviadas.length === 0;
  elementos.sugerenciaLista.replaceChildren(...enviadas.map((envio) => {
    const item = document.createElement('li');
    const nombre = document.createElement('span');
    nombre.textContent = `${envio.nombre} (${envio.cursos})`;
    const boton = document.createElement('button');
    boton.type = 'button';
    boton.className = 'boton boton--secundario boton--pequeno';
    boton.textContent = 'Mover a la papelera';
    boton.addEventListener('click', async () => {
      if (!window.confirm(`¿Mover "${envio.nombre}" a la papelera? Podrás restaurarla durante 30 días.`)) return;
      boton.disabled = true;
      const respuesta = await api(`/api/docente/sesiones/${envio.id}`, { method: 'DELETE' });
      if (!respuesta.ok) window.alert(respuesta.mensaje);
      await cargar();
    });
    item.append(nombre, boton);
    return item;
  }));
}

function pintarEnvios(envios) {
  ultimosEnvios = envios;
  pintarSugerencia(envios);
  elementos.vacio.hidden = envios.length > 0;
  elementos.listaCabecera.hidden = envios.length === 0;
  elementos.listaEnvoltura.hidden = envios.length === 0;
  elementos.filas.replaceChildren(...envios.map(filaEnvio));
  const pendientes = envios.filter((envio) => envio.estado === 'pendiente').length;
  elementos.enviar.disabled = pendientes === 0;
  elementos.enviar.textContent = pendientes > 0 ? `Enviar ahora (${pendientes})` : 'Nada pendiente por enviar';
}

async function cargar() {
  const { vinculo, envios } = await api('/api/docente/portal');
  pintarVinculo(vinculo);
  pintarEnvios(envios);
}

elementos.formVinculo.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  const respuesta = await api('/api/docente/portal/vinculo', {
    method: 'PUT', body: JSON.stringify({ url: elementos.url.value, clave: elementos.clave.value }),
  });
  if (!respuesta.ok) {
    mostrar(elementos.errorVinculo, respuesta.mensaje);
    return;
  }
  mostrar(elementos.errorVinculo, '');
  pintarVinculo(respuesta.vinculo);
  elementos.dialogo.close();
});

elementos.chipVinculo.addEventListener('click', () => elementos.dialogo.showModal());

elementos.desvincular.addEventListener('click', async () => {
  if (!window.confirm('¿Desvincular OpenTest del portal? Tendrás que pegar la clave otra vez para enviar.')) return;
  const respuesta = await api('/api/docente/portal/vinculo', { method: 'DELETE' });
  pintarVinculo(respuesta.vinculo);
});

elementos.buscarEvaluaciones.addEventListener('click', async () => {
  elementos.buscarEvaluaciones.disabled = true;
  elementos.buscarEvaluaciones.textContent = 'Buscando…';
  mostrar(elementos.errorEvaluaciones, '');
  try {
    const respuesta = await api('/api/docente/portal/evaluaciones-disponibles');
    if (!respuesta.ok) {
      mostrar(elementos.errorEvaluaciones, respuesta.mensaje);
    } else {
      evaluacionesPortal = respuesta.evaluaciones;
      pintarEnvios(ultimosEnvios);
    }
  } catch {
    mostrar(elementos.errorEvaluaciones, 'OpenTest no respondió. Revisa que siga abierto.');
  } finally {
    elementos.buscarEvaluaciones.disabled = false;
    elementos.buscarEvaluaciones.textContent = 'Buscar en el portal';
  }
});

elementos.enviar.addEventListener('click', async () => {
  elementos.enviar.disabled = true;
  elementos.enviar.textContent = 'Enviando…';
  mostrar(elementos.errorEnvio, '');
  mostrar(elementos.exitoEnvio, '');
  try {
    const respuesta = await api('/api/docente/portal/enviar', { method: 'POST' });
    if (!respuesta.ok) {
      mostrar(elementos.errorEnvio, respuesta.mensaje);
      await cargar();
      return;
    }
    const fallidos = respuesta.resultados.filter((resultado) => !resultado.ok);
    if (respuesta.enviados > 0) {
      mostrar(elementos.exitoEnvio,
        `${respuesta.enviados} evaluación(es) enviada(s). Apruébalas en el portal: Agentes → Propuestas.`);
    }
    if (fallidos.length > 0) {
      mostrar(elementos.errorEnvio, fallidos.map((fallo) => `${fallo.nombre}: ${fallo.mensaje}`).join(' '));
    }
    pintarEnvios(respuesta.envios);
  } catch {
    mostrar(elementos.errorEnvio, 'OpenTest no respondió. Revisa que siga abierto.');
    await cargar();
  }
});

await cargar();
