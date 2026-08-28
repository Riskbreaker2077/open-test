import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { RUTAS } from './rutas.js';
import { validarEstudiantes } from './importers/estudiantes.js';
import { validarBanco } from './importers/preguntas.js';

test('los dos archivos de ejemplo se importan completos y sin errores', () => {
  const estudiantes = validarEstudiantes(
    readFileSync(join(RUTAS.raiz, 'ejemplos', 'estudiantes-ejemplo.csv'), 'utf8'),
  );
  const banco = validarBanco(
    readFileSync(join(RUTAS.raiz, 'ejemplos', 'banco-ejemplo.json'), 'utf8'),
  );
  assert.equal(estudiantes.errores.length, 0);
  assert.equal(estudiantes.registros.length, 10);
  assert.equal(banco.errores.length, 0);
  assert.equal(banco.preguntas.length, 50);
});

test('el paquete de participación ciudadana se importa completo y sin errores', () => {
  const carpeta = join(RUTAS.raiz, 'ejemplos', 'paquete-participacion-ciudadana');
  const imagenes = new Set(readdirSync(join(carpeta, 'imagenes')));
  const banco = validarBanco(readFileSync(join(carpeta, 'paquete.json'), 'utf8'), {
    imagenesDisponibles: imagenes,
    nPreguntasSesion: 20,
  });

  assert.deepEqual(banco.errores, []);
  assert.equal(banco.preguntas.length, 20);
  assert.deepEqual(banco.avisos, []);
});

test('la guía cubre el flujo y los problemas obligatorios', () => {
  const guia = readFileSync(join(RUTAS.raiz, 'GUIA-DOCENTE.md'), 'utf8');
  for (const termino of [
    'Estudiantes', 'Bancos de preguntas', 'Evaluaciones', 'código QR', 'Monitorear',
    'Cerrar evaluación', 'Descargar resultados', 'cortafuegos', 'misma red wifi',
    'aislamiento de clientes', 'CSV UTF-8', 'ceros', 'contraseña', 'SmartScreen',
    'menos de 10 minutos',
  ]) assert.match(guia, new RegExp(termino, 'i'));
});
