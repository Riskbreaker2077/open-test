# 020 · Tareas

## Servicio

- [x] Extraer `validarEstudiante(datos)` en `server/services/estudiantes.js`, reutilizando `COLUMNAS` y `LIMITES` de `server/importers/estudiantes.js`.
- [x] Agregar `crearEstudiante(db, datos)` con errores tipados: `400` para validación, `409` para código duplicado.
- [x] Agregar `actualizarEstudiante(db, codigo, datos)`: `404` si no existe, `400` para validación, ignora `codigo` del body aunque venga.
- [x] Tests en `server/services/estudiantes.test.js`: caso feliz, duplicado, edición parcial, edición con código inventado, edición que ignora `codigo`.

## API

- [x] `POST /api/docente/estudiantes` en `server/routes/docente.js`: cuerpo con los cuatro campos, devuelve `{ok, estudiante}` o `{ok: false, errores}` con 400/409.
- [x] `PUT /api/docente/estudiantes/:codigo` en el mismo archivo: cuerpo con `nombres`, `apellidos`, `curso`; ignora `codigo` aunque venga en el body.
- [x] Tests de integración en `server/routes/docente.estudiantes.test.js`: crear y verificar en `GET`, duplicado (409), editar y verificar, editar con inválidos (400, no modifica), editar ignorando `codigo` del body, ambas rutas sin contraseña (401).

## Frontend

- [x] Botón **"+ Nuevo estudiante"** en `public/docente/estudiantes.html`, dentro de la tarjeta "Lista cargada", antes del filtro por curso.
- [x] `<dialog id="editor">` al final del HTML con el formulario (cuatro `.campo`, bloque de errores, Guardar/Cancelar).
- [x] Estilos mínimos del modal local al archivo (si hace falta) — sin tocar `base.css`.
- [x] En `public/docente/estudiantes.js`: `abrirEditor(estudiante)` con dos modos (crear / editar), manejo del submit con `api`, pintado de errores dentro del modal, foco inicial correcto.
- [x] `botonEditar(estudiante)` en cada fila; acciones quedan **Editar** + **Eliminar** lado a lado.
- [x] Al guardar con éxito, refrescar la lista sin recargar la página.

## Cierre

- [x] `npm test` — los nuevos y los 329 anteriores en verde.
- [x] `npm run lint` — sin errores.
- [x] Mover la 020 a **"Hecho ✅"** en `spec/constitution/roadmap.md`.
- [x] Actualizar la sección **"Dónde estamos"** de `AGENTS.md`.
- [x] Sobrescribir `RESTART.md` y agregar entrada a `spec/bitacora.md` antes de cerrar la sesión.
- [ ] Commit y push.
