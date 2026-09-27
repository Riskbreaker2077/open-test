# Restart

## Última actualización y rama activa

- 27/09/2026 — `main`. Última versión publicada: **1.4.0**. La 041 está en `main` sin tag de versión.

## Feature/tarea en curso

- Ninguna. 041 implementada; quedan sus verificaciones y las de 039/040 en tablet real.

## Qué se hizo en esta sesión

1. El usuario pidió dos cambios: que el estudiante que espera el inicio de una prueba pueda devolverse, y que el tiempo mínimo por pregunta por defecto sea 45 s.
2. 041: botón **Volver al inicio** en la espera del portal, en la lista de evaluaciones y en los demás mensajes (`public/index.html`, `public/portal.js`). Reutiliza `POST /api/examen/salir` de la 033; el servidor no cambió. El intento no se borra: el cuadro del tablero queda rojo y el mismo código lo reanuda.
3. `POR_DEFECTO.segundos_minimos_pregunta` y el formulario de sesiones: 60 → 45 s. `tech-stack.md` y el criterio de la 004 al día.

## Estado

- `npm test`: 479 en verde. `npm run lint`: 97 archivos, limpio.
- Recorrido en Chrome sin cabeza (DevTools) contra un servidor en memoria: espera → Volver → paso del código vacío y con foco; recargar ya no regresa a la espera; otro código entra en la misma tablet.

## Siguiente tarea

1. Si el usuario lo pide, publicar una versión (subir `package.json` y `git tag vX.Y.Z`).
2. En tablet real: 039 (una sola opción marcada), 040 (puntos y pergamino) y 041 (Volver al inicio desde la espera).

## Bloqueos / decisiones pendientes

- "¡El/La mejor!" se dejó tal cual lo escribió el usuario; el sistema no conoce el género del estudiante.
