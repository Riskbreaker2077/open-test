# 023 · Plan técnico

## Pila y límites respetados

Sin nuevas dependencias, sin cambios en el esquema, sin build, sin
HTTP nuevo. Cambios concentrados en `server/red.js` (candidatas por
hostname), en `server/index.js` (cartel de arranque) y en los tests.

## Servicio: `server/red.js`

### Nueva función pura `urlsDeHostnames(puerto, hostname)`

Una función independiente, fácil de probar sin tocar `node:os`:

```js
const IPV4 = /^\d+\.\d+\.\d+\.\d+$/;

export function urlsDeHostnames(puerto, hostname) {
  if (typeof hostname !== 'string') return [];
  const base = hostname.trim();
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
```

Decisiones de diseño:

- **No más prioridad que `-1`**: cualquier IP queda con prioridad ≥ 0
  (los rangos `192.168.` ya son 0). Las candidatas de hostname siempre
  van primero.
- **`hostname.local` con prioridad `-1`** (justo después del hostname
  corto en `-2`): si el SO anuncia `prueba` directamente sin sufijo,
  va antes que `.local`; si sólo anuncia `prueba.local`, esa queda
  primera igualmente. Orden estable.
- **Si el hostname ya trae punto, no se duplica `.local`**: evita
  `prueba.local.local` y respeta los FQDN que el docente haya puesto
  a mano.
- **IPv4 detectada y descartada**: si por algún motivo `os.hostname()`
  devuelve `192.168.1.42` (algunos contenedores hacen eso), no se
  agrega como hostname — ya estaría como candidata IPv4.
- **String vacío o null**: la función devuelve `[]`, sin errores.

### Cambio en `urlsDeIntranet(puerto)`

Se llama a `urlsDeHostnames` con `hostname()` y se prependen sus
candidatas al array existente:

```js
export function urlsDeIntranet(puerto) {
  const candidatas = [
    ...urlsDeHostnames(puerto, hostname()),
  ];

  for (const [interfaz, direcciones] of Object.entries(networkInterfaces())) {
    // ... igual que antes
  }

  candidatas.sort((a, b) => a.prioridad - b.prioridad || a.url.localeCompare(b.url));
  return candidatas.map(({ prioridad, ...resto }, i) => ({ ...resto, probable: i === 0 }));
}
```

Importo `hostname` desde `node:os` en la misma línea donde ya se importa
`networkInterfaces`.

### Función auxiliar `hostnameEsAmigable(hostname)`

Pequeño predicado que decide si el nombre es "amigable" para los
mensajes del cartel de arranque:

```js
const HOSTNAME_AMIGABLE = /^[A-Za-z0-9-]{1,24}$/;

export function hostnameEsAmigable(hostname) {
  return typeof hostname === 'string' && HOSTNAME_AMIGABLE.test(hostname.trim());
}
```

`prueba`, `portatil-aula`, `lab-101` pasan. `DESKTOP-7KQ3P9H` no (32
caracteres). `laptop.example.com` no (punto). Lo usa el cartel de
arranque para elegir entre el mensaje normal y el de aviso.

## Arranque: `server/index.js`

En `imprimirArranque`, después de listar las URLs candidatas y antes
del bloque `Panel del docente`, agrego dos líneas que dependen de
`hostname()`:

```js
const nombre = hostname();
if (hostnameEsAmigable(nombre)) {
  console.log(`  Tu equipo se llama \`${nombre}\`. Las tablets pueden`);
  console.log(`  entrar también por http://${nombre}.local:${puerto} si la red tiene mDNS.`);
} else if (nombre && !/^\d+\.\d+\.\d+\.\d+$/.test(nombre)) {
  console.log(`  Tu equipo se llama \`${nombre}\`, un nombre poco legible.`);
  console.log('  Si prefieres algo más corto, cámbialo en el sistema y reinicia OpenTest.');
}
```

Si el hostname es vacío o es una IPv4, no se imprime nada — no hay
nada útil que decir y no hay candidata nueva que esperar.

## Pantalla de proyección

**No se toca `public/proyeccion/proyeccion.js`.** La pantalla ya
pregunta al servidor cada 5 s por `proyeccion.direccion` y pinta el QR
con `proyeccion.direccion` cada vez que cambia. Como ahora el servidor
devuelve una `probable` por hostname, el QR ya se actualiza sólo.
(Este era el bug que la 023 cierra junto: si el hostname aparece, las
tablets pueden seguir escaneando aunque la IP cambie.)

## Tests

### `server/red.test.js`

Ajustes a los tests existentes para que convivan con las nuevas
candidatas por hostname:

- El primer test (`devuelve URL con el puerto y sin direcciones
  internas`) pasa de asertar `^http://\d+...` a asertar
  `^http://[\\w.-]+:\\d+$` y a comprobar `candidata.ip` sólo cuando
  exista (las candidatas por hostname no tienen campo `ip`).
- Los demás tests (probable única, prioridades ordenadas, no probable
  virtual, hostname vacío, hostname virtual) siguen pasando sin
  cambios — el `probable: true` sigue siendo único, las prioridades
  quedan ordenadas y la primera probable sigue siendo no-virtual (el
  nombre de interfaz `'hostname'` no es virtual).

Tests nuevos:

- `urlsDeHostnames(3000, 'prueba')` devuelve las dos candidatas
  (`http://prueba:3000` con prioridad -2 y `http://prueba.local:3000`
  con -1).
- `urlsDeHostnames(3000, 'prueba.local')` devuelve sólo la candidata
  ya con sufijo (no duplica).
- `urlsDeHostnames(3000, 'laptop.example.com')` devuelve sólo la forma
  FQDN.
- `urlsDeHostnames(3000, '192.168.1.42')` devuelve `[]`.
- `urlsDeHostnames(3000, '')` y `urlsDeHostnames(3000, null)` devuelven
  `[]`.
- `hostnameEsAmigable('prueba')` es `true`,
  `hostnameEsAmigable('DESKTOP-7KQ3P9H')` es `false`,
  `hostnameEsAmigable('laptop.example.com')` es `false`.

### `server/index.js` (sin tests nuevos)

El cartel de arranque se valida manualmente cuando el docente arranca
el servidor — son dos `console.log`, sin lógica que merezca un test
unitario.

## Cambios fuera de `server/` y `public/`

- `spec/constitution/roadmap.md`: muevo la 023 a "Hecho ✅".
- `AGENTS.md`, sección "Dónde estamos": actualizo la línea de estado.
- `RESTART.md`: al cerrar la sesión, resumo lo hecho.

## Lo que no cambia

- El QR es una imagen SVG stateless: cada request al endpoint
  `/api/docente/qr.svg?texto=…` genera el SVG desde cero. No se
  introduce caché.
- El endpoint sigue aceptando `?texto=…` como entrada: la pantalla de
  proyección sigue siendo la que decide qué URL codificar.
- `direccionPortal(req)` en `server/routes/docente.js` ya recomputa
  `urlsDeIntranet(...)` en cada request, así que las tablets que
  refresquen la pantalla (cada 5 s) ven la nueva candidata sin
  necesidad de recargar la página manualmente.
- El orden de las candidatas IPv4 entre sí no cambia — los rangos
  privados y el demérito de adaptadores virtuales siguen idénticos.