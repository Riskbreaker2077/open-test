# 024 · Tareas

## Servicio

- [x] Agregar `pausarIntentoComoEstudiante(db, intento, ahora?)` a
      `server/services/examen.js`: pausa si la sesión está en
      `en_curso`, no-op si está en `pausada`, 409 en cualquier otro
      estado. Devuelve la sesión actualizada.
- [x] Tests en `server/services/examen.test.js`:
      - Pausa cuando la sesión está en `en_curso` y deja el intento
        sin entregar.
      - Es idempotente cuando la sesión ya está pausada.

## API

- [x] Nueva ruta `POST /api/examen/pausar` en
      `server/routes/examen.js`, detrás de `conIntento(db)`. Pausa y
      siempre limpia la cookie, incluso si la pausa falla.
- [x] Tests integrales en
      `server/routes/examen.presentacion.test.js`:
      - 200 + cookie limpia cuando la sesión está en curso.
      - 200 idempotente cuando se llama dos veces seguidas.
      - 401 sin cookie (mismo patrón que las otras rutas nuevas).

## Frontend

- [x] En `public/estudiante/examen.html`, reemplazar el `<button
      id="terminar">` que ya no existe (la 021 lo borró) por
      `<button class="terminar" id="pausar-salir" type="button">Pausar
      y salir</button>` en el mismo lugar.
- [x] En `public/estudiante/examen.js`:
      - Agregar `pausarSalir` al diccionario `elementos`.
      - Agregar `elementos.pausarSalir.disabled = ocupada;` en
        `actualizarBloqueo`.
      - Agregar función `pausarYSalir()` con `window.confirm`,
        llamada a `/api/examen/pausar` y redirección a `/`.
      - Registrar el listener en el botón nuevo.

## Cierre

- [x] `npm test` — los nuevos y los anteriores en verde.
- [x] `npm run lint` — sin errores.
- [x] Mover la 024 a **"Hecho ✅"** en
      `spec/constitution/roadmap.md`.
- [x] Actualizar la sección **"Dónde estamos"** de `AGENTS.md`.
- [x] Sobrescribir `RESTART.md` y agregar entrada a
      `spec/bitacora.md` antes de cerrar la sesión.
- [ ] Commit y push.
