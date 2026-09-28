# 044 · Elegir la evaluación del portal de una lista — Tareas

- [x] Investigar la conexión real con el portal.
- [x] **Error propio detectado y corregido a mitad de camino:** se concluyó
  sin fundamento que la 043 nunca funcionó (checkout local desactualizado,
  sin `git fetch`). Se sincronizó con `origin/main` de `portal-estudiantes`
  y se encontró la feature 030 real, contraparte exacta de la 043.
- [x] Revertido: cliente MCP propio (`portal-mcp.js`), dependencia
  `@modelcontextprotocol/client`, migración v8 (`destino_portal`),
  herramienta MCP `listar_evaluaciones_opentest` — todo innecesario.
- [x] Portal: `listarEvaluacionesOpenTest` en `lib/opentest-envio.ts` +
  `GET /api/opentest/evaluaciones` sin `codigo` en la ruta + prueba de
  integración contra la base local. Commiteado en `portal-estudiantes`,
  rama `feature/044-listar-evaluaciones-disponibles` (sobre `origin/main`,
  sin fusionar).
- [x] OpenTest: `evaluacionesDisponibles` en `envios-portal.js` (REST
  simple, como la 043) + ruta + pruebas.
- [x] `public/docente/portal.html` y `portal.js`: selector en vez de texto
  libre.
- [x] `npm test` (501 en verde) + `npm run lint` (103 archivos limpio) en
  OpenTest; suite completa del portal (1662/1689, los 3 fallos son
  preexistentes y no relacionados: 2 necesitan MySQL aislado en :3338, uno
  es un flaky ya documentado en el `RESTART.md` del portal).
- [x] **Recorrido de punta a punta contra el portal real en local**:
  sembrado un periodo/asignatura/módulo/evaluación y una credencial
  `opentest:enviar` reales; vincular, buscar evaluaciones disponibles,
  elegir código, enviar y confirmar la propuesta `IMPORTACION_OPENTEST`
  creada en la base del portal. Éxito el 28/09/2026.
- [x] Corregidas las notas falsas que esta misma sesión había dejado en
  `spec.md` de la 043, `roadmap.md`, `AGENTS.md` y `RESTART.md` sobre que
  la 043 nunca funcionó — no era cierto.
- [x] Guía docente, roadmap, AGENTS, RESTART, bitácora.
- [ ] Publicar versión: pendiente de que el usuario lo confirme (¿1.5.1?).
- [ ] Decidir si fusionar `feature/044-listar-evaluaciones-disponibles` en
  `portal-estudiantes` ahora o dejarlo para revisión del usuario.
