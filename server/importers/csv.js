// Parser de CSV propio. Cubre exactamente lo que produce el Excel de un
// docente: BOM, separador «,» o «;», comillas con comas y saltos dentro,
// columnas de más y filas vacías. Nada más, y por eso cabe aquí en lugar de
// traer una dependencia.

const BOM = '﻿';
/** Carácter de reemplazo: aparece cuando el archivo no venía en UTF-8. */
const REEMPLAZO = '�';

export function quitarBom(texto) {
  return texto.startsWith(BOM) ? texto.slice(1) : texto;
}

/** Un archivo guardado en Latin-1 llega con tildes rotas; conviene avisar. */
export function pareceMalCodificado(texto) {
  return texto.includes(REEMPLAZO);
}

/**
 * Decide el separador mirando solo la línea de cabecera: el Excel en español
 * usa «;» y el resto del mundo «,».
 */
export function detectarSeparador(texto) {
  let comas = 0;
  let puntoYComas = 0;
  let enComillas = false;

  for (let i = 0; i < texto.length; i += 1) {
    const c = texto[i];

    if (c === '"') {
      if (enComillas && texto[i + 1] === '"') i += 1;
      else enComillas = !enComillas;
      continue;
    }
    if (enComillas) continue;
    if (c === '\n') break;
    if (c === ',') comas += 1;
    else if (c === ';') puntoYComas += 1;
  }

  return puntoYComas > comas ? ';' : ',';
}

/**
 * Trocea el texto en filas conservando el número de línea real de cada una:
 * es lo que permite decirle al docente "Fila 12" y que la encuentre.
 */
function tokenizar(texto, separador) {
  const filas = [];
  let valores = [];
  let campo = '';
  let enComillas = false;
  let linea = 1;
  let lineaDeLaFila = 1;

  const cerrarFila = () => {
    valores.push(campo);
    filas.push({ valores, linea: lineaDeLaFila });
    valores = [];
    campo = '';
  };

  for (let i = 0; i < texto.length; i += 1) {
    const c = texto[i];

    if (enComillas) {
      if (c === '"') {
        if (texto[i + 1] === '"') {
          campo += '"';
          i += 1;
        } else {
          enComillas = false;
        }
      } else {
        if (c === '\n') linea += 1;
        campo += c;
      }
      continue;
    }

    if (c === '"') {
      enComillas = true;
    } else if (c === separador) {
      valores.push(campo);
      campo = '';
    } else if (c === '\r') {
      // Se ignora: los saltos los marca el \n.
    } else if (c === '\n') {
      cerrarFila();
      linea += 1;
      lineaDeLaFila = linea;
    } else {
      campo += c;
    }
  }

  if (campo !== '' || valores.length > 0) cerrarFila();

  return filas;
}

const estaVacia = (fila) => fila.valores.every((v) => v.trim() === '');

/**
 * Devuelve la cabecera normalizada y las filas de datos con su número de línea.
 * Las filas en blanco se descartan sin ruido; los nombres de columna se
 * comparan en minúsculas y sin espacios, para que el orden y el formato de la
 * cabecera no importen.
 */
export function parsearCsv(texto) {
  const limpio = quitarBom(texto);
  const separador = detectarSeparador(limpio);
  const conContenido = tokenizar(limpio, separador).filter((fila) => !estaVacia(fila));

  if (conContenido.length === 0) {
    return { cabecera: [], filas: [], separador };
  }

  const [cabecera, ...filas] = conContenido;
  return {
    cabecera: cabecera.valores.map((v) => v.trim().toLowerCase()),
    lineaCabecera: cabecera.linea,
    filas,
    separador,
  };
}

/** Convierte las filas en objetos por nombre de columna. Sobrantes: se ignoran. */
export function aObjetos(cabecera, filas) {
  return filas.map(({ valores, linea }) => {
    const datos = {};
    cabecera.forEach((columna, i) => {
      datos[columna] = (valores[i] ?? '').trim();
    });
    return { datos, linea };
  });
}
