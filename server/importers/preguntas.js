import { aObjetos, pareceMalCodificado, parsearCsv } from './csv.js';
import { MAX_BYTES, MAX_ERRORES } from './estudiantes.js';

export const COLUMNAS_OBLIGATORIAS = ['enunciado', 'opcion_a', 'opcion_b', 'opcion_c', 'opcion_d', 'correcta'];
export const LETRAS = ['A', 'B', 'C', 'D'];
export const LIMITES = { enunciado: 1000, opcion: 500, contexto: 4000, explicacion: 2000 };
export const EXTENSIONES_IMAGEN = ['.png', '.jpg', '.jpeg', '.webp'];

export function detectarTipo(texto) {
  const inicio = texto.replace(/^﻿/, '').trimStart()[0];
  return inicio === '{' || inicio === '[' ? 'json' : 'csv';
}

function recortar(errores) {
  if (errores.length <= MAX_ERRORES) return errores;
  return [
    ...errores.slice(0, MAX_ERRORES),
    `…y ${errores.length - MAX_ERRORES} error(es) más. Corrige estos primero.`,
  ];
}

/**
 * `correcta` se acepta como letra (A-D, en cualquier caja) o como índice 0-3.
 * Devuelve el índice, o null si no es válido.
 */
export function indiceCorrecta(valor) {
  if (typeof valor === 'number' && Number.isInteger(valor)) {
    return valor >= 0 && valor <= 3 ? valor : null;
  }
  const texto = String(valor ?? '').trim();
  if (texto === '') return null;

  const porLetra = LETRAS.indexOf(texto.toUpperCase());
  if (porLetra >= 0) return porLetra;

  if (/^[0-3]$/.test(texto)) return Number(texto);
  return null;
}

function validarPregunta({ contexto, imagen, enunciado, opciones, correcta, explicacion }, etiqueta, errores, imagenesDisponibles) {
  if (enunciado === '') {
    errores.push(`${etiqueta}: el enunciado está vacío.`);
  } else if (enunciado.length > LIMITES.enunciado) {
    errores.push(`${etiqueta}: el enunciado supera los ${LIMITES.enunciado} caracteres.`);
  }

  if (opciones.length !== 4) {
    errores.push(`${etiqueta}: tiene ${opciones.length} opción(es). Deben ser exactamente 4.`);
  } else {
    opciones.forEach((texto, i) => {
      if (texto === '') {
        errores.push(`${etiqueta}: la opción ${LETRAS[i]} está vacía. Las cuatro son obligatorias.`);
      } else if (texto.length > LIMITES.opcion) {
        errores.push(`${etiqueta}: la opción ${LETRAS[i]} supera los ${LIMITES.opcion} caracteres.`);
      }
    });
  }

  if (correcta === null) {
    errores.push(`${etiqueta}: la columna "correcta" no es válida. Debe ser A, B, C o D.`);
  }

  if (contexto.length > LIMITES.contexto) {
    errores.push(`${etiqueta}: el contexto supera los ${LIMITES.contexto} caracteres.`);
  }
  if (explicacion.length > LIMITES.explicacion) {
    errores.push(`${etiqueta}: la explicación supera los ${LIMITES.explicacion} caracteres.`);
  }

  if (imagen !== '') {
    const extension = imagen.slice(imagen.lastIndexOf('.')).toLowerCase();

    if (imagen.includes('/') || imagen.includes('\\')) {
      errores.push(`${etiqueta}: "imagen" debe ser solo el nombre del archivo, sin carpetas.`);
    } else if (!EXTENSIONES_IMAGEN.includes(extension)) {
      errores.push(
        `${etiqueta}: la imagen "${imagen}" no es de un tipo admitido (${EXTENSIONES_IMAGEN.join(', ')}).`,
      );
    } else if (imagenesDisponibles && !imagenesDisponibles.has(imagen)) {
      errores.push(
        `${etiqueta}: la imagen "${imagen}" no está en la carpeta de imágenes. Súbela antes de importar.`,
      );
    }
  }
}

/**
 * Valida el paquete entero sin tocar la base. Todo o nada: nunca se importa
 * media evaluación.
 *
 * `imagenesDisponibles` es el conjunto de nombres ya subidos; si se omite, no
 * se comprueba la existencia (útil para probar la validación en aislamiento).
 */
