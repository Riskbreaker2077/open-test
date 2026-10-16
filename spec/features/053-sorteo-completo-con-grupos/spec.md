# 053 · Sorteo completo con grupos — Spec

**Estado:** implementado ✅ (pendiente reanudar la evaluación de 11A con la 1.8.1)

## Por qué

El 16/10/2026, en «11A - Módulo 2 - III - CS» (20 preguntas, banco de 40 con
6 sueltas y 8 grupos de contexto compartido de 4 y 5 preguntas), los
estudiantes llegaron a la pregunta 16 o 17 y no pudieron seguir: la pantalla
decía «Esa pregunta no forma parte de tu prueba.» y no dejaba avanzar ni saltar.

La causa está en el sorteo (017 + 026): trata cada grupo como una pieza que no
se parte y, cuando la siguiente pieza no cabía en lo que faltaba, **dejaba de
rellenar**. Así la prueba quedaba con 16 o 17 preguntas mientras la evaluación
anunciaba 20, y la tablet pedía la 17 o la 18, que no existía. Los 22 intentos
de esa evaluación quedaron cortos.

## Qué hace

- El sorteo siempre llega exactamente al número de preguntas de la evaluación
  cuando el banco lo permite:
  1. Primero, como hasta ahora, cuotas por competencia con grupos enteros.
  2. Si falta, rellena con piezas enteras (sueltas o grupos) que quepan.
  3. Si todavía falta, toma preguntas **sueltas de un grupo de contexto
     compartido**. Partirlo no estorba: cada pregunta se muestra con el
     contexto del grupo. Esto revisa la regla de la 026 solo para este caso,
     como último recurso.
  - Los grupos de emparejamiento y de texto con blancos nunca se parten.
- Si ni así se completa, el sorteo falla con un mensaje claro en vez de
  generar una prueba corta. `abrirSesion` lo comprueba antes de abrir la
  evaluación, para que el docente lo vea y baje el número.
- **Reparación de pruebas cortas:** si un intento no entregado tiene menos
  preguntas que la evaluación, se completa agregando al final las que faltan
  (sorteadas de las que no tiene, con la misma regla). Lo ya visto y
  respondido no cambia: las filas existentes no se tocan. Ocurre al reanudar
  (volver a entrar con el código) y al pedir una pregunta que no existe.

## Fuera de alcance

- No cambia el esquema ni los contratos: sin migración.
- Intentos entregados no se tocan.

## Criterios de aceptación

- [x] Banco como el de 11A (6 sueltas + grupos de contexto compartido 5,5,4×6), 20 preguntas: 300 semillas dan exactamente 20, sin repetir.
- [x] Los grupos de emparejamiento y de texto con blancos siguen sin partirse.
- [x] Un banco donde 20 no se puede formar sin partir un grupo indivisible falla con mensaje claro, y `abrirSesion` lo rechaza.
- [x] Un intento con 16 de 20 se completa a 20: las 16 filas originales quedan idénticas y las nuevas van de la 17 a la 20 sin repetir preguntas.
- [x] Pedir la pregunta 17 de un intento corto la devuelve en vez de dar 404.
- [x] Un intento entregado no se completa.
- [x] Copia de la base real: los 22 intentos de 11A quedan en 20 sin tocar sus respuestas.
- [ ] Reanudada en el aula con la 1.8.1 (queda para el usuario).
