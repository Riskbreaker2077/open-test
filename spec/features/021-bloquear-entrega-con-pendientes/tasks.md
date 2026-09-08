# 021 · Tareas

## Servicio

- [x] En `server/services/examen.js`, dentro de `entregarIntento`, añadir
      una guarda que rechace con 409 si `pendientes > 0` y el motivo es
      `'manual'` o `'ultima_pregunta'`. Usar `estadoDelExamen` para
      calcular `respondidas` (ya importado en el archivo).
- [x] Tests en `server/services/examen.test.js`:
      - Reescribir el test "entrega manual y desde la última pregunta son
        idempotentes" en cuatro: rechazo manual con pendientes, rechazo
        desde la última con pendientes, manual con todas respondidas
        cierra, desde la última con todas respondidas cierra.
      - Añadir test de `tiempo` con pendientes (debe cerrar).
      - Añadir test de `forzada_docente` con pendientes (debe cerrar).

## API

- [x] `POST /api/examen/entregar` en `server/routes/examen.js` no
      cambia: la regla vive en el servicio y queda protegida para
      cualquier llamador futuro.
- [x] Test integral en `server/routes/examen.presentacion.test.js`:
      "entregar manualmente con pendientes devuelve 409 y no cierra el
      intento".

## Frontend

- [x] Borrar el `<button id="terminar">` en `public/estudiante/examen.html`.
- [x] Borrar la regla `.terminar` en `public/estudiante/examen.css`.
- [x] En `public/estudiante/examen.js`:
      - Quitar `terminar` del diccionario `elementos`.
      - Quitar la línea `elementos.terminar.disabled = ocupada;`.
      - Quitar el listener de `#terminar`.
      - Reescribir `confirmarEntrega` para pintar el error del servidor
        en `#error` cuando la entrega es rechazada, sin redirigir.
      - Quitar la rama de `window.confirm` "¿entregar de todas formas?"
        en la última pregunta: la regla vive en el servidor.

## Cierre

- [x] `npm test` — los nuevos y los 345 anteriores en verde.
- [x] `npm run lint` — sin errores.
- [x] Mover la 021 a **"Hecho ✅"** en `spec/constitution/roadmap.md` y
      actualizar la fila 65 de la matriz de trazabilidad.
- [x] Actualizar la sección **"Dónde estamos"** de `AGENTS.md`.
- [x] Sobrescribir `RESTART.md` y agregar entrada a `spec/bitacora.md`
      antes de cerrar la sesión.
- [ ] Commit y push.