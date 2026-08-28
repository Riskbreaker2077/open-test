# Plan · 016 Estándar preguntas-icfes

## Enfoque

Se vendoriza el validador de referencia del estándar externo, sin
dependencias (`server/importers/estandar-preguntas-icfes.js`, copia literal de
`validador/validar.js` en github.com/riskbreaker2077/preguntas-icfes), y
`server/importers/preguntas.js` se reduce a: comprobar tamaño/codificación,
parsear el JSON y delegar toda la validación de contenido a ese validador.
El importador CSV desaparece por completo, igual que las rutas HTTP
`/api/docente/bancos/validar` y `/confirmar` (JSON plano); solo queda la
pareja `paquete/validar` y `paquete/confirmar` ya existente desde la 015,
apuntando ahora a `paquete.json` en vez de `banco.json`.

`contexto` y `enunciado` de `preguntas`, y `texto` de `opciones`, guardan
JSON serializado (un array de bloques) en vez de texto plano; se leen con
`server/services/bloques.js` (`analizarBloques`/`serializarBloques`), que
además envuelve texto plano de bancos anteriores a esta feature en un bloque
de texto, para no romper su lectura. `opciones` gana `justificacion`.
`preguntas` gana las 6 columnas de metadata pedagógica. Todas las columnas
nuevas son `NOT NULL DEFAULT ''`, así que se añaden con `ALTER TABLE ADD
COLUMN` simple (sin rehacer la tabla): una base existente las gana en blanco,
sin perder ni inventar datos.

El servicio `examen.js` sigue sin seleccionar `es_correcta`; ahora tampoco
selecciona `justificacion` en la ruta que sirve al estudiante durante el
intento — solo `calificacion.js` la expone, y solo en nivel `completo`,
incluyendo la de la opción que el estudiante eligió (antes esa opción no
llevaba explicación adicional en absoluto en niveles inferiores; ahora hay
que ocultarla explícitamente porque cada opción trae su propia
justificación embebida).

`public/shared/pregunta.js` cambia de pintar strings a iterar un array de
bloques (`texto`/`imagen`/`tabla`) para contexto, enunciado y el contenido de
cada opción, con una nueva clase `.pregunta__tabla` en `base.css`. Sus tres
consumidores (previsualización y detalle en `bancos.js`, examen del
estudiante) siguen pasándole el objeto pregunta completo sin cambios propios,
salvo `resultado.js`, que ya no arma una vista "solo texto" a mano para nivel
`aciertos`: usa un helper `textoPlano` para el resumen simple y delega a
`pregunta.js` en nivel `completo`.

## Seguridad y límites

- Mismos límites de ZIP que la 015 (25 MB, 101 archivos, 3 MB por imagen):
  no se tocan, solo cambia el nombre del manifiesto.
- `justificacion` se trata con la misma disciplina que `es_correcta`: nunca
  sale de la base hacia el estudiante mientras el intento sigue abierto.

## Pruebas

- `server/fixtures-preguntas.js`: fábrica de preguntas válidas para no repetir
  los 6 campos de metadata y las 4 opciones en cada test de otro módulo
  (sesiones, intentos, monitoreo, examen, calificación, exportación).
- Migración: una base con el esquema anterior a la 016 gana las columnas
  nuevas en blanco, sin perder las preguntas/opciones que ya tenía.
- Validador vendorizado: casos de cada invariante (4 opciones, 1 correcta,
  justificación por opción, metadata completa, imagen referenciada existente,
  tabla rectangular, id único), más los ya existentes de tamaño/codificación.
- HTTP: paquete ZIP con `paquete.json`, previsualización, confirmación,
  detalle del banco, y que ninguna ruta abierta al estudiante filtre
  `justificacion` ni `es_correcta`.
- Exportación: `formato_version: 2`, columna `competencia` en el CSV de
  detalle, `justificacion` por opción y sin `explicacion` en el JSON.
- Paquete de ejemplo de participación ciudadana validado end-to-end contra el
  importador real, con sus 20 preguntas y 5 imágenes.
