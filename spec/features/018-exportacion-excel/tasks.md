# 018 · Exportación a Excel con diseño — Tareas

## Escritor de ZIP

- [x] `server/exporters/zip-escritor.js` — `crearZip(entradas)`, compresión con `deflateRawSync`, reutilizando `crc32()` de `paquete-zip.js`.
- [x] Test: `crearZip()` seguido de `leerZip()` (el lector ya existente) devuelve las mismas entradas byte a byte.
- [x] Test: entrada con contenido vacío y con contenido de varios KB no rompe el central directory.

## Construcción del libro Excel

- [x] `server/exporters/xlsx.js` — `crearLibroXlsx(hojas)`: arma las partes XML fijas + una hoja por entrada y llama a `crearZip()`.
- [x] Estilos: cabecera en negrita con relleno de color (`xl/styles.xml`), fila 1 congelada por hoja.
- [x] Anchos de columna calculados por el contenido más largo de cada una.
- [x] Celdas numéricas vs. texto (`t="inlineStr"` solo para texto).
- [x] Escapar `&`, `<`, `>` en todo texto insertado en XML.
- [x] Test: libro de una hoja con textos simples — reabrir el ZIP y confirmar que `xl/worksheets/sheet1.xml` contiene las cabeceras y valores esperados como substrings.
- [x] Test: `workbook.xml` lista las hojas en el orden dado, con los nombres dados.
- [x] Test: nombre/valor con `&`, `<`, `>` sale escapado y el XML resultante es bien formado (parseable).
- [x] Test: columna marcada numérica produce `<v>` sin `t="inlineStr"`.

## Datos compartidos con CSV

- [x] Extraer `filasDetalle(exportacion)` y `filasResumen(exportacion)` en `server/exporters/resultados.js`.
- [x] `aDetalleCsv`/`aResumenCsv` pasan a usar esas funciones — confirmado que ningún test de `resultados.test.js` cambió de resultado.
- [x] Nueva `aExcel(exportacion)` que arma las dos hojas ("Resumen", "Detalle") con `CABECERAS_RESUMEN`/`CABECERAS_DETALLE` y llama a `crearLibroXlsx`.
- [x] Test: `aExcel()` sobre el fixture de exportación existente produce un ZIP válido con las dos hojas y las cabeceras correctas en cada una.
- [x] Test: intentos sin entregar aparecen igual que en CSV/JSON.

## Ruta y descarga

- [x] `server/routes/docente.js` — agregar `'excel'` a los tipos válidos de `GET /sesiones/:id/export/:tipo`, extensión `xlsx`, content-type de SpreadsheetML, respuesta binaria.
- [x] Test de ruta: pedir `/export/excel` responde 200, content-type correcto, cuerpo no vacío y con la firma de ZIP (`PK`) al inicio.
- [x] Confirmar que el nombre de archivo sigue el patrón `opentest_<sesion>_<curso>_resultados_<fecha>.xlsx`.

## UI

- [x] `public/docente/resultados.html` — cuarto acceso "Excel (.xlsx)".
- [x] `public/docente/resultados.js` — agregar `'excel'` al armado de `href` de los accesos.

## Cierre

- [x] `npm test` y `npm run lint` completos en verde (315/315, 83 archivos).
- [x] Medir tiempo de exportación con 40 estudiantes × 20 preguntas: ~134 ms, muy por debajo de los 2 s.
- [x] Validar los criterios de aceptación de `spec.md` y marcar los que se pudieron comprobar de verdad.
- [x] Quitar "Exportación a Excel con diseño" del backlog de `../../constitution/roadmap.md` y mover la 018 a "Hecho ✅".
- [x] Actualizar la sección "Dónde estamos" de `AGENTS.md`.
- [x] Anotar en `spec/bitacora.md`.
- [x] Anotar en `RESTART.md` qué queda pendiente de validación manual (apertura real en Excel/LibreOffice).
