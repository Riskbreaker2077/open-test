# 005 · Motor de personalización — Tareas

- [ ] Implementar `server/services/prng.js` (hash de semilla + `mulberry32`).
- [ ] Test del PRNG: misma semilla → misma secuencia; semillas distintas → secuencias distintas.
- [ ] Implementar `barajar` (Fisher-Yates) y `muestrear` (barajado parcial) en `personalizacion.js`.
- [ ] Implementar `generarPrueba` con su validación de banco insuficiente.
- [ ] Test de determinismo: misma semilla produce resultado idéntico campo a campo.
- [ ] Test de integridad: sin preguntas repetidas, todas del banco, `orden_opciones` es permutación exacta.
- [ ] Test de dispersión: 100 semillas, ningún par idéntico, solapamiento medio cerca del teórico.
- [ ] Test de uniformidad: posición de la correcta entre 20% y 30% sobre 1000 preguntas.
- [ ] Tests de borde: banco de tamaño exacto funciona; banco corto lanza error claro.
- [ ] Test de rendimiento: generación bajo 50 ms con banco de 50.
- [ ] Implementar `materializarPrueba` transaccional e idempotente en `server/services/intentos.js`.
- [ ] Test de idempotencia: materializar dos veces no altera ninguna fila.
- [ ] Test de atomicidad: un fallo a mitad no deja filas parciales.
- [ ] Test de unicidad de semillas sobre 1000 intentos.
- [ ] Enganchar la materialización al alta de intento de la feature 004.
- [ ] Mostrar en el panel de sesiones el solapamiento esperado según el tamaño del banco.
- [ ] Validar contra los criterios de aceptación de `spec.md`.
- [ ] Mover la feature a "Hecho" en `../../constitution/roadmap.md`.
