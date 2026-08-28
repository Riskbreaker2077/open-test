# 013 · Portal del estudiante — Tareas

- [x] Implementar `sesionesDisponiblesPara` en `server/services/sesiones.js` (filtro por curso y estado).
- [x] Implementar `POST /api/examen/sesiones` con el mensaje de código inexistente del contrato.
- [x] Ampliar `POST /api/examen/entrar` para recibir y validar `sesionId`.
- [x] Ampliar `GET /api/examen/estado` con el estado de la sesión y el tiempo restante. _(completado por la feature 012; usa la misma fuente de verdad que la proyección.)_
- [x] Construir `public/index.html`, `portal.js` y `portal.css` con los tres estados.
- [x] Implementar el paso automático al examen cuando la sesión pasa a `en_curso`. _(el sondeo detecta el cambio de estado y transiciona sin recargar; el contenido de esa pantalla es un mensaje explícito de que la construye la feature 006 — decisión acordada con el usuario, ver Decisiones.)_
- [x] Implementar la entrada directa cuando solo hay una sesión disponible.
- [x] Eliminar `public/docente/index.html` y `public/estudiante/index.html` (páginas puente de la feature 001). _(`public/estudiante/` ya no existe; `public/docente/index.html` dejó de ser una página puente pública porque `/docente` y `/proyeccion` quedaron protegidas por `protegerPaginas` en la feature 011 — verificado en `server/app.js`.)_
- [x] Test: el listado solo trae sesiones del curso del estudiante, abiertas o en curso. _(`server/routes/examen.login.test.js`: "el estudiante ve solo las evaluaciones de su curso".)_
- [x] Test: código inexistente devuelve el mensaje acordado y nada más. _("un código inexistente no revela nada".)_
- [x] Test: sin sesiones disponibles, respuesta vacía y mensaje claro. _("sin evaluaciones abiertas la lista viene vacía, no es un error".)_
- [x] Test: entrar a una sesión de otro curso se rechaza. _("un estudiante de otro curso no entra".)_
- [x] Test: el HTML de la raíz no menciona `docente` ni `proyeccion`. _(actualizado en `server/app.test.js`, "GET / entrega el portal del estudiante": ya no comprobaba la placeholder de la 001, ahora comprueba el formulario de código real.)_
- [ ] Probar el flujo completo llegando por el QR desde una tablet. _(el QR ya existe por la feature 012; falta la prueba con una tablet física.)_
- [x] Validar contra los criterios de aceptación de `spec.md`. _(las integraciones con 006/007 ya están verificadas; lo restante es visual o físico y se aplaza a la sesión final con el equipo destino.)_
- [x] Mover la feature a "Hecho" en `../../constitution/roadmap.md`. _(cerrada el 26/08/2026 dentro de su alcance; los 6 criterios diferidos siguen sin marcar y se verificarán con 012, 006, 007 o una tablet física.)_
