import test from 'node:test';
import assert from 'node:assert/strict';
import { esInterfazVirtual, urlsDeIntranet } from './red.js';

test('devuelve URL con el puerto y sin direcciones internas', () => {
  const urls = urlsDeIntranet(3000);

  for (const candidata of urls) {
    assert.match(candidata.url, /^http:\/\/\d+\.\d+\.\d+\.\d+:3000$/);
    assert.notEqual(candidata.ip, '127.0.0.1');
    assert.ok(candidata.interfaz.length > 0);
  }
});

test('marca exactamente una candidata como la más probable', () => {
  const urls = urlsDeIntranet(3000);
  if (urls.length === 0) return; // Equipo sin red: nada que marcar.

  const probables = urls.filter((u) => u.probable);
  assert.equal(probables.length, 1);
  assert.equal(urls[0].probable, true);
});

test('prioriza los rangos privados habituales de un colegio', () => {
  const urls = urlsDeIntranet(3000);
  const prioridad = (ip) => {
    if (ip.startsWith('192.168.')) return 0;
    if (ip.startsWith('10.')) return 1;
    const [a, b] = ip.split('.').map(Number);
    if (a === 172 && b >= 16 && b <= 31) return 2;
    return 3;
  };

  const prioridades = urls.map((u) => prioridad(u.ip));
  assert.deepEqual(prioridades, [...prioridades].sort((a, b) => a - b));
});

test('no falla en un equipo sin red', () => {
  assert.doesNotThrow(() => urlsDeIntranet(3000));
  assert.ok(Array.isArray(urlsDeIntranet(3000)));
});

test('no marca como probable un adaptador virtual si hay uno real', () => {
  const urls = urlsDeIntranet(3000);
  const reales = urls.filter((u) => !esInterfazVirtual(u.interfaz));

  if (reales.length === 0) return; // Solo hay adaptadores virtuales: se listan igual.
  assert.equal(urls[0].probable, true);
  assert.equal(esInterfazVirtual(urls[0].interfaz), false);
});

test('reconoce los adaptadores virtuales habituales', () => {
  for (const nombre of ['docker0', 'br-df0a4d1e', 'vEthernet (WSL)', 'VirtualBox Host-Only']) {
    assert.equal(esInterfazVirtual(nombre), true, `${nombre} debería ser virtual`);
  }
  for (const nombre of ['eth0', 'wlan0', 'Wi-Fi', 'Ethernet']) {
    assert.equal(esInterfazVirtual(nombre), false, `${nombre} no es virtual`);
  }
});
