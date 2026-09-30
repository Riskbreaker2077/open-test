# 051 — Plan

- `server/services/calificacion.js`: `NOTA_MAXIMA = 5` y `notaDe(puntaje, total)`
  (regla de tres, redondeo a 1 decimal, tope en `NOTA_MAXIMA`); `armarResultado`
  añade `nota` en las tres salidas (anulado, `solo_puntaje`, `completo`).
- `public/estudiante/resultado-logica.js`: `formatearNota(nota)` con
  `toLocaleString('es-CO')`, un decimal.
- `resultado.html`/`.css`/`.js`: línea "Tu nota" bajo el puntaje.
- Tests: `calificacion.test.js` y `resultado-logica.test.js`.
Sin migración, sin dependencias, sin cambio de contratos.
