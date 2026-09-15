# Restart

## Última actualización y rama activa

- 15/09/2026 — `main`. Publicada la **1.2.0** (033–035). Encima, la **036** (presencia casi inmediata), que sale como **1.2.1**.

## Feature/tarea en curso

- Ninguna. 033, 034 y 035 implementadas; quedan las verificaciones físicas en Windows (sin ventana, apagar desde el panel, ícono de los accesos directos) y en el proyector.

## Qué se hizo en esta sesión

1. 031: tablero de asistencia por colores en la proyección (presencia en memoria, `server/presencia.js`). Publicada en 1.1.0 junto con el tiempo mínimo por defecto de 60 s.
2. 032: se quitó "Pausar y salir" del examen (pausaba a todo el grupo). Publicada en 1.1.1.
3. 033: Volver/Finalizar en la proyección, nombres cortos con más de 30 convocados, borrar sin descarga previa, Volver al inicio desde resultados.
4. 034: accesos directos sin consola (`OpenTest.vbs`), botón Apagar OpenTest, detección de instancia abierta, cierre al actualizar.
6. 036: el docente probó cortar la red de una tablet y el rojo tardó demasiado. Latido cada 2 s, aviso con `sendBeacon` al ocultar la página, umbral de 6 s y proyección cada 2 s.
5. 035: logo en app, sitio, README e instalador. Los derivados (PNG transparentes e `.ico`) se generaron con un script con `pngjs` fuera del repo, a partir del PNG que entregó el docente.

## Estado

- Tests y lint: ver el último `npm test` / `npm run lint` antes del commit de la 1.2.0.
- Instalador: compilado y probado en Windows (runner), publicado como 1.0.0.
- Hay cambios sin commitear que **no son de esta sesión** y no se tocaron: borrados de `spec_template/`, que ya estaban al empezar, y en `.opencode/skills/` dos skills renombradas a `*-opentest`, que aparecieron durante la sesión. Preguntar al usuario antes de commitearlos o restaurarlos.

## Siguiente tarea

- Para publicar una versión nueva: subir `version` en `package.json`, commit, `git tag vX.Y.Z && git push origin vX.Y.Z`. El workflow hace el resto.
- Aparte de eso, nada obligatorio; ver `roadmap.md → Backlog / ideas`.

## Bloqueos / decisiones pendientes

- Ninguno. Cada versión suma unos 50 MB al historial de git por la copia commiteada (decisión del usuario, ver bitácora 15/09/2026).
