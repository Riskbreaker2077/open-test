import test from 'node:test';
import assert from 'node:assert/strict';
import { indiceCorrecta, LIMITES, validarBanco } from './preguntas.js';

const CABECERA = 'contexto,imagen,enunciado,opcion_a,opcion_b,opcion_c,opcion_d,correcta,explicacion';
const FILA = ',,¿Cuál es la idea principal?,La migración,El clima,La cosecha,El río,A,Está en la primera oración.';
const CSV = `${CABECERA}\n${FILA}\n`;

const validar = (texto, opciones = {}) => validarBanco(texto, { nPreguntasSesion: 1, ...opciones });

test('importa un banco correcto', () => {
  const { preguntas, errores } = validar(CSV);

  assert.deepEqual(errores, []);
  assert.equal(preguntas.length, 1);
  assert.equal(preguntas[0].enunciado, '¿Cuál es la idea principal?');
  assert.deepEqual(preguntas[0].opciones, ['La migración', 'El clima', 'La cosecha', 'El río']);
  assert.equal(preguntas[0].correcta, 0);
  assert.equal(preguntas[0].explicacion, 'Está en la primera oración.');
});

test('el contexto y la explicación son opcionales', () => {
  const sinOpcionales = `${CABECERA}\n,,¿Pregunta?,a,b,c,d,B,\n`;
  const { preguntas, errores } = validar(sinOpcionales);

  assert.deepEqual(errores, []);
  assert.equal(preguntas[0].contexto, '');
  assert.equal(preguntas[0].explicacion, '');
  assert.equal(preguntas[0].correcta, 1);
});

test('acepta la letra correcta en cualquier caja', () => {
  for (const [valor, esperado] of [['A', 0], ['b', 1], ['C', 2], ['d', 3]]) {
    assert.equal(indiceCorrecta(valor), esperado);
  }
});

test('acepta el índice 0-3 del formato JSON', () => {
  assert.equal(indiceCorrecta(0), 0);
  assert.equal(indiceCorrecta(3), 3);
  assert.equal(indiceCorrecta('2'), 2);
  assert.equal(indiceCorrecta(4), null);
  assert.equal(indiceCorrecta(-1), null);
});

test('rechaza una letra correcta inválida', () => {
  const { preguntas, errores } = validar(`${CABECERA}\n,,¿Pregunta?,a,b,c,d,E,\n`);

  assert.deepEqual(preguntas, []);
  assert.match(errores[0], /Fila 2: la columna "correcta" no es válida/);
});

test('rechaza una opción vacía', () => {
  const { errores } = validar(`${CABECERA}\n,,¿Pregunta?,a,b,,d,A,\n`);
  assert.deepEqual(errores, ['Fila 2: la opción C está vacía. Las cuatro son obligatorias.']);
});

test('rechaza el archivo entero por un solo error', () => {
  const csv = `${CABECERA}\n${FILA}\n,,¿Otra?,a,b,c,d,Z,\n,,¿Tercera?,a,b,c,d,A,\n`;
  const { preguntas, errores } = validar(csv);

  assert.equal(errores.length, 1);
  assert.deepEqual(preguntas, [], 'ni siquiera las preguntas correctas');
});

test('avisa de la columna obligatoria que falta', () => {
  const sinCorrecta = 'enunciado,opcion_a,opcion_b,opcion_c,opcion_d\n¿P?,a,b,c,d\n';
  const { errores } = validar(sinCorrecta);
  assert.deepEqual(errores, ['Falta la columna obligatoria "correcta" en la cabecera del archivo.']);
});

test('rechaza un enunciado demasiado largo', () => {
  const largo = 'a'.repeat(LIMITES.enunciado + 1);
  const { errores } = validar(`${CABECERA}\n,,${largo},a,b,c,d,A,\n`);
  assert.match(errores[0], /el enunciado supera los 1000 caracteres/);
});

