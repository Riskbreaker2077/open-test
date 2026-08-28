# 007 · Calificación y retroalimentación

**Estado:** implementado ✅

## Qué hace

En cuanto el estudiante entrega —por decisión propia, porque se acabó el tiempo o porque el docente cerró la sesión— el sistema califica su prueba y le muestra su resultado en la misma tablet, sin esperar a nadie.

Cuánto ve depende de lo que el docente configuró al crear la sesión:

- **`solo_puntaje`** — su puntaje y su porcentaje.
- **`aciertos`** (por defecto) — además, qué preguntas acertó y cuáles no, sin revelar cuál era la correcta.
- **`completo`** — además, la respuesta correcta de cada pregunta y su explicación.

## Por qué

Es una regla de negocio explícita del encargo: el estudiante recibe su resultado con retroalimentación al terminar. Devolverle la nota en el momento es también lo que hace que la evaluación enseñe algo, en lugar de ser un trámite que se comenta dos semanas después.

Los tres niveles existen por un conflicto real: el nivel `completo` es el más útil pedagógicamente y el más peligroso durante la sesión, porque el primero que termina puede pasarle las respuestas a quien sigue presentando. El docente conoce su aula y decide; el valor por defecto es el prudente.

## Criterios de aceptación

- [x] Al entregar se calculan y guardan `aciertos` y `puntaje` en el intento.
- [x] El puntaje es 1 punto por acierto, 0 por error y 0 por pregunta saltada o no alcanzada, según [`export-resultados-v1.md`](../../contracts/export-resultados-v1.md).
- [x] El porcentaje se calcula sobre el total de preguntas asignadas, no sobre las respondidas.
- [x] La calificación se hace una sola vez, al entregar; volver a la pantalla de resultado no la recalcula.
- [x] Con `solo_puntaje`, la pantalla muestra puntaje y porcentaje y nada más.
- [x] Con `aciertos`, se lista cada pregunta con su enunciado, lo que respondió el estudiante y si acertó — **sin mostrar la correcta cuando falló**.
- [x] Con `completo`, se muestra además la opción correcta y la explicación de cada pregunta.
- [x] La API respeta el nivel configurado: con `solo_puntaje` o `aciertos`, la respuesta del servidor **no contiene** la opción correcta en ningún campo (test explícito por nivel).
- [x] Las preguntas saltadas o no alcanzadas aparecen identificadas como tales, no como errores.
- [x] Un estudiante que vuelve a entrar con su código tras entregar ve su resultado otra vez, con el mismo nivel de detalle.
- [ ] La pantalla es legible en tablet y deja claro que la prueba terminó y que puede levantarse.
- [x] Si el docente cambia el nivel de feedback de una sesión cerrada, los estudiantes que vuelvan a consultar ven el nivel nuevo; ningún otro parámetro de la sesión cerrada se puede modificar.

## Cierre

Implementación cerrada con 11 de 12 criterios verificados. La legibilidad y facilidad de uso en una tablet real queda aplazada, por decisión del usuario, a la sesión final de pruebas con el equipo destino.

## Fuera de alcance

- Que el docente vea o descargue los resultados (features 008 y 009).
- Puntajes ponderados, penalización por error o preguntas con distinto valor: en v1 todas valen 1.
- Comentarios manuales del docente sobre una respuesta concreta.
