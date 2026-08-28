import { pareceMalCodificado } from './csv.js';
import { MAX_BYTES, MAX_ERRORES } from './estudiantes.js';
import { validarPaquete as validarContraEstandar } from './estandar-preguntas-icfes.js';

export const EXTENSIONES_IMAGEN = ['.png', '.jpg', '.jpeg', '.webp'];

function recortar(errores) {
  if (errores.length <= MAX_ERRORES) return errores;
  return [
    ...errores.slice(0, MAX_ERRORES),
    `…y ${errores.length - MAX_ERRORES} error(es) más. Corrige estos primero.`,
  ];
}

/**
 * Valida el paquete entero sin tocar la base. Todo o nada: nunca se importa
 * media evaluación.
 *
 * El archivo es un único JSON que sigue el estándar `preguntas-icfes`
 * (ver `spec/contracts/paquete-preguntas-icfes.md`): metadata pedagógica por
 * pregunta, contenido en bloques (texto/imagen/tabla) y justificación
 * individual por cada una de las 4 opciones.
 *
 * `imagenesDisponibles` es el conjunto de nombres de imagen ya disponibles
 * (subidas sueltas + las que traiga el propio ZIP); si se omite, no se
 * comprueba que las imágenes referenciadas existan (útil para probar la
 * validación de contenido en aislamiento).
 */
export function validarBanco(texto, { imagenesDisponibles, nPreguntasSesion = 20 } = {}) {
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
          'Vuelve a guardarlo desde un editor de texto como UTF-8.',
      ],
      avisos: [],
    };
  }

  let paquete;
  try {
    paquete = JSON.parse(texto);
  } catch (err) {
    return { nombre: null, preguntas: [], errores: [`El archivo JSON no es válido: ${err.message}`], avisos: [] };
  }

  const { valido, errores } = validarContraEstandar(paquete, { imagenesDisponibles });
  if (!valido) {
    return {
      nombre: typeof paquete?.nombre === 'string' ? paquete.nombre : null,
      preguntas: [],
      errores: recortar(errores.map((e) => e.mensaje)),
    };
  }

  const avisos = [];
  if (paquete.preguntas.length < nPreguntasSesion) {
    avisos.push(
      `El banco tiene ${paquete.preguntas.length} preguntas. Una sesión de ` +
        `${nPreguntasSesion} preguntas necesita al menos ${nPreguntasSesion}.`,
    );
  }

  return { nombre: paquete.nombre, preguntas: paquete.preguntas, errores: [], avisos };
}
