# Restart

## Última actualización y rama activa

- 29/09/2026 — `main` tiene la 1.5.0 publicada (043) y, sin versión todavía,
  la 044 (elegir la evaluación del portal de una lista) más la 045, la 046 y
  la 047 de esta sesión. Commits locales; **sin push ni tag**: falta que el
  usuario lo confirme.

## Feature/tarea en curso

- Ninguna. 045, 046 y 047 quedaron completas, con un commit por feature.

## Qué se hizo en esta sesión

1. `git pull --ff-only` trajo la 044 y el instalador 1.5.0 de `origin/main`.
2. **045 · El portal solo muestra evaluaciones abiertas.** El portal listaba
   y dejaba reabrir las evaluaciones cerradas que el estudiante ya había
   presentado, con su nota y su retroalimentación. `sesionesDisponiblesPara`
   pasó de `OR EXISTS` a `AND NOT EXISTS`, `iniciarOReanudarIntento` responde
   409 "Ya entregaste esta prueba." (también si la prueba está anulada), y
   `public/portal.js` descarta la cookie de un intento entregado. Así se
   cumple lo que `tech-stack.md:146` ya decía.
3. **046 · Papelera.** Migración **v8** (`sesiones.en_papelera_en`). Borrar
   una evaluación con intentos la deja en la papelera, solo si está cerrada
   (si no, 409). Sin intentos, se borra en el acto. `obtenerSesion`,
   `listarSesiones`, `listarEnvios`, las estadísticas, `intentoPorToken` y el
   portal ignoran lo que está en la papelera. La purga corre al arrancar y
   cada 24 h en `server/index.js`. Rutas `/api/docente/papelera`. La interfaz
   agrega la sección Papelera en Evaluaciones y la sugerencia **Mover a la
   papelera** en Enviar al portal. `GUIA-DOCENTE.md` quedó al día.
4. **047 · Panel de inicio.** Franja Ahora, pendientes y tres pasos, en
   `public/docente/inicio.js`. `panel.js` perdió el viejo `#resumen`.
   `/api/docente/estado` se amplió. Se revisaron capturas a 1280, 800 y
   390 px, sin desborde.
5. Los recorridos se hicieron con Chrome sin cabeza vía CDP y un servidor en
   memoria. Los scripts quedaron en el scratchpad de la sesión, fuera del
   repo.

## Siguiente tarea

1. El usuario decide si publica una versión (¿1.6.0?, porque trae la
   migración v8): `npm version`, commit, `git push`,
   `git tag vX.Y.Z && git push origin vX.Y.Z`.
2. En tablet real: la 045 (entregar → Volver al inicio → el código ya no
   muestra la prueba), más las pendientes 039–042.
3. En `portal-estudiantes`: sigue pendiente decidir si se fusiona la rama
   `feature/044-listar-evaluaciones-disponibles`.

## Bloqueos / decisiones pendientes

- Ninguno.
