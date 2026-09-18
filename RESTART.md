# Restart

## Última actualización y rama activa

- 18/09/2026 — `main`. Commiteadas y etiquetadas como **1.3.0**: **037** (sin espera al volver) y **038** (anular la prueba desde la proyección). Falta empujar a `origin`.

## Feature/tarea en curso

- Ninguna. 037 y 038 implementadas, con 467 tests en verde y lint limpio. Quedan sus verificaciones físicas.

## Qué se hizo en esta sesión

1. Se puso al día la copia local, que estaba 37 commits atrás (iba por la feature 005).
2. 037: el tiempo mínimo por pregunta solo se cobra la primera vez que se despacha cada pantalla; volver atrás ya no hace esperar. Sin migración: "despachada" se lee de la fila en `respuestas`.
3. 038: doble clic sobre un cuadro del tablero de la proyección para anular la prueba (0 puntos, sin retroalimentación en ningún nivel, aviso en la tablet, cuadro negro) y otro doble clic para deshacerlo. Migración **v6** (`intentos.anulado_en` y motivo `anulada_docente`, rehaciendo la tabla) y columna `anulado` en el export, sin subir de `formato_version: 3`.

## Estado

- `npm test`: 467 en verde. `npm run lint`: 95 archivos, limpio.
- Recorrido completo probado contra el servidor real: anular, ver el cuadro en negro, leer el resultado del estudiante y deshacer.
- Dos commits en `main` (037 y 038) y el tag `v1.3.0`, **todavía sin empujar**. Al hacer `git push origin main v1.3.0`, el workflow compila y publica `OpenTest-Setup.exe` 1.3.0 en Releases y lo commitea en `instalador/`.

## Siguiente tarea

1. `git push origin main v1.3.0` para publicar el instalador 1.3.0.
2. Verificación física de la 037 y la 038 en el aula: volver atrás en una tablet sin cuenta atrás; anular desde el proyector y ver la tablet del estudiante (aviso, cero, sin retroalimentación) y el cuadro en negro.

## Bloqueos / decisiones pendientes

- Ninguno. Decidido con el usuario: la nota del anulado se representa como 0 puntos / 0 % con marca `anulado` (no se añade escala 1–5), y la anulación se puede deshacer.
