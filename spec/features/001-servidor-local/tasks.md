# 001 · Servidor local — Tareas

- [x] Crear `package.json` (`type: module`, scripts, `express` + `better-sqlite3`) y `.gitignore`.
- [x] Escribir `server/schema.sql` con las ocho tablas, FK, índices y `UNIQUE`.
- [x] Implementar `server/db.js` (`abrirBd`, pragmas, aplicación del esquema, `cerrarBd`).
- [x] Implementar `server/red.js` (`urlsDeIntranet`, filtrado y ordenación de interfaces).
- [x] Implementar `server/app.js` (`crearApp`, estáticos, `GET /api/salud`, errores en español).
- [x] Implementar `server/index.js` (arranque en `0.0.0.0`, bloque de URL, manejo de `EADDRINUSE`).
- [x] Crear `public/index.html` y `public/shared/base.css` con los dos accesos y los tokens visuales.
- [x] Crear `public/docente/index.html` y `public/estudiante/index.html` como páginas puente, para que los dos accesos de la portada no lleven a un 404 hasta que lleguen sus features.
- [x] Tests `server/db.test.js`: tablas creadas, `UNIQUE` de `estudiantes.codigo`, reapertura sin pérdida.
- [x] Tests `server/app.test.js`: `/api/salud` responde `ok`, ruta inexistente devuelve 404 en español.
- [x] Tests `server/red.test.js`: formato de las URL, marcado de la más probable, adaptadores virtuales.
- [ ] Verificar desde una segunda máquina/tablet de la misma red que la URL mostrada carga. _(pendiente: requiere un segundo dispositivo. Aquí se comprobó el acceso por las IP de red del propio equipo.)_
- [ ] Verificar con la red desconectada que el arranque no falla ni intenta salir a internet. _(pendiente: requiere desconectar físicamente. Hay test automático de orígenes externos y el arranque sin red está contemplado en el código.)_
- [x] Validar contra los criterios de aceptación de `spec.md`.
- [x] Mover la feature a "Hecho" en `../../constitution/roadmap.md`.
