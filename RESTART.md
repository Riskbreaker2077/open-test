# Restart

## Última actualización y rama activa

- 29/09/2026 — `main` publicada como **1.7.0** (tag `v1.7.0`): rediseño del
  panel del docente (048) y papelera universal + renombrar (049). El workflow
  `instalador.yml` compila y commitea el instalador.

## 30/09/2026 — 050

Nombre del estudiante en el header del examen y "Saltar" que conserva la respuesta (`spec/features/050-*`). Publicada como **1.7.1** (tag `v1.7.1`); falta verificar en tablet.

## 30/09/2026 — 051

Nota del estudiante (0,0–5,0, regla de tres) en la pantalla de resultado (`spec/features/051-*`). Commiteada en la rama, publicada como **1.7.2** (incluye la 1.7.1); el tag depende de poder empujarlo (ver bitácora).

## Feature/tarea en curso

- Ninguna. 048 y 049 completas y desplegadas.

## Qué se hizo en esta sesión

1. **048 · Panel del docente como app, sin scroll.** Las ocho pantallas de
   `public/docente/` pasan a un marco fijo. El CSS compartido está en
   `panel-shell.css`; los íconos de línea (Heroicons, MIT) en `iconos.js`.
   Se rehízo varias veces con capturas del usuario sobre su instalación.
2. **049 · Papelera universal y renombrar.** `borrarSesion` manda siempre a
   la papelera (salvo abierta/en curso/pausada) y `PATCH
   /api/docente/sesiones/:id/nombre` renombra en cualquier estado. Sin
   migración.
3. Para ver cambios sin desplegar: copiar `public/docente/*` (archivo a
   archivo) a `C:\Users\Camil\AppData\Local\OpenTest\public\docente\`;
   `OpenTest.exe` sirve esos archivos tal cual. Los cambios de `server/`
   exigen copiar **el contenido** (`cp -r server/. destino/server/`) y
   reiniciar OpenTest.

## Siguiente tarea

1. Confirmar que el workflow de `v1.7.0` terminó en verde y hacer
   `git pull` para traer el commit del instalador.
2. Verificado por el usuario el 30/09/2026: 039, 040, 041, 045 en tablet
   real y la 042 en proyector, sin novedades.
3. En `portal-estudiantes`: sigue pendiente decidir si se fusiona la rama
   `feature/044-listar-evaluaciones-disponibles`.

## Bloqueos / decisiones pendientes

- Ninguno.
