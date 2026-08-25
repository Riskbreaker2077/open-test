# 004 · Sesiones y login — Tareas

- [ ] Implementar `server/services/sesiones.js` con la máquina de estados y sus validaciones.
- [ ] Tests de la máquina de estados: transiciones válidas, inválidas, apertura con banco corto, segunda sesión abierta.
- [ ] Test de inmutabilidad: modificar una sesión abierta se rechaza.
- [x] Añadir a `sesiones` las columnas del reloj global (`comenzada_en`, `pausada_en`, `segundos_pausados`) y ampliar el `CHECK` de `estado`.
- [x] Retirar el índice único de sesión abierta: ya pueden coexistir varias.
- [x] Implementar `server/migraciones.js` y engancharlo a `abrirBd`, para que una base ya creada se ponga al día sin perder datos.
- [ ] Añadir el índice `UNIQUE(sesion_id, codigo_estudiante)` a `server/schema.sql`.
- [ ] Implementar `server/services/intentos.js` (`iniciarOReanudarIntento`, semilla y token).
- [ ] Implementar el middleware `conIntento` y las rutas `/api/examen/entrar` y `/api/examen/estado`.
- [ ] Añadir el CRUD de sesiones y las transiciones a `server/routes/docente.js`.
- [ ] Poblar el selector de cursos desde los cursos existentes en la base (nunca texto libre).
- [ ] Construir `public/docente/sesiones.html` y `sesiones.js` con los defaults y la URL destacada.
- [ ] Construir `public/estudiante/entrar.html` y `entrar.js` (campo grande, `inputmode`, errores en sitio fijo).
- [ ] Tests de login: código inexistente, curso no convocado, sin sesión abierta, ya entregado, espacios sobrantes.
- [ ] Test de reanudación: entrar dos veces con el mismo código devuelve el mismo `intento_id`.
- [ ] Test de concurrencia: dos peticiones simultáneas de entrada no crean dos intentos.
- [ ] Validar contra los criterios de aceptación de `spec.md`.
- [ ] Mover la feature a "Hecho" en `../../constitution/roadmap.md`.
