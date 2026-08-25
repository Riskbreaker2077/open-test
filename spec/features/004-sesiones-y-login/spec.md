# 004 · Sesiones y login

**Estado:** implementado ✅

## Qué hace

**Del lado del docente:** crea una *sesión de examen* eligiendo el banco, los cursos convocados y los parámetros —cuántas preguntas sortear (20 por defecto), cuántos minutos dura, cuántos segundos mínimos por pregunta y cuánta retroalimentación verá el estudiante—. La sesión nace en borrador; cuando el docente la abre, los estudiantes ya pueden entrar.

**Del lado del estudiante:** abre la URL en la tablet, escribe su código y entra. El sistema comprueba que el código existe, que su curso está convocado y que no ha presentado ya. A partir de ahí queda identificado en esa tablet mediante un token, sin contraseña.

## Por qué

La sesión es lo que convierte un banco de preguntas y una lista de estudiantes en un examen concreto, con reglas concretas. Y el login por código es el punto donde la aplicación toca al estudiante por primera vez: tiene que funcionar 30 veces seguidas en dos minutos, con adolescentes tecleando, sin contraseñas que nadie recuerda y sin dejar entrar a quien no debe.

## Criterios de aceptación

- [x] El docente puede crear una sesión eligiendo banco, cursos, `n_preguntas`, `duracion_minutos` (plazo del **reloj global**), `segundos_minimos_pregunta` y `nivel_feedback`.
- [x] Los valores por defecto son 20 preguntas, 60 minutos, 10 segundos mínimos y feedback `aciertos`.
- [x] No se puede abrir una sesión cuyo banco tenga menos preguntas que `n_preguntas`; se explica por qué.
- [x] Pueden coexistir varias sesiones abiertas a la vez (10A en Ciencias mientras 10B está en Matemáticas).
- [x] Los parámetros de una sesión abierta **no se pueden modificar**; la interfaz los muestra en solo lectura y la API los rechaza.
- [x] El estudiante entra escribiendo únicamente su código.
- [x] Un código inexistente muestra "No encontramos ese código. Revísalo con tu docente." y no revela si el código existe en otro curso.
- [x] Un estudiante cuyo curso no está convocado no puede entrar y se le explica.
- [x] El estudiante elige a qué sesión entra entre las disponibles para su curso; la mecánica del portal está en la feature [013](../013-portal-estudiante/spec.md).
- [x] Al entrar por primera vez se crea su intento con una semilla propia y se le devuelve un token que la tablet guarda.
- [x] Si recarga la página o se le apaga la tablet, volver a entrar con su código lo devuelve a **su mismo intento**, no a uno nuevo.
- [x] El token se renueva en cada entrada: la última tablet en la que se identificó es la única que sigue valiendo.
- [ ] Un estudiante que ya entregó no puede volver a entrar: ve su resultado, no un examen nuevo. _(el intento se marca como entregado y el estado lo refleja; la pantalla de resultado llega en la feature 007.)_
- [x] Dos estudiantes distintos nunca reciben el mismo token.
- [x] El código se recorta de espacios antes de comparar, y espacios sobrantes no impiden entrar.

## Fuera de alcance

- El sorteo de preguntas y el barajado de opciones (feature 005): aquí solo se crea el intento y su semilla.
- La presentación de las preguntas (feature 006).
- Autenticación del panel del docente: la resuelve la feature [011](../011-autenticacion-docente/spec.md).
- Cerrar la sesión y forzar entregas (feature 008).
