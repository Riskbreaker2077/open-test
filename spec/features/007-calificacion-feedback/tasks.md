# 007 · Calificación y retroalimentación — Tareas

- [x] Implementar `calificarIntento` en `server/services/calificacion.js`.
- [x] Tests de cálculo: todo bien, todo mal, mezcla, todas saltadas, entrega temprana con preguntas sin llegar.
- [x] Test: el porcentaje se calcula sobre el total asignado, no sobre lo respondido.
- [x] Implementar `armarResultado(intento, preguntas, nivel)` con el recorte por nivel.
- [x] Test por nivel (`solo_puntaje`, `aciertos`, `completo`): la correcta solo aparece en `completo`.
- [x] Integrar la calificación en todas las entregas: manual, última pregunta, tiempo y cierre del docente.
- [x] Implementar `GET /api/examen/resultado`.
- [x] Test de idempotencia: consultar el resultado dos veces no altera `aciertos` ni `puntaje`.
- [x] Construir `public/estudiante/resultado.html` y `resultado.js` con los tres niveles.
- [x] Distinguir visualmente acertada / fallada / saltada / sin llegar.
- [x] Redirigir al resultado a quien entra con un intento ya entregado (ajuste de la feature 004).
- [x] Añadir la advertencia en el panel al elegir el nivel `completo`.
- [x] Permitir cambiar solo el nivel de feedback de una sesión cerrada y probar que el resultado usa el nuevo nivel.
- [x] Validar los 11 criterios automatizables; legibilidad táctil pendiente para el equipo destino.
- [x] Mover la feature a "Hecho" en `../../constitution/roadmap.md`.
