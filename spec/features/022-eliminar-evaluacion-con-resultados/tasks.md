# 022 · Tareas

## Esquema

- [x] Agregar paso v4 en `server/migraciones.js` con
      `anadirColumna(db, 'sesiones', 'descargado_en', 'TEXT')`.
- [x] Documentar `descargado_en TEXT NULL` en `server/schema.sql` con
      un comentario que explique su significado.

## Servicio

- [x] En `server/services/sesiones.js`, `borrarSesion`: cambiar el guard
      a `intentos > 0 && !sesion.descargado_en` con el mensaje nuevo en
      español.
- [x] Actualizar el comentario del header de `borrarSesion`.
- [x] `listarSesiones` no cambia: `descargado_en` viaja en `s.*`.

## API

- [x] En `server/routes/docente.js`, dentro del handler
      `GET /api/docente/sesiones/:id/export/:tipo`, escribir
      `descargado_en` con la hora actual si viene nulo, justo después
      de que `armarExportacion` retorne sin lanzar.
- [x] Tests en `server/services/sesiones.test.js`:
      - Actualizar el viejo "sesión con intentos no se borra" para
        reflejar el nuevo mensaje.
      - Sesión cerrada con intentos y `descargado_en` poblado se borra.
      - El borrado cascadea a `intentos`/`intento_preguntas`/
        `respuestas`.
      - Sesión cerrada con cero intentos se borra.
- [x] Tests en `server/routes/docente.sesiones.test.js`:
      - Descargar escribe `descargado_en` la primera vez, lo deja
      igual la segunda.
      - DELETE con `descargado_en` nulo devuelve 409.
      - DELETE con `descargado_en` poblado devuelve 200.
- [x] Tests en `server/migraciones.test.js`:
      - Base con v3 aplica v4 al arrancar.
      - Base nueva aplica v1→v4 de un tirón y la columna queda.

## Frontend

- [x] En `public/docente/sesiones.js`, dentro de `acciones(sesion)`,
      agregar botón "Borrar" en la rama `cerrada` cuando
      `sesion.intentos > 0`. Disabled con `title` mientras
      `sesion.descargado_en` sea nulo. Habilitado y con `confirm()`
      nuevo cuando esté poblado.
- [x] Después del borrado exitoso, llamar a `recargar()` (igual que
      en la rama `borrador`).

## Cierre

- [x] `npm test` — los nuevos y los anteriores en verde.
- [x] `npm run lint` — sin errores.
- [x] Mover la 022 a **"Hecho ✅"** en `spec/constitution/roadmap.md`.
- [x] Actualizar la sección **"Dónde estamos"** de `AGENTS.md`.
- [x] Sobrescribir `RESTART.md` y agregar entrada a `spec/bitacora.md`
      antes de cerrar la sesión.
- [ ] Commit y push.