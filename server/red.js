import { hostname, networkInterfaces } from 'node:os';

// Ordenadas por probabilidad de ser la red del colegio.
const RANGOS = [
  { prueba: (ip) => ip.startsWith('192.168.'), prioridad: 0 },
  { prueba: (ip) => ip.startsWith('10.'), prioridad: 1 },
  {
    prueba: (ip) => {
      const [a, b] = ip.split('.').map(Number);
      return a === 172 && b >= 16 && b <= 31;
    },
    prioridad: 2,
  },
];

// Adaptadores que casi nunca son la red del aula: Docker, WSL, VirtualBox,
// VMware, Hyper-V. Tienen IP privada válida, así que sin esto pueden ganarle
// a la wifi real y dejar al docente dictando una dirección inalcanzable.
const VIRTUALES = /^(docker|br-|veth|virbr|vmnet|vboxnet|tun|tap|wsl|zt)/i;
const VIRTUALES_WINDOWS = /(vethernet|virtualbox|vmware|hyper-v|loopback)/i;

const IPV4 = /^\d+\.\d+\.\d+\.\d+$/;
// Nombres cortos tipo `prueba`, `lab-101`. El corte en 12 deja fuera a los
// autogenerados de Windows (DESKTOP-7KQ3P9H) y a los que vienen con marca
// de fabricante (camilo-Lenovo-V14-G3-IAP), que es justo cuando el aviso de
// "nombre poco legible" le sirve al docente.
const HOSTNAME_AMIGABLE = /^[A-Za-z0-9-]{1,12}$/;

export function esInterfazVirtual(nombre) {
  return VIRTUALES.test(nombre) || VIRTUALES_WINDOWS.test(nombre);
}

export function hostnameEsAmigable(nombre) {
  return typeof nombre === 'string' && HOSTNAME_AMIGABLE.test(nombre.trim());
}

function prioridadDe(ip, interfaz) {
  const rango = RANGOS.find((r) => r.prueba(ip));
  const base = rango ? rango.prioridad : 3;
  // Una interfaz virtual nunca se marca como la más probable, pero se sigue
  // listando: si el docente no tiene otra, puede probarla.
  return esInterfazVirtual(interfaz) ? base + 10 : base;
}

/**
 * Candidatas por nombre del equipo (mDNS / Bonjour).
 *
 * Si el portátil del docente se llama `prueba`, esto devuelve
 * `http://prueba:3000` y `http://prueba.local:3000` con prioridades
 * negativas para que queden por encima de cualquier IPv4. Si el hostname ya
 * trae punto (FQDN) o es una IPv4, devuelve sólo la forma tal cual o nada.
 */
export function urlsDeHostnames(puerto, nombre) {
  if (typeof nombre !== 'string') return [];
  const base = nombre.trim();
  if (base === '' || IPV4.test(base)) return [];

  const candidatas = [
    { interfaz: 'hostname', host: base, url: `http://${base}:${puerto}`, prioridad: -2 },
  ];
  if (!base.includes('.')) {
    candidatas.push({
      interfaz: 'hostname.local',
      host: `${base}.local`,
      url: `http://${base}.local:${puerto}`,
      prioridad: -1,
    });
  }
  return candidatas;
}

/**
 * Direcciones por las que las tablets pueden alcanzar el servidor.
 * Se devuelven todas las candidatas —un portátil con wifi, ethernet y algún
 * adaptador virtual es lo normal— con la más probable marcada, para que el
 * docente tenga una alternativa que probar si la primera no funciona.
 *
 * Si el sistema operativo reporta un nombre de equipo, las candidatas por
 * hostname (mDNS / Bonjour) se anteponen a las IPv4: son más legibles y no
 * cambian cuando el portátil se mueve de subred.
 */
export function urlsDeIntranet(puerto) {
  const candidatas = [...urlsDeHostnames(puerto, hostname())];

  for (const [interfaz, direcciones] of Object.entries(networkInterfaces())) {
    for (const dir of direcciones ?? []) {
      if (dir.family !== 'IPv4' || dir.internal) continue;
      candidatas.push({
        interfaz,
        ip: dir.address,
        url: `http://${dir.address}:${puerto}`,
        prioridad: prioridadDe(dir.address, interfaz),
      });
    }
  }

  candidatas.sort((a, b) => a.prioridad - b.prioridad || a.url.localeCompare(b.url));
  return candidatas.map(({ prioridad, ...resto }, i) => ({ ...resto, probable: i === 0 }));
}
