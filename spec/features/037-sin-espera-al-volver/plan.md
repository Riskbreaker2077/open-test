# 037 · Sin espera al volver — Plan

## Enfoque

La regla vive donde ya vive el mínimo: en `server/services/examen.js`. El cliente no necesita saber nada nuevo, porque ya obedece al `segundosParaAvanzar` que le manda el servidor — si llega `0`, no pinta cuenta atrás y habilita los botones. Es la propiedad que hace que este cambio sea de servidor y no de interfaz.

La pregunta que hay que responder es "¿esta pantalla ya fue despachada?", y la base ya lo sabe sin columnas nuevas: **existe una fila en `respuestas` para su `intento_pregunta_id`**. Esa fila se escribe tanto al responder como al saltar (`opcion_id = NULL`), que es exactamente la definición de despachada. No hay migración.

## Implementación

1. `server/services/examen.js` — nueva función `pantallaDespachada(db, intentoId, fila)`:
   - pregunta suelta: existe fila en `respuestas` para su `intento_pregunta_id`;
   - miembro de un grupo: **ningún** miembro del grupo en este intento está sin fila de `respuestas`. Es la misma consulta que ya usa `obtenerPregunta` para decidir si reinicia el mínimo al reanudar en mitad de un matching, así que se extrae y se reutiliza en lugar de duplicarse.
2. `obtenerPregunta` — `segundosParaAvanzar` pasa a ser `0` cuando la pantalla está despachada; el resto (`pregunta_actual`, `pregunta_mostrada_en`, `segundosEnPantalla`) no cambia, porque siguen haciendo falta para acumular el tiempo y para reanudar en la pregunta correcta.
3. `guardarRespuesta` — la comprobación del mínimo se salta cuando la pantalla está despachada. El resto de validaciones (intento vivo, sesión en curso, pregunta en pantalla, opción válida) se mantienen intactas.
4. Tests en `server/services/examen.test.js`: revisita sin espera, primera visita con espera, salto que deja despachada, pantalla de grupo con un miembro pendiente, y mínimo en `0`.

## Decisiones

- **"Despachada" se deduce de `respuestas`, no de una columna nueva** — la fila ya significa "la vio y decidió". Una columna `vista_en` añadiría un estado que puede desincronizarse de la respuesta y una migración para un dato que ya está.
- **El mínimo se sigue validando en el servidor** — no se relaja la regla de la 006: lo que cambia es *a qué preguntas* se aplica, no *dónde* se comprueba. Manipular el navegador sigue sin servir para saltarse la primera visita.
- **Sin mínimo corto para las revisitas** — descartado con el usuario: no hay abuso que prevenir, porque para revisitar hay que haber pagado antes el mínimo completo de esa misma pregunta.
- **Una pantalla de grupo se despacha entera** — sus miembros se responden juntos y comparten `pregunta_mostrada_en`; tratarlos por separado dejaría media pantalla libre y media bloqueada, que es peor de explicar que la regla actual.
- **Sin cambios en el cliente** — `desbloqueoEn` ya se calcula a partir del valor del servidor. Menos código tocado es menos riesgo en la única pantalla que el aula no perdona.

## Riesgos

- **Barrer la prueba al final cambiando respuestas a toda velocidad** — es posible, pero solo tras haber pagado el mínimo de cada pregunta una vez; no acorta la duración mínima del examen ni un segundo. Aceptado explícitamente.
- **Reanudación en mitad de una pantalla de grupo** — la 026 decidió que ahí el mínimo vuelve a correr. Se conserva tal cual: con algún miembro pendiente la pantalla no está despachada y la regla nueva no la toca.
