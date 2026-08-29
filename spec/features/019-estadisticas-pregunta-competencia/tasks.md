# 019 · Estadísticas por pregunta y por competencia — Tareas

## Servicio

- [x] `server/services/estadisticas.js` — `sesionesCerradasDeBanco(db, bancoId)`.
- [x] `estadisticasDeBanco(db, bancoId, { sesionId, curso })`: resuelve alcance, ejecuta la consulta agregada, calcula porcentajes.
- [x] Agregación por competencia sumando conteos (no promediando porcentajes).
- [x] Enunciado recortado a texto plano con `textoPlano(analizarBloques(...))`, con etiqueta genérica si el enunciado no tiene bloques de texto.
- [x] Test: banco con una sola sesión cerrada — % acierto, % saltada y % fallo suman 100 por pregunta.
- [x] Test: "todas" con dos sesiones cerradas del mismo banco da el acumulado correcto (no el de una sola).
- [x] Test: elegir la única sesión cerrada de un banco da el mismo resultado que "todas".
- [x] Test: el filtro de curso funciona en ambos modos.
- [x] Test: la agregación por competencia pondera por veces mostrada, no promedia porcentajes de preguntas mostradas cantidades distintas de veces (caso con números que lo distinguirían de un promedio simple).
- [x] Test: una pregunta del banco que nunca salió sorteada no aparece en el resultado.
- [x] Test: banco sin ninguna sesión cerrada devuelve listas vacías sin error.
- [x] Test de rendimiento: banco con 10 sesiones cerradas de 40×20 (8000 filas) bajo 2 segundos.

## Ruta

- [x] `GET /api/docente/bancos/:id/sesiones-cerradas`.
- [x] `GET /api/docente/bancos/:id/estadisticas?sesion=&curso=`.
- [x] Test de ruta: ambos endpoints exigen sesión de docente autenticada.
- [x] Test de ruta: sesión inválida o de otro banco en el parámetro `sesion` da un error claro, no un `TypeError`.

## UI

- [x] `public/docente/estadisticas.html` — selects en cascada (banco → alcance → curso) y dos tablas.
- [x] `public/docente/estadisticas.js` — repoblar selects, pintar tablas, mensaje cuando no hay sesiones cerradas para el banco elegido.
- [x] Acceso nuevo en `public/docente/index.html`.
- [x] Verificado con un servidor de prueba desechable (banco/sesiones/respuestas simulados, base `:memory:`, sin tocar `data/opentest.db`): login, servido de `estadisticas.html`/`.js`, y las dos rutas nuevas devuelven datos correctos vía HTTP real. No se pudo hacer clic-a-clic en un navegador real (sin herramienta de automatización de navegador disponible en este entorno) — la interacción visual de los selects en cascada queda para la sesión de validación manual.

## Cierre

- [x] `npm test` y `npm run lint` completos en verde (329/329, 87 archivos).
- [x] Validar los criterios de aceptación de `spec.md` y marcar los que se pudieron comprobar de verdad.
- [x] Mover la 019 a "Hecho ✅" en `../../constitution/roadmap.md` y quitarla del backlog.
- [x] Actualizar la sección "Dónde estamos" de `AGENTS.md`.
- [x] Anotar en `spec/bitacora.md`.
- [x] Actualizar `RESTART.md`.
