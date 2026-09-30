import { api, iniciarEngranaje } from './panel.js';
import { crearIcono } from './iconos.js';

document.getElementById('engranaje').append(crearIcono('engranaje'));
iniciarEngranaje();

const elementos = {
  sinBancos: document.getElementById('sin-bancos'),
  panel: document.getElementById('panel'),
  banco: document.getElementById('banco'),
  engranaje: document.getElementById('engranaje'),
  alcance: document.getElementById('alcance'),
  alcanceActual: document.getElementById('alcance-actual'),
  curso: document.getElementById('curso'),
  sinSesiones: document.getElementById('sin-sesiones'),
  tablas: document.getElementById('tablas'),
  listaCompetencias: document.getElementById('lista-competencias'),
  tablaPreguntas: document.getElementById('tabla-preguntas'),
  kpiPreguntas: document.getElementById('kpi-preguntas'),
  kpiPromedio: document.getElementById('kpi-promedio'),
  kpiSaltada: document.getElementById('kpi-saltada'),
  kpiSegundos: document.getElementById('kpi-segundos'),
  distribucionBarra: document.getElementById('distribucion-barra'),
  distribucionLeyenda: document.getElementById('distribucion-leyenda'),
};

let sesionesDelBanco = [];

// Tramos de semáforo: menos de la mitad es crítico, menos de tres cuartos
// pide atención, el resto va bien. El color nunca es la única señal: el
// número siempre va al lado, en tinta neutra.
const TRAMOS = [
  { clave: 'critico', etiqueta: 'críticas', regla: '< 50 %', color: 'var(--rojo-600)', contiene: (p) => p < 50 },
  { clave: 'atencion', etiqueta: 'por atender', regla: '50–74 %', color: 'var(--dorado-500)', contiene: (p) => p >= 50 && p < 75 },
  { clave: 'bien', etiqueta: 'bien', regla: '≥ 75 %', color: 'var(--verde-700)', contiene: (p) => p >= 75 },
];

function colorAcierto(porcentaje) {
  return TRAMOS.find((tramo) => tramo.contiene(porcentaje)).color;
}

function celdaDiscreta(texto) {
  const td = document.createElement('td');
  td.className = 'texto-discreto';
  td.textContent = texto;
  return td;
}

function barraAcierto(porcentaje) {
  const pista = document.createElement('div');
  pista.className = 'barra-pista';
  const relleno = document.createElement('div');
  relleno.className = 'barra-relleno';
  relleno.style.width = `${Math.max(0, Math.min(100, porcentaje))}%`;
  relleno.style.background = colorAcierto(porcentaje);
  pista.append(relleno);
  return pista;
}

function celdaAcierto(porcentaje) {
  const td = document.createElement('td');
  const caja = document.createElement('div');
  caja.className = 'celda-acierto';
  const valor = document.createElement('span');
  valor.className = 'celda-acierto__valor';
  valor.textContent = `${porcentaje} %`;
  caja.append(barraAcierto(porcentaje), valor);
  td.append(caja);
  return td;
}

function promedioPonderado(elementosConPeso, valorDe) {
  const conDato = elementosConPeso.filter((item) => valorDe(item) != null && item.vecesMostrada > 0);
  const peso = conDato.reduce((suma, item) => suma + item.vecesMostrada, 0);
  if (peso === 0) return null;
  return conDato.reduce((suma, item) => suma + valorDe(item) * item.vecesMostrada, 0) / peso;
}

function pintarResumen(preguntas) {
  elementos.kpiPreguntas.textContent = preguntas.length;

  const acierto = promedioPonderado(preguntas, (p) => p.porcentajeAcierto);
  elementos.kpiPromedio.textContent = acierto == null ? '—' : `${Math.round(acierto)} %`;
  elementos.kpiPromedio.style.color = acierto == null ? '' : colorAcierto(acierto);

  const saltada = promedioPonderado(preguntas, (p) => p.porcentajeSaltada);
  elementos.kpiSaltada.textContent = saltada == null ? '—' : `${Math.round(saltada)} %`;

  const segundos = promedioPonderado(preguntas, (p) => p.segundosPromedio);
  elementos.kpiSegundos.textContent = segundos == null ? '—' : Math.round(segundos);

  // Cuántas preguntas caen en cada tramo: la respuesta a "¿qué tan mal
  // (o bien) está repartido?" en una sola barra, con la leyenda al lado.
  const conteos = TRAMOS.map((tramo) => ({
    ...tramo, total: preguntas.filter((p) => tramo.contiene(p.porcentajeAcierto)).length,
  }));
  elementos.distribucionBarra.replaceChildren(...conteos.filter((c) => c.total > 0).map((c) => {
    const tramo = document.createElement('div');
    tramo.className = 'distribucion__tramo';
    tramo.style.flex = `${c.total} 1 0`;
    tramo.style.background = c.color;
    tramo.title = `${c.total} pregunta(s) ${c.etiqueta} (${c.regla})`;
    return tramo;
  }));
  elementos.distribucionLeyenda.replaceChildren(...conteos.map((c) => {
    const item = document.createElement('span');
    const punto = document.createElement('span');
    punto.className = 'punto';
    punto.style.background = c.color;
    const negrita = document.createElement('b');
    negrita.textContent = c.total;
    item.append(punto, negrita, ` ${c.etiqueta} (${c.regla})`);
    return item;
  }));
}

