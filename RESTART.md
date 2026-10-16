# Restart

## Última actualización y rama activa

- 29/09/2026 — `main` publicada como **1.7.0** (tag `v1.7.0`): rediseño del
  panel del docente (048) y papelera universal + renombrar (049). El workflow
  `instalador.yml` compila y commitea el instalador.

## 30/09/2026 — 050

Nombre del estudiante en el header del examen y "Saltar" que conserva la respuesta (`spec/features/050-*`). Publicada como **1.7.1** (tag `v1.7.1`); falta verificar en tablet.

## 30/09/2026 — 051

Nota del estudiante (0,0–5,0, regla de tres) en la pantalla de resultado (`spec/features/051-*`). Commiteada en la rama, publicada como **1.7.2** (incluye la 1.7.1); el tag depende de poder empujarlo (ver bitácora).

## 16/10/2026 — 052

Editor de banco en dos paneles con edición completa de preguntas y grupos y «Agregar desde ZIP» a un banco existente (`spec/features/052-*`). Revisada por el usuario en su instalación; publicada como **1.8.0** (tag `v1.8.0`).

## 16/10/2026 — 053

El sorteo dejaba pruebas cortas con grupos (11A atascada en la 16/17). Corregido y con reparación automática de los intentos cortos (`spec/features/053-*`). Publicada como **1.8.1** (tag `v1.8.1`). **La evaluación «11A - Módulo 2 - III - CS» está en pausa**: instalar la 1.8.1 y reanudarla. Las tablets piden la pregunta que falta y la prueba se completa sola. La de 11B (borrador, mismo banco) puede abrirse con la 1.8.1.

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
