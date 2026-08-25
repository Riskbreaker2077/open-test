# 012 · Pantalla de proyección

**Estado:** propuesta

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

- [ ] La pantalla muestra el QR, la dirección, el nombre de la prueba, el reloj y los contadores de entrados y entregados.
- [ ] El QR codifica la **dirección estable del portal del estudiante**, no una URL con parámetros de sesión.
- [ ] El QR se genera **sin conexión** y sin dependencias externas.
- [ ] El QR escaneado desde una tablet real abre el portal del estudiante.
- [ ] Todo es legible desde el fondo de un aula: el reloj y la dirección ocupan la mayor parte de la pantalla.
- [ ] "Comenzar" pasa la sesión a `en_curso`, fija `comenzada_en` y arranca el reloj.
- [ ] Mientras la sesión está `abierta` pero no comenzada, el estudiante que ya entró ve "Espera a que tu docente inicie la prueba" y **no puede responder**.
- [ ] "Pausar" detiene el reloj para todos y bloquea las respuestas; "Reanudar" lo continúa sumando el tiempo pausado al plazo.
- [ ] "Cerrar" pide confirmación indicando cuántos siguen presentando, y entrega y califica a todos.
- [ ] El reloj proyectado y el que ve cada tablet muestran **el mismo tiempo restante**, calculado por el servidor.
- [ ] Al llegar a cero, la sesión se cierra y se entrega a todos automáticamente.
- [ ] Los contadores se actualizan solos, sin recargar.
- [ ] La pantalla **no muestra** ningún nombre de estudiante, puntaje, pregunta ni respuesta.
- [ ] La pantalla exige sesión de docente: abrirla desde una tablet sin contraseña no funciona.
- [ ] Funciona a pantalla completa sin barras de desplazamiento en una resolución de proyector típica (1024×768 y 1920×1080).

## Fuera de alcance

- Ver quién ha entrado con nombre y apellido: eso es el panel de monitoreo (feature 008), que no se proyecta.
- Personalizar colores, logo del colegio o mensajes.
- Proyectar varias sesiones a la vez: se proyecta una, la que el docente elija.
