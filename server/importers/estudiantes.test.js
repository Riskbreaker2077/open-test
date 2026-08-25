import test from 'node:test';
import assert from 'node:assert/strict';
import { detectarTipo, LIMITES, MAX_ERRORES, validarEstudiantes } from './estudiantes.js';

const CABECERA = 'codigo,nombres,apellidos,curso';
const BUENO = `${CABECERA}\n2024001,María Fernanda,Gómez Ruiz,10A\n2024002,Juan Sebastián,Pérez Loaiza,10A\n`;

test('importa un CSV correcto', () => {
  const { registros, errores } = validarEstudiantes(BUENO);

  assert.deepEqual(errores, []);
  assert.equal(registros.length, 2);
  assert.deepEqual(registros[0], {
    codigo: '2024001',
    nombres: 'María Fernanda',
    apellidos: 'Gómez Ruiz',
    curso: '10A',
  });
});

test('importa el CSV que exporta el Excel en español', () => {
  const excel = '﻿codigo;nombres;apellidos;curso\r\n2024001;María;Gómez;10A\r\n';
  const { registros, errores } = validarEstudiantes(excel);

  assert.deepEqual(errores, []);
  assert.equal(registros[0].nombres, 'María');
});

test('el orden de las columnas y las columnas de más no importan', () => {
  const raro = 'curso,observaciones,apellidos,nombres,codigo\n10A,nada,Gómez,Ana,2024001\n';
  const { registros, errores } = validarEstudiantes(raro);

  assert.deepEqual(errores, []);
  assert.deepEqual(registros[0], {
    codigo: '2024001',
    nombres: 'Ana',
    apellidos: 'Gómez',
    curso: '10A',
  });
});

test('avisa de la columna obligatoria que falta', () => {
  const { registros, errores } = validarEstudiantes('codigo,nombres,apellidos\n2024001,Ana,Gómez\n');

  assert.deepEqual(registros, []);
  assert.deepEqual(errores, ['Falta la columna obligatoria "curso" en la cabecera del archivo.']);
});

test('avisa de una columna vacía con su número de fila', () => {
  const csv = `${CABECERA}\n2024001,Ana,Gómez,10A\n,Luis,Pérez,10A\n`;
  const { registros, errores } = validarEstudiantes(csv);

  assert.deepEqual(registros, []);
  assert.deepEqual(errores, ['Fila 3: la columna "codigo" está vacía.']);
});

test('avisa de un código repetido señalando las dos filas', () => {
  const csv = `${CABECERA}\n2024001,Ana,Gómez,10A\n2024002,Luis,Pérez,10A\n2024001,Otro,Nombre,10B\n`;
  const { errores } = validarEstudiantes(csv);

  assert.deepEqual(errores, [
    'Fila 4: el código "2024001" está repetido (ya aparece en la fila 2).',
  ]);
});

test('avisa cuando un campo se pasa de largo', () => {
  const largo = 'a'.repeat(LIMITES.apellidos + 1);
  const { errores } = validarEstudiantes(`${CABECERA}\n2024001,Ana,${largo},10A\n`);

  assert.deepEqual(errores, [`Fila 2: "apellidos" supera los ${LIMITES.apellidos} caracteres.`]);
});

test('avisa cuando no hay ninguna fila de datos', () => {
  const { errores } = validarEstudiantes(`${CABECERA}\n`);
  assert.deepEqual(errores, ['El archivo no contiene ninguna fila de datos.']);
});

test('un archivo vacío no revienta', () => {
  assert.deepEqual(validarEstudiantes('').errores, ['El archivo está vacío.']);
  assert.deepEqual(validarEstudiantes('   \n  ').errores, ['El archivo está vacío.']);
});

