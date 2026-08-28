const parametros = new URLSearchParams(window.location.search);
const sesionId = Number(parametros.get('sesion'));

const elementos = {
  qr: document.getElementById('qr'),
  direccion: document.getElementById('direccion'),
  nombre: document.getElementById('nombre'),
  estado: document.getElementById('estado'),
  reloj: document.getElementById('reloj'),
  dentro: document.getElementById('dentro'),
  entregados: document.getElementById('entregados'),
  controles: document.getElementById('controles'),
  error: document.getElementById('error'),
};

const ETIQUETAS = {
  abierta: 'Esperando para comenzar',
  en_curso: 'Evaluación en curso',
  pausada: 'Evaluación en pausa',
  cerrada: 'Evaluación cerrada',
};

let ultimaSincronizacion = null;
let sincronizando = false;
let estadoControles = null;
let proyeccionActual = null;

function mostrarError(mensaje) {
  elementos.error.textContent = mensaje;
  elementos.error.hidden = false;
}

function formatear(segundos) {
  const total = Math.max(0, Math.ceil(segundos));
  const horas = Math.floor(total / 3600);
  const minutos = Math.floor((total % 3600) / 60);
  const resto = total % 60;
  return horas > 0
    ? `${horas}:${String(minutos).padStart(2, '0')}:${String(resto).padStart(2, '0')}`
    : `${String(minutos).padStart(2, '0')}:${String(resto).padStart(2, '0')}`;
}

async function api(ruta, opciones = {}) {
  const respuesta = await fetch(ruta, opciones);
  const cuerpo = await respuesta.json();
  if (!respuesta.ok) throw new Error(cuerpo.mensaje ?? 'No pudimos actualizar la proyección.');
  return cuerpo;
}

function boton(texto, accion, clase = '') {
  const control = document.createElement('button');
  control.className = `boton control ${clase}`.trim();
  control.textContent = texto;
  control.addEventListener('click', accion);
  return control;
}

function enlace(texto, ruta) {
  const control = document.createElement('a');
  control.className = 'boton control control--volver';
  control.href = ruta;
  control.textContent = texto;
  return control;
}

async function transicion(nombre) {
  try {
    await api(`/api/docente/sesiones/${sesionId}/${nombre}`, { method: 'POST' });
    await sincronizar();
  } catch (err) {
    mostrarError(err.message);
  }
}

function pintarControles(proyeccion) {
  const controles = [];
  if (proyeccion.estado === 'abierta') {
    controles.push(boton('Comenzar', () => transicion('comenzar')));
  } else if (proyeccion.estado === 'en_curso') {
    controles.push(boton('Pausar', () => transicion('pausar')));
  } else if (proyeccion.estado === 'pausada') {
    controles.push(boton('Reanudar', () => transicion('reanudar')));
  }

  if (proyeccion.estado !== 'cerrada') {
    controles.push(boton('Cerrar', async () => {
      const pendientes = Math.max(0, proyeccionActual.dentro - proyeccionActual.entregados);
      if (!window.confirm(
        `${pendientes} estudiante(s) siguen presentando. ¿Cerrar y entregar sus pruebas?`,
      )) return;
      await transicion('cerrar');
    }, 'control--cerrar'));
  } else {
    controles.push(enlace('Volver a Evaluaciones', '/docente/sesiones.html'));
  }
  elementos.controles.replaceChildren(...controles);
}

function pintar(proyeccion) {
  proyeccionActual = proyeccion;
  elementos.nombre.textContent = proyeccion.nombre;
  elementos.estado.textContent = ETIQUETAS[proyeccion.estado] ?? proyeccion.estado;
  elementos.direccion.textContent = proyeccion.direccion;
  elementos.dentro.textContent = proyeccion.dentro;
  elementos.entregados.textContent = proyeccion.entregados;
  elementos.reloj.textContent = formatear(proyeccion.segundosRestantes);
  if (!elementos.qr.src) {
    elementos.qr.src = `/api/docente/qr.svg?texto=${encodeURIComponent(proyeccion.direccion)}`;
    elementos.qr.hidden = false;
  }
  if (estadoControles !== proyeccion.estado) {
    pintarControles(proyeccion);
    estadoControles = proyeccion.estado;
  }
  ultimaSincronizacion = {
    estado: proyeccion.estado,
    segundos: proyeccion.segundosRestantes,
    instante: performance.now(),
  };
}

async function sincronizar() {
  if (sincronizando) return;
  sincronizando = true;
  try {
    const { proyeccion } = await api(`/api/docente/proyeccion/${sesionId}`);
    elementos.error.hidden = true;
    pintar(proyeccion);
  } catch (err) {
    mostrarError(err.message);
  } finally {
    sincronizando = false;
  }
}

function interpolarReloj() {
  if (!ultimaSincronizacion || ultimaSincronizacion.estado !== 'en_curso') return;
  const transcurridos = (performance.now() - ultimaSincronizacion.instante) / 1000;
  elementos.reloj.textContent = formatear(ultimaSincronizacion.segundos - transcurridos);
}

if (!Number.isInteger(sesionId) || sesionId <= 0) {
  mostrarError('Elige una evaluación desde el panel del docente para proyectarla.');
} else {
  await sincronizar();
  window.setInterval(interpolarReloj, 250);
  window.setInterval(sincronizar, 5000);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) sincronizar();
  });
}
