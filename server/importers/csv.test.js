import test from 'node:test';
import assert from 'node:assert/strict';
import { aObjetos, detectarSeparador, pareceMalCodificado, parsearCsv, quitarBom } from './csv.js';

test('descarta el BOM que pone Excel en Windows', () => {
  const { cabecera } = parsearCsv('﻿codigo,nombres\n2024001,Ana\n');
  assert.deepEqual(cabecera, ['codigo', 'nombres']);
  assert.equal(quitarBom('﻿hola'), 'hola');
});

test('detecta el separador punto y coma del Excel en español', () => {
  assert.equal(detectarSeparador('codigo;nombres;curso\n'), ';');
  assert.equal(detectarSeparador('codigo,nombres,curso\n'), ',');

  const { cabecera, filas } = parsearCsv('codigo;nombres;curso\n2024001;Ana;10A\n');
  assert.deepEqual(cabecera, ['codigo', 'nombres', 'curso']);
  assert.deepEqual(filas[0].valores, ['2024001', 'Ana', '10A']);
});

test('no confunde las comas que van dentro de comillas', () => {
  const { separador, filas } = parsearCsv('codigo;nombres\n2024001;"Gómez, Ana"\n');
  assert.equal(separador, ';');
  assert.deepEqual(filas[0].valores, ['2024001', 'Gómez, Ana']);
});

test('respeta un campo entrecomillado con comas', () => {
  const { filas } = parsearCsv('a,b\n1,"uno, dos, tres"\n');
  assert.deepEqual(filas[0].valores, ['1', 'uno, dos, tres']);
});

test('respeta las comillas escapadas', () => {
  const { filas } = parsearCsv('a,b\n1,"dijo ""hola"" y se fue"\n');
  assert.deepEqual(filas[0].valores, ['1', 'dijo "hola" y se fue']);
});

test('respeta un salto de línea dentro de comillas y sigue contando bien', () => {
  const csv = 'a,b\n1,"primera\nsegunda"\n2,fin\n';
  const { filas } = parsearCsv(csv);

  assert.deepEqual(filas[0].valores, ['1', 'primera\nsegunda']);
  assert.equal(filas[0].linea, 2);
  // La fila siguiente está en la línea 4, no en la 3: el campo ocupaba dos.
  assert.deepEqual(filas[1].valores, ['2', 'fin']);
  assert.equal(filas[1].linea, 4);
});

test('numera las filas como las ve el docente en su editor', () => {
  const { filas, lineaCabecera } = parsearCsv('a,b\n1,x\n2,y\n3,z\n');
  assert.equal(lineaCabecera, 1);
  assert.deepEqual(filas.map((f) => f.linea), [2, 3, 4]);
});

test('acepta saltos de Windows y de Unix', () => {
  const windows = parsearCsv('a,b\r\n1,x\r\n');
  const unix = parsearCsv('a,b\n1,x\n');
  assert.deepEqual(windows.filas[0].valores, unix.filas[0].valores);
});

test('acepta la última fila sin salto de línea final', () => {
  const { filas } = parsearCsv('a,b\n1,x');
  assert.equal(filas.length, 1);
  assert.deepEqual(filas[0].valores, ['1', 'x']);
});

test('ignora las filas en blanco sin considerarlas un error', () => {
  const { filas } = parsearCsv('a,b\n1,x\n\n\n2,y\n');
  assert.equal(filas.length, 2);
  // Y la numeración sigue siendo la real del archivo.
  assert.deepEqual(filas.map((f) => f.linea), [2, 5]);
});

test('un archivo sin contenido no revienta', () => {
  assert.deepEqual(parsearCsv('').filas, []);
  assert.deepEqual(parsearCsv('\n\n\n').filas, []);
  assert.deepEqual(parsearCsv('').cabecera, []);
});

test('normaliza la cabecera para que el orden y el formato no importen', () => {
  const { cabecera } = parsearCsv('  Código Raro ,NOMBRES,  curso  \n');
  assert.deepEqual(cabecera, ['código raro', 'nombres', 'curso']);
});

test('aObjetos empareja por nombre de columna e ignora las de más', () => {
  const { cabecera, filas } = parsearCsv('curso,codigo,nombres,observaciones\n10A,2024001,Ana,nada\n');
  const objetos = aObjetos(cabecera, filas);

  assert.equal(objetos[0].datos.codigo, '2024001');
  assert.equal(objetos[0].datos.curso, '10A');
  assert.equal(objetos[0].linea, 2);
});

test('aObjetos recorta espacios sobrantes de copiar y pegar', () => {
  const { cabecera, filas } = parsearCsv('codigo,nombres\n  2024001  ,  Ana  \n');
  const [{ datos }] = aObjetos(cabecera, filas);

  assert.equal(datos.codigo, '2024001');
  assert.equal(datos.nombres, 'Ana');
});

test('una fila con menos columnas que la cabecera no rompe', () => {
  const { cabecera, filas } = parsearCsv('codigo,nombres,curso\n2024001,Ana\n');
  const [{ datos }] = aObjetos(cabecera, filas);

  assert.equal(datos.nombres, 'Ana');
  assert.equal(datos.curso, '');
});

test('reconoce un archivo que no venía en UTF-8', () => {
  const latin1 = Buffer.from('codigo,nombres\n1,María\n', 'latin1').toString('utf8');
  assert.equal(pareceMalCodificado(latin1), true);
  assert.equal(pareceMalCodificado('codigo,nombres\n1,María\n'), false);
});
