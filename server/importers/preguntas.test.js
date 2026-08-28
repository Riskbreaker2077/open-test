import test from 'node:test';
import assert from 'node:assert/strict';
import { validarBanco } from './preguntas.js';
import { preguntaDeEjemplo } from '../fixtures-preguntas.js';

const paquete = (preguntas, overrides = {}) => JSON.stringify({
  estandar: 'preguntas-icfes',
  version_estandar: '1.0.0',
  nombre: 'Banco de prueba',
  preguntas,
  ...overrides,
});

const validar = (preguntas, opciones = {}) =>
  validarBanco(paquete(preguntas), { nPreguntasSesion: 1, ...opciones });

test('importa un banco correcto', () => {
  const pregunta = preguntaDeEjemplo();
  const { nombre, preguntas, errores } = validar([pregunta]);

  assert.deepEqual(errores, []);
  assert.equal(nombre, 'Banco de prueba');
  assert.equal(preguntas.length, 1);
  assert.equal(preguntas[0].id, pregunta.id);
  assert.equal(preguntas[0].opciones.length, 4);
});

test('rechaza un archivo que no es JSON', () => {
  const { errores } = validarBanco('{"preguntas": [ }', { nPreguntasSesion: 1 });
  assert.match(errores[0], /JSON no es válido/);
});

test('un archivo vacío no revienta', () => {
  assert.match(validarBanco('').errores[0], /vacío/);
});

test('avisa de un archivo que no está en UTF-8', () => {
  const latin1 = Buffer.from(paquete([preguntaDeEjemplo()]), 'latin1').toString('utf8');
  assert.match(validarBanco(latin1).errores[0], /UTF-8/);
});

test('rechaza un estandar distinto de preguntas-icfes', () => {
  const texto = paquete([preguntaDeEjemplo()], { estandar: 'otra-cosa' });
  const { errores } = validarBanco(texto, { nPreguntasSesion: 1 });
  assert.match(errores[0], /"estandar"/);
});

test('rechaza una version_estandar que no sigue SemVer', () => {
  const texto = paquete([preguntaDeEjemplo()], { version_estandar: 'v1' });
  const { errores } = validarBanco(texto, { nPreguntasSesion: 1 });
  assert.match(errores[0], /SemVer/);
});

test('rechaza una pregunta con menos de 4 opciones', () => {
  const rota = preguntaDeEjemplo();
  rota.opciones = rota.opciones.slice(0, 3);
  const { preguntas, errores } = validar([rota]);
  assert.deepEqual(preguntas, []);
  assert.match(errores[0], /exactamente 4/);
});

test('rechaza una pregunta sin ninguna opción correcta', () => {
  const rota = preguntaDeEjemplo();
  rota.opciones = rota.opciones.map((o) => ({ ...o, es_correcta: false }));
  const { errores } = validar([rota]);
  assert.match(errores[0], /exactamente 1/);
});

test('rechaza una opción sin justificacion', () => {
  const rota = preguntaDeEjemplo();
  delete rota.opciones[0].justificacion;
  const { errores } = validar([rota]);
  assert.match(errores[0], /justificacion/);
});

for (const campo of ['competencia', 'componente', 'afirmacion', 'evidencia', 'estandar_asociado', 'que_evalua']) {
  test(`rechaza una pregunta sin "${campo}"`, () => {
    const rota = preguntaDeEjemplo();
    delete rota[campo];
    const { errores } = validar([rota]);
    assert.match(errores[0], new RegExp(campo));
  });
}

test('rechaza ids de pregunta duplicados', () => {
  const uno = preguntaDeEjemplo({ id: 'repetido' });
  const dos = preguntaDeEjemplo({ id: 'repetido' });
  const { errores } = validar([uno, dos]);
  assert.match(errores[0], /repetido/);
});

test('exige que una imagen referenciada exista antes de importar', () => {
  const conImagen = preguntaDeEjemplo({
    contexto: [{ tipo: 'imagen', archivo: 'celula.png' }],
  });

  const sinSubir = validar([conImagen], { imagenesDisponibles: new Set() });
  assert.match(sinSubir.errores[0], /no existe en imagenes/);

  const subida = validar([conImagen], { imagenesDisponibles: new Set(['celula.png']) });
  assert.deepEqual(subida.errores, []);
});

test('rechaza una tabla con filas no rectangulares', () => {
  const rota = preguntaDeEjemplo({
    contexto: [{ tipo: 'tabla', encabezados: ['A', 'B'], filas: [['1', '2'], ['solo-una']] }],
  });
  const { errores } = validar([rota]);
  assert.match(errores[0], /rectangulares/);
});

test('acepta contexto vacío, y contexto/opciones con imagen o tabla', () => {
  const rica = preguntaDeEjemplo({
    contexto: [
      { tipo: 'texto', texto: 'Un párrafo de contexto.' },
      { tipo: 'tabla', encabezados: ['Año', 'Valor'], filas: [['2020', '10']] },
    ],
  });
  rica.opciones[0].contenido = [{ tipo: 'imagen', archivo: 'opcion-a.png' }];

  const { errores } = validar([rica], {
    imagenesDisponibles: new Set(['opcion-a.png']),
  });
  assert.deepEqual(errores, []);
});

test('avisa si el banco es más corto que la sesión, pero lo importa', () => {
  const { preguntas, errores, avisos } = validarBanco(paquete([preguntaDeEjemplo()]), { nPreguntasSesion: 20 });

  assert.deepEqual(errores, []);
  assert.equal(preguntas.length, 1, 'el banco corto sí se importa');
  assert.match(avisos[0], /necesita al menos 20/);
});

test('un solo error en varias preguntas rechaza el archivo entero', () => {
  const buena = preguntaDeEjemplo({ id: 'buena' });
  const mala = preguntaDeEjemplo({ id: 'mala' });
  delete mala.competencia;

  const { preguntas, errores } = validar([buena, mala]);
  assert.deepEqual(preguntas, [], 'ni siquiera la pregunta correcta se importa');
  assert.equal(errores.length, 1);
});
