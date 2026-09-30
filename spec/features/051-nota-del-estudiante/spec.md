# 051 · Nota del estudiante en el resultado — Spec

**Estado:** implementado ✅ (pendiente verificación en tablet)

## Por qué

Al entregar, el estudiante ve su puntaje ("14 / 20") y un porcentaje. El
docente quiere que vea también su **nota**, calculada con una regla de tres
sobre el número de preguntas de su prueba.

## Qué hace

- Nota = `puntaje / total × 5,0`, con un decimal (`14 / 20` → `3,5`;
  `20 / 20` → `5,0`; `0 / 20` → `0,0`). `total` es el número de preguntas de
  la prueba de ese estudiante, así que pruebas de distinto largo dan notas
  comparables. Se usa el mismo `puntaje` y `total` que ya alimentan el
  porcentaje, para que nota y porcentaje nunca se contradigan.
- La escala máxima (5,0) vive en una sola constante, `NOTA_MAXIMA`, en
  `server/services/calificacion.js`.
- `armarResultado` añade `nota` en todos los niveles de feedback. Una prueba
  anulada (038) lleva nota `0`.
- La pantalla de resultado muestra "Tu nota: 3,5" (coma decimal, `es-CO`) bajo
  el puntaje. Una prueba anulada muestra 0,0 en rojo, como el puntaje.
- La nota nunca pasa de `NOTA_MAXIMA`, aunque un `valor` de pregunta mayor a 1
  (026) empuje el puntaje por encima del total.

## Fuera de alcance

- La exportación de resultados (contratos v3) no cambia: no se añade columna.
- Sin nota mínima de 1,0: es regla de tres pura, como se pidió.

## Criterios de aceptación

- [x] `notaDe(14, 20)` = 3,5; `notaDe(20, 20)` = 5; `notaDe(0, 20)` = 0; total 0 → 0.
- [x] `obtenerResultado` devuelve `nota` en `solo_puntaje` y `completo`.
- [x] Prueba anulada → `nota: 0`.
- [x] La pantalla muestra la nota con coma decimal.
- [ ] Verificado en tablet real.
