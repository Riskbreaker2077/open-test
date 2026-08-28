# 006 · Presentación del examen — Plan

## Enfoque

El servidor es la única fuente de verdad de todo lo que importa: qué pregunta toca, cuánto tiempo queda y si una respuesta se acepta. La tablet solo pinta y envía; su reloj y su estado son sugerencias. Esto es lo que hace que manipular el navegador no dé ventaja y que una recarga no pierda nada.

Cada respuesta se envía en el momento de darla, no al final. No hay estado acumulado en el cliente que se pueda perder: recargar es simplemente volver a pedir el estado al servidor.

El renderizado reutiliza `public/shared/pregunta.js`, el mismo módulo que ya usa la previsualización del docente (feature 003).

## Implementación

1. `server/routes/examen.js`, sobre el middleware `conIntento` de la feature 004:
   - `GET /api/examen/pregunta/:n` — devuelve contexto, imagen, enunciado y opciones **en el orden guardado**, la respuesta previa si la hay, el progreso y los segundos restantes del examen. **Nunca `es_correcta`.**
   - `POST /api/examen/responder` — `{ n, opcionId | null, segundos }`. Valida que el intento esté vivo, que el tiempo no se haya agotado y que se cumpla el mínimo por pregunta. Guarda con `INSERT ... ON CONFLICT DO UPDATE` sobre `intento_pregunta_id`.
   - `POST /api/examen/entregar` — cierra el intento con `motivo_entrega`.
2. `server/services/examen.js` — `estadoDeIntento(db, intento)`: calcula pregunta actual, restantes y segundos que quedan a partir del **reloj global de la sesión** (`comenzada_en`, `duracion_minutos`, `segundos_pausados`), no del momento en que entró el estudiante. `verificarTiempo(db, intento)`: si el plazo venció, entrega automáticamente con motivo `tiempo`; se invoca al principio de toda ruta que opere sobre un intento, de modo que el corte no dependa de que el navegador avise.
3. `server/schema.sql` + `server/migraciones.js` — el intento persiste `pregunta_actual` y `pregunta_mostrada_en`. La primera permite recargar exactamente donde iba; la segunda permite que el servidor compruebe el mínimo sin confiar en el reloj de la tablet. Una migración idempotente añade ambas columnas a bases existentes.
4. `public/estudiante/examen.html` + `examen.js`:
   - carga el estado al abrir y navega a la pregunta que corresponda;
   - deshabilita "Siguiente" y muestra la cuenta atrás del mínimo por pregunta;
   - envía la respuesta y **solo entonces** avanza, con indicador de "guardando" y reintento con aviso visible si falla;
   - temporizador global que se **resincroniza con el servidor** en cada petición, en lugar de contar solo en local;
   - diálogo de "Terminar la prueba" con el recuento de no respondidas;
   - en la última pregunta, el botón de avanzar se convierte en "Terminar", que entrega con motivo `ultima_pregunta`.
5. `public/estudiante/examen.css` — tipografía grande, opciones como tarjetas táctiles, sin scroll horizontal, área de toque generosa.
6. Tests de servidor: rechazo de respuesta antes del mínimo, rechazo tras agotarse el tiempo, entrega automática por tiempo, respuesta sobre intento ya entregado rechazada, orden de opciones estable entre llamadas, ausencia de `es_correcta` en todas las respuestas, y reanudación devolviendo la misma pregunta y las mismas respuestas.

## Decisiones

- **El servidor calcula el tiempo, no el navegador** — la alternativa (contar en el cliente) regala el examen a quien cambie la hora del sistema o pause el JavaScript. Además es lo único que hace que el reloj del proyector y el de treinta tablets coincidan.
- **El mínimo por pregunta se valida también en el servidor** — si solo se deshabilitara el botón, bastaría con la consola del navegador para saltárselo. El bloqueo visual es la comodidad; la regla vive en el servidor.
- **Guardado inmediato por respuesta, sin cola offline** — la intranet del aula está a metros del portátil; una cola offline añadiría una clase entera de errores de sincronización a cambio de cubrir un escenario que la propia arquitectura ya asume disponible. Se documenta como límite.
- **Permitir volver atrás y cambiar la respuesta** — el requisito pedía poder saltar; saltar sin poder volver haría la función inútil. La navegación libre entre las preguntas asignadas es la lectura razonable.
- **Los segundos por pregunta los reporta el cliente y los acota el servidor** — el cliente sabe cuánto estuvo la pregunta en pantalla; el servidor recorta valores imposibles para que el dato exportado sea útil sin ser manipulable.
- **La posición actual y el comienzo de la vista viven en el intento** — no se infieren de la primera pregunta sin respuesta: el estudiante puede saltar, volver atrás o cambiar una respuesta. Guardarlas explícitamente hace que una recarga retome la pantalla exacta y permite validar el mínimo con tiempo del servidor.
- **Renderizado compartido con la previsualización del docente** — garantiza que lo que el docente revisó es lo que el estudiante ve.

## Riesgos

- **Doble toque en "Siguiente"** que salta una pregunta — mitigación: el botón se bloquea mientras hay un envío en curso y la navegación es por índice explícito, no por incremento.
- **La tablet suspende la pantalla y el temporizador local se desfasa** — mitigación: el tiempo se resincroniza con el servidor en cada petición y el corte real lo decide el servidor.
- **Pérdida de red justo al entregar** — el estudiante no sabe si entregó. Mitigación: la entrega es idempotente y la pantalla no avanza hasta confirmar; si falla, el mensaje dice explícitamente "no se pudo entregar, vuelve a intentarlo".
- **Imágenes grandes lentas en tablets modestas** — mitigación: límite de tamaño ya aplicado en la feature 003 y carga de la imagen sin bloquear el resto de la pregunta.
