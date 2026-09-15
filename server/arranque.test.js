import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import net from 'node:net';
import { crearApp } from './app.js';
import { siguientePuertoLibre, yaEstaAbierto } from './arranque.js';
import { abrirBd, cerrarBd } from './db.js';

const escuchar = (servidor) => new Promise((resolve) => servidor.once('listening', resolve));
const cerrar = (servidor) => new Promise((resolve) => servidor.close(resolve));

test('si el puerto está ocupado elige el siguiente', async () => {
  const ocupado = net.createServer().listen(0, '0.0.0.0');
  await escuchar(ocupado);
  const puerto = ocupado.address().port;
  assert.equal(await siguientePuertoLibre(puerto, puerto + 2), puerto + 1);
  await cerrar(ocupado);
});

test('reconoce un OpenTest que ya responde en el puerto', async () => {
  const db = abrirBd(':memory:');
  const servidor = crearApp(db).listen(0, '127.0.0.1');
  await escuchar(servidor);
  assert.equal(await yaEstaAbierto(servidor.address().port), true);
  await cerrar(servidor);
  cerrarBd(db);
});

test('otro programa en el puerto, o nadie, no cuenta como OpenTest abierto', async () => {
  const otro = http.createServer((req, res) => res.end('hola')).listen(0, '127.0.0.1');
  await escuchar(otro);
  const puerto = otro.address().port;
  assert.equal(await yaEstaAbierto(puerto), false);
  await cerrar(otro);
  assert.equal(await yaEstaAbierto(puerto), false);
});