test('todo o nada: un solo error impide importar las filas buenas', () => {
  const csv = `${CABECERA}\n2024001,Ana,Gómez,10A\n,Luis,Pérez,10A\n2024003,Eva,Díaz,10B\n`;
  const { registros, errores } = validarEstudiantes(csv);

  assert.equal(errores.length, 1);
  assert.deepEqual(registros, [], 'no debe importar ni las filas correctas');
});

test('reúne todos los errores en una sola pasada', () => {
  const csv = `${CABECERA}\n,Ana,Gómez,10A\n2024002,,Pérez,10A\n2024003,Eva,,10B\n`;
  const { errores } = validarEstudiantes(csv);

  assert.equal(errores.length, 3);
  assert.match(errores[0], /Fila 2/);
  assert.match(errores[1], /Fila 3/);
  assert.match(errores[2], /Fila 4/);
});

test('recorta la lista de errores cuando es interminable', () => {
  const filas = Array.from({ length: 120 }, () => ',Ana,Gómez,10A').join('\n');
  const { errores } = validarEstudiantes(`${CABECERA}\n${filas}\n`);

  assert.equal(errores.length, MAX_ERRORES + 1);
  assert.match(errores.at(-1), /error\(es\) más/);
});

test('avisa de un archivo que no está en UTF-8 en vez de importar tildes rotas', () => {
  const latin1 = Buffer.from(`${CABECERA}\n2024001,María,Gómez,10A\n`, 'latin1').toString('utf8');
  const { registros, errores } = validarEstudiantes(latin1);

  assert.deepEqual(registros, []);
  assert.match(errores[0], /UTF-8/);
});

test('recorta los espacios sobrantes de copiar y pegar de una planilla', () => {
  const { registros, errores } = validarEstudiantes(`${CABECERA}\n  2024001 , Ana , Gómez , 10A \n`);

  assert.deepEqual(errores, []);
  assert.equal(registros[0].codigo, '2024001');
  assert.equal(registros[0].curso, '10A');
});

test('importa el JSON con la clave estudiantes', () => {
  const json = JSON.stringify({
    estudiantes: [{ codigo: '2024001', nombres: 'Ana', apellidos: 'Gómez', curso: '10A' }],
  });
  const { registros, errores } = validarEstudiantes(json);

  assert.deepEqual(errores, []);
  assert.equal(registros[0].codigo, '2024001');
});

test('importa el JSON como lista plana', () => {
  const json = JSON.stringify([
    { codigo: '2024001', nombres: 'Ana', apellidos: 'Gómez', curso: '10A' },
  ]);
  assert.equal(validarEstudiantes(json).registros.length, 1);
});

test('detecta el tipo de archivo por su contenido, no por la extensión', () => {
  assert.equal(detectarTipo('{"estudiantes":[]}'), 'json');
  assert.equal(detectarTipo('[{"codigo":"1"}]'), 'json');
  assert.equal(detectarTipo(CABECERA), 'csv');
  assert.equal(detectarTipo('﻿[{"codigo":"1"}]'), 'json');
});

test('un JSON roto se explica en lugar de reventar', () => {
  const { errores } = validarEstudiantes('{"estudiantes": [ }');
  assert.match(errores[0], /JSON no es válido/);
});

test('los errores del JSON identifican al estudiante por su posición', () => {
  const json = JSON.stringify({
    estudiantes: [
      { codigo: '2024001', nombres: 'Ana', apellidos: 'Gómez', curso: '10A' },
      { codigo: '', nombres: 'Luis', apellidos: 'Pérez', curso: '10A' },
    ],
  });
  const { errores } = validarEstudiantes(json);
  assert.deepEqual(errores, ['Estudiante 2: la columna "codigo" está vacía.']);
});

test('un código numérico en el JSON no rompe la validación', () => {
  const json = JSON.stringify([{ codigo: 2024001, nombres: 'Ana', apellidos: 'Gómez', curso: '10A' }]);
  const { registros, errores } = validarEstudiantes(json);

  assert.deepEqual(errores, []);
  assert.equal(registros[0].codigo, '2024001');
});
