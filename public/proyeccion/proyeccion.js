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
  tablero: document.getElementById('tablero'),
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
let claveAsistencia = null;

/** Límites de la letra de las listas, en píxeles. */
const LETRA_MINIMA = 11;
const LETRA_MAXIMA_VMIN = 2.8;

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

const ESTADOS_ASISTENCIA = {
  sin_entrar: 'sin entrar',
  conectado: 'conectado',
  desconectado: 'salió',
  entregado: 'entregó',
};

function cuadroEstudiante(estudiante, conCurso) {
  const cuadro = document.createElement('li');
  cuadro.className = `cuadro cuadro--${estudiante.estado}`;
  cuadro.title = `${estudiante.nombre}: ${ESTADOS_ASISTENCIA[estudiante.estado] ?? estudiante.estado}`;
  const nombre = document.createElement('span');
  nombre.className = 'cuadro-nombre';
  nombre.textContent = `${estudiante.estado === 'entregado' ? '✓ ' : ''}${estudiante.nombre}`;
  cuadro.append(nombre);
  if (conCurso) {
    const curso = document.createElement('span');
    curso.className = 'cuadro-curso';
    curso.textContent = estudiante.curso;
    cuadro.append(curso);
  }
  return cuadro;
}

/** Busca la letra más grande con la que el tablero cabe sin desbordar su caja. */
function ajustarLetra(lista) {
  const maxima = Math.max(LETRA_MINIMA, Math.min(window.innerWidth, window.innerHeight) * LETRA_MAXIMA_VMIN / 100);
  let bajo = LETRA_MINIMA;
  let alto = maxima;
  lista.style.fontSize = `${alto}px`;
  if (lista.scrollHeight <= lista.clientHeight) return;
  for (let paso = 0; paso < 8; paso += 1) {
    const medio = (bajo + alto) / 2;
    lista.style.fontSize = `${medio}px`;
    if (lista.scrollHeight <= lista.clientHeight) bajo = medio;
    else alto = medio;
  }
  lista.style.fontSize = `${bajo}px`;
}

function ajustarTablero() {
  ajustarLetra(elementos.tablero);
}

function pintarAsistencia(proyeccion) {
  const clave = JSON.stringify([proyeccion.cursos, proyeccion.estudiantes]);
  if (clave === claveAsistencia) return;
  claveAsistencia = clave;

  const conCurso = proyeccion.cursos.length > 1;
  if (proyeccion.estudiantes.length === 0) {
    const vacio = document.createElement('li');
    vacio.className = 'vacia';
    vacio.textContent = 'Esta evaluación no tiene estudiantes convocados.';
    elementos.tablero.replaceChildren(vacio);
  } else {
    elementos.tablero.replaceChildren(
      ...proyeccion.estudiantes.map((estudiante) => cuadroEstudiante(estudiante, conCurso)),
    );
  }
  ajustarTablero();
}

function pintar(proyeccion) {
  proyeccionActual = proyeccion;
  elementos.nombre.textContent = proyeccion.nombre;
  elementos.estado.textContent = ETIQUETAS[proyeccion.estado] ?? proyeccion.estado;
  elementos.direccion.textContent = proyeccion.direccion;
  elementos.dentro.textContent = proyeccion.dentro;
  elementos.entregados.textContent = proyeccion.entregados;
  elementos.reloj.textContent = formatear(proyeccion.segundosRestantes);
  pintarAsistencia(proyeccion);
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
  // La caja de las listas cambia al cargar el QR o las fuentes, no solo al redimensionar.
  // Su tamaño no depende de la letra que se ajusta, así que no hay bucle.
  new ResizeObserver(ajustarTablero).observe(elementos.tablero);
  elementos.qr.addEventListener('load', ajustarTablero);
  document.fonts?.ready.then(ajustarTablero);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) sincronizar();
  });
}
