import { api, iniciarEngranaje } from './panel.js';
import { crearIcono } from './iconos.js';

document.getElementById('engranaje').append(crearIcono('engranaje'));
iniciarEngranaje();

const elementos = {
  panel: document.getElementById('panel'),
  sinSesiones: document.getElementById('sin-sesiones'),
  selector: document.getElementById('sesion'),
  nombre: document.getElementById('nombre'),
  estadoPastilla: document.getElementById('estado-pastilla'),
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

const ETIQUETAS_ESTADO = {
  sin_entrar: 'Sin entrar',
  presentando: 'Presentando',
  entregado: 'Entregado',
};
const PASTILLA_ESTADO = { sin_entrar: 'neutro', presentando: 'ambar', entregado: 'verde' };
const ETIQUETAS_SESION = {
  borrador: 'Borrador', abierta: 'Abierta — esperando', en_curso: 'En curso', pausada: 'En pausa', cerrada: 'Cerrada',
};
const PASTILLA_SESION = { borrador: 'neutro', abierta: 'ambar', en_curso: 'verde', pausada: 'rojo', cerrada: 'azul' };

let sesionId = null;
let sondeo = null;
let ultimo = null;

const tiempo = (segundos) => {
  const total = Math.max(0, segundos ?? 0);
  const minutos = Math.floor(total / 60);
  return `${String(minutos).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
};

function celdaTexto(texto) {
  const td = document.createElement('td');
  td.className = 'texto-discreto';
  td.textContent = texto;
  return td;
}

// El nombre identifica la fila (fuerte); el curso es de apoyo, tenue debajo
// — igual que Evaluación/Banco en las otras listas del panel.
function celdaEstudiante(estudiante) {
  const td = document.createElement('td');
  const caja = document.createElement('div');
  caja.className = 'celda-titulo';
  const nombre = document.createElement('strong');
  nombre.textContent = estudiante.nombre;
  const curso = document.createElement('small');
  curso.textContent = estudiante.curso;
  caja.append(nombre, curso);
  td.append(caja);
  return td;
}

function celdaEstado(estudiante) {
  const td = document.createElement('td');
  const pastilla = document.createElement('span');
  // La anulación (038) se superpone al estado: se anuló, pero sigue
  // importando si había entrado y si había entregado.
  if (estudiante.anulado) {
    pastilla.className = 'pastilla pastilla--rojo';
    pastilla.textContent = `Anulada · ${ETIQUETAS_ESTADO[estudiante.estado] ?? estudiante.estado}`;
  } else {
    pastilla.className = `pastilla pastilla--${PASTILLA_ESTADO[estudiante.estado] ?? 'neutro'}`;
    pastilla.textContent = ETIQUETAS_ESTADO[estudiante.estado] ?? estudiante.estado;
  }
  td.append(pastilla);
  return td;
}

function pintarTabla(estudiantes) {
  const filas = estudiantes.map((estudiante) => {
    const fila = document.createElement('tr');
    const tdAcciones = document.createElement('td');
    if (estudiante.estado === 'presentando' && !estudiante.anulado) {
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
      tdAcciones.append(boton);
    }
    fila.append(
      celdaEstudiante(estudiante),
      celdaEstado(estudiante),
      celdaTexto(estudiante.estado === 'presentando' ? `Pregunta ${estudiante.preguntaActual}` : '—'),
      celdaTexto(estudiante.estado === 'presentando' ? tiempo(estudiante.segundosRestantes) : '—'),
      celdaTexto((() => {
        if (estudiante.anulado) return 'Anulada · 0 puntos · 0 %';
        return estudiante.estado === 'entregado'
          ? `${estudiante.puntaje} puntos · ${estudiante.porcentaje} % · ${estudiante.motivoEntrega}`
          : '—';
      })()),
      tdAcciones,
    );
    return fila;
  });
  elementos.tabla.replaceChildren(...filas);
}

function pintar(monitoreo) {
  ultimo = monitoreo;
  const { sesion, contadores } = monitoreo;
  elementos.nombre.textContent = sesion.nombre;
  elementos.estadoPastilla.className = `pastilla pastilla--${PASTILLA_SESION[sesion.estado] ?? 'neutro'}`;
  elementos.estadoPastilla.textContent = ETIQUETAS_SESION[sesion.estado] ?? sesion.estado;
  elementos.parametros.textContent = `${sesion.banco} · ${sesion.cursos.join(', ')} · ` +
    `${sesion.nPreguntas} preguntas · ${sesion.duracionMinutos} minutos`;
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
