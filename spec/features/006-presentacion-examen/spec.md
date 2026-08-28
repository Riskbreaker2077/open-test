# 006 · Presentación del examen

**Estado:** implementado ✅

## Qué hace

Es el examen tal como lo vive el estudiante en la tablet. Ve **una pregunta a la vez**, con su contexto y su imagen si los tiene, y sus cuatro opciones en el orden que le tocó. Puede responder o saltar y seguir adelante. Arriba tiene el tiempo que le queda y por qué pregunta va.

El botón de avanzar **no se habilita hasta que hayan pasado los segundos mínimos** que configuró el docente: es el mecanismo contra el que responde a ciegas para salir corriendo.

Puede terminar la prueba cuando quiera, con una confirmación que le dice cuántas dejó sin responder. Si se le acaba el tiempo, se entrega sola. Y si la tablet se apaga, se recarga o se cae la red, al volver a entrar retoma **su mismo examen, en la misma pregunta, con sus respuestas intactas**.

## Por qué

Es la única parte que ve el estudiante, y es donde el aula pone a prueba todos los supuestos: tablets que se bloquean, dedos que tocan dos veces, wifi que parpadea, alguien que cierra la pestaña sin querer. Una respuesta perdida es una nota injusta y una queja para el docente. La robustez aquí no es un extra de calidad: es el requisito.

## Criterios de aceptación

- [x] Se muestra una sola pregunta por pantalla, con contexto e imagen cuando existen.
- [x] Las opciones aparecen en el orden guardado en `orden_opciones`, idéntico cada vez que se vuelve a esa pregunta.
- [x] Se ve siempre el progreso ("Pregunta 7 de 20") y el tiempo restante del **reloj global de la sesión**, el mismo que se proyecta al aula.
- [x] Se puede seleccionar una opción y avanzar; la respuesta queda guardada en el servidor antes de pasar a la siguiente.
- [x] Se puede saltar una pregunta sin responder y seguir adelante.
- [x] Se puede volver a una pregunta anterior y cambiar la respuesta mientras el examen siga abierto.
- [x] El botón de avanzar permanece deshabilitado hasta cumplirse `segundos_minimos_pregunta`, mostrando la cuenta atrás de forma visible.
- [x] Con `segundos_minimos_pregunta = 0` no hay bloqueo alguno.
- [x] El bloqueo se aplica también **en el servidor**: una respuesta enviada antes del mínimo se rechaza, aunque se manipule el navegador.
- [x] Se registran los segundos que el estudiante estuvo en cada pregunta.
- [x] Se puede terminar la prueba en cualquier momento; la confirmación indica cuántas preguntas quedan sin responder.
- [x] Al agotarse el reloj global, todos los exámenes se entregan automáticamente con `motivo_entrega = "tiempo"`.
- [x] Mientras la sesión está `abierta` (aún no comenzada) o `pausada`, el servidor rechaza cualquier respuesta y la tablet muestra la pantalla de espera.
- [x] Al responder o saltar la última pregunta se ofrece entregar; hacerlo desde ahí registra `motivo_entrega = "ultima_pregunta"`, y desde el botón de terminar registra `"manual"`.
- [x] El tiempo restante lo calcula el **servidor**: cambiar la hora de la tablet no da más tiempo.
- [x] Recargar la página devuelve al estudiante a la misma pregunta con sus respuestas conservadas.
- [x] Cerrar la pestaña y volver a entrar con el código reanuda el mismo intento, no uno nuevo.
- [ ] Si se pierde la red al enviar una respuesta, se avisa en pantalla y se reintenta; el estudiante nunca cree que quedó guardado algo que no quedó.
- [x] Ninguna respuesta del servidor durante el examen indica cuál es la opción correcta (test explícito).
- [ ] La interfaz es usable con el dedo en una tablet: opciones y botones de 44 px o más, sin desplazamiento horizontal.

## Fuera de alcance

- La pantalla de resultado y la retroalimentación (feature 007).
- Preguntas extra por rapidez (backlog).
- Guardado sin conexión con sincronización posterior: se asume que la intranet está disponible; las caídas se manejan con reintentos y aviso, no con una cola offline.

> **Cierre (26/08/2026).** La implementación y 18 de 20 criterios están verificados. Las pruebas manuales de corte real de red y uso físico/orientación en tablet se agrupan en la sesión final sobre el equipo destino; permanecen sin marcar hasta entonces.