test('exige que la imagen exista antes de importar', () => {
  const conImagen = `${CABECERA}\n,celula.png,¿Qué organelo?,a,b,c,d,B,\n`;

  const sinSubir = validar(conImagen, { imagenesDisponibles: new Set() });
  assert.match(sinSubir.errores[0], /no está en la carpeta de imágenes/);

  const subida = validar(conImagen, { imagenesDisponibles: new Set(['celula.png']) });
  assert.deepEqual(subida.errores, []);
  assert.equal(subida.preguntas[0].imagen, 'celula.png');
});

test('rechaza una imagen con ruta en lugar de nombre', () => {
  const conRuta = `${CABECERA}\n,../../etc/passwd.png,¿P?,a,b,c,d,A,\n`;
  const { errores } = validar(conRuta, { imagenesDisponibles: new Set() });
  assert.match(errores[0], /sin carpetas/);
});

test('rechaza una imagen de tipo no admitido', () => {
  const { errores } = validar(`${CABECERA}\n,dibujo.bmp,¿P?,a,b,c,d,A,\n`, {
    imagenesDisponibles: new Set(['dibujo.bmp']),
  });
  assert.match(errores[0], /no es de un tipo admitido/);
});

test('acepta nombres de imagen con tildes y espacios', () => {
  const nombre = 'célula animal 1.png';
  const { errores, preguntas } = validar(`${CABECERA}\n,${nombre},¿P?,a,b,c,d,A,\n`, {
    imagenesDisponibles: new Set([nombre]),
  });

  assert.deepEqual(errores, []);
  assert.equal(preguntas[0].imagen, nombre);
});

test('avisa si el banco es más corto que la sesión, pero lo importa', () => {
  const { preguntas, errores, avisos } = validarBanco(CSV, { nPreguntasSesion: 20 });

  assert.deepEqual(errores, []);
  assert.equal(preguntas.length, 1, 'el banco corto sí se importa');
  assert.match(avisos[0], /necesita al menos 20/);
});

test('importa el JSON anidado con índice de correcta', () => {
  const json = JSON.stringify({
    nombre_banco: 'Ciencias · Periodo 2',
    preguntas: [
      {
        contexto: 'Lee el fragmento',
        enunciado: '¿Cuál es la idea principal?',
        opciones: ['La migración', 'El clima', 'La cosecha', 'El río'],
        correcta: 0,
        explicacion: 'Primera oración.',
      },
    ],
  });
  const { nombre, preguntas, errores } = validar(json);

  assert.deepEqual(errores, []);
  assert.equal(nombre, 'Ciencias · Periodo 2');
  assert.equal(preguntas[0].correcta, 0);
  assert.equal(preguntas[0].contexto, 'Lee el fragmento');
});

test('el JSON también acepta la correcta como letra', () => {
  const json = JSON.stringify([
    { enunciado: '¿P?', opciones: ['a', 'b', 'c', 'd'], correcta: 'C' },
  ]);
  assert.equal(validar(json).preguntas[0].correcta, 2);
});

test('rechaza un JSON con un número de opciones distinto de cuatro', () => {
  const json = JSON.stringify({
    preguntas: [
      { enunciado: '¿Bien?', opciones: ['a', 'b', 'c', 'd'], correcta: 0 },
      { enunciado: '¿Mal?', opciones: ['a', 'b', 'c'], correcta: 0 },
    ],
  });
  const { preguntas, errores } = validar(json);

  assert.deepEqual(preguntas, []);
  assert.deepEqual(errores, ['Pregunta 2: tiene 3 opción(es). Deben ser exactamente 4.']);
});

test('un JSON roto se explica en lugar de reventar', () => {
  assert.match(validar('{"preguntas": [ }').errores[0], /JSON no es válido/);
});

test('avisa de un archivo que no está en UTF-8', () => {
  const latin1 = Buffer.from(CSV, 'latin1').toString('utf8');
  assert.match(validar(latin1).errores[0], /UTF-8/);
});

test('un archivo vacío o sin preguntas no revienta', () => {
  assert.match(validar('').errores[0], /vacío/);
  assert.match(validar(`${CABECERA}\n`).errores[0], /ninguna pregunta/);
});
