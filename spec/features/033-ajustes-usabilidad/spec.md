# 033 · Ajustes de usabilidad del aula

**Estado:** implementado ✅

## Qué hace

Cinco ajustes que pidió el docente después de usar la 1.1.1 (15/09/2026):

1. **Volver desde la proyección sin cerrar la prueba.** La pantalla de proyección tiene siempre un botón **Volver** que lleva a Evaluaciones y deja la evaluación como está.
2. **"Cerrar" pasa a llamarse "Finalizar"** en la pantalla de proyección, con su confirmación redactada igual.
3. **Nombres cortos con grupos grandes.** Con **más de 30** estudiantes convocados, el tablero de asistencia (031) muestra solo el **primer nombre y el primer apellido** ("María Fernanda Rodríguez Castañeda" → "María Rodríguez"), en cuadros de una sola línea, para que quepan todos.
4. **Borrar una evaluación sin descargar antes sus resultados.** Se retira la restricción de la 022. El panel sigue pidiendo confirmación, y ahora avisa que se borran también los resultados.
5. **Salir de la pantalla de resultados.** El estudiante que terminó ve un botón **Volver al inicio** que cierra su sesión en esa tablet y lo lleva al portal, donde otro estudiante puede escribir su código.

## Por qué

- (1) Hoy la única salida de la proyección durante la prueba es "Cerrar", que entrega a todos. El docente tenía que editar la dirección a mano para volver al panel.
- (2) "Cerrar" se confunde con cerrar la ventana; "Finalizar" dice lo que hace: termina la prueba para todos.
- (3) Con grupos de 35-45 estudiantes, los cuadros con nombres completos no caben ni con la letra mínima y se cortan.
- (4) La restricción protegía contra perder resultados, pero en la práctica estorba: el docente decide cuándo borrar.
- (5) Es un fallo: la pantalla de resultados no tenía salida, y la tablet quedaba atrapada en ella. Como la sesión del estudiante seguía viva, recargar o ir a la raíz devolvía a los resultados.

## Criterios de aceptación

- [x] La proyección muestra **Volver** en todos los estados; lleva a `/docente/sesiones.html` sin llamar a ninguna transición.
- [x] El botón que terminaba la prueba dice **Finalizar**, y su confirmación dice "¿Finalizar y entregar sus pruebas?".
- [x] Con 30 convocados o menos, el tablero muestra nombre y apellido completos, como antes.
- [x] Con más de 30, la API de proyección devuelve `nombre` como primer nombre + primer apellido, y los cuadros ocupan una línea.
- [x] Con 45 convocados, el tablero cabe entero sin cortes a 1024×768 y a 1920×1080. _(capturas en Chromium headless; el ancho de columna se mide con el nombre corto más largo.)_
- [x] `borrarSesion` borra una evaluación con intentos aunque `descargado_en` sea `NULL`.
- [x] En el panel, "Borrar" de una evaluación cerrada ya no está deshabilitado por falta de descarga, y la confirmación avisa que se pierden los resultados.
- [ ] La pantalla de resultados muestra **Volver al inicio** _(implementado; sin prueba automática ni captura, verificar en una tablet)_; al pulsarlo se borra la cookie del estudiante y la tablet queda en el portal, lista para otro código.
- [ ] Si consultar el resultado falla, el enlace existente también cierra la sesión antes de volver.

## Fuera de alcance

- Cambiar el nombre de la acción en el panel de monitoreo ("Cerrar evaluación"): el pedido fue sobre la proyección.
- Quitar la columna `descargado_en`: se sigue escribiendo al descargar, aunque ya no bloquee el borrado.
