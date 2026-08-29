# Restart

## Última actualización y rama activa

- 28/08/2026 — `main`.

## Feature/tarea en curso

- Ninguna en curso. La última completada es la 019 · Estadísticas por pregunta y por competencia ([roadmap](spec/constitution/roadmap.md)). Todas las features del roadmap están implementadas; queda pendiente la sesión de validación física en el equipo destino.

## Qué se hizo en esta sesión

### `main`

- Se comiteó y se hizo `push` de la feature 018 (`e16de7c`, `775adeb`), que había quedado pendiente al cierre de la sesión anterior.
- Se implementó la feature 019: nueva pantalla `/docente/estadisticas.html` con qué preguntas y qué competencias falla más el grupo. Cubre las dos formas de alcance que se le plantearon al usuario y ambas pidió: una sesión cerrada concreta, o acumulado por banco entre todas sus sesiones cerradas. `server/services/estadisticas.js` con una consulta SQL agregada; dos rutas nuevas bajo `/api/docente/bancos/:id/`. Detalle completo en `spec/bitacora.md` y `spec/features/019-estadisticas-pregunta-competencia/`.
- Se verificó el flujo de la 019 con un servidor desechable en `:memory:` (sin tocar `data/opentest.db`): login real, páginas servidas, rutas devolviendo datos correctos por HTTP. No se pudo hacer clic-a-clic en un navegador real porque este entorno no tiene una herramienta de automatización de navegador disponible.

## Estado

- Git: feature 019 sin commit todavía. `main` está sincronizado con `origin/main` hasta `775adeb` (018 + ajuste de RESTART.md); falta comitear y decidir el `push` de la 019.
- Tests: 329/329 en verde (315 antes de esta sesión; 14 nuevos: servicio de estadísticas, rutas, integración HTTP).
- Lint: 87 archivos revisados, sin errores.
- Build: no se tocó.
- Migraciones: ninguna nueva; el esquema no cambió.
- Servidor: no se probó en un navegador real (sin herramienta de automatización disponible en este entorno). Se verificó por HTTP con un servidor de prueba desechable, separado de `data/opentest.db`.

## Siguiente tarea

1. Decidir con el usuario si se comitea la feature 019 y si se hace `push`.
2. Si se va a usar la sesión "Participación ciudadana" local, reimportar el banco con el `paquete.json` regenerado para que tenga metadata y justificación (pendiente desde la 016).
3. Transferir el estado a la máquina Windows y ejecutar `npm test`.
4. Ejecutar en conjunto las verificaciones físicas pendientes de 012, 013, 006, 007, 009, 010, la apertura del `.xlsx` de la 018 en Excel/LibreOffice reales, y un clic-a-clic real en la pantalla de estadísticas de la 019.

## Bloqueos / decisiones pendientes

- Hace falta el equipo Windows con tablets/proyector para QR, red wifi, orientación, legibilidad y pérdida real de conexión.
- Falta construir/probar el SEA en Windows sin Node, revisar SmartScreen/cortafuegos y abrir los CSV, el `.xlsx` de la 018 en Excel, y probar en un navegador real la pantalla de estadísticas de la 019.
- Falta decidir el commit y el `push` de la feature 019.
- Backlog abierto: monitoreo en vivo enriquecido, backup con un clic, y decidir si/cómo migrar bancos anteriores a la 016 (ver roadmap).
