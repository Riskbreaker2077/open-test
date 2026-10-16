import { api } from './panel.js';
import { letrasDeOpciones, renderizarGrupo, renderizarPregunta, textoPlano } from '/shared/pregunta.js';
import { crearIcono } from './iconos.js';
import { crearEditorBloques } from './editor-bloques.js';

const importarDialogo = document.getElementById('importar');
const importarTitulo = document.getElementById('importar-titulo');
const importarDestino = document.getElementById('importar-destino');
const campoNombre = document.getElementById('campo-nombre');
const abrirImportar = document.getElementById('abrir-importar');
const imagenes = document.getElementById('imagenes');
const estadoImagenes = document.getElementById('estado-imagenes');
const nombre = document.getElementById('nombre');
const paquete = document.getElementById('paquete');
const errores = document.getElementById('errores');
const listaErrores = document.getElementById('lista-errores');
const previsualizacion = document.getElementById('previsualizacion');
const resumenCarga = document.getElementById('resumen-carga');
const avisos = document.getElementById('avisos');
const muestra = document.getElementById('muestra');
const confirmar = document.getElementById('confirmar');
const listado = document.getElementById('listado');
const listaCabecera = document.getElementById('lista-cabecera');
const listaEnvoltura = document.getElementById('lista-envoltura');
const vacio = document.getElementById('vacio');
const vacioImportar = document.getElementById('vacio-importar');
const seccionLista = document.getElementById('seccion-lista');
const encabezadoPantalla = document.querySelector('.encabezado-pantalla');
const detalle = document.getElementById('detalle');
const detalleTitulo = document.getElementById('detalle-titulo');
const detalleResumen = document.getElementById('detalle-resumen');
const detallePreguntas = document.getElementById('detalle-preguntas');
const detalleVacio = document.getElementById('detalle-vacio');
const vistaPrevia = document.getElementById('vista-previa');
const cerrarDetalle = document.getElementById('cerrar-detalle');
const nuevoBanco = document.getElementById('nuevo-banco');
const errorNuevoBanco = document.getElementById('error-nuevo-banco');
const agregarPregunta = document.getElementById('agregar-pregunta');
const agregarZip = document.getElementById('agregar-zip');

let paquetePendiente = null;
// null = la importación crea un banco nuevo; un id = agrega a ese banco (052).
let bancoDestinoZip = null;

function listaDeMensajes(contenedor, lista) {
  contenedor.replaceChildren(
    ...lista.map((mensaje) => {
      const li = document.createElement('li');
      li.textContent = mensaje;
      return li;
    }),
  );
}

// --- Importar un paquete: banco nuevo o agregado al abierto ---------------

function limpiar() {
  errores.hidden = true;
  previsualizacion.hidden = true;
  confirmar.hidden = true;
  avisos.hidden = true;
  listaErrores.replaceChildren();
  muestra.replaceChildren();
  paquetePendiente = null;
}

function abrirDialogoImportar(destino) {
  bancoDestinoZip = destino?.id ?? null;
  importarTitulo.textContent = destino ? 'Agregar preguntas desde un ZIP' : 'Importar paquete (.zip)';
  importarDestino.hidden = !destino;
  importarDestino.textContent = destino ? `Las preguntas del paquete se agregan a «${destino.nombre}».` : '';
  campoNombre.hidden = Boolean(destino);
  confirmar.textContent = destino ? 'Confirmar y agregar' : 'Confirmar e importar';
  importarDialogo.showModal();
}

const rutaPaquete = (paso) => (bancoDestinoZip
  ? `/api/docente/bancos/${bancoDestinoZip}/paquete/${paso}`
  : `/api/docente/bancos/paquete/${paso}?nombre=${encodeURIComponent(nombre.value)}`);

abrirImportar.addEventListener('click', () => abrirDialogoImportar(null));
vacioImportar.addEventListener('click', () => abrirDialogoImportar(null));
importarDialogo.addEventListener('close', () => {
  limpiar();
  paquete.value = '';
  nombre.value = '';
});
importarDialogo.querySelectorAll('[data-cerrar]').forEach((el) => {
  el.addEventListener('click', () => importarDialogo.close());
});

function mostrarPrevisualizacion(respuesta) {
  if (!nombre.value && !bancoDestinoZip) nombre.value = respuesta.nombre;

  const { total, conContexto, conImagen, imagenesIncluidas } = respuesta.resumen;
  resumenCarga.textContent =
    `${total} pregunta(s): ${conContexto} con contexto y ${conImagen} con imagen.` +
    (imagenesIncluidas === undefined ? '' : ` El ZIP incluye ${imagenesIncluidas} imagen(es).`);

  if (respuesta.avisos.length > 0) {
    avisos.textContent = respuesta.avisos.join(' ');
    avisos.hidden = false;
  }

  muestra.replaceChildren(
    ...respuesta.muestra.map((pregunta) =>
      renderizarPregunta(pregunta, {
        correcta: pregunta.opciones.findIndex((o) => o.es_correcta),
        mostrarJustificacion: true,
      }),
    ),
  );
  previsualizacion.hidden = false;
  confirmar.hidden = false;
}

