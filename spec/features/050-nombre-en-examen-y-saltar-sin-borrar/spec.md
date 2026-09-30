# 050 · Nombre del estudiante en el examen y "Saltar" que no borra — Spec

**Estado:** implementado ✅ (pendiente verificación en tablet real)

## Por qué

El docente pidió dos ajustes a la pantalla del examen del estudiante:

1. El header muestra el progreso a la izquierda y el reloj a la derecha; en el
   centro debe ir el **nombre del estudiante**.
2. Al devolverse con "Anterior", el estudiante perdía su respuesta.

Causa encontrada en (2): "Saltar" siempre enviaba `opcionId: null`, aun cuando
la pregunta ya tenía respuesta. "Siguiente" exige respuesta, pero "Saltar"
está siempre habilitado, y quien revisaba hacia atrás lo usaba para avanzar de
nuevo: cada pregunta ya contestada quedaba en blanco. "Anterior" en sí guardaba
bien (probado a nivel de servicio).

## Qué hace

- El header pasa a tres zonas: progreso · nombre · reloj. El nombre sale de
  `GET /api/examen/estado` (`estudiante`); no hay endpoint ni dato nuevo. En
  pantallas angostas el nombre se recorta con puntos suspensivos.
- "Saltar" ya no borra: envía la selección actual de la pantalla. Si no hay
  ninguna, sigue guardando "saltada" (`NULL`) como antes (021/037).

## Criterios de aceptación

- [x] El nombre completo aparece centrado en el header durante la prueba.
- [x] En una pregunta ya respondida, "Saltar" conserva la respuesta.
- [x] En una pregunta sin respuesta, "Saltar" sigue registrándola como saltada.
- [x] Sin cambios de servidor, contrato ni migración; `formato_version` intacto.
- [ ] Verificado en tablet real.
