# 013 · Portal del estudiante — Tareas

- [ ] Implementar `sesionesDisponiblesPara` en `server/services/sesiones.js` (filtro por curso y estado).
- [ ] Implementar `POST /api/examen/sesiones` con el mensaje de código inexistente del contrato.
- [ ] Ampliar `POST /api/examen/entrar` para recibir y validar `sesionId`.
- [ ] Ampliar `GET /api/examen/estado` con el estado de la sesión y el tiempo restante.
- [ ] Construir `public/index.html`, `portal.js` y `portal.css` con los tres estados.
- [ ] Implementar el paso automático al examen cuando la sesión pasa a `en_curso`.
- [ ] Implementar la entrada directa cuando solo hay una sesión disponible.
- [ ] Eliminar `public/docente/index.html` y `public/estudiante/index.html` (páginas puente de la feature 001).
- [ ] Test: el listado solo trae sesiones del curso del estudiante, abiertas o en curso.
- [ ] Test: código inexistente devuelve el mensaje acordado y nada más.
- [ ] Test: sin sesiones disponibles, respuesta vacía y mensaje claro.
- [ ] Test: entrar a una sesión de otro curso se rechaza.
- [ ] Test: el HTML de la raíz no menciona `docente` ni `proyeccion`.
- [ ] Probar el flujo completo llegando por el QR desde una tablet.
- [ ] Validar contra los criterios de aceptación de `spec.md`.
- [ ] Mover la feature a "Hecho" en `../../constitution/roadmap.md`.
