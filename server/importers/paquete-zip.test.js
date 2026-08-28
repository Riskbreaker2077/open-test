import test from 'node:test';
import assert from 'node:assert/strict';
import { deflateRawSync } from 'node:zlib';
import { crc32, leerZip, validarPaquete } from './paquete-zip.js';
import { preguntaDeEjemplo } from '../fixtures-preguntas.js';

function zip(archivos, { metodo = 0 } = {}) {
  const locales = [];
  const centrales = [];
  let offset = 0;
  for (const [nombre, valor] of Object.entries(archivos)) {
    const nombreBytes = Buffer.from(nombre);
    const contenido = Buffer.isBuffer(valor) ? valor : Buffer.from(valor);
    const comprimido = metodo === 8 ? deflateRawSync(contenido) : contenido;
    const crc = crc32(contenido);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6);
    local.writeUInt16LE(metodo, 8);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(comprimido.length, 18);
    local.writeUInt32LE(contenido.length, 22);
    local.writeUInt16LE(nombreBytes.length, 26);
    locales.push(local, nombreBytes, comprimido);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(metodo, 10);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(comprimido.length, 20);
    central.writeUInt32LE(contenido.length, 24);
    central.writeUInt16LE(nombreBytes.length, 28);
    central.writeUInt32LE(offset, 42);
    centrales.push(central, nombreBytes);
    offset += local.length + nombreBytes.length + comprimido.length;
  }
  const directorio = Buffer.concat(centrales);
  const fin = Buffer.alloc(22);
  fin.writeUInt32LE(0x06054b50, 0);
  fin.writeUInt16LE(Object.keys(archivos).length, 8);
  fin.writeUInt16LE(Object.keys(archivos).length, 10);
  fin.writeUInt32LE(directorio.length, 12);
  fin.writeUInt32LE(offset, 16);
  return Buffer.concat([...locales, directorio, fin]);
}

const paqueteJson = (preguntas) => JSON.stringify({
  estandar: 'preguntas-icfes',
  version_estandar: '1.0.0',
  nombre: 'Participación ciudadana',
  preguntas,
});

const conImagen = paqueteJson([
  preguntaDeEjemplo({ contexto: [{ tipo: 'imagen', archivo: 'cabildo.png' }] }),
]);

test('lee entradas almacenadas y DEFLATE', () => {
  for (const metodo of [0, 8]) {
    const archivos = leerZip(zip({ 'paquete.json': conImagen, 'imagenes/cabildo.png': 'PNG' }, { metodo }));
    assert.deepEqual(archivos.map((a) => a.nombre), ['paquete.json', 'imagenes/cabildo.png']);
    assert.equal(archivos[0].contenido.toString(), conImagen);
  }
});

test('una entrada que miente su tamaño descomprimido se rechaza sin inflarla entera', () => {
  const nombre = 'paquete.json';
  const contenido = Buffer.alloc(200 * 1024, 'a'); // comprime a casi nada
  const buffer = zip({ [nombre]: contenido }, { metodo: 8 });
  const comprimido = deflateRawSync(contenido);
  const posDescomprimidos = 30 + nombre.length + comprimido.length + 24;
  buffer.writeUInt32LE(10, posDescomprimidos); // el directorio central ahora dice "10 bytes"
  assert.throws(() => leerZip(buffer), /dañada/);
});

test('valida el paquete y sus imágenes como un solo conjunto', () => {
  const resultado = validarPaquete(zip({ 'paquete.json': conImagen, 'imagenes/cabildo.png': 'PNG' }));
  assert.deepEqual(resultado.errores, []);
  assert.equal(resultado.nombre, 'Participación ciudadana');
  assert.equal(resultado.preguntas.length, 1);
  assert.equal(resultado.imagenes[0].nombre, 'cabildo.png');
});

test('rechaza imagen referenciada ausente', () => {
  const resultado = validarPaquete(zip({ 'paquete.json': conImagen }));
  assert.match(resultado.errores[0], /no existe en imagenes/i);
});

test('rechaza rutas inseguras y archivos fuera de la estructura', () => {
  assert.throws(() => leerZip(zip({ '../paquete.json': conImagen })), /ruta no permitida/);
  const sinImagen = paqueteJson([preguntaDeEjemplo()]);
  const ajeno = validarPaquete(zip({ 'paquete.json': sinImagen, 'notas.txt': 'hola' }));
  assert.match(ajeno.errores[0], /fuera de paquete.json o imagenes/);
});

test('rechaza un ZIP sin paquete.json', () => {
  const resultado = validarPaquete(zip({ 'imagenes/cabildo.png': 'PNG' }));
  assert.match(resultado.errores[0], /debe contener paquete.json/);
});

export { zip };
