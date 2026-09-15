# Restart

## Última actualización y rama activa

- 15/09/2026 — `main`. Publicada la **1.1.0** (tablero de asistencia, tiempo mínimo de 60 s). Encima, la **032** quita "Pausar y salir" del examen; se publica como **1.1.1**.

## Feature/tarea en curso

- Ninguna. La 031 quedó implementada con el tablero; falta la verificación física en el proyector del aula.

## Qué se hizo en esta sesión

1. El docente pidió ver en la pantalla del QR quién está conectado y quién falta. Se revisó la regla "nada de nombres" de `mission.md` y la 012 por decisión suya.
2. Primera versión: dos listas (faltan / conectados). Commit `4a4e80e`, publicado.
3. El tiempo mínimo por pregunta por defecto pasó de 10 a 60 s (`POR_DEFECTO` y formulario). Las evaluaciones existentes no cambian. También en `4a4e80e`.
4. El docente corrigió el diseño: un cuadro por estudiante, blanco sin entrar, verde conectado, rojo si salió y verde con ✓ al entregar. Nuevo `server/presencia.js` (en memoria, umbral de 15 s), enganchado en `conIntento`, `/entrar`, `/pausar` y `/salir`. La API de proyección devuelve `estudiantes` con `estado`.
5. El docente reportó como bug grave el botón "Pausar y salir" (pausaba a todo el grupo). La 032 lo quita junto con `POST /api/examen/pausar` y `pausarIntentoComoEstudiante`.
6. Verificado con capturas de Chromium headless (40 convocados, los cuatro estados) a 1920×1080 y 1024×768.

## Estado

- Tests: 451/451, lint de 95 archivos limpio.
- Instalador: compilado y probado en Windows (runner), publicado como 1.0.0.
- Hay cambios sin commitear que **no son de esta sesión** y no se tocaron: borrados de `spec_template/`, que ya estaban al empezar, y en `.opencode/skills/` dos skills renombradas a `*-opentest`, que aparecieron durante la sesión. Preguntar al usuario antes de commitearlos o restaurarlos.

## Siguiente tarea

- Para publicar una versión nueva: subir `version` en `package.json`, commit, `git tag vX.Y.Z && git push origin vX.Y.Z`. El workflow hace el resto.
- Aparte de eso, nada obligatorio; ver `roadmap.md → Backlog / ideas`.

## Bloqueos / decisiones pendientes

- Ninguno. Cada versión suma unos 50 MB al historial de git por la copia commiteada (decisión del usuario, ver bitácora 15/09/2026).
