/**
 * Lee una columna que debería tener JSON de bloques
 * ({tipo: texto|imagen|tabla, ...}). Un banco cargado antes de adoptar el
 * estándar preguntas-icfes (feature 016) tiene ahí texto plano o NULL: se
 * envuelve como un único bloque de texto para que el panel y el examen lo
 * sigan mostrando en vez de romperse. No se reescribe a la base; es solo una
 * lectura tolerante — reescribirlo exige reimportar el banco.
 */
export function analizarBloques(crudo) {
  if (crudo == null || crudo === '') return [];
  try {
    const valor = JSON.parse(crudo);
    if (Array.isArray(valor)) return valor;
  } catch {
    // No era JSON: es texto plano de un banco anterior al estándar.
  }
  return [{ tipo: 'texto', texto: String(crudo) }];
}

/** Serializa un array de bloques a JSON para guardarlo en una columna TEXT. */
export function serializarBloques(bloques) {
  return JSON.stringify(bloques ?? []);
}

/** ¿Alguno de los bloques de la pregunta (contexto, enunciado u opciones) es una imagen? */
export function tieneBloqueImagen(pregunta) {
  const arrays = [pregunta.contexto ?? [], pregunta.enunciado ?? [], ...(pregunta.opciones ?? []).map((o) => o.contenido ?? [])];
  return arrays.some((bloques) => bloques.some((bloque) => bloque?.tipo === 'imagen'));
}

/**
 * Concatena solo los bloques de texto, para columnas CSV o vistas que no
 * pueden mostrar imágenes ni tablas. Ignora silenciosamente los demás tipos.
 */
export function textoPlano(bloques) {
  return (bloques ?? [])
    .filter((bloque) => bloque?.tipo === 'texto')
    .map((bloque) => bloque.texto)
    .join(' ');
}
