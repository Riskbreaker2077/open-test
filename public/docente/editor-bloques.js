// Editor de una lista de bloques del estándar preguntas-icfes (052): texto,
// imagen y tabla. Lo usan el editor de pregunta y el de grupo del panel de
// Bancos. Cada bloque conserva las propiedades que aquí no se editan, para
// que corregir una pregunta importada por ZIP no le quite nada.

let contadorCampos = 0;

function boton(texto, titulo, alPulsar, clase = 'boton boton--secundario boton--pequeno') {
  const el = document.createElement('button');
  el.type = 'button';
  el.className = clase;
  el.textContent = texto;
  if (titulo) {
    el.title = titulo;
    el.setAttribute('aria-label', titulo);
  }
  el.addEventListener('click', alPulsar);
  return el;
}

/** Sube un archivo de imagen y devuelve su nombre guardado, o lanza con el mensaje del servidor. */
export async function subirImagen(fichero) {
  const res = await fetch(`/api/docente/imagenes?nombre=${encodeURIComponent(fichero.name)}`, {
    method: 'POST',
    headers: { 'content-type': fichero.type || 'application/octet-stream' },
    body: fichero,
  });
  const cuerpo = await res.json();
  if (!cuerpo.ok) throw new Error(`${fichero.name}: ${cuerpo.mensaje}`);
  return cuerpo.imagen.nombre;
}

function editorTexto(bloque) {
  const area = document.createElement('textarea');
  area.className = 'bloque__texto';
  area.maxLength = 8000;
  area.rows = 3;
  area.value = bloque.texto ?? '';
  area.setAttribute('aria-label', 'Texto');
  return { elemento: area, valor: () => ({ ...bloque, texto: area.value }) };
}

function editorImagen(bloque) {
  const caja = document.createElement('div');
  caja.className = 'bloque__imagen';
  let archivo = bloque.archivo ?? '';

  const vista = document.createElement('img');
  vista.alt = '';
  const nombre = document.createElement('small');
  const pintar = () => {
    vista.hidden = !archivo;
    if (archivo) vista.src = `/imagenes/${encodeURIComponent(archivo)}`;
    nombre.textContent = archivo || 'Todavía no has elegido una imagen.';
  };

  const id = `bloque-archivo-${++contadorCampos}`;
  const entrada = document.createElement('input');
  entrada.type = 'file';
  entrada.accept = '.png,.jpg,.jpeg,.webp';
  entrada.id = id;
  entrada.className = 'bloque__archivo';
  const etiquetaArchivo = document.createElement('label');
  etiquetaArchivo.htmlFor = id;
  etiquetaArchivo.className = 'boton boton--secundario boton--pequeno';
  etiquetaArchivo.textContent = archivo ? 'Cambiar imagen' : 'Elegir imagen';
  entrada.addEventListener('change', async () => {
    const fichero = entrada.files[0];
    if (!fichero) return;
    nombre.textContent = `Subiendo ${fichero.name}…`;
    try {
      archivo = await subirImagen(fichero);
      etiquetaArchivo.textContent = 'Cambiar imagen';
      pintar();
    } catch (err) {
      nombre.textContent = err.message;
    }
    entrada.value = '';
  });

  const descripcion = document.createElement('input');
  descripcion.type = 'text';
  descripcion.placeholder = 'Descripción para quien no puede ver la imagen (opcional)';
  descripcion.value = bloque.descripcion_accesible ?? '';
  descripcion.setAttribute('aria-label', 'Descripción de la imagen');

  const datos = document.createElement('div');
  datos.className = 'bloque__imagen-datos';
  datos.append(nombre, etiquetaArchivo, entrada, descripcion);
  caja.append(vista, datos);
  pintar();

  return {
    elemento: caja,
    valor: () => ({ ...bloque, archivo, descripcion_accesible: descripcion.value }),
  };
}