function pintarCompetencias(competencias) {
  const ordenadas = [...competencias].sort((a, b) => a.porcentajeAcierto - b.porcentajeAcierto);
  elementos.listaCompetencias.replaceChildren(...ordenadas.map((item) => {
    const nombreCompleto = item.competencia || '(sin competencia)';
    const fila = document.createElement('div');
    fila.className = 'fila-competencia';

    const nombre = document.createElement('p');
    nombre.className = 'fila-competencia__nombre';
    nombre.textContent = nombreCompleto;
    nombre.title = nombreCompleto;

    const grafico = document.createElement('div');
    grafico.className = 'fila-competencia__grafico';
    const valor = document.createElement('span');
    valor.className = 'fila-competencia__valor';
    valor.textContent = `${item.porcentajeAcierto} %`;
    const meta = document.createElement('span');
    meta.className = 'fila-competencia__meta';
    meta.textContent = `${item.preguntas} preg.`;
    meta.title = `${item.preguntas} pregunta(s), mostradas ${item.vecesMostrada} veces`;
    grafico.append(barraAcierto(item.porcentajeAcierto), valor, meta);

    fila.append(nombre, grafico);
    return fila;
  }));
}

function pintarPreguntas(preguntas) {
  elementos.tablaPreguntas.replaceChildren(...preguntas.map((item) => {
    const competencia = item.competencia || '(sin competencia)';
    const td = document.createElement('td');
    const caja = document.createElement('div');
    caja.className = 'celda-titulo';
    caja.title = `${item.enunciado}\n${competencia}`;
    const enunciado = document.createElement('strong');
    enunciado.textContent = item.enunciado;
    const meta = document.createElement('small');
    meta.textContent = competencia;
    caja.append(enunciado, meta);
    td.append(caja);

    const fila = document.createElement('tr');
    fila.append(
      td,
      celdaAcierto(item.porcentajeAcierto),
      celdaDiscreta(item.vecesMostrada),
      celdaDiscreta(`${item.porcentajeSaltada} %`),
      celdaDiscreta(item.segundosPromedio == null ? '—' : item.segundosPromedio),
    );
    return fila;
  }));
}

function textoDeAlcance() {
  const alcance = elementos.alcance.selectedOptions[0]?.text ?? '';
  const curso = elementos.curso.selectedOptions[0]?.text ?? '';
  return [alcance, curso].filter(Boolean).join(' · ');
}

async function actualizarSesionesYCursos() {
  const { sesiones } = await api(`/api/docente/bancos/${elementos.banco.value}/sesiones-cerradas`);
  sesionesDelBanco = sesiones;

  if (sesiones.length === 0) {
    elementos.sinSesiones.hidden = false;
    elementos.tablas.hidden = true;
    elementos.engranaje.hidden = true;
    elementos.alcanceActual.textContent = '';
    elementos.alcance.replaceChildren();
    elementos.curso.replaceChildren();
    return;
  }
  elementos.sinSesiones.hidden = true;
  elementos.engranaje.hidden = false;

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

  elementos.alcanceActual.textContent = textoDeAlcance();
  pintarResumen(estadisticas.preguntas);
  pintarCompetencias(estadisticas.competencias);
  pintarPreguntas(estadisticas.preguntas);
  elementos.tablas.hidden = false;
}

elementos.banco.addEventListener('change', actualizarSesionesYCursos);
elementos.alcance.addEventListener('change', actualizarCursos);
elementos.curso.addEventListener('change', actualizarEstadisticas);

const { bancos } = await api('/api/docente/bancos');
if (bancos.length === 0) {
  elementos.sinBancos.hidden = false;
  elementos.banco.hidden = true;
  elementos.engranaje.hidden = true;
} else {
  elementos.banco.replaceChildren(...bancos.map((banco) => new Option(banco.nombre, banco.id)));
  elementos.panel.hidden = false;
  await actualizarSesionesYCursos();
}
