# 041 · Volver desde la sala de espera y mínimo de 45 s — Plan

_Cómo se implementa lo descrito en `spec.md`. Debe respetar la `constitution/`._

**Volver.** Solo frontend, en `public/index.html` y `public/portal.js`:

- Un botón `boton--secundario` "Volver al inicio" en `#paso-mensaje` y otro en `#paso-elegir`.
- `volverAlInicio()`: `detenerSondeo()`, `POST /api/examen/salir` (ignora fallos de red, como en `resultado.js`), vacía y enfoca `#codigo`, limpia avisos y `mostrarPaso(pasoCodigo)`.
- El servidor no cambia: `salir` ya borra la cookie y llama a `marcarSalida`, y `iniciarOReanudarIntento` ya reanuda el intento existente.

**45 s.** `POR_DEFECTO.segundos_minimos_pregunta` en `server/services/sesiones.js` y el `value` del campo en `public/docente/sesiones.html`. La columna conserva `DEFAULT 10` (el servicio siempre escribe el valor explícito), así que no hay migración. Se actualizan `tech-stack.md` y el criterio de la 004.

Sin dependencias nuevas ni cambios de contrato.
