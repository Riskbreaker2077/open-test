# 042 · Anular con triple clic y cuadro flotante

**Estado:** implementado ✅ _(pendiente de verificación en el aula)_

## Qué hace

Cambia el gesto de la 038 para anular la prueba de un estudiante desde el
tablero de asistencia de la proyección:

- El docente hace **tres clics seguidos sobre el cuadro con el nombre** del
  estudiante (en vez del doble clic de la 038).
- Aparece un **cuadro flotante** propio de OpenTest, centrado sobre la
  proyección, con el nombre completo del estudiante y la pregunta
  «¿Anular la prueba de …?». Tiene dos botones: **Anular la prueba** y
  **Cancelar**. Esc, clic fuera del cuadro o Cancelar lo cierran sin cambiar
  nada.
- Al confirmar se aplica exactamente la anulación de la 038: la prueba termina,
  queda en 0 puntos y 0 %, no hay retroalimentación en ningún nivel, el
  estudiante ve el aviso de anulación y el cuadro se pinta negro con ⊘.
- Tres clics sobre un cuadro ya anulado abren el mismo cuadro flotante
  ofreciendo **devolver la prueba** (revertir, igual que en la 038).
- En la descarga, el intento sale anulado como ya lo define la 038 y el
  contrato `export-resultados-v3.md`: columna `anulado = SÍ`, `anulado: true`
  y `anulado_en` en el JSON, puntaje 0. **`formato_version` sigue en 3**:
  esta feature no toca el exportador.

## Por qué

El docente pidió el triple clic: el doble clic se dispara con facilidad por
accidente al tocar la pantalla o el panel táctil del portátil delante del
curso. El `window.confirm` del navegador, además, sale pequeño, arriba y con
el nombre del sitio: en un proyector se lee mal y parece un error. Un cuadro
propio, grande y centrado, deja claro a quién se le va a anular antes de
hacerlo.

## Criterios de aceptación

- [x] Tres clics seguidos (cada uno a menos de 600 ms del anterior) sobre el
  mismo cuadro abren el cuadro flotante; uno o dos clics no hacen nada.
  _(triple-clic.test.js)_
- [x] Los clics sobre cuadros distintos no se suman entre sí.
  _(triple-clic.test.js)_
- [x] La cuenta sobrevive a que el tablero se repinte entre un clic y otro
  (el tablero se reconstruye cada vez que cambia la asistencia): se cuenta por
  estudiante, no por elemento del DOM. _(triple-clic.test.js)_
- [x] Pausas largas reinician la cuenta: tres clics sueltos en un minuto no
  anulan a nadie. _(triple-clic.test.js)_
- [ ] El cuadro flotante muestra el nombre completo, se lee desde el fondo del
  aula y Cancelar/Esc/clic fuera lo cierran sin cambios. _(nombre completo y Esc
  comprobados en Chromium sin cabeza; la legibilidad solo se comprueba con el
  proyector)_
- [x] Confirmar anula (o revierte) y el tablero se actualiza en el acto.
  _(recorrido en Chromium sin cabeza contra un servidor en memoria)_
- [x] Tres clics sobre quien todavía no ha entrado avisan de que no hay prueba
  que anular (igual que en la 038) y no abren el cuadro. _(mismo recorrido)_
- [x] El doble clic ya no anula. _(el cuadro solo escucha `click` y cuenta
  tres; en Chromium un doble clic no abre el cuadro)_
- [x] La exportación de un anulado no cambia respecto a la 038 y sigue en
  `formato_version: 3`. _(resultados.test.js sin cambios, en verde)_

## Fuera de alcance

- Cambiar qué significa anular, cómo se califica o cómo se exporta: todo eso
  sigue siendo la 038.
- Registrar el motivo de la anulación: el portal de estudiantes lo asigna al
  importar (ver la feature 029 del portal).
