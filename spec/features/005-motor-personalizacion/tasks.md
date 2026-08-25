# 005 · Motor de personalización — Tareas

- [x] Implementar `server/services/prng.js` (hash de semilla + `mulberry32`).
- [x] Test del PRNG: misma semilla → misma secuencia; semillas distintas → secuencias distintas.
- [x] Implementar `barajar` (Fisher-Yates) y `muestrear` (barajado parcial) en `personalizacion.js`.
- [x] Implementar `generarPrueba` con su validación de banco insuficiente.
- [x] Test de determinismo: misma semilla produce resultado idéntico campo a campo.
- [x] Test de integridad: sin preguntas repetidas, todas del banco, `orden_opciones` es permutación exacta.
- [x] Test de dispersión: 100 semillas, ningún par idéntico, solapamiento medio cerca del teórico.
- [x] Test de uniformidad: posición de la correcta entre 20% y 30% sobre 1000 preguntas.
- [x] Tests de borde: banco de tamaño exacto funciona; banco corto lanza error claro.
- [x] Test de rendimiento: generación bajo 50 ms con banco de 50.
- [x] Implementar `materializarPrueba` transaccional e idempotente en `server/services/intentos.js`.
- [x] Test de idempotencia: materializar dos veces no altera ninguna fila.
- [x] Test de atomicidad: un fallo a mitad no deja filas parciales.
- [x] Test de unicidad de semillas sobre 1000 intentos.
- [x] Enganchar la materialización al alta de intento de la feature 004.
- [x] Mostrar en el panel de sesiones el solapamiento esperado según el tamaño del banco.
- [x] Validar contra los criterios de aceptación de `spec.md`.
- [x] Mover la feature a "Hecho" en `../../constitution/roadmap.md`.
