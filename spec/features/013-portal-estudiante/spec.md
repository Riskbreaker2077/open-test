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

- [x] La raíz `/` es el portal del estudiante y su dirección no cambia entre evaluaciones. _(verificado por HTTP y en navegador real.)_
- [x] El estudiante escribe únicamente su código para identificarse. _(el formulario servido tiene un solo campo.)_
- [x] Tras identificarse, ve solo las sesiones **abiertas o en curso convocadas para su curso**. _(filtro de `sesionesDisponiblesPara` con cobertura de tests automatizados; el estudiante solo recibe/renderiza esa lista.)_
- [x] Si solo hay una disponible, entra directamente sin pantalla de elección. _(verificado en vivo: con una sola sesión abierta para 10A, María entró directo a la espera, sin elegir.)_
- [ ] Si no hay ninguna, ve un mensaje claro y no un error. _(la ruta de datos está probada por `curl`; falta verlo en pantalla — no se dio el caso en la prueba en navegador de hoy porque siempre había alguna sesión abierta.)_
- [ ] Un código inexistente muestra "No encontramos ese código. Revísalo con tu docente." sin revelar nada más. _(el mensaje está garantizado por el backend con test automatizado; falta verlo renderizado en pantalla.)_
- [x] Nunca ve sesiones de otros cursos, ni en borrador, ni cerradas. _(misma garantía de `sesionesDisponiblesPara`, cubierta por la suite automatizada.)_
- [x] Si su sesión está `abierta` pero no comenzada, ve la pantalla de espera con su nombre y **no puede responder**. _(verificado en vivo: "Espera a que tu docente inicie la prueba / Ya estás dentro, María Fernanda Gómez Ruiz." Nadie puede responder porque no existe ninguna pantalla de examen todavía.)_
- [x] Cuando el docente pulsa Comenzar, la tablet pasa sola al examen sin que el estudiante recargue. _(verificado en vivo forzando la transición en la base de datos, porque el botón "Comenzar" en sí no existe aún — pertenece a la feature 012. El salto ocurrió solo, sin recargar; el contenido al que salta es el placeholder honesto acordado, no la presentación real del examen, que es de la 006.)_
- [ ] Si ya entregó, ve su resultado, no un examen nuevo. _(el backend ya lo garantiza — un intento entregado nunca genera uno nuevo, verificado por `curl` — pero "su resultado" es, por diseño, la feature 007; ver la nota de alcance más abajo.)_
- [ ] Si tenía un examen a medias, lo reanuda donde iba. _(el backend ya reanuda el mismo intento por cookie, verificado por `curl`; "donde iba" es la presentación del examen, feature 006. Ver la nota de alcance.)_
- [x] Ninguna página del portal enlaza a `/docente/` ni a `/proyeccion/`, ni los menciona. _(cubierto por el test automatizado que escanea recursivamente todo `public/` fuera de `docente/` y `proyeccion/`.)_
- [x] Intentar abrir `/docente/` desde una tablet lleva al inicio de sesión, no al panel. _(cubierto por el test automatizado de la feature 011.)_
- [ ] La interfaz es usable con el dedo: campo de código grande, teclado adecuado, botones de 44 px o más. _(el CSS ya usa el mismo `--toque: 44px` que el resto del sitio; falta confirmarlo con el dedo en una tablet real.)_
- [ ] Funciona igual llegando por el QR que escribiendo la dirección a mano. _(no hay QR que probar todavía — lo genera la feature 012.)_

> **Nota de alcance (25/08/2026).** Los criterios de "ve su resultado" y "lo reanuda donde iba" describen una experiencia que solo se completa cuando existan las features 006 y 007, tal como dice "Fuera de alcance" más abajo. Lo que la 013 sí entrega y ya está verificado: el mecanismo nunca crea un intento nuevo ni pierde el que estaba a medias, y la transición de pantalla ocurre sola. Mientras 006/007 no existan, el estudiante ve un mensaje honesto en vez de esas pantallas.

## Fuera de alcance

- La presentación de las preguntas (feature 006) y el resultado (feature 007): el portal lleva hasta la puerta del examen.
- Que el estudiante elija entre varias sesiones del **mismo** curso abiertas a la vez: se listan todas y elige, sin más lógica.
- Recordar al estudiante entre exámenes distintos: cada evaluación empieza escribiendo el código.
