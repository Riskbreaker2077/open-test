# 043 · Enviar resultados al portal

**Estado:** propuesta 📝 — pendiente de aprobación del usuario. Exige antes una
enmienda de la constitución (ver *Choque con la constitución*).

## Qué hace

Evita el paso manual «descargar el ZIP → abrir el portal → subirlo». Después
de cerrar una evaluación, OpenTest envía **el mismo ZIP de reproducción v3 de
hoy** al portal de estudiantes de la I.E. Santa Teresa de Jesús, cuando el
portátil tenga internet.

1. **Vincular una sola vez.** En el portal, el profesor crea un token de envío
   (Configuración → OpenTest). En OpenTest, **Configuración → Portal** pide la
   dirección del portal y ese token. El token se guarda en la base local; nunca
   se muestra completo otra vez.
2. **Asociar la evaluación.** Al crear o editar una evaluación, un campo
   opcional **Código de la evaluación en el portal** (el que el portal muestra
   en la evaluación del módulo).
3. **Cola de salida.** Al cerrar una evaluación que tiene código, OpenTest deja
   un envío **pendiente**. Nada sale a la red en ese momento: el aula no tiene
   internet.
4. **Enviar.** En **Resultados**, el panel muestra «N envíos pendientes al
   portal» y un botón **Enviar ahora**. Solo al pulsarlo OpenTest intenta
   conectarse. Por cada pendiente:
   - comprueba el código contra el portal y muestra el nombre de la evaluación
     de destino;
   - sube el ZIP;
   - lo marca **enviado** con la fecha, o deja el error en español («Sin
     conexión», «Token revocado», «El código no existe en el portal»…) y sigue
     pendiente.
5. **Nada se publica solo.** El ZIP llega a la bandeja **Agentes** del portal
   como propuesta de importación. El profesor la revisa y la aprueba allí, con
   la misma previsualización de siempre (filas, anulados, reemplazo).

Reenviar la misma evaluación es seguro: el portal reconoce el paquete por su
huella y no lo duplica. Si en OpenTest se anula o se devuelve una prueba
después de enviar, la evaluación vuelve a quedar pendiente.

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

- [ ] Sin vinculación, o sin código en la evaluación, OpenTest se comporta
  exactamente como la 1.4.x y no abre ninguna conexión.
- [ ] Ninguna conexión saliente ocurre sin que el docente pulse **Enviar
  ahora**, ni con una evaluación en curso o pausada (test que intercepta
  `fetch` durante un examen completo).
- [ ] El ZIP enviado es byte a byte el mismo que se descarga a mano
  (`formato_version: 3`).
- [ ] Cerrar una evaluación con código la deja pendiente; enviarla con éxito
  la marca enviada con fecha.
- [ ] Anular o devolver una prueba después del envío la vuelve a dejar
  pendiente.
- [ ] Sin red, token revocado, código inexistente o ZIP rechazado: mensaje en
  español, el envío sigue pendiente y no se pierde nada.
- [ ] El token no aparece en la interfaz después de guardarlo, ni en
  registros, ni en exportaciones.
- [ ] Solo se envía a direcciones `https://`.

## Fuera de alcance

- Envío automático al detectar red: se descartó para que el docente sepa
  cuándo salen datos de menores del portátil.
- Traer al OpenTest estudiantes o preguntas desde el portal.
- Publicar notas sin la aprobación del profesor en el portal.
