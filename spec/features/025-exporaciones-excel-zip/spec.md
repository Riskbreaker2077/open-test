# 025 · Exportaciones: Excel rico + ZIP reproducible

**Estado:** implementado ✅

## Qué hace

Reduce las cuatro descargas del panel de resultados a **dos**:

1. **`resultados.xlsx`** — un único libro Excel con tres hojas:
   - `Resumen`: una fila por estudiante con los totales (aciertos,
     puntaje, porcentaje, respondidas, saltadas, tiempo).
   - `Detalle`: una fila por pregunta-estudiante con las **cuatro**
     opciones del banco (texto y `es_correcta`), la elegida, la
     justificación de cada opción, el orden en que se le mostraron,
     los segundos que pasó en la pregunta, y la metadata pedagógica
     completa de la pregunta (competencia, componente, afirmación,
     evidencia, estándar asociado, qué evalúa).
   - `Banco`: una fila por pregunta del banco, con la misma metadata
     pedagógica, los cuatro textos de las opciones y la cantidad de
     estudiantes que la vieron / acertaron / saltaron.

2. **`reproduccion.zip`** — un ZIP con todo lo necesario para volver
   a presentar la evaluación en la plataforma de retroalimentación,
   aunque OpenTest ya no exista:
   - `resultados.json` (mismo contenido que el `formato_version: 2`
     actual — incluye los bloques `texto`, `imagen` y `tabla` de
     enunciado, contexto y opciones, y los bloques tal cual se le
     mostraron a cada estudiante).
   - `imagenes/<archivo>` con cada imagen referenciada por los
     bloques `tipo: 'imagen'`. Los archivos viven con su nombre a
     secas en `imagenes/` y el JSON las referencia por basename.
   - Si alguna imagen referenciada no existe en el disco (raro: se
     borró a mano, etc.), el ZIP incluye un `imagenes_faltantes.txt`
     con la lista de nombres no encontrados. La exportación no falla
     por eso.

Las descargas CSV detalle, CSV resumen y JSON suelto **dejan de
existir**. El JSON vive únicamente dentro del ZIP.

## Por qué

Las cuatro descargas actuales sirvieron para construir la plataforma de
retroalimentación paso a paso (CSV para inspección rápida, JSON para
reproducción completa, XLSX para quien no maneja herramientas), pero
hoy le sobran al docente que abre el panel después de cerrar la
evaluación: la mayoría descarga los cuatro, abre el JSON en un editor
y termina trabajando con el XLSX. Mantener tres caminos que dicen
casi lo mismo abre la puerta a errores ("¿cuál es el bueno?"), ocupa
espacio visual y exige mantener tres formatos en sincronía cuando
aparece una columna nueva.

Quedarse con dos tiene sentido operativo y respeta el principio
"Simple para el docente" de `mission.md`. La elección **Excel rico +
ZIP reproducible** cubre las dos necesidades reales:

- El Excel es para **mirar** y para alimentar pipelines que ya leen
  planillas.
- El ZIP es para **reproducir** la evaluación entera en otro sistema:
  las preguntas, las opciones en el orden que vio cada uno, las
  imágenes, las respuestas, y la sesión que el docente armó.

## Criterios de aceptación

### Esquema y servicio

- [x] `armarExportacion(...)` no cambia: sigue produciendo el árbol
      con `intentos → preguntas → opciones_mostradas` y los bloques
      completos. Es la materia prima tanto del Excel rico como del
      JSON del ZIP.
- [x] Nueva función `imagenesDeSesion(db, sesionId)` que devuelve
      `Set<string>` con los nombres de archivo (basename) referenciados
      por los bloques `tipo: 'imagen'` en `contexto`, `enunciado`,
      `opciones[].texto` de las preguntas del banco que efectivamente
      aparecieron en los `intento_preguntas` de la sesión. Recorre el
      banco una sola vez por sesión, sin duplicar nombres.

### Exportador — `server/exporters/resultados.js`

- [x] `aDetalleCsv` y `aResumenCsv` se eliminan, junto con las
      constantes `CABECERAS_DETALLE` y `CABECERAS_RESUMEN` (los CSV
      detalle y resumen ya no son parte del producto).
- [x] `aJson` se queda exportada y se usa **solo** dentro del
      armado del ZIP. Su salida es byte-idéntica al JSON suelto de
      antes (los consumidores externos que aún dependan del endpoint
      `/export/json` quedan avisados por la línea 25 del README más
      abajo).
- [x] `aExcel` se reemplaza por `aExcelRico(exportacion)` que arma
      tres hojas (`Resumen`, `Detalle`, `Banco`) y se apoya en el
      mismo `crearLibroXlsx(...)` que ya existe.
- [x] Nueva función `aReproduccionZip(db, exportacion)` que produce
      el ZIP reproducible:
      - `resultados.json` con el contenido de `aJson(...)`.
      - Por cada nombre de `imagenesDeSesion`, una entrada
        `imagenes/<archivo>` con los bytes leídos de
        `data/uploads/imagenes/<archivo>` si existe.
      - Si el conjunto de imágenes referenciadas y el conjunto de
        imágenes efectivamente empaquetadas no coinciden, una
        entrada `imagenes_faltantes.txt` con un nombre por línea.
- [x] El conjunto de imágenes efectivamente empaquetadas **no**
      introduce archivos huérfanos: si una imagen existe en disco
      pero nadie la referencia, no se incluye.

### Ruta y UI

- [x] `GET /api/docente/sesiones/:id/export/:tipo` rechaza con 404
      cualquier tipo distinto de `excel` o `zip`.
- [x] La marca `descargado_en` (introducida por la 022) se sigue
      escribiendo en ambas descargas, igual que antes.
- [x] `public/docente/resultados.html` pasa de cuatro `<a>` a dos:
      "Excel" y "Reproducción (ZIP)". Los textos son descriptivos
      ("Abre este Excel para ver los resultados en una planilla
      común", "Usa este ZIP para reproducir la evaluación en otra
      plataforma").
- [x] `public/docente/resultados.js` itera solo `['excel', 'zip']`
      y ajusta los `Content-Disposition` de cada uno.

### Contrato

- [x] El JSON dentro del ZIP mantiene `formato_version: 2` (no
      cambia) porque ya está publicado en `spec/contracts/
      export-resultados-v2.md`.
- [x] `spec/contracts/export-resultados-v2.md` se actualiza para
      declarar obsoletas las rutas `detalle.csv` y `resumen.csv` y
      para indicar que el JSON sólo se distribuye dentro del ZIP.

### Lo que NO hace

- No introduce un nuevo formato intermedio ("CSV único", "TSV"): los
  consumidores que quieran CSV pueden abrir el Excel y exportar a
  CSV desde allí.
- No cambia `armarExportacion`. Los campos que hoy produce se
  preservan: si un consumidor futuro necesita más, se añaden al
  exportador, no al servicio.
- No elimina el endpoint `GET /api/docente/sesiones/:id/export/json`.
  Lo rechaza con 404 por consistencia con los CSV, pero no rompe
  nada más.
- No agrega un nuevo `formato_version`. El JSON dentro del ZIP
  sigue siendo `formato_version: 2`; lo nuevo es el envoltorio
  (el ZIP) y la lista de imágenes que lo acompaña.
- No cambia la pantalla de estadísticas (019). Esa vista es en vivo
  sobre la base, no una exportación.