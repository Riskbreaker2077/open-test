# 007 · Calificación y retroalimentación — Plan

## Enfoque

La calificación es una función pura sobre las respuestas del intento, invocada dentro de la misma transacción que la entrega: entregar y quedar calificado son un solo hecho, nunca dos estados separados que puedan desincronizarse.

La clave de diseño está en el filtrado por nivel: **se hace en el servidor, no en el cliente**. Enviar todo y esconderlo con CSS o con un `if` en el navegador equivale a no esconder nada — cualquier estudiante puede abrir las herramientas de desarrollo. El nivel decide qué se serializa.

## Implementación

1. `server/services/calificacion.js` — módulo puro:
   - `calificarIntento(preguntasConRespuesta)` → `{ aciertos, puntaje, total, porcentaje }`.
   - `armarResultado(intento, preguntas, nivel)` → la estructura exacta que se envía, ya recortada según el nivel. Es la única función que decide qué se revela.
2. Integración en `POST /api/examen/entregar` (feature 006): dentro de la transacción, marca `entregado_en` y `motivo_entrega`, y escribe `aciertos` y `puntaje`.
3. `GET /api/examen/resultado` — devuelve `armarResultado(...)` con el nivel de la sesión. Accesible con el token o tras volver a entrar con el código.
4. `public/estudiante/resultado.html` + `resultado.js` — puntaje destacado arriba y, si el nivel lo permite, el listado de preguntas con su estado (`acertada` / `fallada` / `saltada` / `sin llegar`), reutilizando `public/shared/pregunta.js` en modo lectura.
5. Ajuste en el flujo de login (feature 004): un estudiante con intento entregado se dirige a la pantalla de resultado, no a la de examen.
6. Tests:
   - cálculo: todo correcto, todo incorrecto, mezcla, todas saltadas, intento sin llegar al final;
   - porcentaje sobre el total asignado, no sobre lo respondido;
   - **un test por nivel** que serializa el resultado y comprueba que la opción correcta aparece solo en `completo`;
   - idempotencia: pedir el resultado dos veces no cambia `aciertos` ni `puntaje`.

## Decisiones

- **Filtrado por nivel en el servidor** — es la diferencia entre una restricción real y una decorativa.
- **Calificar al entregar y persistir, en vez de calcular al vuelo** — el puntaje queda congelado con las reglas vigentes en ese momento; si mañana cambia la fórmula, las notas ya dadas no se mueven. Además el panel del docente lee un número, no recalcula 30 intentos.
- **Distinguir "saltada" de "sin llegar"** — pedagógicamente son cosas distintas: una es una decisión, la otra es falta de tiempo. Ambas puntúan 0, pero el estudiante y el docente merecen ver cuál fue.
- **`aciertos` como valor por defecto** — le dice al estudiante en qué falló, que es la mitad útil de la retroalimentación, sin regalar el banco a quien sigue presentando.
- **Sin penalización por error en v1** — es la convención más común y la más fácil de explicar a un estudiante. Cambiarla implicaría subir `formato_version` del export.

## Riesgos

- **El nivel `completo` filtra el banco durante la sesión** — el primero en terminar sale con las respuestas. Mitigación: el valor por defecto es `aciertos`, y al elegir `completo` el panel advierte explícitamente de este efecto en lugar de dejarlo implícito.
- **Un estudiante disconforme con su nota** — mitigación: el nivel `aciertos` y el export detallado (feature 009) permiten al docente reconstruir exactamente qué vio y qué marcó, gracias a la materialización de la feature 005.
- **Preguntas jamás alcanzadas al entregar temprano** — deben aparecer y contar como 0. Se prueba explícitamente para que no se cuelen como "acertadas por defecto" ni desaparezcan del total.
