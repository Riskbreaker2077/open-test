# 040 · Resultado con puntos y pergamino — Tareas

_Checklist accionable derivada del `plan.md`. Marca `[x]` al completarlas._

## Especificación
- [x] `spec.md`, `plan.md`, `tasks.md`.
- [x] Nota en `007-calificacion-feedback/spec.md` remitiendo a esta feature.

## Implementación
- [x] `public/estudiante/resultado-logica.js` + tests.
- [x] `package.json`: `npm test` incluye `public/**/*.test.js`.
- [x] `resultado.html`: vistas resumen y pergamino.
- [x] `resultado.js`: rejilla, navegación por hash, pergamino, celebración.
- [x] `resultado.css`: puntos, pergamino, dorado, chispas, movimiento reducido.

- [x] Mensaje de felicitación al azar y estable por estudiante (`mensajeDeFelicitacion`) + tests.

## Verificación
- [x] Recorrido en navegador con `aciertos`, `completo`, `solo_puntaje` y puntaje perfecto. _(Chrome sin cabeza con un arnés que simula `/api/examen/resultado`: capturas a 820 px y 390 px, y clics por DevTools en punto → pergamino → Siguiente → Volver, atrás del navegador y entrada directa por `#pregunta-1`. Pendiente en tablet real.)_

## Cierre
- [x] `npm test` y `npm run lint` en verde.
- [x] Roadmap, AGENTS.md, RESTART.md, bitácora.
