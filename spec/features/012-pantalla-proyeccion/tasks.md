# 012 · Pantalla de proyección — Tareas

- [ ] Implementar `server/qr.js` (`matrizQr`, `svgQr`) sin dependencias.
- [ ] Test del QR: decodificar la salida devuelve el texto original.
- [ ] Añadir `comenzada_en`, `pausada_en` y `segundos_pausados` a `sesiones` en `server/schema.sql`.
- [ ] Ampliar el `CHECK` de `estado` con `en_curso` y `pausada`.
- [ ] Implementar `comenzarSesion`, `pausarSesion`, `reanudarSesion` y `tiempoRestante`.
- [ ] Tests de `tiempoRestante`: sin comenzar, en curso, pausada, vencida.
- [ ] Tests de las transiciones de estado válidas e inválidas.
- [ ] Implementar `GET /api/docente/proyeccion/:sesionId` y `GET /api/docente/qr.svg`.
- [ ] Test: la respuesta de proyección no contiene nombres, puntajes ni preguntas.
- [ ] Test: sin sesión de docente, la proyección responde 401.
- [ ] Construir `public/proyeccion/` (HTML, CSS y JS) a pantalla completa.
- [ ] Implementar el reloj interpolado con resincronización al volver a estar visible.
- [ ] Implementar los tres controles con la confirmación de cierre.
- [ ] Implementar el cierre automático al llegar el reloj a cero.
- [ ] Probar la legibilidad a 1024×768 y 1920×1080.
- [ ] Probar el escaneo del QR con una tablet real.
- [ ] Validar contra los criterios de aceptación de `spec.md`.
- [ ] Mover la feature a "Hecho" en `../../constitution/roadmap.md`.
