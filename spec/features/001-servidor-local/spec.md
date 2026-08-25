# 001 · Servidor local

**Estado:** implementado ✅

## Qué hace

El docente arranca OpenTest en su portátil y, sin configurar nada, obtiene en pantalla la dirección que debe dictar a las tablets: algo como `http://192.168.1.34:3000`. Desde cualquier tablet conectada a la misma red del colegio, esa dirección abre la aplicación.

Esta feature no tiene aún funcionalidad de examen: entrega el esqueleto sobre el que se montan todas las demás —servidor, base de datos y las dos páginas de entrada (docente y estudiante)— más la parte que más fricción le quita al docente: descubrir y mostrar la URL correcta.

## Por qué

Es el cimiento técnico y, a la vez, el primer punto donde el proyecto puede fracasar en el aula. Un docente que no sabe qué IP tiene su portátil no puede empezar el examen, y averiguarlo implica abrir una terminal —justo lo que la misión prohíbe. Resolverlo aquí, de entrada, hace que todo lo demás sea utilizable.

## Criterios de aceptación

- [x] `npm start` arranca el servidor sin pedir configuración previa ni variables de entorno.
- [x] La primera vez, se crea `data/opentest.db` con todas las tablas del modelo de datos de `tech-stack.md`; arranques posteriores reutilizan el archivo sin perder datos.
- [x] Al arrancar, la consola muestra de forma destacada la URL de intranet (`http://<ip-lan>:<puerto>`), no `localhost`.
- [x] Si el portátil tiene varias interfaces de red, se listan todas las URL candidatas y se marca la más probable.
- [x] El servidor escucha en `0.0.0.0`, de modo que otro dispositivo de la misma red puede abrir esa URL. _(verificado accediendo por las IP de red del equipo; falta la prueba con una tablet real.)_
- [x] `GET /` devuelve una página de bienvenida en español con dos accesos claros: "Soy docente" y "Soy estudiante".
- [x] `GET /api/salud` devuelve `{ "ok": true, "version": "..." }`.
- [x] Si el puerto está ocupado, el mensaje de error lo dice en español y sugiere cómo cambiarlo, en lugar de volcar un stack trace.
- [x] La aplicación no realiza ninguna petición de red saliente al arrancar. _(test automático: ningún archivo servido apunta a un origen externo; falta la prueba con la red físicamente desconectada.)_
- [x] `npm test` pasa e incluye pruebas del esquema y de `/api/salud`.

## Revisión posterior

La portada con los dos accesos ("Soy docente" / "Soy estudiante") queda **sustituida por la feature [013 · Portal del estudiante](../013-portal-estudiante/spec.md)**: enseñaba al estudiante dónde estaba la puerta del docente, que es justo lo que la separación de superficies de `mission.md` prohíbe. La raíz pasa a ser el portal del estudiante y el panel vive tras la contraseña de la feature 011. Todo lo demás de esta feature —servidor, esquema, descubrimiento de la URL— sigue vigente.

## Fuera de alcance

- Cualquier gestión de estudiantes, preguntas, sesiones o exámenes (features 002 en adelante).
- Autenticación del panel del docente.
- El ejecutable de un clic y el QR de la URL (feature 010).