function mostrarErrores(lista) {
  listaDeMensajes(listaErrores, lista);
  errores.hidden = false;
}

imagenes.addEventListener('change', async () => {
  const ficheros = [...imagenes.files];
  if (ficheros.length === 0) return;

  const pesadas = [];
  for (const fichero of ficheros) {
    estadoImagenes.textContent = `Subiendo ${fichero.name}…`;
    const res = await fetch(`/api/docente/imagenes?nombre=${encodeURIComponent(fichero.name)}`, {
      method: 'POST',
      headers: { 'content-type': fichero.type || 'application/octet-stream' },
      body: fichero,
    });
    const cuerpo = await res.json();

    if (!cuerpo.ok) {
      estadoImagenes.textContent = `${fichero.name}: ${cuerpo.mensaje}`;
      return;
    }
    if (cuerpo.imagen.pesada) pesadas.push(fichero.name);
  }

  const total = (await api('/api/docente/imagenes')).imagenes.length;
  estadoImagenes.textContent =
    `${ficheros.length} imagen(es) subida(s). Hay ${total} disponible(s).` +
    (pesadas.length > 0
      ? ` Ojo: ${pesadas.join(', ')} pesa(n) bastante y puede(n) ir lenta(s) en tablets modestas.`
      : '');
  imagenes.value = '';
});

paquete.addEventListener('change', async () => {
  limpiar();
  const fichero = paquete.files[0];
  if (!fichero) return;

  const respuesta = await api(rutaPaquete('validar'), {
    method: 'POST', headers: { 'content-type': 'application/zip' }, body: fichero,
  });
  if (!respuesta.ok) {
    mostrarErrores(respuesta.errores);
    return;
  }
  paquetePendiente = fichero;
  mostrarPrevisualizacion(respuesta);
});

confirmar.addEventListener('click', async () => {
  if (!paquetePendiente) return;

  confirmar.disabled = true;
  try {
    const destino = bancoDestinoZip;
    const respuesta = await api(rutaPaquete('confirmar'), {
      method: 'POST', headers: { 'content-type': 'application/zip' }, body: paquetePendiente,
    });

    if (!respuesta.ok) {
      mostrarErrores(respuesta.errores ?? [respuesta.mensaje]);
      return;
    }
    importarDialogo.close(); // dispara 'close', que ya limpia el formulario
    await recargar();
    if (destino) await verBanco(destino);
  } finally {
    confirmar.disabled = false;
  }
});

// --- Nuevo banco vacío (028) -------------------------------------------

nuevoBanco.addEventListener('click', async () => {
  errorNuevoBanco.hidden = true;
  const nombreBanco = window.prompt('Nombre del banco:');
  if (nombreBanco === null) return; // canceló

  const respuesta = await api('/api/docente/bancos', {
    method: 'POST',
    body: JSON.stringify({ nombre: nombreBanco }),
  });

  if (!respuesta.ok) {
    errorNuevoBanco.textContent = respuesta.errores?.join(' ') ?? respuesta.mensaje;
    errorNuevoBanco.hidden = false;
    return;
  }

  await recargar();
  await verBanco(respuesta.banco.id);
});

// --- Detalle del banco: lista a la izquierda, vista previa a la derecha (052)

let bancoActual = null;
// { tipo: 'pregunta' | 'grupo', id }
let seleccion = null;

const ETIQUETA_TIPO_GRUPO = {
  contexto_compartido: 'Contexto compartido',
  banco_opciones: 'Emparejamiento',
  texto_con_blancos: 'Texto con blancos',
};
// Emparejamiento y texto con blancos se borran enteros (ver eliminarPregunta).
const GRUPOS_INDIVISIBLES = new Set(['banco_opciones', 'texto_con_blancos']);

const MOTIVO_USADA = 'Ya se usó en una evaluación: no se puede editar ni eliminar para que sus respuestas sigan siendo auditables.';

const grupoUsado = (grupo) => grupo.preguntas.some((p) => p.usos > 0);

function resumenDe(bloques, alternativa) {
  const texto = textoPlano(bloques).trim();
  if (texto) return texto;
  if ((bloques ?? []).some((b) => b.tipo === 'imagen')) return '(imagen)';
  if ((bloques ?? []).some((b) => b.tipo === 'tabla')) return '(tabla)';
  return alternativa;
}

function botonIcono(nombreIcono, titulo, alPulsar, claseExtra = '') {
  const boton = document.createElement('button');
  boton.type = 'button';
  boton.className = `boton-fila ${claseExtra}`.trim();
  boton.append(crearIcono(nombreIcono));
  boton.title = titulo;
  boton.setAttribute('aria-label', titulo);
  boton.addEventListener('click', alPulsar);
  return boton;
}

function deshabilitar(boton, motivo) {
  boton.disabled = true;
  boton.title = motivo;
}

/** Numeración corrida en el orden de la lista: sueltas primero, luego los grupos. */
function preguntasNumeradas(banco) {
  const numeros = new Map();
  let n = 0;
  for (const p of banco.preguntas) numeros.set(p.id, ++n);
  for (const g of banco.grupos) for (const p of g.preguntas) numeros.set(p.id, ++n);
  return numeros;
}

