import { networkInterfaces } from 'node:os';

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

export function esInterfazVirtual(nombre) {
  return VIRTUALES.test(nombre) || VIRTUALES_WINDOWS.test(nombre);
}

function prioridadDe(ip, interfaz) {
  const rango = RANGOS.find((r) => r.prueba(ip));
  const base = rango ? rango.prioridad : 3;
  // Una interfaz virtual nunca se marca como la más probable, pero se sigue
  // listando: si el docente no tiene otra, puede probarla.
  return esInterfazVirtual(interfaz) ? base + 10 : base;
}

/**
 * Direcciones por las que las tablets pueden alcanzar el servidor.
 * Se devuelven todas las candidatas —un portátil con wifi, ethernet y algún
 * adaptador virtual es lo normal— con la más probable marcada, para que el
 * docente tenga una alternativa que probar si la primera no funciona.
 */
export function urlsDeIntranet(puerto) {
  const candidatas = [];

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

  candidatas.sort((a, b) => a.prioridad - b.prioridad || a.ip.localeCompare(b.ip));
  return candidatas.map(({ prioridad, ...resto }, i) => ({ ...resto, probable: i === 0 }));
}
