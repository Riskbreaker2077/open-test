# 008 · Panel del docente — Tareas

- [ ] Implementar `server/services/monitoreo.js` (`estadoDeSesion` con `LEFT JOIN` y contadores).
- [ ] Añadir los índices `respuestas(intento_pregunta_id)` e `intentos(sesion_id)` a `server/schema.sql`.
- [ ] Implementar `forzarEntrega` reutilizando la ruta de entrega y calificación del estudiante.
- [ ] Implementar `cerrarSesion` transaccional: entrega y califica todos los intentos vivos.
- [ ] Añadir las tres rutas de monitoreo, entrega forzada y cierre a `server/routes/docente.js`.
- [ ] Construir `public/docente/monitoreo.html` y `monitoreo.js` con la tabla y los contadores.
- [ ] Mostrar la URL de intranet destacada en el panel.
- [ ] Implementar el sondeo cada 5 s con pausa por `visibilitychange`.
- [ ] Implementar las confirmaciones de forzar entrega y de cierre, indicando a cuántos afecta.
- [ ] Test: `estadoDeSesion` refleja correctamente `sin entrar`, `presentando` y `entregado`.
- [ ] Test: cerrar la sesión entrega y califica a todos los vivos con motivo `forzada_docente`.
- [ ] Test: tras cerrar, entrar o responder se rechaza.
- [ ] Prueba de carga ligera: 40 intentos simulados, el endpoint responde bajo 200 ms.
- [ ] Validar contra los criterios de aceptación de `spec.md`.
- [ ] Mover la feature a "Hecho" en `../../constitution/roadmap.md`.
