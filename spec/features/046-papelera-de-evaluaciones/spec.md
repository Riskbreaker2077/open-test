# 046 · Papelera de evaluaciones y sugerencia tras enviar al portal

**Estado:** implementado ✅ _(revisada por la 049: ahora **toda** evaluación no abierta va a la papelera, con o sin intentos)_

## Qué hace

1. **Papelera de 30 días.** Borrar una evaluación que tiene intentos ya no la elimina en el acto: la manda a la **papelera**. Desde ahí se puede **restaurar** tal como estaba (intentos, respuestas, notas, anulaciones y estado de envío) durante 30 días. Pasado ese plazo, OpenTest la elimina definitivamente por su cuenta. Desde la papelera también se puede **borrar ya**, con confirmación. Una evaluación sin intentos (por ejemplo, un borrador) se sigue borrando en el acto, porque no hay nada que proteger.
2. **Sugerencia tras enviar.** Cuando «Enviar ahora» deja una evaluación como enviada al portal, la página **Enviar al portal** sugiere quitarla de este equipo con un botón **Mover a la papelera**. Solo es una sugerencia: nada se borra sin que el docente pulse el botón.

Lo que va a la papelera es la evaluación y todo lo que cuelga de ella. Los estudiantes y los bancos de preguntas no se tocan.

## Por qué

Una vez que los resultados están en el portal, la copia local solo ocupa espacio y guarda datos personales de estudiantes en un portátil que se mueve de aula en aula. Por eso conviene sugerir borrarlos. La papelera cubre el error de borrar demasiado pronto, por ejemplo si el docente aún no ha aprobado la propuesta en el portal o si se equivocó de evaluación.

## Criterios de aceptación

- [x] Una base existente se migra a la **v8** (`sesiones.en_papelera_en`) sin perder datos. _(test de migración)_
- [x] `DELETE /api/docente/sesiones/:id` de una evaluación cerrada con intentos la deja en la papelera: no se pierde ninguna fila y la evaluación desaparece de Evaluaciones, Monitoreo, Resultados, Estadísticas y Enviar al portal. _(tests)_
- [x] Una evaluación con intentos que está abierta, en curso o en pausa no se puede borrar (409 «Cierra la evaluación antes de borrarla.»). _(test)_
- [x] Una evaluación sin intentos se borra en el acto. _(test)_
- [x] `GET /api/docente/papelera` lista lo que hay en la papelera con la fecha en que se eliminará sola. _(test)_
- [x] `POST /api/docente/papelera/:id/restaurar` la devuelve intacta. _(test)_
- [x] `DELETE /api/docente/papelera/:id` la elimina definitivamente, en cascada. _(test)_
- [x] Lo que lleva más de 30 días en la papelera se elimina al arrancar OpenTest y una vez al día mientras sigue abierto. _(test con reloj simulado)_
- [x] Mientras está en la papelera, un banco usado por esa evaluación sigue sin poder borrarse. _(test)_
- [x] En Evaluaciones, la confirmación de «Borrar» dice que la evaluación irá a la papelera 30 días, y un enlace **Papelera (N)** abre la lista con **Restaurar** y **Borrar ya**. _(recorrido en Chrome sin cabeza)_
- [x] Tras un envío con éxito, Enviar al portal muestra por cada evaluación enviada la sugerencia **Mover a la papelera**; al pulsarla y confirmar, la evaluación deja la lista. _(recorrido en Chrome sin cabeza)_
- [x] `GUIA-DOCENTE.md` explica la papelera.

## Fuera de alcance

- Papelera para estudiantes, bancos o preguntas.
- Borrar automáticamente tras enviar.
- Cambiar el plazo de 30 días desde la interfaz.
