import { deflateRawSync } from 'node:zlib';
import { crc32 } from '../importers/paquete-zip.js';

const FIRMA_LOCAL = 0x04034b50;
const FIRMA_CENTRAL = 0x02014b50;
const FIRMA_FIN = 0x06054b50;
// Fecha DOS fija: el contenido no depende de cuándo se generó el archivo.
const FECHA_DOS = ((2026 - 1980) << 9) | (1 << 5) | 1;
const BANDERA_UTF8 = 0x0800;

const aBuffer = (contenido) => (Buffer.isBuffer(contenido) ? contenido : Buffer.from(String(contenido), 'utf-8'));

export function crearZip(entradas) {
  const partes = [];
  const registrosCentrales = [];
  let offset = 0;

  for (const { nombre, contenido } of entradas) {
    const nombreBuf = Buffer.from(nombre, 'utf-8');
    const original = aBuffer(contenido);
    const comprimido = deflateRawSync(original);
    const crc = crc32(original);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(FIRMA_LOCAL, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(BANDERA_UTF8, 6);
    local.writeUInt16LE(8, 8);
    local.writeUInt16LE(0, 10);
    local.writeUInt16LE(FECHA_DOS, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(comprimido.length, 18);
    local.writeUInt32LE(original.length, 22);
    local.writeUInt16LE(nombreBuf.length, 26);
    local.writeUInt16LE(0, 28);
    partes.push(local, nombreBuf, comprimido);

    const registro = Buffer.alloc(46);
    registro.writeUInt32LE(FIRMA_CENTRAL, 0);
    registro.writeUInt16LE(20, 4);
    registro.writeUInt16LE(20, 6);
    registro.writeUInt16LE(BANDERA_UTF8, 8);
    registro.writeUInt16LE(8, 10);
    registro.writeUInt16LE(0, 12);
    registro.writeUInt16LE(FECHA_DOS, 14);
    registro.writeUInt32LE(crc, 16);
    registro.writeUInt32LE(comprimido.length, 20);
    registro.writeUInt32LE(original.length, 24);
    registro.writeUInt16LE(nombreBuf.length, 28);
    registro.writeUInt16LE(0, 30);
    registro.writeUInt16LE(0, 32);
    registro.writeUInt16LE(0, 34);
    registro.writeUInt16LE(0, 36);
    registro.writeUInt32LE(0, 38);
    registro.writeUInt32LE(offset, 42);
    registrosCentrales.push(registro, nombreBuf);

    offset += local.length + nombreBuf.length + comprimido.length;
  }

  const offsetCentral = offset;
  const directorioCentral = Buffer.concat(registrosCentrales);

  const fin = Buffer.alloc(22);
  fin.writeUInt32LE(FIRMA_FIN, 0);
  fin.writeUInt16LE(0, 4);
  fin.writeUInt16LE(0, 6);
  fin.writeUInt16LE(entradas.length, 8);
  fin.writeUInt16LE(entradas.length, 10);
  fin.writeUInt32LE(directorioCentral.length, 12);
  fin.writeUInt32LE(offsetCentral, 16);
  fin.writeUInt16LE(0, 20);

  return Buffer.concat([...partes, directorioCentral, fin]);
}
