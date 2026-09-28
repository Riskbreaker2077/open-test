import { api } from './panel.js';

const elementos = {
  formVinculo: document.getElementById('form-vinculo'),
  url: document.getElementById('url'),
  clave: document.getElementById('clave'),
  vinculado: document.getElementById('vinculado'),
  desvincular: document.getElementById('desvincular'),
  errorVinculo: document.getElementById('error-vinculo'),
  listado: document.getElementById('listado'),
  filas: document.getElementById('filas'),
  vacio: document.getElementById('vacio'),
  enviar: document.getElementById('enviar'),
  errorEnvio: document.getElementById('error-envio'),
  exitoEnvio: document.getElementById('exito-envio'),
};

const fecha = (iso) => new Date(iso).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' });

function mostrar(elemento, texto) {
  elemento.textContent = texto ?? '';
  elemento.hidden = !texto;
}

function textoEstado(envio) {
  switch (envio.estado) {
    case 'sin_codigo': return 'Sin código: no se envía.';
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
  if (vinculo.url) elementos.url.value = vinculo.url;
  elementos.clave.value = '';
  elementos.clave.placeholder = vinculo.vinculado ? 'Pega una clave nueva solo si la cambiaste' : 'mcp_…';
}

function filaEnvio(envio) {
  const fila = document.createElement('tr');
  const nombre = document.createElement('td');
  nombre.textContent = `${envio.nombre} (${envio.cursos})`;

  const celdaCodigo = document.createElement('td');
  const codigo = document.createElement('input');
  codigo.value = envio.codigoPortal ?? '';
  codigo.placeholder = 'Código del portal';
  codigo.setAttribute('aria-label', `Código en el portal para ${envio.nombre}`);
  codigo.className = 'entrada-codigo';
  codigo.addEventListener('change', async () => {
    const respuesta = await api(`/api/docente/sesiones/${envio.id}/codigo-portal`, {
      method: 'PATCH', body: JSON.stringify({ codigo: codigo.value }),
    });
    if (!respuesta.ok) {
      mostrar(elementos.errorEnvio, respuesta.mensaje);
      return;
    }
    mostrar(elementos.errorEnvio, '');
    pintarEnvios(respuesta.envios);
  });
  celdaCodigo.append(codigo);

  const estado = document.createElement('td');
  estado.textContent = textoEstado(envio);
  fila.append(nombre, celdaCodigo, estado);
  return fila;
}

function pintarEnvios(envios) {
  elementos.vacio.hidden = envios.length > 0;
  elementos.listado.hidden = envios.length === 0;
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
});

elementos.desvincular.addEventListener('click', async () => {
  if (!window.confirm('¿Desvincular OpenTest del portal? Tendrás que pegar la clave otra vez para enviar.')) return;
  const respuesta = await api('/api/docente/portal/vinculo', { method: 'DELETE' });
  pintarVinculo(respuesta.vinculo);
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
