import test from 'node:test';
import assert from 'node:assert/strict';
import { validarBanco } from './preguntas.js';
import {
  grupoBancoOpciones,
  grupoContextoCompartido,
  grupoTextoConBlancos,
  preguntaDeEjemplo,
  preguntaMiembroBancoOpciones,
  preguntaMiembroContextoCompartido,
  preguntaMiembroTextoConBlancos,
} from '../fixtures-preguntas.js';

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

test('rechaza una pregunta con menos de 2 opciones', () => {
  const rota = preguntaDeEjemplo();
  rota.opciones = rota.opciones.slice(0, 1);
  const { preguntas, errores } = validar([rota]);
  assert.deepEqual(preguntas, []);
  assert.match(errores[0], /al menos 2/);
});

test('acepta una pregunta con 3 opciones (v1.2.0+: mínimo 2)', () => {
  const conTres = preguntaDeEjemplo();
  conTres.opciones = conTres.opciones.slice(0, 3);
  const { errores } = validar([conTres]);
  assert.deepEqual(errores, []);
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

// --- Grupos de preguntas (feature 026, estándar v1.2.0+) -----------------

test('acepta un grupo contexto_compartido y devuelve preguntas + grupos', () => {
  const grupo = grupoContextoCompartido({ id: 'g-001' });
  const miembro = preguntaMiembroContextoCompartido('g-001');

  const { grupos, preguntas, exclusiones, errores, avisos } = validarBanco(
    paquete([miembro], { grupos: [grupo] }),
    { nPreguntasSesion: 1 },
  );

  assert.deepEqual(errores, []);
  assert.equal(grupos.length, 1);
  assert.equal(grupos[0].id, 'g-001');
  assert.equal(grupos[0].tipo, 'contexto_compartido');
  assert.equal(preguntas.length, 1);
  assert.equal(preguntas[0].grupo_id, 'g-001');
  assert.equal(exclusiones.length, 0);
  assert.equal(avisos.length, 0);
});

test('acepta un grupo banco_opciones con preguntas miembro sin opciones propias', () => {
  const grupo = grupoBancoOpciones({ id: 'g-bo' });
  const m1 = preguntaMiembroBancoOpciones('g-bo', grupo.banco, { id: 'm-1', respuesta_pool_id: 'p1' });
  const m2 = preguntaMiembroBancoOpciones('g-bo', grupo.banco, { id: 'm-2', respuesta_pool_id: 'p2' });

  const { grupos, preguntas, errores } = validarBanco(
    paquete([m1, m2], { grupos: [grupo] }),
    { nPreguntasSesion: 1 },
  );

  assert.deepEqual(errores, []);
  assert.equal(grupos.length, 1);
  assert.equal(grupos[0].tipo, 'banco_opciones');
  assert.equal(preguntas.length, 2);
  assert.equal(preguntas[0].opciones, undefined, 'los miembros de banco_opciones no tienen opciones');
  assert.equal(preguntas[0].respuesta_pool_id, 'p1');
});

test('acepta un grupo texto_con_blancos con preguntas miembro sin enunciado propio', () => {
  const grupo = grupoTextoConBlancos({ id: 'g-tb' });
  const m1 = preguntaMiembroTextoConBlancos('g-tb', 1, { id: 'm-1' });
  const m2 = preguntaMiembroTextoConBlancos('g-tb', 2, { id: 'm-2' });

  const { grupos, preguntas, errores } = validarBanco(
    paquete([m1, m2], { grupos: [grupo] }),
    { nPreguntasSesion: 1 },
  );

  assert.deepEqual(errores, []);
  assert.equal(grupos.length, 1);
  assert.equal(grupos[0].tipo, 'texto_con_blancos');
  assert.equal(preguntas.length, 2);
  assert.equal(preguntas[0].enunciado, undefined, 'los miembros de cloze no tienen enunciado propio');
  assert.equal(preguntas[0].numero_blanco, 1);
});

// --- Exclusión por marcador {{numero:ID}} (regla local de OpenTest) -------

test('excluye una pregunta standalone que trae el marcador {{numero:ID}}', () => {
  const limpia = preguntaDeEjemplo({ id: 'limpia' });
  const conMarcador = preguntaDeEjemplo({
    id: 'con-marcador',
    enunciado: [{ tipo: 'texto', texto: 'The {{numero:limpia}}_______ word matters.' }],
  });

  const { preguntas, exclusiones, avisos } = validar([limpia, conMarcador]);

  assert.deepEqual(preguntas.map((p) => p.id), ['limpia']);
  assert.equal(exclusiones.length, 1);
  assert.equal(exclusiones[0].tipo, 'pregunta');
  assert.equal(exclusiones[0].id, 'con-marcador');
  assert.match(avisos[0], /marcador/);
});

test('excluye un grupo entero si su contexto o banco trae el marcador', () => {
  const grupoLimpio = grupoContextoCompartido({ id: 'g-limpio' });
  const grupoConMarcador = grupoContextoCompartido({
    id: 'g-marcado',
    contexto: [{ tipo: 'texto', texto: 'Lee el {{numero:m-limpio}}_______ texto.' }],
  });
  const m1 = preguntaMiembroContextoCompartido('g-limpio', { id: 'm-limpio' });
  const m2 = preguntaMiembroContextoCompartido('g-marcado', { id: 'm-marcado' });

  const { grupos, preguntas, exclusiones } = validarBanco(
    paquete([m1, m2], { grupos: [grupoLimpio, grupoConMarcador] }),
    { nPreguntasSesion: 1 },
  );

  assert.deepEqual(grupos.map((g) => g.id), ['g-limpio']);
  // La pregunta miembro del grupo excluido no se importa y no se enumera dos veces.
  assert.deepEqual(preguntas.map((p) => p.id), ['m-limpio']);
  assert.equal(exclusiones.length, 1);
  assert.equal(exclusiones[0].tipo, 'grupo');
  assert.equal(exclusiones[0].id, 'g-marcado');
});

test('excluye un grupo si el marcador está en una entrada de su banco', () => {
  const grupo = grupoBancoOpciones({
    id: 'g-bo-marcado',
    banco: [
      { id: 'b1', contenido: [{ tipo: 'texto', texto: 'phloem' }] },
      { id: 'b2', contenido: [{ tipo: 'texto', texto: 'the {{numero:m-1}}_______ word' }] },
    ],
  });
  const miembro = preguntaMiembroBancoOpciones('g-bo-marcado', grupo.banco, { id: 'm-1' });

  const { grupos, preguntas, exclusiones } = validarBanco(
    paquete([miembro], { grupos: [grupo] }),
    { nPreguntasSesion: 1 },
  );

  assert.equal(grupos.length, 0);
  assert.equal(preguntas.length, 0);
  assert.equal(exclusiones.length, 1);
  assert.match(exclusiones[0].motivo, /banco/);
});