function buscarPregunta(id) {
  const suelta = bancoActual.preguntas.find((p) => p.id === id);
  if (suelta) return { pregunta: suelta, grupo: null };
  for (const grupo of bancoActual.grupos) {
    const miembro = grupo.preguntas.find((p) => p.id === id);
    if (miembro) return { pregunta: miembro, grupo };
  }
  return null;
}

function accionesPregunta(pregunta, grupo) {
  const contenedor = document.createElement('div');
  contenedor.className = 'acciones-fila';
  const editar = botonIcono('editar', 'Editar', (ev) => abrirEditorPregunta(pregunta, grupo, ev.currentTarget));
  const borrar = botonIcono('borrar', 'Eliminar', () => eliminarPreguntaConfirmando(pregunta), 'boton-fila--peligro');
  if (pregunta.usos > 0) {
    deshabilitar(editar, MOTIVO_USADA);
    deshabilitar(borrar, MOTIVO_USADA);
  } else if (grupo && GRUPOS_INDIVISIBLES.has(grupo.tipo)) {
    deshabilitar(borrar, 'Esta pregunta es parte de un grupo que va completo: elimina el grupo entero.');
  }
  contenedor.append(editar, borrar);
  return contenedor;
}

function accionesGrupo(grupo) {
  const contenedor = document.createElement('div');
  contenedor.className = 'acciones-fila';
  const editar = botonIcono('editar', 'Editar grupo', (ev) => abrirEditorGrupo(grupo, ev.currentTarget));
  const borrar = botonIcono('borrar', 'Eliminar grupo', () => eliminarGrupoConfirmando(grupo), 'boton-fila--peligro');
  if (grupoUsado(grupo)) {
    deshabilitar(editar, MOTIVO_USADA);
    deshabilitar(borrar, MOTIVO_USADA);
  }
  contenedor.append(editar, borrar);
  return contenedor;
}

function itemLista({ numero, titulo, apoyo, usada, clase, alElegir, acciones, actual }) {
  const li = document.createElement('li');
  const fila = document.createElement('div');
  fila.className = `item-lista ${clase ?? ''}`.trim();
  if (actual) fila.setAttribute('aria-current', 'true');

  const abrir = document.createElement('button');
  abrir.type = 'button';
  abrir.className = 'item-lista__abrir';
  const num = document.createElement('span');
  num.className = 'item-lista__numero';
  num.textContent = numero ?? '';
  const texto = document.createElement('span');
  texto.className = 'item-lista__texto';
  const fuerte = document.createElement('strong');
  fuerte.textContent = titulo;
  const tenue = document.createElement('small');
  tenue.textContent = apoyo;
  texto.append(fuerte, tenue);
  abrir.append(num, texto);
  abrir.addEventListener('click', alElegir);

  fila.append(abrir);
  if (usada) {
    const candado = crearIcono('candado');
    candado.classList.add('item-lista__candado');
    candado.setAttribute('aria-label', 'Usada en una evaluación');
    fila.append(candado);
  }
  fila.append(acciones);
  li.append(fila);
  return li;
}

function pintarLista() {
  const teniaFoco = detallePreguntas.contains(document.activeElement);
  const numeros = preguntasNumeradas(bancoActual);
  const esActual = (tipo, id) => seleccion?.tipo === tipo && seleccion.id === id;
  const elegir = (tipo, id) => () => {
    seleccion = { tipo, id };
    pintarLista();
    pintarVista();
  };

  const itemPregunta = (pregunta, grupo) => itemLista({
    numero: numeros.get(pregunta.id),
    titulo: resumenDe(pregunta.enunciado, 'Sin enunciado'),
    apoyo: pregunta.competencia || 'Sin competencia',
    usada: pregunta.usos > 0,
    actual: esActual('pregunta', pregunta.id),
    alElegir: elegir('pregunta', pregunta.id),
    acciones: accionesPregunta(pregunta, grupo),
  });

  const items = bancoActual.preguntas.map((p) => itemPregunta(p, null));
  for (const grupo of bancoActual.grupos) {
    const li = itemLista({
      titulo: `${ETIQUETA_TIPO_GRUPO[grupo.tipo] ?? grupo.tipo} · ${grupo.preguntas.length} pregunta(s)`,
      apoyo: resumenDe(grupo.contexto, 'Sin contexto'),
      usada: grupoUsado(grupo),
      clase: 'item-lista--grupo',
      actual: esActual('grupo', grupo.id),
      alElegir: elegir('grupo', grupo.id),
      acciones: accionesGrupo(grupo),
    });
    const miembros = document.createElement('ol');
    miembros.append(...grupo.preguntas.map((p) => itemPregunta(p, grupo)));
    li.append(miembros);
    items.push(li);
  }

  detallePreguntas.replaceChildren(...items);
  detalleVacio.hidden = items.length > 0;
  detallePreguntas.hidden = items.length === 0;
  const actual = detallePreguntas.querySelector('[aria-current="true"]');
  actual?.scrollIntoView({ block: 'nearest' });
  if (teniaFoco) actual?.querySelector('.item-lista__abrir')?.focus();
}

