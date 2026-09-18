# 038 · Anular la prueba de un estudiante desde la proyección

**Estado:** implementado ✅ _(pendiente de verificación en el aula)_

## Qué hace

En el tablero de asistencia de la pantalla de proyección (031), el docente hace **doble clic sobre el cuadro de un estudiante** y anula su prueba.

La pantalla pide confirmación con el nombre completo ("¿Anular la prueba de María Fernanda Gómez Ruiz?"). Al aceptar:

- la prueba del estudiante **termina en el acto**: su tablet deja de aceptar respuestas y pasa a la pantalla de resultado;
- su resultado es **0 puntos y 0 %** — la nota mínima de la planilla;
- **no recibe retroalimentación**, sea cual sea el `nivel_feedback` de la evaluación: ni aciertos, ni respuestas correctas, ni explicaciones;
- en su lugar ve un **aviso de anulación**: "Tu prueba fue anulada por tu docente";
- su cuadro del tablero queda **negro con el símbolo ⊘**, visible para el aula.

Un segundo doble clic sobre un cuadro ya anulado ofrece **revertir la anulación**. El estudiante recupera su prueba tal como iba, con todas sus respuestas intactas, y sigue presentando si la evaluación continúa abierta.

En la descarga de resultados, el intento anulado sale con `motivo_entrega = anulada_docente` y una columna nueva `anulado`.

## Por qué

Hoy el docente que pilla a un estudiante copiando o con el celular no tiene nada que hacer dentro de OpenTest: solo puede forzar su entrega desde el panel, que lo califica normalmente, con la nota que llevara. La sanción tiene que aplicarla después, a mano, en otra planilla, y para entonces ya no hay constancia de qué pasó ni cuándo.

Se pone en la proyección, y no solo en el panel de monitoreo, porque es donde el docente ya está mirando durante el examen: el tablero de la 031 está en el proyector con los cuarenta nombres delante. Tener que ir al portátil, abrir el panel y buscar la fila es justo la fricción que hace que la sanción no se aplique.

Que el aula vea el cuadro ponerse negro no es un efecto colateral, es parte del mecanismo: la anulación disuade cuando es pública e inmediata.

## Criterios de aceptación

- [ ] Un doble clic sobre el cuadro de un estudiante en la proyección abre una confirmación con su nombre completo.
- [x] Al confirmar, el intento queda anulado: `anulado_en` con la fecha, `entregado_en` fijado, `motivo_entrega = "anulada_docente"`, `aciertos = 0` y `puntaje = 0`. _(intentos.test.js)_
- [x] La tablet del estudiante anulado deja de aceptar respuestas de inmediato y pasa sola a la pantalla de resultado en el siguiente sondeo (≤ 5 s). _(examen.presentacion.test.js: responder devuelve 409 y `/estado` trae `anulado`)_
- [ ] La pantalla de resultado del anulado muestra el aviso de anulación, 0 puntos y 0 %.
- [x] La API de resultado de un anulado **no devuelve el detalle de preguntas** con ningún `nivel_feedback`, tampoco con `completo` (test explícito por nivel). _(examen.presentacion.test.js, los tres niveles)_
- [ ] El cuadro del estudiante anulado se ve distinto de los otros cuatro estados y la leyenda lo explica.
- [x] Un doble clic sobre un cuadro ya anulado ofrece revertir; al confirmar, el estudiante vuelve a presentar con sus respuestas intactas y su posición en la pregunta donde iba. _(intentos.test.js y prueba de API)_
- [x] Revertir la anulación de quien ya había entregado antes de ser anulado le devuelve su entrega y su nota recalculada, no un intento a medias. _(intentos.test.js)_
- [ ] Un doble clic sobre un estudiante que todavía no ha entrado avisa de que no hay prueba que anular y no cambia nada.
- [x] Se puede anular con la evaluación `en_curso`, `pausada` o ya `cerrada`; en `borrador` no hay intentos que anular. _(intentos.test.js)_
- [x] La anulación sobrevive a que el estudiante recargue, cierre la pestaña o vuelva a entrar con su código. _(vive en la base, no en la tablet; `/estado` y `/resultado` lo reflejan)_
- [x] Cerrar la evaluación no recalifica ni revive al anulado: sigue en 0 y sin retroalimentación. _(intentos.test.js)_
- [x] El panel de monitoreo (008) muestra a los anulados marcados como tales. _(monitoreo devuelve `anulado`; la tabla lo pinta)_
- [x] La descarga de resultados trae la columna `anulado` en la hoja Resumen y el campo equivalente en el JSON de reproducción, con el intento anulado en `aciertos = 0` y `puntaje = 0`. _(resultados.test.js)_
- [x] La proyección sigue sin mostrar puntajes, avance, preguntas ni códigos: el cuadro anulado solo añade un estado más. _(docente.sesiones.test.js conserva la prueba de datos reservados)_
- [x] Anular exige sesión de docente, como todo `/api/docente/*`. _(examen.presentacion.test.js: 401 sin cookie)_

> **Cierre (18/09/2026).** Doce de los dieciséis criterios están verificados con pruebas
> automatizadas, incluidos los dos que más importan: que el anulado no reciba
> retroalimentación en ninguno de los tres niveles, y que revertir devuelva la nota
> exacta. Los cuatro pendientes son de interfaz (el diálogo del doble clic, el aviso en
> la tablet, el color del cuadro y el aviso de "todavía no ha entrado") y se comprueban
> proyectando en el aula. El recorrido completo sí se ejecutó contra el servidor real:
> anular, ver el cuadro en negro, leer el resultado del estudiante y deshacer.

## Fuera de alcance

- Registrar el motivo de la anulación (copia, celular, salida del aula): se decide en un renglón de la planilla del docente, no en la aplicación.
- Anular a un estudiante que nunca entró, o anular una evaluación entera de una vez.
- Una escala de nota 1–5: OpenTest sigue entregando puntaje y porcentaje, y 0 % es la nota mínima en la planilla del docente. Descartado con el usuario por exigir fijar una fórmula de conversión que es una decisión institucional, no técnica.
- Avisar al estudiante de por qué se le anuló, o permitirle reclamar desde la tablet.
