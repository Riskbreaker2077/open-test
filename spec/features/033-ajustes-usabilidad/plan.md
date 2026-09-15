# 033 · Ajustes de usabilidad del aula — Plan

## Implementación

1. **Volver** — `public/proyeccion/proyeccion.js`: `pintarControles` agrega siempre `enlace('Volver', '/docente/sesiones.html')`. En estado `cerrada` ese enlace sustituye al "Volver a Evaluaciones" actual, que ya hacía lo mismo.
2. **Finalizar** — mismo archivo: texto del botón y del `confirm`. La clase CSS `control--cerrar` pasa a `control--finalizar`.
3. **Nombres cortos** — `server/services/monitoreo.js` expone también `nombres` y `apellidos` (el monitoreo es solo del docente). `server/routes/docente.js` decide en la proyección: si hay más de `LIMITE_NOMBRE_COMPLETO = 30` convocados, `nombre` = primera palabra de `nombres` + primera palabra de `apellidos`. La API manda `nombresCortos: true` y el cliente pone el tablero en modo compacto: cuadros de una línea, sin altura mínima de dos renglones y columnas más angostas.
4. **Borrar** — `server/services/sesiones.js`: `borrarSesion` pierde la comprobación de `descargado_en`. `public/docente/sesiones.js`: el botón deja de depender de `descargado_en` y la confirmación menciona los resultados. Tests de la 022 reescritos: con intentos y sin descarga, se borra en cascada.
5. **Volver al inicio** — `public/estudiante/resultado.html` agrega un botón bajo el resumen; `resultado.js` hace `POST /api/examen/salir` y `location.replace('/')`, también desde el enlace de error. Así el portal no lo redirige otra vez a resultados.

## Decisiones

- **El recorte se decide en el servidor** — la regla ("más de 30") y la forma del nombre quedan en un solo sitio y con test; el cliente solo pinta.
- **Primera palabra, sin diccionario de partículas** — "Juan de la Cruz" quedaría "Juan de". Es raro en las listas del colegio y el panel de monitoreo sigue teniendo el nombre completo. Si molesta, se ajusta.
- **Botón y no enlace en resultados** — un enlace a `/` sin cerrar la sesión devuelve a los resultados (el portal redirige al estudiante que ya entregó).
