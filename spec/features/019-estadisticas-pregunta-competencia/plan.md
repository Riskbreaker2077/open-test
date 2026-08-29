# 019 · Estadísticas por pregunta y por competencia — Plan

## Enfoque

Todo el cálculo se resuelve con una sola consulta SQL agregada por `pregunta_id`, comparando `respuestas.opcion_id` contra la opción marcada `es_correcta = 1` de esa pregunta. A diferencia de `armarExportacion()` (feature 009/016), **no hace falta reconstruir `opciones_mostradas` en el orden exacto que vio cada estudiante** — para saber si acertó basta comparar el id elegido contra el id correcto, así que esta consulta es más simple que la de resultados, no una variación de ella.

El alcance ("una sesión" o "todas las de un banco") se resuelve en SQL con `sesion_id IN (...)`: para "todas" es la lista de ids de las sesiones cerradas con ese `banco_id`; para "una sesión" es una lista de un solo elemento. El curso filtra con el mismo patrón `(? = '' OR e.curso = ?)` que ya usa `armarExportacion()`.

La agregación por competencia se hace en JavaScript sobre el resultado ya agrupado por pregunta (sumar `veces_mostrada` y `aciertos` de las preguntas de cada competencia, no promediar porcentajes ya calculados — evita el error clásico de "promedio de promedios" cuando las preguntas no se mostraron la misma cantidad de veces).

## Implementación

### 1. `server/services/estadisticas.js`

- `sesionesCerradasDeBanco(db, bancoId)`: `SELECT id, nombre, cursos FROM sesiones WHERE banco_id = ? AND estado = 'cerrada' ORDER BY id DESC`, con `cursos` ya separado en lista (reutilizando `cursosDe` de `sesiones.js`).
- `estadisticasDeBanco(db, bancoId, { sesionId, curso })`:
  - Resuelve la lista de `sesion_id` en alcance: `[sesionId]` si se pasó una sesión concreta (validando que pertenezca al banco y esté cerrada), o todas las de `sesionesCerradasDeBanco` si no.
  - Si la lista queda vacía, devuelve `{ preguntas: [], competencias: [] }` sin tocar la base.
  - Ejecuta la consulta agregada por pregunta (ver abajo), junta con `enunciado`/`competencia` de `preguntas` (recortando el enunciado con `textoPlano(analizarBloques(...))`, límite razonable de caracteres para la tabla).
  - Calcula `% acierto`, `% saltada` y agrega por competencia en JS.
  - Ordena ambas listas ascendente por `% acierto` (empate por `pregunta_id` / nombre de competencia, para que el resultado sea reproducible).

Consulta por pregunta:

```sql
SELECT ip.pregunta_id,
       count(*) AS veces_mostrada,
       sum(CASE WHEN r.opcion_id IS NULL THEN 1 ELSE 0 END) AS saltadas,
       sum(CASE WHEN r.opcion_id = o.id THEN 1 ELSE 0 END) AS aciertos,
       avg(CASE WHEN r.opcion_id IS NOT NULL THEN r.segundos_en_pantalla END) AS segundos_promedio
FROM intento_preguntas ip
JOIN intentos i ON i.id = ip.intento_id
JOIN estudiantes e ON e.codigo = i.codigo_estudiante
LEFT JOIN respuestas r ON r.intento_pregunta_id = ip.id
LEFT JOIN opciones o ON o.pregunta_id = ip.pregunta_id AND o.es_correcta = 1
WHERE ip.pregunta_id IN (SELECT id FROM preguntas WHERE banco_id = ?)
  AND i.sesion_id IN (...)
  AND (? = '' OR e.curso = ?)
GROUP BY ip.pregunta_id
```

El filtro `ip.pregunta_id IN (SELECT id FROM preguntas WHERE banco_id = ?)` es cinturón y tirantes: ya está garantizado porque los `sesion_id` en alcance pertenecen a ese banco, pero deja la consulta correcta por sí sola si algún día se relaja esa invariante.

**Por qué no reutilizar código de `resultados.js`:** esa función arma `opciones_mostradas` en orden real para el JSON de auditoría, que aquí no hace falta; forzar la reutilización obligaría a cargar y descartar datos que esta consulta no necesita. Sí se reutiliza `textoPlano`/`analizarBloques` de `bloques.js`, que es la utilidad genuinamente compartida.

### 2. Ruta — `server/routes/docente.js`

- `GET /bancos/:id/sesiones-cerradas` → `{ ok: true, sesiones: [...] }`, para poblar el selector de alcance y derivar la lista de cursos disponibles en el frontend sin una segunda consulta dedicada a cursos.
- `GET /bancos/:id/estadisticas?sesion=<id|'todas'>&curso=<curso>` → `{ ok: true, estadisticas: { preguntas, competencias } }`.

### 3. UI — `public/docente/estadisticas.html` + `.js`

- Mismo patrón visual que `resultados.html`: tres `<select>` (banco, alcance, curso) que se repueblan en cascada, dos tablas debajo.
- Acceso nuevo en `public/docente/index.html`.

## Decisiones

- **Comparar `opcion_id` contra la opción `es_correcta`, no reconstruir el orden mostrado** — para "¿acertó o no?" el orden en que vio las opciones es irrelevante; solo importa para la auditoría de `resultados.js`, que tiene un propósito distinto (qué vio exactamente cada estudiante).
- **Agregar por competencia sumando conteos, no promediando porcentajes** — con preguntas mostradas cantidades distintas de veces (normal si "todas las sesiones" mezcla sesiones con distinto `n_preguntas` o si el sorteo estratificado de la 017 dio cupos desiguales), promediar los `%` de cada pregunta pesaría igual a una pregunta vista 3 veces que a una vista 300.
- **Solo preguntas con al menos una aparición** — mostrar en la tabla una pregunta del banco que nunca salió sorteada no aporta nada y confundiría con un "0% de acierto" engañoso (en realidad es "sin datos").
- **Sin caché ni tabla de estadísticas materializada** — a la escala del proyecto (un colegio, decenas de sesiones por banco como mucho) una consulta agregada en cada carga de la pantalla es más simple que mantener una tabla derivada sincronizada, y el criterio de rendimiento (8000 filas bajo 2 s) es holgado para SQLite con un índice ya existente en `intento_preguntas.intento_id`.

## Riesgos

- **Rendimiento con muchas sesiones acumuladas** — mitigado por el criterio de aceptación de 8000 filas bajo 2 s; si en el futuro un banco acumula muchas más sesiones de las que un colegio genera en la práctica, tocaría revisar índices, pero no es el caso hoy.
- **Enunciados largos o con bloques de imagen/tabla en la tabla** — se recortan a texto plano con un límite de caracteres; una pregunta cuyo enunciado es puramente una imagen se mostrará con una etiqueta genérica en vez de texto vacío, para que la fila siga siendo identificable.
