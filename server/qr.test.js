import test from 'node:test';
import assert from 'node:assert/strict';
import { decodificarMatrizQr, matrizQr, svgQr } from './qr.js';

test('el QR recupera exactamente la dirección del portal', () => {
  const direccion = 'http://192.168.1.25:3000';
  const matriz = matrizQr(direccion);

  assert.equal(decodificarMatrizQr(matriz), direccion);
  assert.ok([21, 25, 29, 33].includes(matriz.length));
  assert.ok(matriz.every((fila) => fila.length === matriz.length));
});

test('el SVG es local, escalable y tiene margen blanco', () => {
  const svg = svgQr('http://10.0.0.8:3000');
  assert.match(svg, /^<svg xmlns=/);
  assert.match(svg, /viewBox="0 0 \d+ \d+"/);
  assert.match(svg, /shape-rendering="crispEdges"/);
  assert.doesNotMatch(svg, /(?:href|src)="https?:\/\//, 'la salida no carga recursos externos');
});

test('rechaza textos que exceden el QR acotado de intranet', () => {
  assert.throws(() => matrizQr('x'.repeat(100)), /demasiado larga/);
});
