import { aObjetos, pareceMalCodificado, parsearCsv } from './csv.js';

export const COLUMNAS = ['codigo', 'nombres', 'apellidos', 'curso'];

export const LIMITES = { codigo: 40, nombres: 120, apellidos: 120, curso: 40 };

/** Más allá de esto, la lista de errores deja de ser útil y abruma. */
export const MAX_ERRORES = 50;

export const MAX_BYTES = 2 * 1024 * 1024;

/** Un archivo que empieza por { o [ es JSON, venga con la extensión que venga. */
export function detectarTipo(texto) {
  const inicio = texto.replace(/^﻿/, '').trimStart()[0];
  return inicio === '{' || inicio === '[' ? 'json' : 'csv';
}

function recortar(errores) {
  if (errores.length <= MAX_ERRORES) return errores;
  const sobran = errores.length - MAX_ERRORES;
  return [...errores.slice(0, MAX_ERRORES), `…y ${sobran} error(es) más. Corrige estos primero.`];
}

function validarCampos(datos, etiqueta, errores) {
  for (const columna of COLUMNAS) {
    const valor = datos[columna] ?? '';

    if (valor === '') {
      errores.push(`${etiqueta}: la columna "${columna}" está vacía.`);
    } else if (valor.length > LIMITES[columna]) {
      errores.push(`${etiqueta}: "${columna}" supera los ${LIMITES[columna]} caracteres.`);
    }
  }
}

/**
 * Valida sin tocar la base de datos y devuelve todos los problemas de una vez,
 * para que el docente corrija su archivo en una sola pasada.
 * Nunca lanza por datos malos: los datos malos son un resultado, no una avería.
 */
export function validarEstudiantes(texto, tipo = detectarTipo(texto)) {
  if (typeof texto !== 'string' || texto.trim() === '') {
    return { registros: [], errores: ['El archivo está vacío.'] };
  }
  if (Buffer.byteLength(texto, 'utf8') > MAX_BYTES) {
    return {
      registros: [],
      errores: [`El archivo supera los ${Math.round(MAX_BYTES / 1024 / 1024)} MB.`],
    };
  }
  if (pareceMalCodificado(texto)) {
    return {
      registros: [],
      errores: [
        'El archivo no está guardado en UTF-8 y las tildes se verían mal. ' +
          'Vuelve a guardarlo desde Excel como "CSV UTF-8".',
      ],
    };
  }

  return tipo === 'json' ? desdeJson(texto) : desdeCsv(texto);
}

function desdeCsv(texto) {
  const { cabecera, filas } = parsearCsv(texto);
  const errores = [];

  const faltantes = COLUMNAS.filter((c) => !cabecera.includes(c));
  if (faltantes.length > 0) {
    return {
      registros: [],
      errores: faltantes.map(
        (c) => `Falta la columna obligatoria "${c}" en la cabecera del archivo.`,
      ),
    };
  }

  if (filas.length === 0) {
    return { registros: [], errores: ['El archivo no contiene ninguna fila de datos.'] };
  }

  return recolectar(
    aObjetos(cabecera, filas).map(({ datos, linea }) => ({
      // Solo las columnas del contrato: las de más se ignoran y no deben
      // llegar al INSERT.
      datos: Object.fromEntries(COLUMNAS.map((c) => [c, datos[c] ?? ''])),
      etiqueta: `Fila ${linea}`,
      referencia: linea,
    })),
    errores,
  );
}

function desdeJson(texto) {
  let crudo;
  try {
    crudo = JSON.parse(texto);
  } catch (err) {
    return { registros: [], errores: [`El archivo JSON no es válido: ${err.message}`] };
  }

  const lista = Array.isArray(crudo) ? crudo : crudo?.estudiantes;
  if (!Array.isArray(lista)) {
    return {
      registros: [],
      errores: ['El JSON debe ser una lista de estudiantes o un objeto con la clave "estudiantes".'],
    };
  }
  if (lista.length === 0) {
    return { registros: [], errores: ['El archivo no contiene ninguna fila de datos.'] };
  }

  return recolectar(
    lista.map((item, i) => {
      const datos = {};
      for (const columna of COLUMNAS) {
        const valor = item?.[columna];
        datos[columna] = typeof valor === 'string' ? valor.trim() : valor == null ? '' : String(valor);
      }
      return { datos, etiqueta: `Estudiante ${i + 1}`, referencia: i + 1 };
    }),
    [],
  );
}

function recolectar(candidatos, errores) {
  const registros = [];
  const vistos = new Map();

  for (const { datos, etiqueta, referencia } of candidatos) {
    const antes = errores.length;
    validarCampos(datos, etiqueta, errores);

    const anterior = vistos.get(datos.codigo);
    if (datos.codigo !== '' && anterior !== undefined) {
      errores.push(
        `${etiqueta}: el código "${datos.codigo}" está repetido (ya aparece en la fila ${anterior}).`,
      );
    } else if (datos.codigo !== '') {
      vistos.set(datos.codigo, referencia);
    }

    if (errores.length === antes) registros.push(datos);
  }

  // Todo o nada: si algo falla, no se importa ni una fila.
  return errores.length > 0
    ? { registros: [], errores: recortar(errores) }
    : { registros, errores: [] };
}
