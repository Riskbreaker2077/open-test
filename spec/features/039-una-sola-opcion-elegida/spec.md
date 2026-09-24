# 039 · Una sola opción con aspecto de elegida

**Estado:** implementado ✅ _(pendiente de verificación en tablet real)_

## Qué hace

En el examen del estudiante parecía que había **dos opciones marcadas**. En el servidor y en el DOM siempre hubo una sola: el estilo de "pasar el dedo o el ratón por encima" (`:hover`, y también `:focus-visible`) era idéntico al de `.opcion--elegida`. En las tablets el hover se queda pegado donde fue el último toque o el último arrastre de scroll, así que una opción no elegida se veía igual que la elegida.

Ahora:
- La opción elegida tiene una marca inequívoca: fondo dorado, borde reforzado, letra en círculo dorado y un ✓.
- El resaltado por encima existe solo en equipos con ratón (`@media (hover: hover) and (pointer: fine)`) y es distinto: solo un borde azul, sin fondo.
- El foco con teclado conserva el contorno global, sin fondo dorado.

## Por qué

El estudiante no sabe cuál de las dos quedó guardada, y eso le hace dudar de una respuesta que el sistema sí registró bien.

## Criterios de aceptación

- [ ] En una pantalla táctil, tocar varias opciones seguidas y hacer scroll arrastrando sobre otras deja **una sola** opción con aspecto de elegida. _(Pendiente de tablet real: la causa se eliminó en CSS, pero el hover pegado solo se reproduce en hardware táctil.)_
- [x] La opción elegida se distingue sin depender solo del color: lleva ✓ además del fondo dorado. _(captura en Chrome sin cabeza)_
- [ ] Con ratón, pasar por encima de una opción la resalta con un estilo visiblemente distinto del de elegida. _(Revisado en el CSS —solo borde azul, sin fondo— pero no observado en pantalla.)_
- [x] La vista previa del docente y el resultado de nivel completo siguen mostrando "Correcta" sin chocar con la marca de elegida: si la elegida es la correcta, prevalece el verde y no se pinta el ✓. _(captura)_

> Nota: esta feature nació en la misma sesión que un arreglo del tiempo mínimo al volver a una pregunta. Ese arreglo se descartó al integrar, porque la [037](../037-sin-espera-al-volver/spec.md) ya lo había resuelto con la misma regla.
