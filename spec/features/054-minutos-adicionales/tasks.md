# 054 · Minutos adicionales — Tareas

## Esquema

- [x] `server/schema.sql`x
      `cerrada_en`, tabla `minutos_otorgados`, CHECK de `intentos.motivo_entrega`
      con `cierre_docente`.
- [x] `server/migraciones.js`: migración 4 (columna + tabla + rebuild de
      `intentos` solo si falta el motivo).
- [x] Test de migración: base v3 → v4 conservando datos de `intentos`.

## Servicio

- [x] `calcularRestantes` suma `segundos_adicionales`.
- [x] `darMinutosAdicionales(db, id, minutos, ahora)`: validaciones, fórmula
      `N×60 + max(0, −congelados)`, transacción (UPDATE + revocación + auditoría),
      reapertura `cerrada → en_curso` con el tramo de cerrada devuelto al reloj.
- [x] `cerrarSesion`: motivo por defecto `cierre_docente`; plegar pausa en
      `segundos_pausados` al cerrar desde `pausada`; sella `cerrada_en`.
- [x] Tests de servicio (los 8 comportamientos de la spec).

## Ruta

- [x] `POST /api/docente/sesiones/:id/minutos` en `server/routes/docente.js`.
- [x] Tests de ruta: contenido válido, inválido y sin sesión docente.

## UI

- [x] Engranaje ⚙ por fila (en_curso/pausada/cerrada) en
      `public/docente/sesiones.js` con `prompt` libre, validación y
      confirmación narrada al reabrir.
- [x] Columna Estado con « (+N min)» cuando hay otorgamientos.
- [x] `monitoreo.js`: `segundosAdicionales` en el resumen y en la línea de
      parámetros de la página.

## Documentación y cierre

- [x] `GUIA-DOCENTE.md`: cuándo usar minutos adicionales y qué pasa al reabrir.
- [x] `npm test` completo en verde y `npm run lint` sin errores.
- [x] Roadmap (054 a Hecho), bitácora y `RESTART.md`.
