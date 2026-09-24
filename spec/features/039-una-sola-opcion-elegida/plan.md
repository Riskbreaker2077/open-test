# 039 · Una sola opción con aspecto de elegida — Plan

_Cómo se implementa lo descrito en `spec.md`. Debe respetar la `constitution/`._

Solo CSS, en `public/shared/base.css` (lo comparten el examen, la vista previa del docente y el resultado):

- `.opcion--elegida`: borde dorado con `inset` extra, fondo `--dorado-100`, `.opcion__letra` con fondo `--dorado-500` y texto `--azul-950`, y un ✓ con `::after` (`margin-left: auto`). En `.opcion--banco` (emparejamiento, en columna) el ✓ va en posición absoluta arriba a la derecha.
- Hover solo dentro de `@media (hover: hover) and (pointer: fine)`, con `border-color: var(--azul-800)` y sin fondo.
- `.opcion--correcta.opcion--elegida`: prevalece el verde y se quita el ✓, para no chocar con la marca "Correcta".

Sin JS, sin API, sin tests automatizables: verificación visual.
