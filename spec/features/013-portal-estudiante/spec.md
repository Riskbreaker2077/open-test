# 013 · Portal del estudiante

**Estado:** implementado ✅

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
- [x] Si ya entregó, ve su resultado, no un examen nuevo. _(integración completada por la feature 007: la reentrada con código recupera el mismo intento y redirige a su resultado.)_
- [x] Si tenía un examen a medias, lo reanuda donde iba. _(la feature 006 persiste `pregunta_actual`; verificado por tests y recarga en navegador.)_
- [x] Ninguna página del portal enlaza a `/docente/` ni a `/proyeccion/`, ni los menciona. _(cubierto por el test automatizado que escanea recursivamente todo `public/` fuera de `docente/` y `proyeccion/`.)_
- [x] Intentar abrir `/docente/` desde una tablet lleva al inicio de sesión, no al panel. _(cubierto por el test automatizado de la feature 011.)_
- [ ] La interfaz es usable con el dedo: campo de código grande, teclado adecuado, botones de 44 px o más. _(el CSS ya usa el mismo `--toque: 44px` que el resto del sitio; falta confirmarlo con el dedo en una tablet real.)_
- [ ] Funciona igual llegando por el QR que escribiendo la dirección a mano. _(el QR ya apunta a la raíz por la feature 012; falta escanearlo con una tablet real.)_

> **Nota de integración (26/08/2026).** Las features 006 y 007 completaron y probaron la reanudación del examen y el regreso al resultado con el mismo intento.

> **Cierre (26/08/2026).** La feature se considera implementada dentro de su alcance. Los criterios aún sin marcar son verificaciones visuales o físicas y se harán en la sesión final con el equipo destino.

## Fuera de alcance

- La presentación de las preguntas (feature 006) y el resultado (feature 007): el portal lleva hasta la puerta del examen.
- Que el estudiante elija entre varias sesiones del **mismo** curso abiertas a la vez: se listan todas y elige, sin más lógica.
- Recordar al estudiante entre exámenes distintos: cada evaluación empieza escribiendo el código.
