# 031 · Tareas

## Constitución y specs

- [x] `spec/constitution/mission.md`: la proyección muestra la asistencia con nombre y apellido.
- [x] `spec/features/012-pantalla-proyeccion/spec.md`: nota de que la 031 revisa el criterio "sin nombres".
- [x] Reescribir spec y plan de la 031 para el tablero de colores y actualizar `mission.md`.

## Servidor

- [x] `server/presencia.js` y sus tests.
- [x] `conIntento`, `/entrar`, `/pausar` y `/salir` actualizan la presencia.
- [x] `GET /api/docente/proyeccion/:sesionId` devuelve `estudiantes` con `estado`.
- [x] Test de API: sin entrar, conectado, desconectado, entregado y sin datos reservados.

## Pantalla

- [x] Tablero de cuadros con leyenda en `index.html`, `proyeccion.js` y `proyeccion.css`.
- [x] Verificar a 1024×768 y 1920×1080 con 40 convocados y los cuatro estados.

## Cierre

- [x] `npm test` y `npm run lint` en verde.
- [x] Roadmap, `AGENTS.md`, `RESTART.md` y `spec/bitacora.md`.
