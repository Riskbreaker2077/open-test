# 008 · Panel del docente — Tareas

- [x] Implementar `server/services/monitoreo.js` (`estadoDeSesion` con `LEFT JOIN` y contadores).
- [x] Verificar los índices existentes `respuestas(intento_pregunta_id)` e `intentos(sesion_id)` en `server/schema.sql`.
- [x] Implementar `forzarEntrega` reutilizando la ruta de entrega y calificación del estudiante.
- [x] Implementar `cerrarSesion` transaccional: entrega y califica todos los intentos vivos.
- [x] Añadir las tres rutas de monitoreo, entrega forzada y cierre a `server/routes/docente.js`.
- [x] Construir `public/docente/monitoreo.html` y `monitoreo.js` con la tabla y los contadores.
- [x] Mostrar la URL de intranet destacada en el panel.
- [x] Implementar el sondeo cada 5 s con pausa por `visibilitychange`.
- [x] Implementar las confirmaciones de forzar entrega y de cierre, indicando a cuántos afecta.
- [x] Test: `estadoDeSesion` refleja correctamente `sin entrar`, `presentando` y `entregado`.
- [x] Test: cerrar la sesión entrega y califica a todos los vivos con motivo `forzada_docente`.
- [x] Test: tras cerrar, entrar o responder se rechaza.
- [x] Prueba de carga ligera: 40 intentos simulados, el endpoint responde bajo 200 ms.
- [x] Validar contra los criterios de aceptación de `spec.md`.
- [x] Mover la feature a "Hecho" en `../../constitution/roadmap.md`.
