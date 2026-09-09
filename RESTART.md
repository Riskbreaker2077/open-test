# Restart

## Última actualización y rama activa

- 09/09/2026 — `main`, **limpio y pusheado** hasta `edec510` (026) + commit de la 027 pendiente al cerrar la sesión (ver Estado).

## Feature/tarea en curso

- **027 · Recuperación de la contraseña del docente — IMPLEMENTADA.** `OpenTest.exe --recuperar-contrasena` (y `npm start -- --recuperar-contrasena`) abre un diálogo de consola en español: pide la contraseña nueva dos veces, con asterisco por carácter en TTY real y lectura sin eco en tuberías; valida la longitud con la misma regla de la 011; reutiliza `establecerContrasena` (sal nueva, transacción sobre `config`). No toca datos ni la interfaz web. Maneja base inexistente (no la crea), base bloqueada (`SQLITE_BUSY` → "cierra OpenTest", código 1) y cancelación (`Ctrl+C`/EOF → código 1, sin escribir). 426 tests en verde (412 + 14 nuevos en `server/recuperacion.test.js`), lint limpio (92 archivos). Verificado end-to-end que el modo no arranca el servidor y que un flujo feliz restablece la contraseña. Pendiente solo la verificación física (máscara en terminal Windows real).

## Qué se hizo en esta sesión

1. **Cierre de la 026**: commiteada y pusheada en `edec510` (la nota anterior de que 020 + postject estaban sin commitear era incorrecta: ya estaban en `a64331d` y `8a061d7`).
2. **027 implementada de punta a punta** (spec SDD en `spec/features/027-recuperar-contrasena/`):
   - `server/recuperacion.js`: `esModoRecuperacion` (filtra argv por guión inicial — necesario porque el SEA pone el parámetro en `argv[1]` y `npm start` en `argv[2]`), `restablecerContrasena` (función pura testeable) y `recuperarContrasena` (flujo con `entrada`/`salida`/`rutaBd`/`abrir` inyectables).
   - `server/index.js`: detección del modo antes de abrir la base y calcular puertos; sin el parámetro el arranque es idéntico.
   - `GUIA-DOCENTE.md → Olvidé la contraseña`: reescrita con el procedimiento paso a paso (PowerShell y acceso directo).
   - Criterio pendiente de la 011 marcado y apuntando a la 027.
   - Bugs encontrados y corregidos en el camino: lector no-TTY que perdía el resto de un trozo tras el primer `\n` y el evento `end` (creado `crearLector` con búfer compartido); alias de guión simple mal construido; `argv.slice(2)` que rompía el caso SEA.

## Estado

- Git: 026 pusheada; **la 027 queda sin commitear al momento de escribir esto** (commitear y pushear al cerrar la sesión).
- Servidor: no probado en un navegador real; el diálogo de recuperación no probado en una terminal Windows real (sin TTY aquí).

## Siguiente tarea

1. **Validación física en equipo destino** (todo lo de `roadmap.md → Siguiente`, incluido el diálogo de la 027 con máscara visible).

## Bloqueos / decisiones pendientes

- Sin bloqueos técnicos. Es la última feature del roadmap: queda la sesión de validación física.
