# 012 · Pantalla de proyección

**Estado:** implementado ✅

## Qué hace

Es lo que el docente pone en el proyector y ve toda la clase. Muestra, en tamaño legible desde el fondo del aula:

- el **código QR** que las tablets escanean para entrar,
- la **dirección** en letra grande, para quien prefiera escribirla,
- el **nombre de la prueba**,
- el **reloj**: cuánto falta para que termine,
- **cuántos han entrado y cuántos han entregado**.

Lleva tres controles y nada más: **Comenzar**, **Pausar** y **Cerrar**. Comenzar arranca el reloj global de la sesión y habilita las respuestas; Pausar lo detiene para todos; Cerrar termina el examen y entrega a quien siga presentando.

No muestra nombres, ni notas, ni preguntas, ni respuestas. Nada que no pueda ver la clase entera.

## Por qué

Resuelve los dos primeros minutos del examen, que hoy son los más caros: treinta adolescentes tecleando una dirección producen una decena de errores de tipeo y una cola de manos levantadas. Con el QR proyectado, entrar es apuntar la tablet.

Y da al aula un reloj común. Sin él, cada estudiante tiene su propio contador y nadie sabe cuánto queda "de verdad": ni el docente para avisar, ni el estudiante para administrarse.

## Criterios de aceptación

- [x] La pantalla muestra el QR, la dirección, el nombre de la prueba, el reloj y los contadores de entrados y entregados. _(verificado en navegador a 1024×768 y 1920×1080.)_
- [x] El QR codifica la **dirección estable del portal del estudiante**, no una URL con parámetros de sesión. _(la API usa la URL raíz elegida por `urlsDeIntranet`; prueba automatizada.)_
- [x] El QR se genera **sin conexión** y sin dependencias externas. _(`server/qr.js`; la prueba recupera el texto desde la matriz.)_
- [ ] El QR escaneado desde una tablet real abre el portal del estudiante.
- [ ] Todo es legible desde el fondo de un aula: el reloj y la dirección ocupan la mayor parte de la pantalla.
- [x] "Comenzar" pasa la sesión a `en_curso`, fija `comenzada_en` y arranca el reloj. _(pruebas de servicio/API y navegador.)_
- [x] Mientras la sesión está `abierta` pero no comenzada, el estudiante que ya entró ve "Espera a que tu docente inicie la prueba" y **no puede responder**. _(verificado en la 013; la 012 conserva el estado `abierta` hasta Comenzar.)_
- [x] "Pausar" detiene el reloj para todos y bloquea las respuestas; "Reanudar" lo continúa sumando el tiempo pausado al plazo. _(verificado por servicio y API de la feature 006.)_
- [x] "Cerrar" pide confirmación indicando cuántos siguen presentando y entrega a todos. La calificación se completa en la feature 007. _(confirmación implementada; entrega forzada cubierta por prueba automatizada.)_
- [x] El reloj proyectado y el que ve cada tablet muestran **el mismo tiempo restante**, calculado por el servidor. _(`tiempoRestante` alimenta ambas API; ambos clientes interpolan desde ese valor.)_
- [x] Al llegar a cero, la sesión se cierra y se entrega a todos automáticamente. _(prueba automatizada con `motivo_entrega = "tiempo"`.)_
- [x] Los contadores se actualizan solos, sin recargar. _(sincronización cada 5 s.)_
- [x] La pantalla **no muestra** ningún nombre de estudiante, puntaje, pregunta ni respuesta. _(prueba explícita sobre la respuesta de proyección.)_
- [x] La pantalla exige sesión de docente: abrirla desde una tablet sin contraseña no funciona. _(protección por prefijo y prueba HTTP.)_
- [x] Funciona a pantalla completa sin barras de desplazamiento en una resolución de proyector típica (1024×768 y 1920×1080). _(ambas resoluciones verificadas en navegador: scroll igual al viewport.)_

> **Cierre (26/08/2026).** La implementación y sus integraciones con 006 están completas. Las dos comprobaciones físicas —escaneo del QR y legibilidad real en aula/proyector— se agrupan, por decisión del usuario, en la sesión final de prueba sobre el equipo destino y permanecen sin marcar hasta entonces.

## Fuera de alcance

- Ver quién ha entrado con nombre y apellido: eso es el panel de monitoreo (feature 008), que no se proyecta.
- Personalizar colores, logo del colegio o mensajes.
- Proyectar varias sesiones a la vez: se proyecta una, la que el docente elija.
