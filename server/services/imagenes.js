import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, extname } from 'node:path';
import { join } from 'node:path';
import { RUTA_IMAGENES } from '../db.js';
import { EXTENSIONES_IMAGEN } from '../importers/preguntas.js';
import { analizarBloques } from './bloques.js';

export const MAX_BYTES_IMAGEN = 3 * 1024 * 1024;
/** Por encima de esto, una tablet modesta empieza a sufrir. */
export const AVISO_BYTES_IMAGEN = 500 * 1024;

/**
 * Única superficie de escritura de archivos del sistema. Se queda con el
 * nombre a secas: sin carpetas, sin «..», sin rutas absolutas.
 */
export function sanearNombre(nombre) {
  const soloNombre = basename(String(nombre ?? '').replace(/\\/g, '/'));
  const limpio = soloNombre.replace(/[/\0]/g, '').replace(/^\.+/, '').trim();

  if (limpio === '') throw Object.assign(new Error('El nombre del archivo no es válido.'), { estado: 400 });

  const extension = extname(limpio).toLowerCase();
  if (!EXTENSIONES_IMAGEN.includes(extension)) {
    throw Object.assign(
      new Error(`Solo se admiten imágenes ${EXTENSIONES_IMAGEN.join(', ')}.`),
      { estado: 400 },
    );
  }
  return limpio;
}

export function carpetaDeImagenes() {
  mkdirSync(RUTA_IMAGENES, { recursive: true });
  return RUTA_IMAGENES;
}

export function guardarImagen(nombre, contenido) {
  const limpio = sanearNombre(nombre);

  if (!Buffer.isBuffer(contenido) || contenido.length === 0) {
    throw Object.assign(new Error('El archivo llegó vacío.'), { estado: 400 });
  }
  if (contenido.length > MAX_BYTES_IMAGEN) {
    throw Object.assign(
      new Error(`La imagen pesa demasiado (máximo ${MAX_BYTES_IMAGEN / 1024 / 1024} MB).`),
      { estado: 413 },
    );
  }

  writeFileSync(join(carpetaDeImagenes(), limpio), contenido);
  return { nombre: limpio, bytes: contenido.length, pesada: contenido.length > AVISO_BYTES_IMAGEN };
}

export function listarImagenes() {
  const carpeta = carpetaDeImagenes();
  if (!existsSync(carpeta)) return [];

  return readdirSync(carpeta, { withFileTypes: true })
    .filter((e) => e.isFile() && EXTENSIONES_IMAGEN.includes(extname(e.name).toLowerCase()))
    .map((e) => e.name)
    .sort();
}

export function nombresDisponibles() {
  return new Set(listarImagenes());
}

/**
 * Conjunto de nombres de archivo referenciados por los bloques
 * `tipo: 'imagen'` de las preguntas que efectivamente cayeron en los
 * intento_preguntas de la sesión. Cruza banco → intento_preguntas y
 * parsea `contexto` / `enunciado` / `opciones[].texto` con
 * `analizarBloques`.
 */
export function imagenesDeSesion(db, sesionId) {
  const nombres = new Set();
  const filas = db.prepare(`
    SELECT p.contexto, p.enunciado, o.texto
    FROM intento_preguntas ip
    JOIN preguntas p ON p.id = ip.pregunta_id
    LEFT JOIN opciones o ON o.pregunta_id = p.id
    WHERE ip.intento_id IN (SELECT id FROM intentos WHERE sesion_id = ?)
  `).all(sesionId);

  for (const fila of filas) {
    for (const campo of ['contexto', 'enunciado', 'texto']) {
      if (!fila[campo]) continue;
      for (const bloque of analizarBloques(fila[campo])) {
        if (bloque.tipo === 'imagen' && bloque.archivo) {
          nombres.add(bloque.archivo);
        }
      }
    }
  }

  // Los grupos que cayeron en la sesión también traen imágenes en su
  // contexto compartido y en las entradas de su banco (matching).
  const grupos = db.prepare(`
    SELECT DISTINCT g.contexto, g.banco
    FROM grupos g
    JOIN preguntas p ON p.grupo_id = g.id
    JOIN intento_preguntas ip ON ip.pregunta_id = p.id
    WHERE ip.intento_id IN (SELECT id FROM intentos WHERE sesion_id = ?)
  `).all(sesionId);

  for (const grupo of grupos) {
    for (const bloque of analizarBloques(grupo.contexto)) {
      if (bloque.tipo === 'imagen' && bloque.archivo) nombres.add(bloque.archivo);
    }
    for (const bloque of bloquesDeBanco(grupo.banco)) {
      if (bloque.tipo === 'imagen' && bloque.archivo) nombres.add(bloque.archivo);
    }
  }

  return nombres;
}

function bloquesDeBanco(bancoJson) {
  let banco = [];
  try {
    banco = JSON.parse(bancoJson ?? '[]');
  } catch {
    return [];
  }
  return banco.flatMap((entrada) => (Array.isArray(entrada?.contenido) ? entrada.contenido : []));
}
