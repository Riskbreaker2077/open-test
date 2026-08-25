# 013 · Portal del estudiante

**Estado:** propuesta

## Qué hace

Es la raíz del servidor: la **dirección estable** que va en el QR proyectado y que no cambia de una evaluación a otra. El estudiante llega ahí —escaneando o escribiendo— y:

1. escribe su código,
2. ve las evaluaciones **abiertas para su curso**,
3. elige la suya y entra.

Si solo hay una, entra directo sin elegir. Si no hay ninguna, ve "Ahora mismo no hay ninguna prueba abierta para tu curso" en lugar de un error. Si su prueba está abierta pero el docente no ha pulsado Comenzar, ve "Espera a que tu docente inicie la prueba" con su nombre en pantalla, para que sepa que ya está dentro.

Desde aquí no hay forma de llegar al panel del docente, ni se menciona que exista.

## Por qué

Sustituye la portada de la feature 001, que ofrecía "Soy docente / Soy estudiante": eso invitaba al estudiante a una puerta que no le corresponde. La raíz es del estudiante y de nadie más.

La dirección estable es un requisito operativo: el docente proyecta siempre el mismo QR, los estudiantes se acostumbran a la misma dirección, y nada de eso depende de qué examen sea hoy. Y como ahora pueden coexistir varias sesiones abiertas —10A en Ciencias mientras 10B está en Matemáticas—, hace falta que el estudiante elija, o que el sistema elija por él cuando no hay ambigüedad.

## Criterios de aceptación

- [ ] La raíz `/` es el portal del estudiante y su dirección no cambia entre evaluaciones.
- [ ] El estudiante escribe únicamente su código para identificarse.
- [ ] Tras identificarse, ve solo las sesiones **abiertas o en curso convocadas para su curso**.
- [ ] Si solo hay una disponible, entra directamente sin pantalla de elección.
- [ ] Si no hay ninguna, ve un mensaje claro y no un error.
- [ ] Un código inexistente muestra "No encontramos ese código. Revísalo con tu docente." sin revelar nada más.
- [ ] Nunca ve sesiones de otros cursos, ni en borrador, ni cerradas.
- [ ] Si su sesión está `abierta` pero no comenzada, ve la pantalla de espera con su nombre y **no puede responder**.
- [ ] Cuando el docente pulsa Comenzar, la tablet pasa sola al examen sin que el estudiante recargue.
- [ ] Si ya entregó, ve su resultado, no un examen nuevo.
- [ ] Si tenía un examen a medias, lo reanuda donde iba.
- [ ] Ninguna página del portal enlaza a `/docente/` ni a `/proyeccion/`, ni los menciona.
- [ ] Intentar abrir `/docente/` desde una tablet lleva al inicio de sesión, no al panel.
- [ ] La interfaz es usable con el dedo: campo de código grande, teclado adecuado, botones de 44 px o más.
- [ ] Funciona igual llegando por el QR que escribiendo la dirección a mano.

## Fuera de alcance

- La presentación de las preguntas (feature 006) y el resultado (feature 007): el portal lleva hasta la puerta del examen.
- Que el estudiante elija entre varias sesiones del **mismo** curso abiertas a la vez: se listan todas y elige, sin más lógica.
- Recordar al estudiante entre exámenes distintos: cada evaluación empieza escribiendo el código.
