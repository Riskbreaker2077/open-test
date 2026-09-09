# 027 · Tareas

## Especificación

- [x] Crear `spec/features/027-recuperar-contrasena/` con `spec.md`,
      `plan.md` y `tasks.md`.

## Backend

- [x] Crear `server/recuperacion.js` con `esModoRecuperacion`,
      `restablecerContrasena` y `recuperarContrasena` (streams y ruta de
      base inyectables).
- [x] Detección del parámetro en `server/index.js` antes de abrir la
      base y calcular puertos; sin el parámetro, arranque idéntico.
- [x] Manejo de base inexistente (no crearla) y base bloqueada
      (`SQLITE_BUSY`) con mensajes accionables.

## Tests

- [x] `server/recuperacion.test.js`: detección del parámetro, restablecimiento
      en base con contraseña, sal nueva, rechazos (confirmación, longitud,
      sin contraseña) y flujo de consola con streams falsos.
- [x] `npm test` en verde y `npm run lint` limpio.

## Documentación

- [x] `GUIA-DOCENTE.md`: reescribir "Olvidé la contraseña" con el
      procedimiento paso a paso (PowerShell y acceso directo).
- [x] `spec/features/011-autenticacion-docente/spec.md`: marcar el
      criterio de recuperación pendiente, apuntando a la 027.

## Cierre

- [x] Mover la 027 a "Hecho ✅" en `spec/constitution/roadmap.md`.
- [x] Actualizar "Dónde estamos" en `AGENTS.md`, `RESTART.md` y
      `spec/bitacora.md`.
- [x] Commit y push.

## Verificación física (equipo destino)

- [x] `OpenTest.exe --recuperar-contrasena` en Windows real: diálogo
      legible, escritura oculta, contraseña nueva aceptada al reabrir.
