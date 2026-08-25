# 011 · Autenticación del docente

**Estado:** implementado ✅

## Qué hace

La primera vez que se abre OpenTest, el docente elige una contraseña. A partir de ahí, entrar al panel exige esa contraseña, y todo lo que hay detrás —estudiantes, bancos, sesiones, monitoreo, resultados y la pantalla de proyección— queda fuera del alcance de cualquiera que no la tenga.

El estudiante nunca ve nada de esto. Ni un enlace desde su portal, ni una pista en un mensaje de error.

## Por qué

El diseño original asumía que el portátil del docente era de confianza y no llevaba contraseña. Eso deja de sostenerse en cuanto las tablets alcanzan el servidor por la intranet: cualquier estudiante que escriba `/docente/` en su tablet vería el banco de preguntas con las respuestas correctas marcadas, y podría abrir, cerrar o alterar sesiones.

Es el cambio que convierte la separación de superficies de `mission.md` en algo real y no en una convención.

## Criterios de aceptación

- [x] En el primer arranque, el panel pide crear una contraseña antes de dejar hacer nada más.
- [x] La contraseña se guarda derivada con `scrypt` y una sal aleatoria por instalación; **jamás en claro**, ni en la base, ni en logs, ni en respuestas de la API.
- [x] Con la contraseña correcta se inicia sesión y se recibe una cookie de sesión.
- [x] La cookie es `HttpOnly`, `SameSite=Lax` y tiene caducidad; no viaja en la URL ni se guarda en `localStorage`.
- [x] **Toda** ruta `/api/docente/*` responde 401 sin sesión válida, incluidas las que se añadan después (verificado con un test que recorre las rutas registradas).
- [x] Las páginas bajo `/docente/` y `/proyeccion/` redirigen al inicio de sesión si no hay sesión válida.
- [x] Las rutas `/api/examen/*` y el portal del estudiante siguen siendo accesibles sin contraseña.
- [x] Un error de contraseña muestra "Contraseña incorrecta" sin revelar si existe configuración previa.
- [x] Tras varios intentos fallidos seguidos desde la misma IP se aplica una espera creciente, para que no se pruebe a ciegas desde una tablet.
- [x] Hay un botón de cerrar sesión que invalida la cookie.
- [x] El docente puede cambiar su contraseña indicando la actual.
- [ ] Si olvida la contraseña, hay un procedimiento documentado de recuperación que exige acceso físico al equipo (no un enlace en la interfaz). _(pendiente: se documenta en `GUIA-DOCENTE.md`, feature 010.)_
- [x] Ninguna página del estudiante enlaza a `/docente/` ni lo menciona (test que revisa los archivos servidos).

## Fuera de alcance

- Varias cuentas de docente: hay una contraseña por equipo, según `mission.md`.
- Recuperación por correo o preguntas de seguridad: no hay red ni datos personales del docente.
- Cifrado de la base de datos en disco: quien tiene el archivo tiene los datos, y esa es una propiedad deseada (el docente copia su `.db` a una USB).
