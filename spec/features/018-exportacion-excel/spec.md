# 018 · Exportación a Excel con diseño

**Estado:** implementado ✅

## Qué hace

El panel de [009 · Exportación de resultados](../009-exportacion-resultados/spec.md) ofrece hoy tres descargas: detalle CSV, resumen CSV y JSON. Esta feature agrega una cuarta, un archivo `.xlsx` de un solo clic con **dos hojas**:

- **"Resumen"** — una fila por estudiante, mismas columnas que `resultados-resumen.csv`.
- **"Detalle"** — una fila por pregunta presentada, mismas columnas que `resultados-detalle.csv`, incluida `competencia`.

Cabecera en negrita con relleno de color y **congelada** (no se pierde de vista al bajar por 40 filas), columnas con ancho ajustado al contenido en vez del ancho por defecto, y las columnas numéricas (`acierto`, `saltada`, `segundos`, `aciertos`, `puntaje`, `porcentaje`, etc.) como números reales, no texto, para que el docente pueda ordenar o sumar directamente en Excel.

## Por qué

Pendiente de "Exportación a Excel con diseño" en el backlog del roadmap. El docente hoy abre el CSV en Excel para revisar resultados o pasarlos a coordinación, y Excel se lo entrega sin formato: cabecera igual que los datos, columnas angostas, todo como texto. Esta feature entrega ya maquetado lo que el docente termina maquetando a mano cada vez.

## Relación con el contrato de exportación

**Este `.xlsx` no es parte de [`export-resultados-v2.md`](../../contracts/export-resultados-v2.md).** El contrato es con la plataforma externa de retroalimentación y se lee por CSV/JSON; el Excel es una comodidad exclusiva para el docente, generado a partir de los mismos datos que ya arma `armarExportacion()`. No lleva número de versión propio y puede cambiar de formato libremente sin romper a nadie fuera de OpenTest.

## Criterios de aceptación

- [x] El panel de resultados (`/docente/resultados.html`) tiene un cuarto acceso, "Excel (.xlsx)", junto a los tres existentes, con el mismo filtro de sesión/curso.
- [x] El archivo descargado tiene exactamente dos hojas, en este orden: "Resumen", "Detalle".
- [x] Las cabeceras de la hoja "Resumen" son, en orden, las de `CABECERAS_RESUMEN`; las de "Detalle", las de `CABECERAS_DETALLE` — ningún tercer formato de columnas inventado.
- [x] La fila de cabecera está en negrita, con relleno de color, y congelada (no se desplaza con el resto de la hoja).
- [x] Las columnas tienen un ancho calculado a partir del contenido, no el ancho por defecto de Excel (8.43) en todas ellas.
- [x] Las columnas numéricas (`acierto`, `saltada`, `segundos`, `total_preguntas`, `respondidas`, `saltadas`, `aciertos`, `puntaje`, `porcentaje`, `n_pregunta`, `pregunta_id`) se guardan como celdas numéricas, no texto.
- [x] Se exportan también los intentos sin entregar, igual que en CSV/JSON.
- [x] El nombre del archivo sigue el patrón `opentest_<sesion>_<curso>_resultados_<fecha>.xlsx`.
- [x] Exportar una sesión de 40 estudiantes × 20 preguntas tarda menos de 2 segundos (~134 ms medidos).
- [x] El archivo generado es un ZIP válido y reconocible por el propio `leerZip()` del proyecto (prueba estructural automatizada); además se comprobó fuera de la suite que las 7 partes XML son bien formadas (`xml.dom.minidom`) y que el ZIP pasa `zipfile.testzip()` de Python. La apertura real en Excel/LibreOffice sin diálogo de reparación queda pendiente para la sesión de validación manual final.
- [x] No se agrega ninguna dependencia nueva a `package.json`.

## Fuera de alcance

- Gráficos, fórmulas o macros dentro del Excel.
- Color condicional por acierto/fallo, o cualquier formato más allá de cabecera + anchos.
- Una tercera hoja de estadísticas agregadas por pregunta/competencia — eso es el backlog separado "Estadísticas por pregunta y competencia".
- Exportar el banco de preguntas a Excel.
- Cambiar el contrato `export-resultados-v2.md` o su versión: el Excel es una vista adicional, no un cuarto archivo del contrato.
