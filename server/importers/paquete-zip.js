import { inflateRawSync } from 'node:zlib';
import { validarBanco } from './preguntas.js';
import { MAX_BYTES_IMAGEN, sanearNombre } from '../services/imagenes.js';

export const MAX_BYTES_PAQUETE = 25 * 1024 * 1024;
export const MAX_ENTRADAS = 101;
const MAX_BYTES_DESCOMPRIMIDOS = 50 * 1024 * 1024;
const MAX_BYTES_BANCO = 2 * 1024 * 1024;

const firma = {
  local: 0x04034b50,
  central: 0x02014b50,
  fin: 0x06054b50,
};

const fallo = (mensaje) => Object.assign(new Error(mensaje), { estado: 400 });

export function crc32(contenido) {
  let crc = 0xffffffff;
  for (const byte of contenido) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function encontrarFin(buffer) {
  const minimo = Math.max(0, buffer.length - 65_557);
  for (let i = buffer.length - 22; i >= minimo; i -= 1) {
    if (buffer.readUInt32LE(i) === firma.fin) return i;
  }
  throw fallo('El archivo no es un ZIP válido: no encontramos su directorio final.');
}

function nombreSeguro(nombre) {
  if (nombre.includes('\0') || nombre.includes('\\') || nombre.startsWith('/') ||
      /^[a-z]:/i.test(nombre)) {
    throw fallo(`El ZIP contiene una ruta no permitida: "${nombre}".`);
  }
  const partes = nombre.split('/');
  if (partes.some((parte) => parte === '..' || parte === '.')) {
    throw fallo(`El ZIP contiene una ruta no permitida: "${nombre}".`);
  }
  return nombre;
}

function descomprimir(buffer, entrada) {
  const inicio = entrada.offsetLocal;
  if (inicio + 30 > buffer.length || buffer.readUInt32LE(inicio) !== firma.local) {
    throw fallo(`La entrada "${entrada.nombre}" tiene una cabecera dañada.`);
  }
  const largoNombre = buffer.readUInt16LE(inicio + 26);
  const largoExtra = buffer.readUInt16LE(inicio + 28);
  const desde = inicio + 30 + largoNombre + largoExtra;
  const hasta = desde + entrada.comprimidos;
  if (hasta > buffer.length) throw fallo(`La entrada "${entrada.nombre}" está incompleta.`);

  const comprimido = buffer.subarray(desde, hasta);
  let contenido;
  if (entrada.metodo === 0) contenido = Buffer.from(comprimido);
  else if (entrada.metodo === 8) contenido = inflateRawSync(comprimido);
  else throw fallo(`La entrada "${entrada.nombre}" usa una compresión no admitida.`);

  if (contenido.length !== entrada.descomprimidos || crc32(contenido) !== entrada.crc) {
    throw fallo(`La entrada "${entrada.nombre}" está dañada.`);
  }
  return contenido;
}

export function leerZip(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) throw fallo('El paquete ZIP llegó vacío.');
  if (buffer.length > MAX_BYTES_PAQUETE) {
    throw Object.assign(new Error('El paquete ZIP pesa más de 25 MB.'), { estado: 413 });
  }

  const fin = encontrarFin(buffer);
  const disco = buffer.readUInt16LE(fin + 4);
  const discoDirectorio = buffer.readUInt16LE(fin + 6);
  const entradasDisco = buffer.readUInt16LE(fin + 8);
  const total = buffer.readUInt16LE(fin + 10);
  const offsetCentral = buffer.readUInt32LE(fin + 16);
  if (disco !== 0 || discoDirectorio !== 0 || entradasDisco !== total) {
    throw fallo('No se admiten archivos ZIP divididos en varias partes.');
  }
  if (total === 0xffff || offsetCentral === 0xffffffff) throw fallo('No se admite el formato ZIP64.');
  if (total === 0 || total > MAX_ENTRADAS) {
    throw fallo(`El paquete debe contener entre 1 y ${MAX_ENTRADAS} archivos.`);
  }

  const decoder = new TextDecoder('utf-8', { fatal: true });
  const nombres = new Set();
  const entradas = [];
  let posicion = offsetCentral;
  let totalDescomprimido = 0;

  for (let indice = 0; indice < total; indice += 1) {
    if (posicion + 46 > buffer.length || buffer.readUInt32LE(posicion) !== firma.central) {
      throw fallo('El directorio del ZIP está dañado.');
    }
    const versionCreada = buffer.readUInt16LE(posicion + 4);
    const banderas = buffer.readUInt16LE(posicion + 8);
    const metodo = buffer.readUInt16LE(posicion + 10);
    const crc = buffer.readUInt32LE(posicion + 16);
    const comprimidos = buffer.readUInt32LE(posicion + 20);
    const descomprimidos = buffer.readUInt32LE(posicion + 24);
    const largoNombre = buffer.readUInt16LE(posicion + 28);
    const largoExtra = buffer.readUInt16LE(posicion + 30);
    const largoComentario = buffer.readUInt16LE(posicion + 32);
    const atributos = buffer.readUInt32LE(posicion + 38);
    const offsetLocal = buffer.readUInt32LE(posicion + 42);
    let nombre;
    try {
      nombre = decoder.decode(buffer.subarray(posicion + 46, posicion + 46 + largoNombre));
    } catch {
      throw fallo('Todos los nombres del ZIP deben estar codificados en UTF-8.');
    }
    nombre = nombreSeguro(nombre);
    if ((banderas & 1) !== 0) throw fallo(`La entrada "${nombre}" está cifrada.`);
    const tipoUnix = versionCreada >> 8;
    const modo = atributos >>> 16;
    if (tipoUnix === 3 && (modo & 0xf000) === 0xa000) {
      throw fallo(`La entrada "${nombre}" es un enlace y no está permitida.`);
    }
    if (nombres.has(nombre)) throw fallo(`El ZIP repite la entrada "${nombre}".`);
    nombres.add(nombre);

    totalDescomprimido += descomprimidos;
    if (totalDescomprimido > MAX_BYTES_DESCOMPRIMIDOS) {
      throw fallo('El contenido descomprimido del ZIP supera 50 MB.');
    }
    entradas.push({ nombre, metodo, crc, comprimidos, descomprimidos, offsetLocal });
    posicion += 46 + largoNombre + largoExtra + largoComentario;
  }

  return entradas
    .filter((entrada) => !entrada.nombre.endsWith('/'))
    .map((entrada) => ({ nombre: entrada.nombre, contenido: descomprimir(buffer, entrada) }));
}

