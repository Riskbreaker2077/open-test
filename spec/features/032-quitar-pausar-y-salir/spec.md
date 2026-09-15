# 032 · Quitar "Pausar y salir" del examen del estudiante

**Estado:** implementado ✅

## Qué hace

Revierte la feature 024. El examen del estudiante deja de tener el botón **"Pausar y salir"**, y el servidor deja de aceptar `POST /api/examen/pausar`. Pausar la evaluación vuelve a ser algo que **solo puede hacer el docente**, desde el panel o la pantalla de proyección.

## Por qué

El docente lo reportó como un bug grave (15/09/2026). El botón pausaba la evaluación **para todo el grupo**: cualquier estudiante podía detener el reloj y bloquear las respuestas de los demás con un toque, a propósito o por accidente. En un aula eso es inaceptable.

Quitar solo el botón no basta: la ruta seguiría viva y cualquier tablet con su cookie podría llamarla. Por eso se retira también la ruta y la función de servicio que la respaldaba.

## Criterios de aceptación

- [x] La pantalla del examen no muestra ningún botón "Pausar y salir".
- [x] `POST /api/examen/pausar` ya no existe: con cookie de estudiante válida no pausa la sesión y responde 404. _(test de API en `examen.presentacion.test.js`.)_
- [x] `pausarIntentoComoEstudiante` desaparece de `server/services/examen.js` junto con sus tests.
- [x] La pausa del docente (`POST /api/docente/sesiones/:id/pausar`) sigue funcionando igual. _(tests de sesiones sin cambios, en verde.)_
- [x] Si una tablet se cierra o pierde el wifi, el examen se retoma igual que antes (006) y la proyección la marca en rojo por silencio (031).

## Fuera de alcance

- Un botón para que el estudiante salga sin pausar: si hace falta, será otra feature.
