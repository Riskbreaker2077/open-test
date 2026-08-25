# 005 · Motor de personalización

**Estado:** propuesta

## Qué hace

Cuando un estudiante inicia su intento, el motor decide **qué prueba le toca**: sortea `n_preguntas` del banco (20 de 40 o 50), las coloca en un orden propio, y baraja las cuatro opciones de cada una. El resultado se escribe una sola vez en la base y no vuelve a cambiar nunca.

Todo se deriva de una única semilla guardada en el intento. Con la misma semilla, el mismo banco produce siempre exactamente la misma prueba: la personalización es aleatoria entre estudiantes, pero **determinista y reproducible** para cada uno.

## Por qué

Esta es la feature que resuelve el problema del encargo. Todo lo demás —importar, presentar, exportar— existe para que esta funcione. Si dos estudiantes sentados juntos ven la pregunta 7 con las mismas opciones en el mismo orden, la aplicación no sirve para lo que se construyó.

El determinismo importa por dos razones distintas: permite reanudar un examen tras una caída sin regenerar la prueba, y permite auditar meses después qué vio exactamente un estudiante que reclama una nota.

## Criterios de aceptación

- [ ] Al iniciar un intento se materializan `n_preguntas` filas en `intento_preguntas`, con su `orden` y su `orden_opciones`.
- [ ] Las preguntas sorteadas son **todas distintas** (muestreo sin reemplazo): ninguna se repite dentro de un intento.
- [ ] Todas las preguntas sorteadas pertenecen al banco de la sesión.
- [ ] `orden_opciones` contiene exactamente los 4 ids de opción de esa pregunta, sin faltar ni repetir ninguno.
- [ ] Dada la misma semilla y el mismo banco, el motor produce **exactamente** la misma selección y las mismas permutaciones (test de determinismo).
- [ ] Semillas distintas producen pruebas distintas: con un banco de 50 y 20 preguntas, sobre 100 intentos simulados, ningún par comparte la selección completa y el promedio de preguntas compartidas entre dos intentos se aproxima al valor teórico (8 de 20).
- [ ] La posición de la respuesta correcta se reparte entre las cuatro posiciones: sobre 1000 preguntas generadas, ninguna posición se lleva más del 30% ni menos del 20%.
- [ ] La materialización ocurre **una sola vez por intento**: llamar de nuevo al motor sobre un intento existente no altera ni una fila (test explícito).
- [ ] Si el banco tiene exactamente `n_preguntas`, funciona (se usan todas, solo cambia el orden).
- [ ] Si el banco tiene menos de `n_preguntas`, el motor falla con un error claro y el intento no se crea a medias.
- [ ] Generar la prueba de un intento tarda menos de 50 ms con un banco de 50 preguntas.

## Fuera de alcance

- Mostrar las preguntas al estudiante (feature 006).
- Preguntas extra por rapidez: el campo existe en el modelo con valor `0` y el motor no lo implementa (backlog).
- Sorteo estratificado por tema o dificultad (backlog): en v1 el muestreo es uniforme.
- Calificar (feature 007).
