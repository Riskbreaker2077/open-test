# 018 · Exportación a Excel con diseño — Plan

## Enfoque

Un `.xlsx` es un ZIP de partes XML (OOXML SpreadsheetML). El proyecto ya sabe **leer** ZIP (`server/importers/paquete-zip.js`, feature 015) usando `node:zlib`; esta feature añade el camino inverso, un **escritor de ZIP mínimo**, para no incorporar una dependencia nueva a un proyecto que hasta ahora no tiene ninguna de exportación/formato de archivo.

No hace falta soportar todo OOXML: solo entradas pequeñas, sin cifrado, sin ZIP64, sin subcarpetas más allá de las fijas que exige el formato. Se usan **strings inline** (`t="inlineStr"`) en vez de una tabla de shared strings, que evita construir e indexar esa tabla a cambio de un archivo un poco más grande — irrelevante a la escala de un examen (decenas de estudiantes, no miles).

## Implementación

### 1. `server/exporters/zip-escritor.js` — escritor de ZIP genérico

- `crearZip(entradas)`: recibe `[{ nombre, contenido }]` (contenido = string o Buffer, UTF-8), y devuelve un `Buffer` con el ZIP completo: un *local file header* + datos comprimidos por entrada (`deflateRawSync` de `node:zlib`), seguido del *central directory* y el *end of central directory record*.
- Reutiliza `crc32()`, ya exportado desde `server/importers/paquete-zip.js`, en vez de reimplementar la tabla CRC-32.
- Sin ZIP64 (no hace falta: un examen cabe muy por debajo de los límites de 32 bits), sin cifrado, sin comentario de archivo.
- Test propio: escribir con `crearZip()` y releer con el `leerZip()` ya existente de la 015 debe devolver las mismas entradas byte a byte. Es la validación estructural más fuerte disponible sin abrir Excel de verdad.

### 2. `server/exporters/xlsx.js` — construcción del libro

- `crearLibroXlsx(hojas)`: recibe `[{ nombre, cabeceras, filas }]` (`filas` = array de arrays de celdas, ya tipadas: `number` o `string`) y arma las partes XML fijas más una `xl/worksheets/sheetN.xml` por hoja:
  - `[Content_Types].xml`, `_rels/.rels`, `xl/workbook.xml`, `xl/_rels/workbook.xml.rels` — plantillas casi fijas, solo varía la lista de hojas.
  - `xl/styles.xml` — dos `cellXfs`: `0` normal, `1` cabecera (fuente en negrita, relleno sólido de color). Referenciado por índice de estilo (`s="1"`) en las celdas de la fila 1 de cada hoja.
  - `xl/worksheets/sheetN.xml` — filas con `<c t="inlineStr"><is><t>…</t></is></c>` para texto y `<c><v>…</v></c>` para números; `<cols>` con ancho por columna calculado como `Math.min(60, Math.max(10, máximoLargoDeTexto + 2))`; `<sheetViews><pane ySplit="1" topLeftCell="A2" state="frozen"/></sheetViews>` para congelar la cabecera.
  - Escapar `&`, `<`, `>` en todo texto que entre a XML (los datos vienen de preguntas/nombres reales, pueden traer cualquiera de los tres).
- `crearZip()` empaqueta todas las partes en el Buffer final.

### 3. `server/exporters/resultados.js` — filas compartidas entre CSV y Excel

- Se extraen `filasDetalle(exportacion)` y `filasResumen(exportacion)` (los `.map(...)` que hoy viven dentro de `aDetalleCsv`/`aResumenCsv`), que devuelven arrays de objetos clave/valor igual que antes.
- `aDetalleCsv`/`aResumenCsv` pasan a ser `aCsv(CABECERAS_X, filasX(exportacion))` — mismo resultado, cero cambio de comportamiento ni de test existente.
- Nueva `aExcel(exportacion)`: arma `hojas = [{ nombre: 'Resumen', cabeceras: CABECERAS_RESUMEN, filas: ... }, { nombre: 'Detalle', ... }]`, convirtiendo cada objeto de `filasResumen`/`filasDetalle` a un array de celdas en el orden de las cabeceras (mismo `cabeceras.map((campo) => fila[campo])` que ya usa `aCsv`), marcando como número las columnas que el criterio de aceptación pide numéricas. Llama a `crearLibroXlsx(hojas)`.

