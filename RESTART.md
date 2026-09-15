# Restart

## Última actualización y rama activa

- 15/09/2026 — `main`. Se implementó la **031 · Asistencia en la pantalla de proyección** (sin commitear).

## Feature/tarea en curso

- Ninguna. La 031 quedó implementada; falta la verificación física en el proyector del aula.

## Qué se hizo en esta sesión

1. El docente preguntó si la proyección podía mostrar quién está conectado y quién falta. Se le explicó que `mission.md` y la 012 lo prohibían; entre tres opciones eligió la **lista completa con nombres durante toda la prueba**.
2. Se corrigió la constitución primero (`mission.md`) y se anotó la revisión en la spec de la 012.
3. `GET /api/docente/proyeccion/:id` reutiliza `estadoDeSesion` y devuelve `asistencia.faltan` / `asistencia.conectados` con solo `nombre`, `curso` y `entregado`. Test de proyección actualizado (orden, no convocados, sin códigos ni puntajes).
4. Aparte, el tiempo mínimo por pregunta por defecto pasó de 10 a 60 s (`POR_DEFECTO` y formulario). Las evaluaciones existentes no cambian.
5. La pantalla gana una tercera columna (o una fila propia en 4:3) con las dos listas; la letra se ajusta sola para caber sin desplazamiento. Verificado con capturas de Chromium headless a 1920×1080 y 1024×768 con 40 convocados.

## Estado

- Tests: 446/446, lint de 93 archivos limpio.
- La 031 está sin commitear, junto con los cambios ajenos de abajo.
- Instalador: compilado y probado en Windows (runner), publicado como 1.0.0.
- Hay cambios sin commitear que **no son de esta sesión** y no se tocaron: borrados de `spec_template/`, que ya estaban al empezar, y en `.opencode/skills/` dos skills renombradas a `*-opentest`, que aparecieron durante la sesión. Preguntar al usuario antes de commitearlos o restaurarlos.

## Siguiente tarea

- Para publicar una versión nueva: subir `version` en `package.json`, commit, `git tag vX.Y.Z && git push origin vX.Y.Z`. El workflow hace el resto.
- Aparte de eso, nada obligatorio; ver `roadmap.md → Backlog / ideas`.

## Bloqueos / decisiones pendientes

- Ninguno. Cada versión suma unos 50 MB al historial de git por la copia commiteada (decisión del usuario, ver bitácora 15/09/2026).
