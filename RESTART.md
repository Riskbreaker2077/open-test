# Restart

## Última actualización y rama activa

- 28/09/2026 — rama `claude/open-test-cancel-exam-59vutp` (sin fusionar a `main`; sin versión nueva publicada).

## Feature/tarea en curso

- Ninguna. 042 implementada; queda verla en el proyector.

## Qué se hizo en esta sesión

1. 042: anular desde la proyección pasa de doble clic a **triple clic** sobre el nombre, con un cuadro flotante (`<dialog>`) en vez de `window.confirm`. Solo cliente (`public/proyeccion/`). Exportación intacta, `formato_version: 3`.
2. Se detectó que el portal de estudiantes rechazaba ZIPs con anulados; se corrige en el portal (feature 029 allá), no aquí.

## Estado

- `npm test`: 486 en verde. `npm run lint`: 99 archivos, limpio.
- Recorrido en Chromium sin cabeza: doble clic no abre nada; triple clic abre el cuadro; Esc cancela; confirmar anula y el cuadro se pone negro; triple clic sobre el anulado ofrece devolver la prueba; sobre quien no ha entrado, avisa.

## Siguiente tarea

1. Fusionar a `main` y publicar versión (1.4.2) si el usuario lo aprueba.
2. En el aula: legibilidad del cuadro flotante en el proyector; 039, 040 y 041 en tablet real.

## Bloqueos / decisiones pendientes

- "¡El/La mejor!" se dejó tal cual lo escribió el usuario; el sistema no conoce el género del estudiante.
