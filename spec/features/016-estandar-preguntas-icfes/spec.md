# 016 · Estándar preguntas-icfes

**Estado:** implementado ✅

## Qué hace

El banco de preguntas de OpenTest deja de tener su propio formato casero y
pasa a seguir el estándar externo y abierto **preguntas-icfes**
(https://github.com/riskbreaker2077/preguntas-icfes): cada pregunta trae su
tabla de especificaciones completa (competencia, componente, afirmación,
evidencia, estándar asociado y qué evalúa), el contexto/enunciado/opciones
pueden combinar texto, imagen y tabla en vez de ser solo texto plano, y cada
una de las 4 opciones trae su propia justificación — no una sola explicación
general de la respuesta correcta.

La importación se unifica: ya no hay CSV ni JSON plano por separado, solo el
ZIP con `paquete.json` que ya existía desde la 015, ahora con el contenido
del estándar.

## Por qué

OpenTest y portal-estudiantes (otro proyecto del mismo autor) manejaban
preguntas tipo ICFES cada uno a su manera, sin comunicarse. Adoptar un
estándar común permite mover bancos de preguntas entre plataformas sin
reescribirlos, y formaliza algo que ya se necesitaba: saber qué competencia
mide cada pregunta (pendiente ya anotado para "equilibrar preguntas por
competencia" al sortear, y para exportar con esa metadata) y explicar por qué
cada distractor es incorrecto, no solo por qué la correcta lo es.

## Contrato

El formato de importación está definido en
[`paquete-preguntas-icfes.md`](../../contracts/paquete-preguntas-icfes.md),
que sustituye a los contratos de las features 003 y 015. La exportación de
resultados sube a
[`export-resultados-v2.md`](../../contracts/export-resultados-v2.md).

## Criterios de aceptación

- [x] El único formato de entrada es un ZIP con `paquete.json` (estándar
  preguntas-icfes v1) e `imagenes/`; se retiran los formularios de CSV/JSON
  plano y sus rutas HTTP.
- [x] Una pregunta sin los 6 campos de metadata pedagógica, sin exactamente 4
  opciones, sin exactamente 1 correcta, o con alguna opción sin
  `justificacion`, se reporta como error y **rechaza el archivo entero**.
- [x] El contexto, el enunciado y el contenido de cada opción admiten
  combinaciones de bloques de texto, imagen y tabla.
- [x] La previsualización y el detalle del banco muestran la pregunta
  completa (bloques y metadata), reutilizando `public/shared/pregunta.js`.
- [x] Un banco cargado antes de esta feature se sigue viendo (su texto plano
  se envuelve como un bloque de texto), sin inventar la metadata que no
  tiene; para tenerla hay que reimportar.
- [x] Ninguna respuesta de las rutas `/api/examen/*` expone `es_correcta` ni
  `justificacion` de las opciones antes de que el estudiante entregue.
- [x] La retroalimentación de nivel `completo` muestra la justificación de
  cada opción, no una explicación general.
- [x] La exportación de resultados sube a `formato_version: 2`: añade
  metadata pedagógica y justificación por opción, y el JSON deja de tener
  `explicacion`.
- [x] El paquete de ejemplo `participacion-ciudadana-20-preguntas.zip` sigue
  teniendo sus 20 preguntas y 5 imágenes, ahora en el formato del estándar,
  con metadata y justificación por opción redactadas.
- [x] Tests, lint y `git diff --check` pasan.

## Fuera de alcance

- Balancear el sorteo de preguntas por competencia (backlog: cambia el
  algoritmo de `personalizacion.js`, no el modelo de datos).
- Exportación a Excel con diseño (backlog).
- Migrar automáticamente los bancos ya cargados hacia la metadata del
  estándar: es trabajo editorial humano, no se puede inventar.
- Tocar portal-estudiantes.
