# 037 · Sin espera al volver a una pregunta ya vista

**Estado:** implementado ✅ _(pendiente de verificación en tablet real)_

## Qué hace

El tiempo mínimo por pregunta (`segundos_minimos_pregunta`, hoy 60 s por defecto) deja de cobrarse cuando el estudiante **vuelve a una pregunta que ya despachó**.

Una pregunta está *despachada* cuando el estudiante ya la respondió o la saltó: es decir, cuando pulsó "Siguiente" o "Saltar" estando en ella. Hasta entonces, el mínimo corre como siempre.

| Situación | Antes | Ahora |
|---|---|---|
| Ve la pregunta 7 por primera vez | espera 60 s | espera 60 s |
| Usa "Anterior" y vuelve a la 6, que ya respondió | **espera 60 s otra vez** | avanza de inmediato |
| Cambia la respuesta de la 6 y sigue | espera 60 s | guarda y sigue de inmediato |
| Desde la 6 avanza a la 7, que nunca abrió | espera 60 s | espera 60 s |

La cuenta atrás simplemente no aparece en las preguntas ya despachadas, y "Siguiente", "Saltar" y "Anterior" quedan activos desde el primer instante.

## Por qué

El mínimo por pregunta existe para un caso concreto: el estudiante que marca a ciegas para salir corriendo. Ese caso ocurre **la primera vez que ve cada pregunta**, y ahí se sigue cobrando íntegro.

Cobrarlo otra vez al volver atrás no frena a nadie —ya pagó los 60 s de esa pregunta— y castiga exactamente la conducta que se quiere fomentar: revisar. Con 20 preguntas y 60 s de mínimo, un estudiante que quiera repasar sus cinco dudas antes de entregar pierde cinco minutos mirando preguntas que ya contestó. En la práctica deja de revisar, que es el efecto contrario al buscado.

Además, la 021 quitó el botón "Terminar la prueba": la única salida legítima es responder todas. Volver atrás a completar lo que quedó saltado dejó de ser un lujo y pasó a ser el camino obligatorio, y hoy ese camino está gravado con un minuto por pregunta.

## Criterios de aceptación

- [x] Al abrir una pregunta que ya fue respondida o saltada, la API devuelve `segundosParaAvanzar = 0`. _(examen.test.js)_
- [x] Al abrir por primera vez una pregunta, la API devuelve la cuenta atrás completa, como hasta ahora. _(examen.test.js)_
- [x] El servidor **acepta** una respuesta sobre una pregunta ya despachada sin exigir el mínimo, aunque llegue un segundo después de abrirla. _(examen.test.js)_
- [x] El servidor **sigue rechazando** con 409 una respuesta antes del mínimo sobre una pregunta que se abre por primera vez. _(examen.test.js)_
- [x] Saltar una pregunta también la deja despachada: volver a ella no exige espera. _(examen.test.js)_
- [ ] En la tablet, una pregunta ya despachada no muestra el mensaje "Podés avanzar en N segundo(s)" y sus botones están activos de entrada.
- [x] En una pantalla de grupo (matching o cloze), la pantalla cuenta como despachada solo cuando **todos** sus miembros tienen respuesta; con alguno pendiente, el mínimo se sigue aplicando a la pantalla completa. _(examen.test.js)_
- [x] Con `segundos_minimos_pregunta = 0` el comportamiento no cambia en nada. _(la suite de la 006 sigue en verde)_
- [x] El tiempo por pregunta exportado (`segundos`) sigue acumulando las visitas posteriores, no solo la primera. _(examen.test.js)_
- [x] Ninguna ruta del examen revela la respuesta correcta como efecto de este cambio. _(prueba de la 006, sin cambios)_

> **Cierre (18/09/2026).** Los nueve criterios de servidor están verificados con pruebas
> automatizadas. El único pendiente es visual —que la tablet no pinte la cuenta atrás al
> volver atrás— y se comprueba en el aula; el cliente no se tocó, porque ya obedece al
> `segundosParaAvanzar` que manda el servidor, y ahí llega `0`.

## Fuera de alcance

- Cambiar el valor por defecto de `segundos_minimos_pregunta`, que sigue en 60 s.
- Un mínimo distinto (más corto) para las revisitas: se evaluó y se descartó por añadir una regla más que explicar a cambio de nada, ya que quien vuelve atrás ya pagó el mínimo de esa pregunta.
- Permitir entregar con preguntas pendientes, que la 021 cerró a propósito.