### 4. Ruta — `server/routes/docente.js`

- El `GET /sesiones/:id/export/:tipo` existente gana `'excel'` en la lista de tipos válidos, con extensión `xlsx` y `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`. La respuesta es un `Buffer` (`res.send(buffer)`), no texto — mismo `Content-Disposition` que las demás.

### 5. UI — `public/docente/resultados.html` y `resultados.js`

- Un cuarto `<a class="acceso" id="excel">` en el panel, mismo patrón visual que los otros tres.
- `resultados.js`: agregar `'excel'` al array `['detalle', 'resumen', 'json']` que arma los `href`; el `id` del elemento coincide con el tipo (no hace falta el caso especial que ya existe para `resumen-csv`).

## Decisiones

- **Escritor de ZIP propio, no una librería** — decisión explícita del usuario (ver conversación): mantiene el `package.json` en cero dependencias nuevas, coherente con el resto del proyecto (CSV, ZIP-lectura y QR ya son código propio). Costo: ~150-200 líneas de código nuevo para el ZIP y otras ~150-200 para el XML de SpreadsheetML.
- **Strings inline en vez de tabla de shared strings** — menos código, el archivo resultante es algo más grande, pero a la escala de un curso (decenas de estudiantes) es imperceptible. Si algún día hiciera falta optimizar tamaño, se puede añadir la tabla sin tocar la interfaz de `crearLibroXlsx`.
- **Dos hojas con las mismas columnas que los CSV existentes, no un tercer formato** — evita mantener tres definiciones de columnas distintas (JSON, CSV, Excel) para los mismos datos; `CABECERAS_DETALLE`/`CABECERAS_RESUMEN` siguen siendo la única fuente de verdad.
- **Extraer `filasDetalle`/`filasResumen` de las funciones CSV existentes** — evaluado contra duplicar la lógica de mapeo dentro de `aExcel`: duplicarla es más simple de escribir pero deja dos lugares que mantener sincronizados cada vez que cambie una columna del contrato v2. Extraer es un refactor de bajo riesgo (mismos tests de CSV siguen pasando sin tocar sus asserts) que evita esa duplicación.
- **No versionar el Excel como parte del contrato** — es una vista de conveniencia sin consumidor externo; versionarlo obligaría a mantener compatibilidad con una plataforma que no existe.
- **Sin ZIP64** — un archivo de examen (decenas de estudiantes, decenas de preguntas) nunca se acerca a los límites de 4 GB / 65535 entradas que justificarían la complejidad extra.

## Riesgos

- **Un XLSX mal formado no siempre falla ruidosamente** — Excel puede "reparar" el archivo en silencio y el docente ni se entera de que algo estaba mal. Mitigación: el test que re-lee el ZIP con `leerZip()` propio confirma la estructura de contenedor; la validación del XML interno (que abra sin diálogo de reparación) queda para la sesión de validación manual final, igual que las demás piezas visuales del proyecto — no es automatizable sin Excel/LibreOffice instalados.
- **Caracteres especiales en nombres o preguntas** (`&`, `<`, `>`, tildes, emoji) — deben escaparse para XML y codificarse en UTF-8 en cada parte; se cubre con un test dedicado usando un nombre de estudiante con `&` y `<` literales.
- **Rendimiento** — comprimir con `deflateRawSync` decenas de entradas pequeñas es holgadamente más rápido que el límite de 2 s del criterio de aceptación (ya se cumple hoy para CSV/JSON con el mismo volumen de datos).
