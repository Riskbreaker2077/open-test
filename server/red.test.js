import test from 'node:test';
import assert from 'node:assert/strict';
import { esInterfazVirtual, hostnameEsAmigable, urlsDeHostnames, urlsDeIntranet } from './red.js';

test('devuelve URL con el puerto y sin direcciones internas', () => {
  const urls = urlsDeIntranet(3000);

  for (const candidata of urls) {
    assert.match(candidata.url, /^http:\/\/[\w.-]+:\d+$/);
    if (candidata.ip !== undefined) {
      assert.notEqual(candidata.ip, '127.0.0.1');
      assert.match(candidata.ip, /^\d+\.\d+\.\d+\.\d+$/);
    }
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

  const prioridades = urls.filter((u) => u.ip).map((u) => prioridad(u.ip));
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

test('urlsDeHostnames devuelve la candidata corta y la .local', () => {
  const candidatas = urlsDeHostnames(3000, 'prueba');

  assert.deepEqual(candidatas, [
    { interfaz: 'hostname', host: 'prueba', url: 'http://prueba:3000', prioridad: -2 },
    { interfaz: 'hostname.local', host: 'prueba.local', url: 'http://prueba.local:3000', prioridad: -1 },
  ]);
});

test('urlsDeHostnames no duplica el sufijo .local si el hostname ya lo trae', () => {
  const candidatas = urlsDeHostnames(3000, 'prueba.local');

  assert.deepEqual(candidatas, [
    { interfaz: 'hostname', host: 'prueba.local', url: 'http://prueba.local:3000', prioridad: -2 },
  ]);
});

test('urlsDeHostnames respeta un FQDN sin agregar .local', () => {
  const candidatas = urlsDeHostnames(3000, 'laptop.example.com');

  assert.deepEqual(candidatas, [
    {
      interfaz: 'hostname',
      host: 'laptop.example.com',
      url: 'http://laptop.example.com:3000',
      prioridad: -2,
    },
  ]);
});

test('urlsDeHostnames descarta el hostname si es una IPv4', () => {
  assert.deepEqual(urlsDeHostnames(3000, '192.168.1.42'), []);
});

test('urlsDeHostnames descarta el hostname vacío o no string', () => {
  assert.deepEqual(urlsDeHostnames(3000, ''), []);
  assert.deepEqual(urlsDeHostnames(3000, '   '), []);
  assert.deepEqual(urlsDeHostnames(3000, null), []);
  assert.deepEqual(urlsDeHostnames(3000, undefined), []);
  assert.deepEqual(urlsDeHostnames(3000, 123), []);
});

test('hostnameEsAmigable distingue nombres cortos legibles del resto', () => {
  for (const nombre of ['prueba', 'lab-101', 'aula1', 'docente-2b']) {
    assert.equal(hostnameEsAmigable(nombre), true, `${nombre} debería ser amigable`);
  }
  for (const nombre of ['', 'DESKTOP-7KQ3P9H', 'camilo-Lenovo-V14-G3-IAP', 'laptop.example.com', 'prueba.local', 'ñandú']) {
    assert.equal(hostnameEsAmigable(nombre), false, `${nombre} no debería ser amigable`);
  }
  assert.equal(hostnameEsAmigable(null), false);
  assert.equal(hostnameEsAmigable(123), false);
});

test('urlsDeIntranet coloca las candidatas por hostname antes que las IPv4', () => {
  const candidatas = urlsDeIntranet(3000);
  const porHostname = candidatas.filter((c) => c.interfaz.startsWith('hostname'));
  if (porHostname.length === 0) return;

  const primeraNoHostname = candidatas.find((c) => !c.interfaz.startsWith('hostname'));
  if (!primeraNoHostname) return;

  const ultimaPorHostname = porHostname[porHostname.length - 1];
  const posHostname = candidatas.indexOf(ultimaPorHostname);
  const posIpv4 = candidatas.indexOf(primeraNoHostname);
  assert.ok(posHostname < posIpv4, 'toda candidata por hostname ordena antes que la primera IPv4');
});
