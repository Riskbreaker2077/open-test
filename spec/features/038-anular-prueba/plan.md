# 038 · Anular la prueba — Plan

## Enfoque

La anulación es **un estado del intento**, no una calificación con otro número. Por eso vive en una columna propia, `intentos.anulado_en`, y no en `puntaje`: un cero podría venir de haber fallado las veinte preguntas, y confundir ambas cosas haría imposible auditar la sanción tres meses después, que es justo cuando se reclama.

A partir de esa columna, todo lo demás es filtro: la calificación devuelve ceros, el resultado del estudiante devuelve el aviso en lugar del detalle, el tablero pinta el cuadro negro y el exportador añade una columna.

La reversión es posible porque **la calificación es una función pura de las respuestas**: nada se borra al anular, así que recalcular devuelve exactamente la nota que había.

## Implementación

1. `server/schema.sql` + `server/migraciones.js` (**versión 6**) — `intentos` gana `anulado_en TEXT` y su `CHECK` de `motivo_entrega` admite `'anulada_docente'`. Ampliar un `CHECK` obliga a rehacer la tabla con la receta estándar (crear, copiar, borrar, renombrar) que ya usó la migración 1 con `sesiones`; el runner desactiva las claves foráneas durante el paso y comprueba `foreign_key_check` al terminar, así que `intento_preguntas` y `respuestas` conservan sus referencias porque los `id` se copian tal cual.
2. `server/services/intentos.js`:
   - `anularIntento(db, intentoId, ahora)` — exige intento existente y sesión fuera de `borrador`; escribe `anulado_en`, pone `aciertos = 0` y `puntaje = 0`, y si el estudiante **seguía presentando** fija además `entregado_en` y `motivo_entrega = 'anulada_docente'`. A quien ya había entregado no se le toca su entrega original: su motivo sigue contando qué pasó de verdad.
   - `revertirAnulacion(db, intentoId)` — limpia `anulado_en`; si la entrega era la de la propia anulación (`motivo_entrega = 'anulada_docente'`), la borra entera y el estudiante vuelve a presentar; si no, recalcula su nota con `calificarIntento` sobre `preguntasCalificables` y la restituye.
3. `server/routes/docente.js` — `POST /intentos/:id/anular` y `DELETE /intentos/:id/anular`. Quedan protegidas por el prefijo, como el resto.
4. `server/routes/docente.js`, respuesta de `/proyeccion/:sesionId` — cada estudiante suma `intentoId` (`null` si no ha entrado) y el estado `anulado`. El `intentoId` es un identificador interno que no se pinta: la proyección sigue sin mostrar códigos.
5. `server/services/monitoreo.js` — el estudiante gana `anulado: boolean`, que la proyección traduce a estado y el panel de la 008 pinta como marca en su fila.
6. `server/services/calificacion.js` — `armarResultado` corta antes de cualquier detalle cuando el intento está anulado: devuelve `{ anulado: true, puntaje: 0, aciertos: 0, porcentaje: 0, total, nivel }` y **ninguna** pregunta, para los tres niveles de feedback. Es el mismo punto único por el que ya pasa toda la información que sale hacia la tablet.
7. `public/proyeccion/proyeccion.js` + `.css` — `dblclick` sobre el cuadro, `window.confirm` con el nombre completo, llamada a la API y resincronización; estado `cuadro--anulado` (negro con ⊘) y su entrada en la leyenda. El doble clic sobre un cuadro sin `intentoId` muestra el aviso en la línea de error existente.
8. `public/estudiante/resultado.js` + `.html` + `.css` — cuando el resultado trae `anulado`, se pinta el aviso y se omite el detalle. El examen no necesita cambios: su sondeo ya redirige al resultado en cuanto el intento figura como entregado.
9. `server/exporters/resultados.js` — `anulado` al final de `CABECERAS_RESUMEN` y en el intento del JSON. Va **al final**, que es lo que el contrato define como cambio compatible: `formato_version` sigue en 3.
10. Tests: anulación y reversión en `intentos.test.js`; resultado sin detalle en los tres niveles y proyección con el estado nuevo en las pruebas de ruta; migración 6 sobre una base de la versión anterior en `migraciones.test.js`.

## Decisiones

- **Columna propia en vez de un puntaje cero** — separa "sacó cero" de "se le anuló", que es lo que el docente necesita poder demostrar.
- **La anulación no borra respuestas** — es lo que hace reversible el doble clic accidental y lo que conserva la evidencia de lo que el estudiante había hecho hasta ese momento.
- **Doble clic con confirmación, no un botón** — un botón por cuadro llenaría de controles una pantalla pensada para verse desde el fondo del aula, y sería más fácil de pulsar sin querer que un doble clic seguido de un diálogo.
- **El filtro del feedback vive en `armarResultado`** — es el único punto por el que sale información hacia la tablet. Filtrar en el cliente dejaría las respuestas correctas viajando en la respuesta HTTP de alguien a quien se acaba de sancionar por copiar.
- **El `intentoId` viaja pero no se pinta** — la 031 dejó fijado que la proyección no muestra códigos ni notas. Un identificador interno en el JSON no es información del aula; sin él no hay forma de decir sobre quién se actúa.
- **Anular es posible con la evaluación cerrada** — el docente revisa los resultados después y ahí es cuando a veces aparece la evidencia. Revertir entonces recalcula la nota, que es determinista.

## Riesgos

- **Doble clic accidental sobre el proyector delante del curso** — mitigación: confirmación con el nombre completo y reversión con sus respuestas intactas.
- **Rehacer la tabla `intentos` en una base con evaluaciones reales** — es el paso más delicado de la migración. Mitigación: la receta ya probada de la migración 1, `foreign_key_check` al terminar (que ya hace el runner) y una prueba que migra una base con intentos, respuestas y preguntas materializadas y comprueba que nada se pierde.
- **Un estudiante revertido que no se entera** — su tablet sigue sondeando cada 5 s y vuelve sola al examen; no hace falta que haga nada.
