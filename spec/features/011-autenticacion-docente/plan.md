# 011 · Autenticación del docente — Plan

## Enfoque

Lo mínimo que resiste a un aula: `scrypt` del módulo `node:crypto` para derivar la contraseña, y un identificador de sesión aleatorio guardado en memoria y en una cookie `HttpOnly`. Sin JWT, sin librerías de sesión, sin base de datos de sesiones: el servidor vive lo que dura una jornada de exámenes y reiniciarlo cerrando la sesión del docente es un comportamiento aceptable.

La decisión que más importa es **dónde se aplica la protección**: en el montaje del router `/api/docente`, no ruta por ruta. Así un endpoint nuevo nace protegido, y olvidarse no es posible. El test que recorre las rutas registradas lo verifica de forma que no dependa de que alguien se acuerde.

## Implementación

1. `server/services/auth.js` — módulo puro sobre `node:crypto`:
   - `derivar(contrasena, salt)` con `scryptSync`, parámetros explícitos.
   - `establecerContrasena(db, contrasena)` guarda `docente_hash` y `docente_salt` en `config`.
   - `verificar(db, contrasena)` con `timingSafeEqual`, para no filtrar por tiempo de respuesta.
   - `hayContrasena(db)` para saber si es el primer arranque.
2. `server/sesion.js` — sesiones en memoria: `crear()` devuelve un id de 32 bytes; `validar(id)` comprueba existencia y caducidad; `destruir(id)`. Barrido periódico de las caducadas.
3. `server/middleware/protegido.js` — lee la cookie, valida y responde 401 JSON en `/api/*` o redirige a `/docente/entrar.html` en las páginas.
4. `server/app.js` — montaje: `app.use('/api/docente', protegido, rutasDocente)` y `app.use('/docente', protegidoPaginas, express.static(...))`. Las rutas de entrada (`POST /api/auth/entrar`, `POST /api/auth/establecer`, `GET /api/auth/estado`) quedan **fuera** del prefijo protegido.
5. Límite de intentos: contador por IP en memoria con espera creciente (1 s, 2 s, 4 s… con tope), reiniciado tras un acierto.
6. `public/docente/entrar.html` — un campo de contraseña; en primer arranque, el formulario de creación con confirmación.
7. `GUIA-DOCENTE.md` (feature 010) — el procedimiento de recuperación: detener OpenTest y borrar las dos filas de `config`, con el comando exacto. Exige acceso físico al equipo.
8. Tests: contraseña correcta e incorrecta; hash distinto para la misma contraseña en dos instalaciones (sal por instalación); **recorrido de todas las rutas `/api/docente/*` registradas comprobando 401 sin cookie**; cookie con los tres atributos; espera creciente tras fallos; el portal del estudiante sigue abierto; ningún archivo del estudiante menciona `/docente`.

## Decisiones

- **`scrypt` nativo y no `bcrypt`** — está en `node:crypto`, no añade dependencia y no es un módulo nativo que compilar. Para una contraseña que protege un panel en una intranet de aula, es de sobra.
- **Sesiones en memoria y no en la base** — el servidor es un proceso que el docente abre y cierra; persistirlas añadiría una tabla y un barrido para un beneficio nulo. Reiniciar cierra la sesión, que es lo esperable.
- **Protección en el montaje del router, no por ruta** — es la diferencia entre una regla y una costumbre. El test sobre las rutas registradas la vuelve verificable.
- **Espera creciente en vez de bloqueo por intentos** — un bloqueo duro convertiría a cualquier estudiante en capaz de dejar al docente fuera de su propio panel a mitad de examen. La espera frena la fuerza bruta sin ofrecer esa palanca.
- **Recuperación por acceso físico** — cualquier mecanismo dentro de la interfaz sería una puerta trasera alcanzable desde una tablet.
- **La proyección también va protegida** — la abre el docente y la proyecta; que su contenido sea público no la hace accesible desde una tablet.

## Riesgos

- **El docente olvida la contraseña el día del examen** — mitigación: el procedimiento de recuperación es una línea en la guía y solo requiere el portátil delante; se prueba y se documenta antes de dar la feature por hecha.
- **Contraseñas triviales** (`1234`) — mitigación: mínimo de 6 caracteres y un aviso, sin reglas de complejidad que lleven a apuntarla en un papel pegado al portátil.
- **Un estudiante con la contraseña del docente** — fuera del alcance del software. Mitigación parcial: el monitoreo con nombres (feature 008) hace visible cualquier cosa rara.
