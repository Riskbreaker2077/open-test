# 007 · Calificación y retroalimentación — Tareas

- [ ] Implementar `calificarIntento` en `server/services/calificacion.js`.
- [ ] Tests de cálculo: todo bien, todo mal, mezcla, todas saltadas, entrega temprana con preguntas sin llegar.
- [ ] Test: el porcentaje se calcula sobre el total asignado, no sobre lo respondido.
- [ ] Implementar `armarResultado(intento, preguntas, nivel)` con el recorte por nivel.
- [ ] Test por nivel (`solo_puntaje`, `aciertos`, `completo`): la correcta solo aparece en `completo`.
- [ ] Integrar la calificación en la transacción de `POST /api/examen/entregar`.
- [ ] Implementar `GET /api/examen/resultado`.
- [ ] Test de idempotencia: consultar el resultado dos veces no altera `aciertos` ni `puntaje`.
- [ ] Construir `public/estudiante/resultado.html` y `resultado.js` con los tres niveles.
- [ ] Distinguir visualmente acertada / fallada / saltada / sin llegar.
- [ ] Redirigir al resultado a quien entra con un intento ya entregado (ajuste de la feature 004).
- [ ] Añadir la advertencia en el panel al elegir el nivel `completo`.
- [ ] Validar contra los criterios de aceptación de `spec.md`.
- [ ] Mover la feature a "Hecho" en `../../constitution/roadmap.md`.
