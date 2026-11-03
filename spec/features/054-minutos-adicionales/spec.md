# 054 · Minutos adicionales sobre el reloj de la evaluación

**Estado:** implementado ✅ (criterios fijados por Camilo, 2026-11-03)

## Qué hace

Un botón de engranaje (⚙) por fila en la hoja «Evaluaciones» del panel
(`/docente/sesiones.html`) que deja al docente dar **minutos adicionales en
cantidad libre** (entero ≥ 1) a una evaluación ya comenzada. Está disponible
para evaluaciones **en curso, en pausa y cerradas** — incluso cuando la prueba
ya terminó.

Dos efectos según el estado del reloj (decisión de Camilo):

- **Si el reloj sigue corriendo** (en curso o en pausa con tiempo restante):
  se **suman N minutos** a lo que queda. El reloj global pasa a valer
  `duración + adicionales + pausados − transcurridos`.
- **Si el reloj ya se agotó** (la evaluación cerró por tiempo): **quedan
  exactamente N minutos desde el momento en que los da**, sin cobrarle el
  tiempo perdido.

## Reabrir una evaluación cerrada

Dar minutos a una evaluación **cerrada** la **reabre** en curso con los N
minutos. Quién puede continuar (decisión de Camilo):

- Vuelven a presentar **solo los que fueron entregados por el cierre**: sus
  intentos con motivo de entrega `tiempo` (venció el reloj) o `cierre_docente`
  (el docente cerró la sala) se les **revoca la entrega** — borran
  `entregado_en`, motivo, aciertos y puntaje — y continúan exactamente donde
  iban (su prueba materializada no se toca).
- **Conservan su nota intacta** los que entregaron voluntariamente
  (`manual`, `ultima_pregunta`) y los que el docente entregó individualmente
  desde monitoreo (`forzada_docente`): nadie entregado a propósito vuelve a
  presentar.
- Los que nunca entraron pueden entrar normalmente mientras la evaluación
  reabierta siga en curso.

Cada otorgamiento queda **auditado** en la tabla nueva `minutos_otorgados`
(sesión, minutos, si reabrió, instante), y el total otorgado se ve en la
columna Estado de la hoja («En curso (+5 min)») y en la cabecera de monitoreo.

## Por qué

Hoy el reloj es rígido: al vencerse, `tiempoRestante` cierra la sesión y
entrega a todos los pendientes. En un aula real eso castiga al grupo por
problemas ajenos (un wifi que se cae, tablets lentas, una indicación tardía).
La única salida era cerrar y crear otra evaluación, perdiendo el examen de
todos. El docente necesita una válvula: dar 5 o 10 minutos ahora, sin tocar
los parámetros congelados ni las pruebas de los que ya entregaron.

## Decisiones de diseño

- **El engranaje es un botón más por fila**, no un menú nuevo: la hoja de
  sesiones ya usa botones de texto por fila; el engranaje entra ahí y hoy su
  única acción son los minutos adicionales (la puerta de entrada para
  opciones futuras de fila).
- **Nueva columna `sesiones.segundos_adicionales`**, no se retoca
  `duracion_minutos`: la duración original queda como se configuró y el
  otorgamiento queda auditable aparte.
- **Nuevo motivo de entrega `cierre_docente`** para distinguir el cierre de
  sala hecho por el docente del entregado individual `forzada_docente`.
  Sin esa distinción, reabrir resucitaría también a los estudiantes que el
  docente entregó a propósito desde monitoreo. (Las bases antiguas pueden
  tener cierres de sala viejos con motivo `forzada_docente`: esos intentos
  quedan entregados y no vuelven; en la práctica no hay salas reales aún.)
- **Cerrar una evaluación en pausa conserva su reloj**: al cerrar desde
  `pausada`, los segundos que estuvo pausada se suman a `segundos_pausados`
  (igual que hace reanudar). Antes se perdían y el reloj reabrido habría
  corrido de más durante la pausa.

## Criterios de aceptación

- [x] La hoja «Evaluaciones» muestra un engranaje ⚙ por fila en evaluaciones
      en curso, en pausa y cerradas (no en borrador ni abierta sin comenzar).
- [x] El engranaje pide los minutos en campo libre; entero ≥ 1; otra cosa se
      rechaza con mensaje claro (cliente y servidor).
- [x] En curso con reloj positivo: `tiempoRestante` sube exactamente N×60
      segundos tras otorgar.
- [x] En pausa: al reanudar, quedan lo pausado más N minutos.
- [x] Cerrada por tiempo: la evaluación pasa a en_curso y quedan exactamente
      N×60 segundos desde el otorgamiento (no se cobra el tiempo vencido).
- [x] Cerrada por el docente con tiempo aún disponible: quedan lo restante
      más N minutos.
- [x] Al reabrir, los intentos entregados por `tiempo` o `cierre_docente`
      quedan sin entregar (entregado_en/motivo/aciertos/puntaje nulos) y el
      estudiante continúa su misma prueba; los de `manual`,
      `ultima_pregunta` y `forzada_docente` conservan entrega y puntaje.
- [x] Un estudiante revocado puede entrar, responder la pregunta donde iba,
      entregar de nuevo y su nota se calcula bien; la sesión vuelve a cerrarse
      sola al vencer el nuevo plazo (motivo `tiempo`).
- [x] El cierre manual del docente registra motivo `cierre_docente` en los
      intentos pendientes; el vencimiento sigue registrando `tiempo`.
- [x] Cada otorgamiento inserta una fila en `minutos_otorgados` (con flag de
      reapertura); el total aparece como «(+N min)» en la columna Estado de la
      hoja y en monitoreo.
- [x] Borrador o abierta sin comenzar no aceptan minutos (error 409); minutos
      inválidos dan 400; sesión inexistente, 404.
- [x] Una base vieja (esquema anterior) migra sola al arranque: columna,
      tabla de auditoría y motivo nuevo quedan disponibles sin paso manual.
- [x] El endpoint exige sesión de docente autenticada (nace protegido bajo
      `/api/docente`). Sin dependencias nuevas.

## Fuera de alcance

- Minutos adicionales **por estudiante** (el engranaje por fila de monitoreo):
  es la extensión natural, pero hoy la necesidad es de sala completa; el
  motor de reloj por intento no existe (el reloj es global por sesión).
- Retirar minutos ya otorgados, ni editar la duración original.
- Reabrir una evaluación cerrada **sin** dar minutos.
- Cambiar la proyección/QR durante la reapertura (la dirección no cambia).