export function validarPaquete(buffer, { imagenesDisponibles = new Set() } = {}) {
  let archivos;
  try {
    archivos = leerZip(buffer);
  } catch (err) {
    return { nombre: null, preguntas: [], imagenes: [], errores: [err.message], avisos: [] };
  }

  const manifiestos = archivos.filter((archivo) => archivo.nombre === 'paquete.json');
  if (manifiestos.length !== 1) {
    return { nombre: null, preguntas: [], imagenes: [], errores: ['El ZIP debe contener paquete.json en la raíz.'], avisos: [] };
  }
  const ajenos = archivos.filter((archivo) => archivo.nombre !== 'paquete.json' &&
    !/^imagenes\/[^/]+$/.test(archivo.nombre));
  if (ajenos.length > 0) {
    return { nombre: null, preguntas: [], imagenes: [], errores: [`El archivo "${ajenos[0].nombre}" está fuera de paquete.json o imagenes/.`], avisos: [] };
  }
  if (manifiestos[0].contenido.length > MAX_BYTES_BANCO) {
    return { nombre: null, preguntas: [], imagenes: [], errores: ['paquete.json pesa más de 2 MB.'], avisos: [] };
  }

  const imagenes = [];
  const nombresPaquete = new Set();
  for (const archivo of archivos.filter((item) => item.nombre.startsWith('imagenes/'))) {
    const nombre = archivo.nombre.slice('imagenes/'.length);
    try {
      const limpio = sanearNombre(nombre);
      if (limpio !== nombre) throw fallo(`El nombre de imagen "${nombre}" no es válido.`);
      if (archivo.contenido.length === 0 || archivo.contenido.length > MAX_BYTES_IMAGEN) {
        throw fallo(`La imagen "${nombre}" está vacía o pesa más de 3 MB.`);
      }
      if (nombresPaquete.has(nombre)) throw fallo(`El paquete repite la imagen "${nombre}".`);
      nombresPaquete.add(nombre);
      imagenes.push({ nombre, contenido: archivo.contenido });
    } catch (err) {
      return { nombre: null, preguntas: [], imagenes: [], errores: [err.message], avisos: [] };
    }
  }

  let texto;
  try {
    texto = new TextDecoder('utf-8', { fatal: true }).decode(manifiestos[0].contenido);
  } catch {
    return { nombre: null, preguntas: [], imagenes: [], errores: ['paquete.json no está codificado en UTF-8.'], avisos: [] };
  }
  const disponibles = new Set([...imagenesDisponibles, ...nombresPaquete]);
  const resultado = validarBanco(texto, { tipo: 'json', imagenesDisponibles: disponibles });
  return { ...resultado, imagenes };
}
