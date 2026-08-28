# 008 · Panel del docente — Plan

## Enfoque

Un único endpoint que devuelve el estado completo de la sesión, y un cliente que lo pide cada 5 segundos. Se descarta websockets o SSE: la actualización en vivo aquí significa "que el docente no tenga que pulsar F5", y con 40 estudiantes una consulta agregada cada 5 segundos es una carga trivial que además se recupera sola de cualquier corte de red, sin lógica de reconexión.

Cerrar la sesión reutiliza la calificación de la feature 007 sobre cada intento vivo, dentro de una transacción: la sesión no queda cerrada a medias con la mitad de los estudiantes sin calificar.

## Implementación

1. `server/services/monitoreo.js` — `estadoDeSesion(db, sesionId)`: una consulta con `LEFT JOIN` desde `estudiantes` (filtrados por los cursos convocados) hacia `intentos`, más un conteo de respuestas por intento para saber el avance. Devuelve el reloj global de la sesión y los contadores agregados; todos los intentos activos comparten ese mismo tiempo restante.
2. `server/services/sesiones.js` — `cerrarSesion(db, id)`: en una transacción, entrega y califica todos los intentos sin `entregado_en` con motivo `forzada_docente`, y pasa la sesión a `cerrada`.
3. `server/services/intentos.js` — `forzarEntrega(db, intentoId)`, que reutiliza la misma ruta de entrega y calificación que usa el estudiante.
4. Rutas: `GET /api/docente/sesiones/:id/monitoreo`, `POST /api/docente/intentos/:id/forzar-entrega`, `POST /api/docente/sesiones/:id/cerrar`.
5. `public/docente/monitoreo.html` + `monitoreo.js` — tabla de estudiantes ordenable, contadores arriba, URL destacada, sondeo cada 5 s que se **detiene cuando la pestaña no está visible** (`visibilitychange`) y se reanuda al volver.
6. Verificar los índices ya existentes en `respuestas(intento_pregunta_id)` e `intentos(sesion_id)` para que la consulta agregada no degrade con 40 intentos; no se crea una migración redundante.
7. Tests: `estadoDeSesion` con estudiantes en los tres estados; el cierre entrega y califica todos los vivos; tras cerrar, entrar o responder se rechaza; la entrega forzada deja el motivo correcto y calcula el puntaje.

## Decisiones

- **Sondeo cada 5 s en lugar de websockets** — el requisito real es "que se actualice solo". El sondeo no necesita reconexión, no rompe con el wifi intermitente del colegio y no añade dependencias. Se descarta SSE por la misma razón: complejidad sin beneficio a esta escala.
- **Un solo endpoint con el estado completo** — evita media docena de llamadas y hace que el cliente sea casi solo una plantilla. La carga útil con 40 estudiantes son unos pocos KB.
- **Cerrar la sesión entrega a todos** — la alternativa (dejar intentos abiertos para siempre) produciría exports incompletos y estudiantes en limbo. Cerrar es una decisión deliberada del docente, con confirmación que dice a cuántos afecta.
- **La entrega forzada reutiliza la ruta del estudiante** — dos caminos distintos para calificar acabarían divergiendo; hay uno solo.
- **Detener el sondeo con la pestaña oculta** — el portátil del docente suele quedarse abierto toda la mañana.
- **El panel muestra nombres completos** — es lo que convierte el monitoreo en un control real de suplantación.

## Riesgos

- **El docente cierra la sesión por error con estudiantes presentando** — es destructivo e irreversible. Mitigación: confirmación que dice explícitamente cuántos están presentando en ese momento y que serán entregados.
- **Estudiantes que aparecen como "sin entrar" por un curso mal escrito** — se ve como un aula entera ausente. Mitigación: ya se atacó en la feature 004 poblando los cursos desde la base; aquí el panel muestra los cursos convocados junto al recuento para que el desajuste sea evidente de inmediato.
- **La consulta agregada creciendo con el histórico** — mitigación: siempre acotada a una sesión, más los índices previstos.
