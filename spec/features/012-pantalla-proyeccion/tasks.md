# 012 · Pantalla de proyección — Tareas

- [x] Implementar `server/qr.js` (`matrizQr`, `svgQr`) sin dependencias.
- [x] Test del QR: decodificar la salida devuelve el texto original.
- [x] Añadir `comenzada_en`, `pausada_en` y `segundos_pausados` a `sesiones` en `server/schema.sql`. _(ya existía por la revisión arquitectónica; verificado en esquema y migraciones.)_
- [x] Ampliar el `CHECK` de `estado` con `en_curso` y `pausada`. _(ya existía por la revisión arquitectónica; cubierto por tests.)_
- [x] Implementar `comenzarSesion`, `pausarSesion`, `reanudarSesion` y `tiempoRestante`.
- [x] Tests de `tiempoRestante`: sin comenzar, en curso, pausada, vencida.
- [x] Tests de las transiciones de estado válidas e inválidas.
- [x] Implementar `GET /api/docente/proyeccion/:sesionId` y `GET /api/docente/qr.svg`.
- [x] Test: la respuesta de proyección no contiene nombres, puntajes ni preguntas.
- [x] Test: sin sesión de docente, la proyección responde 401.
- [x] Construir `public/proyeccion/` (HTML, CSS y JS) a pantalla completa.
- [x] Implementar el reloj interpolado con resincronización al volver a estar visible.
- [x] Implementar los tres controles con la confirmación de cierre.
- [x] Implementar el cierre automático al llegar el reloj a cero.
- [x] Probar la legibilidad a 1024×768 y 1920×1080. _(sin scroll en ambas; reloj de 205 px y dirección de 36 px a 1920×1080.)_
- [ ] Probar el escaneo del QR con una tablet real.
- [x] Validar contra los criterios de aceptación de `spec.md`. _(13 de 15 verificados; las dos pruebas físicas se difieren a la sesión final en el equipo destino.)_
- [x] Mover la feature a "Hecho" en `../../constitution/roadmap.md`. _(cerrada dentro de su alcance; verificaciones físicas diferidas y visibles.)_
