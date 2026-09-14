# 028 · Ingreso manual de preguntas — Tareas

_Checklist accionable derivada del `plan.md`. Tareas pequeñas y concretas; marca `[x]` al completarlas._

## Backend

- [x] `server/services/bancos.js`: `validarPreguntaManual`, `bloquesDeContexto`, `preguntaUnica`.
- [x] `server/services/bancos.js`: `crearBancoVacio`.
- [x] `server/services/bancos.js`: `agregarPreguntaManual`.
- [x] `server/services/bancos.js`: `actualizarPreguntaManual` (con los 409 de grupo y de uso en `intento_preguntas`).
- [x] `server/services/bancos.js`: `eliminarPregunta` (mismos 409).
- [x] `server/routes/docente.js`: `POST /bancos`, `POST /bancos/:id/preguntas`, `PUT /preguntas/:id`, `DELETE /preguntas/:id`.

## Frontend

- [x] `public/docente/bancos.html`: botón "+ Nuevo banco vacío" y `<dialog id="editor-pregunta">`.
- [x] `public/docente/bancos.js`: `crearBancoVacio`, `abrirEditorPregunta` (crear y editar), subida de imagen dentro del modal, submit, `accionesDePregunta` (Editar/Eliminar) en preguntas sueltas del detalle.

## Pruebas

- [x] `server/services/bancos.test.js`: casos de `crearBancoVacio`, `agregarPreguntaManual` (feliz, enunciado vacío, opción vacía, 0 o 2+ correctas), `actualizarPreguntaManual` (feliz, 409 por grupo, 409 por uso en intento), `eliminarPregunta` (feliz, mismos 409).
- [x] `server/routes/docente.bancos.test.js`: integración de las cuatro rutas nuevas, incluida la exigencia de contraseña (401 sin cookie) y que una pregunta creada a mano se vea en `GET /bancos/:id` igual que una importada.

## Documentación

- [x] `GUIA-DOCENTE.md`: sección nueva o ampliada explicando "Nuevo banco vacío" y "Agregar pregunta" como alternativa al ZIP.
- [x] Validar contra los criterios de aceptación de `spec.md`.
- [x] Mover la feature a "Hecho" en `../../constitution/roadmap.md`.
- [x] Actualizar `AGENTS.md` ("Dónde estamos") y `RESTART.md`.
