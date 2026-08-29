import { api } from './panel.js';

const elementos = {
  sinBancos: document.getElementById('sin-bancos'),
  panel: document.getElementById('panel'),
  banco: document.getElementById('banco'),
  alcance: document.getElementById('alcance'),
  curso: document.getElementById('curso'),
  sinSesiones: document.getElementById('sin-sesiones'),
  tablas: document.getElementById('tablas'),
  tablaCompetencias: document.getElementById('tabla-competencias'),
  tablaPreguntas: document.getElementById('tabla-preguntas'),
};

let sesionesDelBanco = [];

function celda(texto) {
  const td = document.createElement('td');
  td.textContent = texto;
  return td;
}

function pintarTabla(tabla, cabeceras, filas) {
  const cabecera = document.createElement('thead');
  cabecera.innerHTML = `<tr>${cabeceras.map((texto) => `<th>${texto}</th>`).join('')}</tr>`;
  const cuerpo = document.createElement('tbody');
  for (const fila of filas) {
    const tr = document.createElement('tr');
    tr.append(...fila.map((valor) => celda(valor)));
    cuerpo.append(tr);
  }
  tabla.replaceChildren(cabecera, cuerpo);
}

async function actualizarSesionesYCursos() {
  const { sesiones } = await api(`/api/docente/bancos/${elementos.banco.value}/sesiones-cerradas`);
  sesionesDelBanco = sesiones;

  if (sesiones.length === 0) {
    elementos.sinSesiones.hidden = false;
    elementos.tablas.hidden = true;
    elementos.alcance.replaceChildren();
    elementos.curso.replaceChildren();
    return;
  }
  elementos.sinSesiones.hidden = true;

  elementos.alcance.replaceChildren(
    new Option('Todas las sesiones cerradas', 'todas'),
    ...sesiones.map((sesion) => new Option(sesion.nombre, sesion.id)),
  );
  actualizarCursos();
}

function actualizarCursos() {
  const enAlcance = elementos.alcance.value === 'todas'
    ? sesionesDelBanco
    : sesionesDelBanco.filter((sesion) => String(sesion.id) === elementos.alcance.value);
  const cursos = [...new Set(enAlcance.flatMap((sesion) => sesion.cursos))].sort();
  elementos.curso.replaceChildren(new Option('Todos los cursos', ''), ...cursos.map((curso) => new Option(curso, curso)));
  actualizarEstadisticas();
}

async function actualizarEstadisticas() {
  const parametros = new URLSearchParams({ sesion: elementos.alcance.value, curso: elementos.curso.value });
  const { estadisticas } = await api(`/api/docente/bancos/${elementos.banco.value}/estadisticas?${parametros}`);

  pintarTabla(elementos.tablaCompetencias, ['Competencia', 'Preguntas', 'Veces mostrada', '% acierto'],
    estadisticas.competencias.map((item) => [
      item.competencia || '(sin competencia)', item.preguntas, item.vecesMostrada, `${item.porcentajeAcierto} %`,
    ]));

  pintarTabla(elementos.tablaPreguntas, ['Pregunta', 'Competencia', 'Veces mostrada', '% acierto', '% saltada', 'Segundos promedio'],
    estadisticas.preguntas.map((item) => [
      item.enunciado, item.competencia || '(sin competencia)', item.vecesMostrada,
      `${item.porcentajeAcierto} %`, `${item.porcentajeSaltada} %`,
      item.segundosPromedio == null ? '—' : item.segundosPromedio,
    ]));

  elementos.tablas.hidden = false;
}

elementos.banco.addEventListener('change', actualizarSesionesYCursos);
elementos.alcance.addEventListener('change', actualizarCursos);
elementos.curso.addEventListener('change', actualizarEstadisticas);

const { bancos } = await api('/api/docente/bancos');
if (bancos.length === 0) {
  elementos.sinBancos.hidden = false;
} else {
  elementos.banco.replaceChildren(...bancos.map((banco) => new Option(banco.nombre, banco.id)));
  elementos.panel.hidden = false;
  await actualizarSesionesYCursos();
}
