# 043 · Enviar resultados al portal

**Estado:** implementado ✅ (28/09/2026), aprobado por el usuario junto con la
enmienda de la constitución. Pendiente de publicar versión y de probarlo en el
equipo del docente contra el portal en producción.

## Qué hace

Evita el paso manual «descargar el ZIP → abrir el portal → subirlo». Cuando el
portátil tenga internet, OpenTest envía **el mismo ZIP de reproducción v3 de
hoy** al portal de estudiantes de la I.E. Santa Teresa de Jesús.

Todo vive en una página nueva del panel, **Enviar al portal**:

1. **Vincular una sola vez.** En el portal, el profesor crea una credencial con
   el permiso «Enviar resultados desde OpenTest» (feature 030 del portal). En
   OpenTest escribe la dirección del portal y pega esa clave. La clave se
   guarda en la base local y **nunca vuelve a mostrarse**: solo sus últimos
   cuatro caracteres. Se puede desvincular.
2. **Asociar cada evaluación.** Cada evaluación cerrada tiene un campo
   **Código en el portal** (el que el portal muestra en la evaluación del
   módulo). Se puede escribir o cambiar en cualquier momento, también después
   de cerrar.
3. **Pendientes.** Una evaluación cerrada, con código y con al menos un
   intento, queda **pendiente** si nunca se envió o si sus resultados cambiaron
   desde el último envío (una prueba anulada o devuelta, otro código). No hace
   falta avisar a OpenTest: lo calcula con una huella del estado de los
   intentos. Nada sale a la red por quedar pendiente.
4. **Enviar ahora.** Solo al pulsarlo OpenTest se conecta. Por cada pendiente:
   - pregunta al portal a qué evaluación corresponde el código y muestra
     módulo, asignatura y cursos;
   - sube el ZIP;
   - lo marca **enviado** con la fecha, o guarda el error en español («Sin
     conexión con el portal», «La clave fue revocada», «El código no existe en
     el portal»…) y sigue pendiente.
   Si hay una evaluación en curso o en pausa, el botón no envía nada y lo dice.
5. **Nada se publica solo.** El ZIP llega a la bandeja **Agentes** del portal
   como propuesta de importación. El profesor la aprueba allí, con la misma
   previsualización de siempre.

Reenviar es seguro: el portal reconoce el paquete por su huella y no crea una
segunda propuesta.

## Choque con la constitución

`mission.md` («No es un servicio en la nube… ni sincronización, ni servidor
remoto») y `tech-stack.md` («Ninguna petición de red saliente en runtime»)
prohíben esto. **No se implementa sin corregirlas primero.** Enmienda
propuesta, mínima:

> Única excepción a la red saliente: el envío de resultados al portal de
> estudiantes, **solo** cuando el docente pulsa «Enviar ahora» en el panel,
> **nunca** con una evaluación en curso o pausada, **nunca** automático ni en
> segundo plano, y sin que ninguna función del examen dependa de él. Si no hay
> red, OpenTest funciona exactamente igual.

## Criterios de aceptación

- [x] Sin vinculación, o sin código en la evaluación, OpenTest se comporta
  exactamente como la 1.4.x y no abre ninguna conexión. _(envios-portal.test.js)_
- [x] Con una evaluación en curso o en pausa, **Enviar ahora** no abre
  ninguna conexión. _(envios-portal.test.js y docente.portal.test.js)_
- [x] Ninguna conexión saliente ocurre sin que el docente pulse **Enviar
  ahora**, ni con una evaluación en curso o pausada (test que intercepta
  `fetch` durante un examen completo). _(docente.portal.test.js)_
- [x] El ZIP enviado es el mismo que se descarga a mano
  (`formato_version: 3`; solo cambia `exportado_en`, la hora de exportación).
  _(envios-portal.test.js)_
- [x] Una evaluación cerrada con código queda pendiente; enviarla con éxito
  la marca enviada con fecha. _(pruebas y recorrido contra el portal real)_
- [x] Anular o devolver una prueba después del envío la vuelve a dejar
  pendiente. _(envios-portal.test.js)_
- [x] Sin red, token revocado, código inexistente o ZIP rechazado: mensaje en
  español, el envío sigue pendiente y no se pierde nada. _(envios-portal.test.js)_
- [x] El token no aparece en la interfaz después de guardarlo, ni en
  registros, ni en exportaciones. _(docente.portal.test.js; recorrido en Chromium)_
- [x] Solo se envía a direcciones `https://` (se admite `http://` únicamente
  para `localhost` y `127.0.0.1`, para pruebas).

> **Recorrido de punta a punta (28/09/2026).** OpenTest en memoria contra el portal
> real corriendo en local (Next.js + MySQL 8.4): vincular, escribir el código real
> `STJ / EVA / …`, **Enviar ahora**, propuesta `IMPORTACION_OPENTEST` en la bandeja,
> aprobarla y ver el resultado publicado. Ese recorrido encontró que los códigos del
> portal llevan espacios y barras; se corrigió la spec y ambos lados antes de cerrar.

## Fuera de alcance

- Envío automático al detectar red: se descartó para que el docente sepa
  cuándo salen datos de menores del portátil.
- Traer al OpenTest estudiantes o preguntas desde el portal.
- Publicar notas sin la aprobación del profesor en el portal.
