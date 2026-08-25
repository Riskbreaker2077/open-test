# 004 · Sesiones y login — Tareas

- [x] Implementar `server/services/sesiones.js` con la máquina de estados y sus validaciones.
- [x] Tests de la máquina de estados: transiciones válidas, inválidas, apertura con banco corto, segunda sesión abierta.
- [x] Test de inmutabilidad: modificar una sesión abierta se rechaza.
- [x] Añadir a `sesiones` las columnas del reloj global (`comenzada_en`, `pausada_en`, `segundos_pausados`) y ampliar el `CHECK` de `estado`.
- [x] Retirar el índice único de sesión abierta: ya pueden coexistir varias.
- [x] Implementar `server/migraciones.js` y engancharlo a `abrirBd`, para que una base ya creada se ponga al día sin perder datos.
- [x] Añadir el índice `UNIQUE(sesion_id, codigo_estudiante)` a `server/schema.sql`.
- [x] Implementar `server/services/intentos.js` (`iniciarOReanudarIntento`, semilla y token).
- [x] Implementar el middleware `conIntento` y las rutas `/api/examen/entrar` y `/api/examen/estado`.
- [x] Añadir el CRUD de sesiones y las transiciones a `server/routes/docente.js`.
- [x] Poblar el selector de cursos desde los cursos existentes en la base (nunca texto libre).
- [x] Construir `public/docente/sesiones.html` y `sesiones.js` con los defaults y la URL destacada.
- [ ] Construir la pantalla de entrada del estudiante. _(pasa a la feature 013: la raíz es el portal, y ahí vive el campo de código.)_
- [x] Tests de login: código inexistente, curso no convocado, sin sesión abierta, ya entregado, espacios sobrantes.
- [x] Test de reanudación: entrar dos veces con el mismo código devuelve el mismo `intento_id`.
- [x] Test de concurrencia: dos peticiones simultáneas de entrada no crean dos intentos.
- [x] Validar contra los criterios de aceptación de `spec.md`.
- [x] Mover la feature a "Hecho" en `../../constitution/roadmap.md`.
