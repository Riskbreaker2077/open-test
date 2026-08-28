import { api } from './panel.js';

const elementos = {
  panel: document.getElementById('panel'),
  sinSesiones: document.getElementById('sin-sesiones'),
  selector: document.getElementById('sesion'),
  nombre: document.getElementById('nombre'),
  parametros: document.getElementById('parametros'),
  direccion: document.getElementById('direccion'),
  proyectar: document.getElementById('proyectar'),
  cerrar: document.getElementById('cerrar'),
  error: document.getElementById('error'),
  tabla: document.getElementById('estudiantes'),
  convocados: document.getElementById('convocados'),
  dentro: document.getElementById('dentro'),
  entregados: document.getElementById('entregados'),
  sinEntrar: document.getElementById('sin-entrar'),
};

let sesionId = null;
let sondeo = null;
let ultimo = null;

const tiempo = (segundos) => {
  const total = Math.max(0, segundos ?? 0);
  const minutos = Math.floor(total / 60);
  return `${String(minutos).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
};

function celda(texto) {
  const td = document.createElement('td');
  td.textContent = texto;
  return td;
}

function pintarTabla(estudiantes) {
  const cabecera = document.createElement('thead');
  cabecera.innerHTML = '<tr><th>Estudiante</th><th>Curso</th><th>Estado</th>' +
    '<th>Avance</th><th>Tiempo</th><th>Resultado</th><th></th></tr>';
  const cuerpo = document.createElement('tbody');
  for (const estudiante of estudiantes) {
    const fila = document.createElement('tr');
    fila.append(celda(estudiante.nombre), celda(estudiante.curso));
    const estado = celda(estudiante.estado.replace('_', ' '));
    estado.className = `estado-monitor estado-monitor--${estudiante.estado}`;
    fila.append(
      estado,
      celda(estudiante.estado === 'presentando' ? `Pregunta ${estudiante.preguntaActual}` : '—'),
      celda(estudiante.estado === 'presentando' ? tiempo(estudiante.segundosRestantes) : '—'),
      celda(estudiante.estado === 'entregado'
        ? `${estudiante.puntaje} puntos · ${estudiante.porcentaje} % · ${estudiante.motivoEntrega}`
        : '—'),
    );
    const acciones = document.createElement('td');
    if (estudiante.estado === 'presentando') {
      const boton = document.createElement('button');
      boton.type = 'button';
      boton.className = 'boton boton--secundario boton--pequeno';
      boton.textContent = 'Forzar entrega';
      boton.addEventListener('click', async () => {
        if (!window.confirm(`¿Forzar la entrega de ${estudiante.nombre}?`)) return;
        const respuesta = await api(`/api/docente/intentos/${estudiante.intentoId}/forzar-entrega`, {
          method: 'POST', body: '{}',
        });
        if (!respuesta.ok) window.alert(respuesta.mensaje);
        await actualizar();
      });
      acciones.append(boton);
    }
    fila.append(acciones);
    cuerpo.append(fila);
  }
  elementos.tabla.replaceChildren(cabecera, cuerpo);
}

function pintar(monitoreo) {
  ultimo = monitoreo;
  const { sesion, contadores } = monitoreo;
  elementos.nombre.textContent = sesion.nombre;
  elementos.parametros.textContent = `${sesion.banco} · ${sesion.cursos.join(', ')} · ` +
    `${sesion.nPreguntas} preguntas · ${sesion.duracionMinutos} minutos · ${sesion.estado}`;
  elementos.direccion.textContent = monitoreo.direccion;
  elementos.proyectar.href = `/proyeccion/?sesion=${sesion.id}`;
  elementos.convocados.textContent = contadores.convocados;
  elementos.dentro.textContent = contadores.dentro;
  elementos.entregados.textContent = contadores.entregados;
  elementos.sinEntrar.textContent = contadores.sinEntrar;
  elementos.cerrar.disabled = sesion.estado === 'cerrada';
  pintarTabla(monitoreo.estudiantes);
}

async function actualizar() {
  if (!sesionId) return;
  const respuesta = await api(`/api/docente/sesiones/${sesionId}/monitoreo`);
  if (!respuesta.ok) {
    elementos.error.textContent = respuesta.mensaje;
    elementos.error.hidden = false;
    return;
  }
  elementos.error.hidden = true;
  pintar(respuesta.monitoreo);
}

function iniciarSondeo() {
  if (sondeo) clearInterval(sondeo);
  sondeo = document.hidden ? null : setInterval(actualizar, 5000);
}

elementos.selector.addEventListener('change', async () => {
  sesionId = Number(elementos.selector.value);
  const url = new URL(window.location.href);
  url.searchParams.set('sesion', sesionId);
  window.history.replaceState(null, '', url);
  await actualizar();
});

elementos.cerrar.addEventListener('click', async () => {
  const presentando = ultimo?.contadores.presentando ?? 0;
  if (!window.confirm(
    `${presentando} estudiante(s) siguen presentando y serán entregados. ¿Cerrar la evaluación?`,
  )) return;
  const respuesta = await api(`/api/docente/sesiones/${sesionId}/cerrar`, { method: 'POST', body: '{}' });
  if (!respuesta.ok) window.alert(respuesta.mensaje);
  await actualizar();
});

document.addEventListener('visibilitychange', () => {
  iniciarSondeo();
  if (!document.hidden) actualizar();
});

async function iniciar() {
  const respuesta = await api('/api/docente/sesiones');
  const activas = respuesta.sesiones.filter((sesion) =>
    ['abierta', 'en_curso', 'pausada'].includes(sesion.estado));
  if (activas.length === 0) {
    elementos.sinSesiones.hidden = false;
    return;
  }
  const solicitada = Number(new URLSearchParams(window.location.search).get('sesion'));
  sesionId = activas.some((sesion) => sesion.id === solicitada) ? solicitada : activas[0].id;
  elementos.selector.replaceChildren(...activas.map((sesion) =>
    new Option(sesion.nombre, sesion.id, sesion.id === sesionId, sesion.id === sesionId)));
  elementos.panel.hidden = false;
  await actualizar();
  iniciarSondeo();
}

await iniciar();
