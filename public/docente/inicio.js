// Panel de inicio (047): qué está en marcha, qué quedó pendiente y los
// accesos ordenados como se trabaja: preparar, aplicar, después.
import { api } from './panel.js';
import { crearIcono } from './iconos.js';

for (const nodo of document.querySelectorAll('[data-icono]')) nodo.append(crearIcono(nodo.dataset.icono));

const ahora = document.getElementById('ahora-contenido');
const pendientes = document.getElementById('pendientes');
const listaPendientes = document.getElementById('pendientes-lista');

const ESTADOS = {
  abierta: 'Abierta — esperando que comiences',
  en_curso: 'En curso',
  pausada: 'En pausa',
};

const REFRESCO_MS = 10_000;

function el(etiqueta, clase, texto) {
  const nodo = document.createElement(etiqueta);
  if (clase) nodo.className = clase;
  if (texto != null) nodo.textContent = texto;
  return nodo;
}

function enlace(texto, href, clase) {
  const a = el('a', clase, texto);
  a.href = href;
  return a;
}

function plural(n, uno, varios) {
  return `${n} ${n === 1 ? uno : varios}`;
}

function filaActiva(sesion) {
  const fila = el('article', `ahora__sesion ahora__sesion--${sesion.estado}`);
  const datos = el('div', 'ahora__datos');
  datos.append(
    el('span', 'ahora__estado', ESTADOS[sesion.estado] ?? sesion.estado),
    el('strong', 'ahora__nombre', sesion.nombre),
    el('span', 'ahora__detalle',
      `${sesion.cursos.replaceAll(',', ', ')} · ${plural(sesion.dentro, 'ha entrado', 'han entrado')}` +
      ` · ${plural(sesion.entregados, 'entregó', 'entregaron')}`),
  );
  const acciones = el('div', 'ahora__acciones');
  acciones.append(
    enlace('Monitorear', `/docente/monitoreo.html?sesion=${sesion.id}`, 'boton'),
    enlace('Proyectar', `/proyeccion/?sesion=${sesion.id}`, 'boton boton--claro'),
  );
  fila.append(datos, acciones);
  return fila;
}

function pintarAhora(activas) {
  if (activas.length === 0) {
    const vacio = el('div', 'ahora__sesion');
    const datos = el('div', 'ahora__datos');
    datos.append(
      el('strong', 'ahora__nombre', 'Sin evaluación en marcha'),
    );
    const acciones = el('div', 'ahora__acciones');
    acciones.append(enlace('Ir a Evaluaciones', '/docente/sesiones.html', 'boton boton--claro'));
    vacio.append(datos, acciones);
    ahora.replaceChildren(vacio);
    return;
  }
  ahora.replaceChildren(...activas.map(filaActiva));
}

function pintarPendientes(estado) {
  // Fichas cortas y clicables (el texto largo va en el title).
  const avisos = [];
  if (estado.estudiantes === 0) avisos.push(['Sin estudiantes', 'Todavía no has cargado estudiantes. Empieza por ahí.', '/docente/estudiantes.html']);
  if (estado.bancos === 0) avisos.push(['Sin bancos', 'Todavía no hay bancos de preguntas.', '/docente/bancos.html']);
  if (estado.sinEnviar > 0) {
    avisos.push([
      `${estado.sinEnviar} sin enviar al portal`,
      `${plural(estado.sinEnviar, 'evaluación cerrada tiene', 'evaluaciones cerradas tienen')} resultados sin enviar al portal.`,
      '/docente/portal.html',
    ]);
  }

  pendientes.hidden = avisos.length === 0;
  listaPendientes.replaceChildren(...avisos.map(([texto, detalle, href]) => {
    const item = el('li');
    const ficha = enlace(texto, href, 'ficha');
    ficha.title = detalle;
    item.append(ficha);
    return item;
  }));
}

function pintarDatos(estado) {
  const textos = {
    estudiantes: estado.estudiantes,
    bancos: estado.bancos,
    evaluaciones: estado.evaluaciones,
  };
  for (const nodo of document.querySelectorAll('[data-dato]')) {
    const valor = textos[nodo.dataset.dato];
    nodo.textContent = valor ?? '';
    nodo.hidden = valor == null;
  }
}

async function refrescar() {
  try {
    const estado = await api('/api/docente/estado');
    if (!estado.ok) return;
    pintarAhora(estado.activas);
    pintarPendientes(estado);
    pintarDatos(estado);
  } catch {
    // Si el servidor no responde, se conserva lo último pintado.
  }
}

let temporizador = null;
function programar() {
  clearInterval(temporizador);
  temporizador = document.hidden ? null : setInterval(refrescar, REFRESCO_MS);
}

document.addEventListener('visibilitychange', () => {
  if (!document.hidden) refrescar();
  programar();
});

await refrescar();
programar();
