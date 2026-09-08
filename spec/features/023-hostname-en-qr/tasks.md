# 023 · Tareas

## Servicio

- [x] Agregar `urlsDeHostnames(puerto, hostname)` a `server/red.js`,
      exportada, que devuelve las dos candidatas (corta y `.local`)
      con prioridades `-2` y `-1`, o sólo la forma FQDN si el hostname
      ya trae punto.
- [x] Importar `hostname` desde `node:os` y agregarlo al inicio del
      array de candidatas en `urlsDeIntranet(puerto)`.
- [x] Agregar `hostnameEsAmigable(hostname)` exportada, con la regex
      `/^[A-Za-z0-9-]{1,24}$/`.
- [x] Actualizar el primer test existente en `server/red.test.js`
      para aceptar candidatas por hostname (sin campo `ip`).
- [x] Agregar tests para `urlsDeHostnames` con: hostname corto,
      hostname ya con `.local`, hostname FQDN, IPv4, vacío y null.
- [x] Agregar tests para `hostnameEsAmigable` con: nombre corto válido,
      nombre demasiado largo, FQDN.

## Arranque

- [x] En `server/index.js`, agregar al `imprimirArranque` el bloque de
      dos líneas que avisa del hostname cuando es amigable, y el
      bloque alternativo cuando es raro.

## Cierre

- [x] `npm test` — los nuevos y los anteriores en verde.
- [x] `npm run lint` — sin errores.
- [x] Mover la 023 a **"Hecho ✅"** en `spec/constitution/roadmap.md`.
- [x] Actualizar la sección **"Dónde estamos"** de `AGENTS.md`.
- [x] Sobrescribir `RESTART.md` y agregar entrada a
      `spec/bitacora.md` antes de cerrar la sesión.
- [ ] Commit y push.