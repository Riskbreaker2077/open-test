# Restart

## ACCIÓN URGENTE PENDIENTE DEL USUARIO

- Revisar y aprobar los cambios de la feature 016 (estándar preguntas-icfes) antes de comitear: no se hizo commit ni push.
- Antes de probar en otro equipo, transferir los cambios sin commit: hacer commit/push o copiar el repositorio completo.
- Llevar Windows 10/11, tablets y proyector; si se quiere conservar el set ya importado, copiar también `data/opentest.db`, que no viaja por Git — pero ver el aviso de abajo: ese banco quedará sin metadata hasta reimportarlo.

## Última actualización y rama activa

- 28/08/2026 — `main`.

## Feature/tarea en curso

- 016 · Estándar preguntas-icfes: implementación completa, pendiente de revisión del usuario y de la sesión de validación física en equipo destino ([roadmap](spec/constitution/roadmap.md)).

## Qué se hizo en esta sesión

### `main`

- Se creó y publicó el repo independiente `preguntas-icfes` (github.com/riskbreaker2077/preguntas-icfes, público, con GitHub Pages en riskbreaker2077.github.io/preguntas-icfes): estándar abierto para preguntas tipo ICFES con metadata pedagógica, contenido en bloques y justificación por opción.
- Se implementó la feature 016: OpenTest adopta ese estándar. Detalle completo en la bitácora de hoy (`spec/bitacora.md`) y en `spec/features/016-estandar-preguntas-icfes/`.
- Se retiró el importador CSV de preguntas y las rutas `/api/docente/bancos/validar` y `/confirmar` (JSON plano). Solo queda el ZIP con `paquete.json`.
- Migración de esquema 3: metadata pedagógica en `preguntas`, `justificacion` en `opciones`, sin romper bancos ya cargados.
- Exportación de resultados subió a `formato_version: 2` (`spec/contracts/export-resultados-v2.md`).
- Se regeneraron `ejemplos/banco-ejemplo.json` y `ejemplos/paquete-participacion-ciudadana` (paquete.json + zip) con metadata y justificación reales.

## Estado

- Git: cambios acumulados sin commit; `main` sigue por delante de `origin/main` como antes de esta sesión (sin contar el repo nuevo `preguntas-icfes`, que ya está commiteado y publicado en su propio remoto).
- Tests: 295/295 en verde (antes 286; se sumaron pruebas del validador vendorizado, la migración 3 y el paquete de ejemplo).
- Lint: 79 archivos revisados, sin errores.
- Build: no se tocó; pendiente ejecutar `npm run build:exe` en Windows como antes.
- Migraciones pendientes: ninguna en el código; **al abrir `data/opentest.db` local se aplicará automáticamente la migración 3** la próxima vez que se arranque el servidor o se corran tests contra ese archivo.
- **`data/opentest.db` local quedó desactualizado en contenido, no en esquema.** El banco 2 ("Participación ciudadana") migrará su esquema sin problema, pero sus preguntas seguirán con metadata en blanco y sin justificación por opción hasta que se reimporte con el `paquete.json` regenerado (mismo contenido de siempre, ahora completo).
- Ramas sin fusionar: ninguna; existen `main` y `agents/continuar-siguiente-feature`.
- Servidor: apagado al cerrar la sesión. No se hizo prueba manual en navegador (cambio de datos/backend, no de UI nueva).

## Siguiente tarea

1. Revisar el diff de la 016 y decidir si se comitea.
2. Si se va a usar la sesión "Participación ciudadana" local, reimportar el banco con el `paquete.json` regenerado (borrar el banco viejo o crear uno nuevo y reapuntar la sesión) para que tenga metadata y justificación.
3. Transferir el estado a la máquina Windows y ejecutar `npm test`.
4. Ejecutar en conjunto las verificaciones físicas pendientes de 012, 013, 006, 007, 009, 010, y ahora también revisar visualmente en tablet que las tablas y las justificaciones de la 016 se lean bien.
5. Según los hallazgos, decidir commit/push.

## Bloqueos / decisiones pendientes

- Hace falta el equipo Windows con tablets/proyector para QR, red wifi, orientación, legibilidad y pérdida real de conexión.
- Falta construir/probar el SEA en Windows sin Node, revisar SmartScreen/cortafuegos y abrir los CSV en Excel.
- Falta decidir commit/push de todos los cambios acumulados, incluida la 016.
- Backlog abierto por la 016: balancear el sorteo por competencia en `personalizacion.js`, exportación a Excel con diseño, y decidir si/cómo migrar bancos anteriores a la 016 (ver roadmap).
