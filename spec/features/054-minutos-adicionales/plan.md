# 054 · Minutos adicionales — Enfoque técnico

Respeta `tech-stack.md`: Node + Express + better-sqlite3, sin dependencias
nuevas. Todo el reloj vive en `server/services/sesiones.js`; la feature no
toca el contrato de exportación (`formato_version: 2`) ni la materialización
de pruebas (`intento_preguntas` queda intocada: una prueba revocada y
continuada es la misma que vio el estudiante).

## Reloj

Hoy: `restantes = duracion_minutos×60 + segundos_pausados − transcurridos`
(`calcularRestantes`). Con la feature:

```
restantes = duracion_minutos×60 + segundos_adicionales + segundos_pausados − transcurridos
```

`segundos_adicionales` es acumulativo (se puede otorgar varias veces). El
punto único de lectura es `calcularRestantes`; `tiempoRestante` y monitoreo
heredan el efecto sin cambios. Antes de `comenzada_en` no hay otorgamiento,
así el reloj virgen sigue mostrando la duración completa.

### Otorgamiento (`darMinutosAdicionales`)

```js
restantes_ahora = calcularRestantes(sesion, instante)
extra = minutos×60 + max(0, −restantes_ahora)
```

- `restantes_ahora > 0` (en curso / pausa con tiempo): `extra = N×60` →
  sube exactamente N minutos.
- `restantes_ahora ≤ 0` (venció, cerrada por tiempo): `extra = N×60 +
  |restantes|` → tras el UPDATE el reloj vale exactamente N×60. La fórmula es
  una sola para todos los casos y no necesita ramas por estado.

Todo en una transacción:

1. `UPDATE sesiones SET segundos_adicionales = segundos_adicionales + extra`
   y, si estaba `cerrada`, también `estado = 'en_curso'`, `pausada_en = NULL`.
2. Si reabrió: `UPDATE intentos SET entregado_en = NULL, motivo_entrega =
   NULL, aciertos = NULL, puntaje = NULL WHERE sesion_id = ? AND
   motivo_entrega IN ('tiempo','cierre_docente') AND entregado_en IS NOT NULL`.
3. `INSERT INTO minutos_otorgados (sesion_id, minutos, reabrio, otorgado_en)`.

Validaciones: sesión existente (404); estado `borrador` o `abierta` sin
`comenzada_en` → 409 («solo una evaluación comenzada»); `minutos` entero con
`1 ≤ minutos ≤ 1440` → 400 si no.

## Motivo `cierre_docente`

`motivo_entrega` tiene un CHECK de cuatro valores; SQLite no altera CHECKs,
así que se rehace la tabla `intentos` con la receta estándar (misma que la
migración 1 usó para `sesiones`) copiando todas las columnas. Con el motivo
nuevo, `cerrarSesion` distingue:

- vencimiento (`pausarSesion` sin tiempo, `tiempoRestante`): `tiempo`.
- cierre de sala del docente (default del endpoint `/cerrar`):
  `cierre_docente` (antes `forzada_docente`, que sigue reservado para la
  entrega individual desde monitoreo — eso es lo que evita resucitar a un
  estudiante entregado a propósito).

`forzarEntrega` individual no cambia.

## Corrección incluida: cerrar desde pausa

`cerrarSesion` desde `pausada` no acumulaba la pausa en `segundos_pausados`
(reanudar sí lo hace). El reloj quedaba corriendo durante la pausa y una
reapertura habría mostrado menos tiempo del congelado. Ahora el cierre desde
pausa suma `(ahora − pausada_en)` a `segundos_pausados` antes de borrar
`pausada_en`. Es el mismo invariante de `reanudarSesion`.

## Esquema

- `sesiones.segundos_adicionales INTEGER NOT NULL DEFAULT 0` (columna nueva;
  `listarSesiones` la trae gratis con `s.*`).
- Tabla `minutos_otorgados (id, sesion_id → sesiones ON DELETE CASCADE,
  minutos > 0, reabrio, otorgado_en)` — auditoría, no se consulta para el
  reloj.
- CHECK de `intentos.motivo_entrega` ampliada con `'cierre_docente'`.
- `schema.sql` queda actualizado para bases nuevas; la **migración 4**
  (`server/migraciones.js`, misma lista idempotente de siempre) añade columna
  y tabla con `anadirColumna`/`IF NOT EXISTS` y rehace `intentos` solo si su
  SQL no trae el motivo nuevo. Bases viejas con cierres de sala guardados
  como `forzada_docente` no se reinterpreta retroactivamente: esos intentos
  no vuelven (documentado en la spec).

## Ruta y UI

- `POST /api/docente/sesiones/:id/minutos` con `{ minutos }` →
  `responder(res, ...)` como las transiciones vecinas; nace protegida bajo
  `/api/docente`.
- `public/docente/sesiones.js`: botón ⚙ (`boton--secundario boton--pequeno`)
  en las filas `en_curso`/`pausada`/`cerrada`; `window.prompt` con cantidad
  libre (mismo nivel de fricción que los `confirm`/`alert` existentes),
  validación de entero en cliente, confirmación narrada solo al reabrir una
  cerrada (explica quién vuelve y quién conserva), y `recargar()` al final.
  La columna Estado muestra « (+N min)» cuando hay otorgamientos.
- `monitoreo.js` (servicio) añade `segundosAdicionales` al resumen de sesión
  y la página de monitoreo lo muestra en la línea de parámetros.

## Pruebas

- Servicio (nuevo `server/services/minutos-adicionales.test.js`, fixture igual
  al de `sesiones.test.js`): los 8 comportamientos de los criterios
  (en curso +N, pausa +N, cerrada por tiempo = N exactos, cerrada por docente
  = resto + N, revoca solo `tiempo`/`cierre_docente`, continuidad de la
  prueba del estudiante y segundo cierre por tiempo, validaciones, auditoría).
- `sesiones.test.js`: el test de cierre manual ahora espera
  `cierre_docente`; nuevo test del plegado de pausa al cerrar.
- `migraciones.test.js`: base en versión 3 sube a 4 con columna, tabla y
  CHECK nuevo, conservando datos.
- Rutas (`docente.sesiones.test.js`): el endpoint pide minutos, rechaza
  inválidos y exige sesión docente.
