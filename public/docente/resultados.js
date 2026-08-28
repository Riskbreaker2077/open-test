import { api } from './panel.js';

const panel = document.getElementById('panel');
const sinResultados = document.getElementById('sin-resultados');
const sesion = document.getElementById('sesion');
const curso = document.getElementById('curso');
let sesiones = [];

function actualizarCursos() {
  const actual = sesiones.find((item) => item.id === Number(sesion.value));
  const cursos = actual?.cursos.split(',').map((item) => item.trim()) ?? [];
  curso.replaceChildren(new Option('Todos los cursos', ''), ...cursos.map((item) => new Option(item, item)));
  actualizarEnlaces();
}

function actualizarEnlaces() {
  const filtro = curso.value ? `?curso=${encodeURIComponent(curso.value)}` : '';
  for (const tipo of ['detalle', 'resumen', 'json', 'excel']) {
    const enlace = document.getElementById(tipo === 'resumen' ? 'resumen-csv' : tipo);
    enlace.href = `/api/docente/sesiones/${sesion.value}/export/${tipo}${filtro}`;
  }
}

sesion.addEventListener('change', actualizarCursos);
curso.addEventListener('change', actualizarEnlaces);

const respuesta = await api('/api/docente/sesiones');
sesiones = respuesta.sesiones.filter((item) => item.estado === 'cerrada');
if (sesiones.length === 0) {
  sinResultados.hidden = false;
} else {
  const solicitada = Number(new URLSearchParams(window.location.search).get('sesion'));
  const elegida = sesiones.some((item) => item.id === solicitada) ? solicitada : sesiones[0].id;
  sesion.replaceChildren(...sesiones.map((item) =>
    new Option(item.nombre, item.id, item.id === elegida, item.id === elegida)));
  panel.hidden = false;
  actualizarCursos();
}