function editorTabla(bloque) {
  const caja = document.createElement('div');
  caja.className = 'bloque__tabla';
  let encabezados = [...(bloque.encabezados ?? ['Columna 1', 'Columna 2'])];
  let filas = (bloque.filas ?? [['', '']]).map((fila) => [...fila]);

  const celda = (valor, alCambiar, etiqueta) => {
    const entrada = document.createElement('input');
    entrada.type = 'text';
    entrada.value = valor;
    entrada.setAttribute('aria-label', etiqueta);
    entrada.addEventListener('input', () => alCambiar(entrada.value));
    return entrada;
  };

  const pintar = () => {
    const tabla = document.createElement('table');
    const cabecera = document.createElement('tr');
    encabezados.forEach((texto, c) => {
      const th = document.createElement('th');
      th.append(celda(texto, (v) => { encabezados[c] = v; }, `Encabezado ${c + 1}`));
      if (encabezados.length > 1) {
        th.append(boton('✕', `Quitar la columna ${c + 1}`, () => {
          encabezados.splice(c, 1);
          filas = filas.map((fila) => fila.filter((_, i) => i !== c));
          pintar();
        }, 'boton-mini'));
      }
      cabecera.append(th);
    });
    tabla.append(cabecera);
    filas.forEach((fila, f) => {
      const tr = document.createElement('tr');
      fila.forEach((valor, c) => {
        const td = document.createElement('td');
        td.append(celda(valor, (v) => { filas[f][c] = v; }, `Fila ${f + 1}, columna ${c + 1}`));
        tr.append(td);
      });
      const quitar = document.createElement('td');
      quitar.className = 'bloque__tabla-quitar';
      quitar.append(boton('✕', `Quitar la fila ${f + 1}`, () => { filas.splice(f, 1); pintar(); }, 'boton-mini'));
      tr.append(quitar);
      tabla.append(tr);
    });

    const acciones = document.createElement('div');
    acciones.className = 'bloque__tabla-acciones';
    acciones.append(
      boton('+ Fila', '', () => { filas.push(encabezados.map(() => '')); pintar(); }),
      boton('+ Columna', '', () => {
        encabezados.push(`Columna ${encabezados.length + 1}`);
        filas = filas.map((fila) => [...fila, '']);
        pintar();
      }),
    );
    const envoltura = document.createElement('div');
    envoltura.className = 'bloque__tabla-envoltura';
    envoltura.append(tabla);
    caja.replaceChildren(envoltura, acciones);
  };
  pintar();

  return { elemento: caja, valor: () => ({ ...bloque, encabezados: [...encabezados], filas: filas.map((f) => [...f]) }) };
}

const EDITORES = { texto: editorTexto, imagen: editorImagen, tabla: editorTabla };
const NOMBRES = { texto: 'Texto', imagen: 'Imagen', tabla: 'Tabla' };

/**
 * @param bloques  array inicial de bloques
 * @param opciones { vacio: texto del estado vacío }
 * @returns { elemento, valor(): bloque[] }
 */
export function crearEditorBloques(bloques = [], { vacio = 'Sin contenido.' } = {}) {
  const raiz = document.createElement('div');
  raiz.className = 'editor-bloques';
  const lista = document.createElement('div');
  lista.className = 'editor-bloques__lista';
  const vacioEl = document.createElement('p');
  vacioEl.className = 'apunte editor-bloques__vacio';
  vacioEl.textContent = vacio;

  /** @type {{tipo: string, editor: {elemento: HTMLElement, valor: Function}}[]} */
  let piezas = [];

  const pintar = () => {
    lista.replaceChildren(...piezas.map((pieza, i) => {
      const fila = document.createElement('div');
      fila.className = `bloque bloque--${pieza.tipo}`;
      const barra = document.createElement('div');
      barra.className = 'bloque__barra';
      const etiqueta = document.createElement('span');
      etiqueta.textContent = NOMBRES[pieza.tipo] ?? pieza.tipo;
      const mover = (desde, hasta) => {
        [piezas[desde], piezas[hasta]] = [piezas[hasta], piezas[desde]];
        pintar();
      };
      const subir = boton('↑', 'Subir este bloque', () => mover(i, i - 1), 'boton-mini');
      subir.disabled = i === 0;
      const bajar = boton('↓', 'Bajar este bloque', () => mover(i, i + 1), 'boton-mini');
      bajar.disabled = i === piezas.length - 1;
      const quitar = boton('✕', 'Quitar este bloque', () => { piezas.splice(i, 1); pintar(); }, 'boton-mini boton-mini--peligro');
      barra.append(etiqueta, subir, bajar, quitar);
      fila.append(barra, pieza.editor.elemento);
      return fila;
    }));
    vacioEl.hidden = piezas.length > 0;
  };

  const agregar = (bloque) => {
    const crear = EDITORES[bloque.tipo];
    // Un tipo desconocido se conserva tal cual, sin editor.
    const editor = crear ? crear(bloque) : { elemento: document.createElement('div'), valor: () => bloque };
    piezas.push({ tipo: bloque.tipo, editor });
  };

  for (const bloque of bloques ?? []) agregar(bloque);

  const agregarBotones = document.createElement('div');
  agregarBotones.className = 'editor-bloques__agregar';
  agregarBotones.append(
    boton('+ Texto', 'Agregar un párrafo de texto', () => { agregar({ tipo: 'texto', texto: '' }); pintar(); }),
    boton('+ Imagen', 'Agregar una imagen', () => { agregar({ tipo: 'imagen', archivo: '' }); pintar(); }),
    boton('+ Tabla', 'Agregar una tabla', () => { agregar({ tipo: 'tabla' }); pintar(); }),
  );

  raiz.append(vacioEl, lista, agregarBotones);
  pintar();

  return { elemento: raiz, valor: () => piezas.map((pieza) => pieza.editor.valor()) };
}