export function validarBanco(texto, { tipo, imagenesDisponibles, nPreguntasSesion = 20 } = {}) {
  if (typeof texto !== 'string' || texto.trim() === '') {
    return { nombre: null, preguntas: [], errores: ['El archivo está vacío.'], avisos: [] };
  }
  if (Buffer.byteLength(texto, 'utf8') > MAX_BYTES) {
    return {
      nombre: null,
      preguntas: [],
      errores: [`El archivo supera los ${Math.round(MAX_BYTES / 1024 / 1024)} MB.`],
      avisos: [],
    };
  }
  if (pareceMalCodificado(texto)) {
    return {
      nombre: null,
      preguntas: [],
      errores: [
        'El archivo no está guardado en UTF-8 y las tildes se verían mal. ' +
          'Vuelve a guardarlo desde Excel como "CSV UTF-8".',
      ],
      avisos: [],
    };
  }

  const resultado =
    (tipo ?? detectarTipo(texto)) === 'json'
      ? desdeJson(texto, imagenesDisponibles)
      : desdeCsv(texto, imagenesDisponibles);

  // Un banco corto se importa, pero el docente tiene que saberlo antes de
  // descubrirlo el día del examen.
  resultado.avisos = [];
  if (resultado.errores.length === 0 && resultado.preguntas.length < nPreguntasSesion) {
    resultado.avisos.push(
      `El banco tiene ${resultado.preguntas.length} preguntas. Una sesión de ` +
        `${nPreguntasSesion} preguntas necesita al menos ${nPreguntasSesion}.`,
    );
  }
  return resultado;
}

function desdeCsv(texto, imagenesDisponibles) {
  const { cabecera, filas } = parsearCsv(texto);

  const faltantes = COLUMNAS_OBLIGATORIAS.filter((c) => !cabecera.includes(c));
  if (faltantes.length > 0) {
    return {
      nombre: null,
      preguntas: [],
      errores: faltantes.map((c) => `Falta la columna obligatoria "${c}" en la cabecera del archivo.`),
    };
  }
  if (filas.length === 0) {
    return { nombre: null, preguntas: [], errores: ['El archivo no contiene ninguna pregunta.'] };
  }

  const candidatas = aObjetos(cabecera, filas).map(({ datos, linea }) => ({
    pregunta: {
      contexto: datos.contexto ?? '',
      imagen: datos.imagen ?? '',
      enunciado: datos.enunciado ?? '',
      opciones: [datos.opcion_a, datos.opcion_b, datos.opcion_c, datos.opcion_d].map(
        (o) => o ?? '',
      ),
      correcta: indiceCorrecta(datos.correcta),
      explicacion: datos.explicacion ?? '',
    },
    etiqueta: `Fila ${linea}`,
  }));

  return recolectar(null, candidatas, imagenesDisponibles);
}

function desdeJson(texto, imagenesDisponibles) {
  let crudo;
  try {
    crudo = JSON.parse(texto);
  } catch (err) {
    return { nombre: null, preguntas: [], errores: [`El archivo JSON no es válido: ${err.message}`] };
  }

  const lista = Array.isArray(crudo) ? crudo : crudo?.preguntas;
  if (!Array.isArray(lista)) {
    return {
      nombre: null,
      preguntas: [],
      errores: ['El JSON debe ser una lista de preguntas o un objeto con la clave "preguntas".'],
    };
  }
  if (lista.length === 0) {
    return { nombre: null, preguntas: [], errores: ['El archivo no contiene ninguna pregunta.'] };
  }

  const texto0 = (v) => (typeof v === 'string' ? v.trim() : v == null ? '' : String(v));

  const candidatas = lista.map((item, i) => ({
    pregunta: {
      contexto: texto0(item?.contexto),
      imagen: texto0(item?.imagen),
      enunciado: texto0(item?.enunciado),
      opciones: Array.isArray(item?.opciones) ? item.opciones.map(texto0) : [],
      correcta: indiceCorrecta(item?.correcta),
      explicacion: texto0(item?.explicacion),
    },
    etiqueta: `Pregunta ${i + 1}`,
  }));

  return recolectar(crudo?.nombre_banco ?? null, candidatas, imagenesDisponibles);
}

function recolectar(nombre, candidatas, imagenesDisponibles) {
  const errores = [];
  const preguntas = [];

  for (const { pregunta, etiqueta } of candidatas) {
    const antes = errores.length;
    validarPregunta(pregunta, etiqueta, errores, imagenesDisponibles);
    if (errores.length === antes) preguntas.push(pregunta);
  }

  return errores.length > 0
    ? { nombre, preguntas: [], errores: recortar(errores) }
    : { nombre, preguntas, errores: [] };
}
