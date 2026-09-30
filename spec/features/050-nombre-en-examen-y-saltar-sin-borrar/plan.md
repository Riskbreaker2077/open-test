# 050 — Plan

Solo cliente (`public/estudiante/`):

- `examen.html`: `<span id="nombre-estudiante">` entre progreso y reloj.
- `examen.css`: la cabecera usa `justify-content: space-between` con el nombre
  como elemento central (`flex: 1`, centrado, `text-overflow: ellipsis`).
- `examen.js`: `actualizarEstado` guarda `estado.estudiante` en el header; el
  botón Saltar llama `avanzar(opcionElegida)` en pantallas de una pregunta.
  (En pantallas de grupo `guardar` ya usa `elegidasGrupo`, sin cambio.)

Sin dependencias, sin servidor. Pruebas: lógica de "qué se envía al saltar"
extraída a `public/estudiante/saltar-logica.js` con test (`node:test`).
