import test from 'node:test';
import assert from 'node:assert/strict';
import net from 'node:net';
import { siguientePuertoLibre } from './arranque.js';

test('si el puerto está ocupado elige el siguiente', async () => {
  const ocupado = net.createServer().listen(0, '0.0.0.0');
  await new Promise((resolve) => ocupado.once('listening', resolve));
  const puerto = ocupado.address().port;
  assert.equal(await siguientePuertoLibre(puerto, puerto + 2), puerto + 1);
  await new Promise((resolve) => ocupado.close(resolve));
});
