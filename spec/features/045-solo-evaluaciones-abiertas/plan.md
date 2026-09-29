# 045 · El portal solo muestra evaluaciones abiertas — Plan

_Cómo se implementa lo descrito en `spec.md`. Debe respetar la `constitution/`._

**Servidor.**

- `sesionesDisponiblesPara` (`server/services/sesiones.js`): el `OR EXISTS (… entregado_en IS NOT NULL)` pasa a ser `AND NOT EXISTS (…)`. Así solo quedan `ESTADOS_VISIBLES` que no entregó.
- `iniciarOReanudarIntento` (`server/services/intentos.js`): si el intento existente tiene `entregado_en`, se lanza un error 409 "Ya entregaste esta prueba." antes de renovar el token. La anulación (038) escribe `entregado_en`, así que queda cubierta.
- Sin migración ni cambios de contrato.

**Portal (`public/portal.js`).** En `iniciar()`, si la cookie apunta a un intento entregado, se llama a `volverAlInicio()` (`POST /api/examen/salir`) en vez de pintar el resultado. `renderEstado` conserva su rama `entregado` para el sondeo de la espera: si el docente cierra mientras el estudiante espera, la entrega forzada lo lleva a su resultado en ese momento.

**Tests.** Se reemplaza "tras entregar y cerrar puede volver a entrar…" en `examen.login.test.js` y "una sesión cerrada solo permanece para quien ya entregó" en `sesiones.test.js` por los criterios nuevos.

**Specs.** Nota de revisión en 004 y 013.