const CAMPOS_FICHA = [
  ['competencia', 'Competencia'],
  ['componente', 'Componente'],
  ['afirmacion', 'Afirmación'],
  ['evidencia', 'Evidencia'],
  ['estandar_asociado', 'Estándar asociado'],
  ['que_evalua', 'Qué evalúa'],
];
const CAMPOS_FICHA_PREGUNTA = [
  ...CAMPOS_FICHA,
  ['grado', 'Grado'],
  ['prueba', 'Prueba'],
  ['nivel_mcer', 'Nivel MCER'],
  ['valor', 'Valor (puntos)'],
];

function textoDeTraza(valor) {
  if (!valor || typeof valor !== 'object') return '';
  return Object.entries(valor)
    .filter(([, v]) => v !== '' && v != null)
    .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`)
    .join(' · ');
}

function fichaPedagogica(titulo, datos, campos, extras = []) {
  const ficha = document.createElement('section');
  ficha.className = 'ficha-pedagogica';
  const h3 = document.createElement('h3');
  h3.textContent = titulo;
  const dl = document.createElement('dl');
  for (const [campo, etiqueta] of [...campos, ...extras]) {
    const valor = datos[campo];
    const dt = document.createElement('dt');
    dt.textContent = etiqueta;
    const dd = document.createElement('dd');
    const texto = valor == null || valor === '' ? '' : String(valor);
    dd.textContent = texto || 'Sin dato';
    if (!texto) dd.className = 'vacio';
    dl.append(dt, dd);
  }
  ficha.append(h3, dl);
  return ficha;
}

function correctasDeGrupo(grupo) {
  const correctas = {};
  for (const miembro of grupo.preguntas) {
    if (miembro.tipo_item === 'miembro_banco_opciones') {
      if (miembro.respuesta_pool_id) correctas[miembro.id] = miembro.respuesta_pool_id;
    } else {
      const correcta = (miembro.opciones ?? []).find((o) => o.es_correcta === 1);
      if (correcta) correctas[miembro.id] = correcta.id;
    }
  }
  return correctas;
}

// El render compartido identifica a cada miembro por `pregunta_id` (así lo
// manda la API del examen); el panel trae `id`.
const comoMiembro = (pregunta) => ({ ...pregunta, pregunta_id: pregunta.id });

function cabeceraVista(titulo, pastillas, acciones, nota) {
  const cabecera = document.createElement('div');
  cabecera.className = 'vista-cabecera';
  const h2 = document.createElement('h2');
  h2.textContent = titulo;
  cabecera.append(h2);
  for (const [texto, clase] of pastillas) {
    const pastilla = document.createElement('span');
    pastilla.className = `pastilla ${clase}`;
    pastilla.textContent = texto;
    cabecera.append(pastilla);
  }
  cabecera.append(...acciones);
  if (nota) {
    const p = document.createElement('p');
    p.className = 'apunte vista-cabecera__nota';
    p.textContent = nota;
    cabecera.append(p);
  }
  return cabecera;
}

function botonTexto(texto, clase, alPulsar, motivoDeshabilitado) {
  const boton = document.createElement('button');
  boton.type = 'button';
  boton.className = `boton boton--pequeno ${clase}`;
  boton.textContent = texto;
  boton.addEventListener('click', alPulsar);
  if (motivoDeshabilitado) deshabilitar(boton, motivoDeshabilitado);
  return boton;
}

function pintarVista() {
  vistaPrevia.replaceChildren();
  if (!seleccion) return;

  if (seleccion.tipo === 'grupo') {
    const grupo = bancoActual.grupos.find((g) => g.id === seleccion.id);
    if (!grupo) return;
    const usado = grupoUsado(grupo) ? MOTIVO_USADA : null;
    vistaPrevia.append(
      cabeceraVista(
        `Grupo · ${ETIQUETA_TIPO_GRUPO[grupo.tipo] ?? grupo.tipo}`,
        usado ? [['Usado en una evaluación', 'pastilla--neutro']] : [],
        [
          botonTexto('Editar grupo', 'boton--secundario', (ev) => abrirEditorGrupo(grupo, ev.currentTarget), usado),
          botonTexto('Eliminar grupo', 'boton--secundario', () => eliminarGrupoConfirmando(grupo), usado),
        ],
        `${grupo.preguntas.length} pregunta(s). Así ve el estudiante el grupo completo.`,
      ),
      renderizarGrupo(grupo, {
        preguntas: grupo.preguntas.map(comoMiembro),
        correctas: correctasDeGrupo(grupo),
        mostrarJustificacion: true,
      }),
      fichaPedagogica('Datos pedagógicos del grupo', grupo.metadata_pedagogica ?? {}, CAMPOS_FICHA),
    );
    return;
  }

  const encontrada = buscarPregunta(seleccion.id);
  if (!encontrada) return;
  const { pregunta, grupo } = encontrada;
  const numero = preguntasNumeradas(bancoActual).get(pregunta.id);
  const usada = pregunta.usos > 0 ? MOTIVO_USADA : null;
  const indivisible = grupo && GRUPOS_INDIVISIBLES.has(grupo.tipo)
    ? 'Esta pregunta es parte de un grupo que va completo: elimina el grupo entero.'
    : null;

  const pastillas = [];
  if (grupo) pastillas.push([ETIQUETA_TIPO_GRUPO[grupo.tipo] ?? grupo.tipo, 'pastilla--ambar']);
  if (usada) pastillas.push(['Usada en una evaluación', 'pastilla--neutro']);

  const vista = grupo
    ? renderizarGrupo(grupo, {
      preguntas: [comoMiembro(pregunta)],
      correctas: correctasDeGrupo(grupo),
      mostrarJustificacion: true,
    })
    : renderizarPregunta(pregunta, {
      correcta: pregunta.opciones.findIndex((o) => o.es_correcta === 1),
      mostrarJustificacion: true,
    });

  vistaPrevia.append(
    cabeceraVista(
      `Pregunta ${numero}`,
      pastillas,
      [
        botonTexto('Editar', 'boton--secundario', (ev) => abrirEditorPregunta(pregunta, grupo, ev.currentTarget), usada),
        botonTexto('Eliminar', 'boton--secundario', () => eliminarPreguntaConfirmando(pregunta), usada ?? indivisible),
      ],
      usada,
    ),
    vista,
    fichaPedagogica('Datos pedagógicos', pregunta, CAMPOS_FICHA_PREGUNTA),
  );
  const traza = [['procedencia', 'Procedencia'], ['verificado', 'Verificado'], ['fuentes', 'Fuentes']]
    .map(([campo, etiqueta]) => [etiqueta, textoDeTraza(pregunta[campo])])
    .filter(([, texto]) => texto);
  if (traza.length > 0) {
    vistaPrevia.append(fichaPedagogica('Trazabilidad', Object.fromEntries(traza), traza.map(([e]) => [e, e])));
  }
}

async function verBanco(id) {
  const { banco } = await api(`/api/docente/bancos/${id}`);
  const cambioDeBanco = bancoActual?.id !== banco.id;
  bancoActual = { ...banco, grupos: banco.grupos ?? [] };

  const totalMiembros = bancoActual.grupos.reduce((suma, g) => suma + g.preguntas.length, 0);
  const total = bancoActual.preguntas.length + totalMiembros;
  detalleTitulo.textContent = banco.nombre;
  detalleTitulo.title = banco.nombre;
  detalleResumen.textContent = bancoActual.grupos.length > 0
    ? `${total} pregunta(s) · ${bancoActual.grupos.length} grupo(s)`
    : `${total} pregunta(s)`;

  // Conserva la selección si sigue existiendo; si no, la primera pregunta.
  const sigue = seleccion && !cambioDeBanco && (seleccion.tipo === 'grupo'
    ? bancoActual.grupos.some((g) => g.id === seleccion.id)
    : buscarPregunta(seleccion.id));
  if (!sigue) {
    const primera = bancoActual.preguntas[0] ?? bancoActual.grupos[0]?.preguntas[0];
    seleccion = primera ? { tipo: 'pregunta', id: primera.id } : null;
  }

  pintarLista();
  pintarVista();
  seccionLista.hidden = true;
  encabezadoPantalla.hidden = true;
  detalle.hidden = false;
}

function cerrarDetalleBanco() {
  detalle.hidden = true;
  seccionLista.hidden = false;
  encabezadoPantalla.hidden = false;
  bancoActual = null;
  seleccion = null;
}

cerrarDetalle.addEventListener('click', cerrarDetalleBanco);
agregarZip.addEventListener('click', () => abrirDialogoImportar(bancoActual));

async function refrescarTrasCambio() {
  await verBanco(bancoActual.id);
  await recargar();
}

async function eliminarPreguntaConfirmando(pregunta) {
  if (!window.confirm('¿Eliminar esta pregunta del banco? No se puede deshacer.')) return;
  const respuesta = await api(`/api/docente/preguntas/${pregunta.id}`, { method: 'DELETE' });
  if (!respuesta.ok) {
    window.alert(respuesta.mensaje);
    return;
  }
  await refrescarTrasCambio();
}

async function eliminarGrupoConfirmando(grupo) {
  const mensaje = `¿Eliminar este grupo con sus ${grupo.preguntas.length} pregunta(s)? No se puede deshacer.`;
  if (!window.confirm(mensaje)) return;
  const respuesta = await api(`/api/docente/grupos/${encodeURIComponent(grupo.id)}`, { method: 'DELETE' });
  if (!respuesta.ok) {
    window.alert(respuesta.mensaje);
    return;
  }
  await refrescarTrasCambio();
}

// --- Editor de pregunta: crear y editar, contenido completo (028 → 052) ----

const editorPregunta = document.getElementById('editor-pregunta');
const formularioPregunta = document.getElementById('formulario-pregunta');
const editorPreguntaTitulo = document.getElementById('editor-pregunta-titulo');
const editorPreguntaNota = document.getElementById('editor-pregunta-nota');
const editorContexto = document.getElementById('editor-contexto');
const editorEnunciado = document.getElementById('editor-enunciado');
const editorSeccionOpciones = document.getElementById('editor-seccion-opciones');
const editorOpciones = document.getElementById('editor-opciones');
const editorAgregarOpcion = document.getElementById('editor-agregar-opcion');
const editorSeccionRespuesta = document.getElementById('editor-seccion-respuesta');
const editorRespuesta = document.getElementById('editor-respuesta');
const editorPreguntaErrores = document.getElementById('editor-pregunta-errores');
const editorPreguntaListaErrores = document.getElementById('editor-pregunta-lista-errores');
const editorPreguntaCancelar = document.getElementById('editor-pregunta-cancelar');
const editorPreguntaGuardar = document.getElementById('editor-pregunta-guardar');
const camposPregunta = [...editorPregunta.querySelectorAll('[data-campo]')];

const MAX_OPCIONES = 8;
const MIN_OPCIONES = 2;

let estadoEditor = null;
let disparadorEditor = null;

function pintarOpciones() {
  const letras = letrasDeOpciones(estadoEditor.opciones.length);
  estadoEditor.opciones.forEach((opcion, i) => {
    opcion.letra.textContent = `Opción ${letras[i]}`;
    opcion.radio.value = String(i);
    opcion.contenedor.classList.toggle('editor-opcion--correcta', opcion.radio.checked);
    opcion.quitar.disabled = estadoEditor.opciones.length <= MIN_OPCIONES;
  });
  editorOpciones.replaceChildren(...estadoEditor.opciones.map((o) => o.contenedor));
  editorAgregarOpcion.disabled = estadoEditor.opciones.length >= MAX_OPCIONES;
}

function filaOpcion(opcion) {
  const contenedor = document.createElement('div');
  contenedor.className = 'editor-opcion';

  const cabecera = document.createElement('div');
  cabecera.className = 'editor-opcion__cabecera';
  const letra = document.createElement('span');
  const etiqueta = document.createElement('label');
  const radio = document.createElement('input');
  radio.type = 'radio';
  radio.name = 'editor-opcion-correcta';
  radio.checked = Boolean(opcion.es_correcta);
  radio.addEventListener('change', pintarOpciones);
  etiqueta.append(radio, 'Correcta');
  const quitar = document.createElement('button');
  quitar.type = 'button';
  quitar.className = 'boton-mini boton-mini--peligro';
  quitar.textContent = '✕';
  quitar.title = 'Quitar esta opción';
  quitar.setAttribute('aria-label', 'Quitar esta opción');
  cabecera.append(letra, etiqueta, quitar);

  const bloques = crearEditorBloques(opcion.contenido ?? [], { vacio: 'Agrega el texto de la opción.' });

  const campoJustificacion = document.createElement('label');
  campoJustificacion.className = 'campo';
  const span = document.createElement('span');
  span.textContent = 'Justificación (por qué es o no es la correcta)';
  const justificacion = document.createElement('textarea');
  justificacion.maxLength = 4000;
  justificacion.value = opcion.justificacion ?? '';
  campoJustificacion.append(span, justificacion);

  contenedor.append(cabecera, bloques.elemento, campoJustificacion);
  const fila = { contenedor, letra, radio, quitar, bloques, justificacion, original: opcion };
  quitar.addEventListener('click', () => {
    estadoEditor.opciones = estadoEditor.opciones.filter((o) => o !== fila);
    pintarOpciones();
  });
  return fila;
}

const opcionVacia = () => ({ contenido: [{ tipo: 'texto', texto: '' }], es_correcta: false, justificacion: '' });

function abrirEditorPregunta(pregunta, grupo, desde) {
  disparadorEditor = desde ?? null;
  editorPreguntaErrores.hidden = true;
  editorPreguntaListaErrores.replaceChildren();

  const esMatching = pregunta?.tipo_item === 'miembro_banco_opciones';
  estadoEditor = {
    id: pregunta?.id ?? null,
    esMatching,
    contexto: crearEditorBloques(pregunta?.contexto ?? [], {
      vacio: grupo ? 'Sin contexto propio: usa el del grupo.' : 'Sin contexto.',
    }),
    enunciado: crearEditorBloques(pregunta?.enunciado ?? [{ tipo: 'texto', texto: '' }], {
      vacio: 'Agrega al menos un párrafo de texto.',
    }),
    opciones: [],
  };
  editorContexto.replaceChildren(estadoEditor.contexto.elemento);
  editorEnunciado.replaceChildren(estadoEditor.enunciado.elemento);

  editorPreguntaTitulo.textContent = pregunta ? 'Editar pregunta' : 'Nueva pregunta';
  editorPreguntaNota.textContent = grupo
    ? `Pertenece a un grupo «${ETIQUETA_TIPO_GRUPO[grupo.tipo] ?? grupo.tipo}». El contexto compartido se corrige con «Editar grupo».`
    : 'Puedes combinar texto, imágenes y tablas en el contexto, el enunciado y cada opción.';

  editorSeccionOpciones.hidden = esMatching;
  editorSeccionRespuesta.hidden = !esMatching;
  if (esMatching) {
    editorRespuesta.replaceChildren(...(grupo?.banco ?? []).map((entrada) => {
      const opcion = document.createElement('option');
      opcion.value = entrada.id;
      opcion.textContent = `${entrada.id} — ${resumenDe(entrada.contenido, '(sin texto)')}`;
      return opcion;
    }));
    editorRespuesta.value = pregunta.respuesta_pool_id ?? '';
  } else {
    const iniciales = pregunta?.opciones?.length ? pregunta.opciones : Array.from({ length: 4 }, opcionVacia);
    estadoEditor.opciones = iniciales.map(filaOpcion);
    pintarOpciones();
  }

  for (const campo of camposPregunta) {
    const clave = campo.dataset.campo;
    campo.value = pregunta?.[clave] ?? (clave === 'valor' ? '1' : '');
  }

  editorPregunta.showModal();
}

function datosDelEditor() {
  const datos = {
    contexto: estadoEditor.contexto.valor(),
    enunciado: estadoEditor.enunciado.valor(),
  };
  if (estadoEditor.esMatching) {
    datos.respuesta_pool_id = editorRespuesta.value;
  } else {
    datos.opciones = estadoEditor.opciones.map((fila) => ({
      contenido: fila.bloques.valor(),
      es_correcta: fila.radio.checked,
      justificacion: fila.justificacion.value,
      procedencia_justificacion: fila.original.procedencia_justificacion ?? null,
      justificacion_verificada: fila.original.justificacion_verificada ?? null,
    }));
  }
  for (const campo of camposPregunta) datos[campo.dataset.campo] = campo.value;
  return datos;
}

editorAgregarOpcion.addEventListener('click', () => {
  estadoEditor.opciones.push(filaOpcion(opcionVacia()));
  pintarOpciones();
});

editorPreguntaCancelar.addEventListener('click', () => editorPregunta.close());
editorPregunta.addEventListener('close', () => disparadorEditor?.focus?.());

formularioPregunta.addEventListener('submit', async (ev) => {
  ev.preventDefault();
  editorPreguntaGuardar.disabled = true;
  try {
    const nueva = !estadoEditor.id;
    const respuesta = await api(
      nueva ? `/api/docente/bancos/${bancoActual.id}/preguntas` : `/api/docente/preguntas/${estadoEditor.id}`,
      { method: nueva ? 'POST' : 'PUT', body: JSON.stringify(datosDelEditor()) },
    );
    if (!respuesta.ok) {
      listaDeMensajes(editorPreguntaListaErrores, respuesta.errores ?? [respuesta.mensaje ?? 'No se pudo guardar la pregunta.']);
      editorPreguntaErrores.hidden = false;
      editorPreguntaErrores.scrollIntoView({ block: 'nearest' });
      return;
    }
    if (nueva) seleccion = { tipo: 'pregunta', id: respuesta.pregunta.id };
    editorPregunta.close();
    await refrescarTrasCambio();
  } finally {
    editorPreguntaGuardar.disabled = false;
  }
});

agregarPregunta.addEventListener('click', () => abrirEditorPregunta(null, null, agregarPregunta));

// --- Editor de grupo (052) -------------------------------------------------

const editorGrupo = document.getElementById('editor-grupo');
const formularioGrupo = document.getElementById('formulario-grupo');
const editorGrupoTitulo = document.getElementById('editor-grupo-titulo');
const editorGrupoContexto = document.getElementById('editor-grupo-contexto');
const editorGrupoSeccionBanco = document.getElementById('editor-grupo-seccion-banco');
const editorGrupoBanco = document.getElementById('editor-grupo-banco');
const editorGrupoAgregarEntrada = document.getElementById('editor-grupo-agregar-entrada');
const editorGrupoErrores = document.getElementById('editor-grupo-errores');
const editorGrupoListaErrores = document.getElementById('editor-grupo-lista-errores');
const editorGrupoCancelar = document.getElementById('editor-grupo-cancelar');
const editorGrupoGuardar = document.getElementById('editor-grupo-guardar');
const camposGrupo = [...editorGrupo.querySelectorAll('[data-campo-grupo]')];

let estadoGrupo = null;
let disparadorGrupo = null;

function idEntradaLibre() {
  const usados = new Set(estadoGrupo.entradas.map((e) => e.original.id));
  let n = estadoGrupo.entradas.length + 1;
  while (usados.has(`e${n}`)) n += 1;
  return `e${n}`;
}

function pintarEntradas() {
  editorGrupoBanco.replaceChildren(...estadoGrupo.entradas.map((e) => e.contenedor));
}

function filaEntrada(entrada) {
  const contenedor = document.createElement('div');
  contenedor.className = 'editor-opcion';
  const cabecera = document.createElement('div');
  cabecera.className = 'editor-opcion__cabecera';
  const titulo = document.createElement('span');
  titulo.textContent = `Entrada ${entrada.id}`;
  const quitar = document.createElement('button');
  quitar.type = 'button';
  quitar.className = 'boton-mini boton-mini--peligro';
  quitar.textContent = '✕';
  quitar.title = 'Quitar esta entrada';
  quitar.setAttribute('aria-label', 'Quitar esta entrada');
  if (estadoGrupo.respuestas.has(entrada.id)) {
    deshabilitar(quitar, 'Es la respuesta correcta de una pregunta del grupo.');
  }
  cabecera.append(titulo, quitar);
  const bloques = crearEditorBloques(entrada.contenido ?? [], { vacio: 'Agrega el texto de la entrada.' });
  contenedor.append(cabecera, bloques.elemento);
  const fila = { contenedor, bloques, original: entrada };
  quitar.addEventListener('click', () => {
    estadoGrupo.entradas = estadoGrupo.entradas.filter((e) => e !== fila);
    pintarEntradas();
  });
  return fila;
}

function abrirEditorGrupo(grupo, desde) {
  disparadorGrupo = desde ?? null;
  editorGrupoErrores.hidden = true;
  estadoGrupo = {
    id: grupo.id,
    tipo: grupo.tipo,
    contexto: crearEditorBloques(grupo.contexto ?? [], { vacio: 'Sin contexto compartido.' }),
    respuestas: new Set(grupo.preguntas.map((p) => p.respuesta_pool_id).filter(Boolean)),
    entradas: [],
  };
  editorGrupoTitulo.textContent = `Editar grupo · ${ETIQUETA_TIPO_GRUPO[grupo.tipo] ?? grupo.tipo}`;
  editorGrupoContexto.replaceChildren(estadoGrupo.contexto.elemento);

  const esMatching = grupo.tipo === 'banco_opciones';
  editorGrupoSeccionBanco.hidden = !esMatching;
  if (esMatching) {
    estadoGrupo.entradas = (grupo.banco ?? []).map(filaEntrada);
    pintarEntradas();
  }
  for (const campo of camposGrupo) campo.value = grupo.metadata_pedagogica?.[campo.dataset.campoGrupo] ?? '';
  editorGrupo.showModal();
}

editorGrupoAgregarEntrada.addEventListener('click', () => {
  estadoGrupo.entradas.push(filaEntrada({ id: idEntradaLibre(), contenido: [{ tipo: 'texto', texto: '' }] }));
  pintarEntradas();
});

editorGrupoCancelar.addEventListener('click', () => editorGrupo.close());
editorGrupo.addEventListener('close', () => disparadorGrupo?.focus?.());

formularioGrupo.addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const datos = {
    contexto: estadoGrupo.contexto.valor(),
    metadata_pedagogica: Object.fromEntries(camposGrupo.map((c) => [c.dataset.campoGrupo, c.value])),
  };
  if (estadoGrupo.tipo === 'banco_opciones') {
    datos.banco = estadoGrupo.entradas.map((fila) => ({ ...fila.original, contenido: fila.bloques.valor() }));
  }

  editorGrupoGuardar.disabled = true;
  try {
    const respuesta = await api(`/api/docente/grupos/${encodeURIComponent(estadoGrupo.id)}`, {
      method: 'PUT', body: JSON.stringify(datos),
    });
    if (!respuesta.ok) {
      listaDeMensajes(editorGrupoListaErrores, respuesta.errores ?? [respuesta.mensaje ?? 'No se pudo guardar el grupo.']);
      editorGrupoErrores.hidden = false;
      editorGrupoErrores.scrollIntoView({ block: 'nearest' });
      return;
    }
    editorGrupo.close();
    await refrescarTrasCambio();
  } finally {
    editorGrupoGuardar.disabled = false;
  }
});

// --- Lista de bancos --------------------------------------------------------

function acciones(banco) {
  const grupo = document.createElement('div');
  grupo.className = 'acciones-fila';

  grupo.append(
    botonIcono('ver', 'Ver y editar', () => verBanco(banco.id)),
    botonIcono('borrar', 'Borrar', async () => {
      if (!window.confirm(`¿Borrar el banco "${banco.nombre}"?`)) return;

      const respuesta = await api(`/api/docente/bancos/${banco.id}`, { method: 'DELETE' });
      if (!respuesta.ok) {
        window.alert(respuesta.mensaje);
        return;
      }
      cerrarDetalleBanco();
      await recargar();
    }, 'boton-fila--peligro'),
  );
  return grupo;
}

// El nombre del banco identifica la fila (fuerte); cuándo se cargó es un
// dato de consulta ocasional, tenue debajo — igual que en Evaluaciones.
function celdaBanco(banco) {
  const td = document.createElement('td');
  const caja = document.createElement('div');
  caja.className = 'celda-titulo';
  const nombreBanco = document.createElement('strong');
  nombreBanco.textContent = banco.nombre;
  const meta = document.createElement('small');
  meta.textContent = `Cargado el ${new Date(banco.creado_en).toLocaleDateString('es')}`;
  caja.append(nombreBanco, meta);
  td.append(caja);
  return td;
}

function celdaTexto(texto) {
  const td = document.createElement('td');
  td.className = 'texto-discreto';
  td.textContent = texto;
  return td;
}

async function recargar() {
  const { bancos } = await api('/api/docente/bancos');
  const hayBancos = bancos.length > 0;
  listaCabecera.hidden = !hayBancos;
  listaEnvoltura.hidden = !hayBancos;
  vacio.hidden = hayBancos;

  const filas = bancos.map((banco) => {
    const tr = document.createElement('tr');
    const tdAcciones = document.createElement('td');
    tdAcciones.append(acciones(banco));
    tr.append(
      celdaBanco(banco),
      celdaTexto(`${banco.preguntas} preguntas`),
      celdaTexto(`${banco.sesiones} evaluación(es)`),
      tdAcciones,
    );
    return tr;
  });

  listado.replaceChildren(...filas);
}

recargar();

