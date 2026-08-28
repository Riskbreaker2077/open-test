# 009 · Exportación de resultados

**Estado:** implementado ✅

## Qué hace

Terminada la sesión, el docente descarga los resultados. Elige la sesión, opcionalmente un curso, y obtiene los tres archivos de [`export-resultados-v1.md`](../../contracts/export-resultados-v1.md):

- **`resultados-detalle.csv`** — una fila por cada pregunta que se le presentó a cada estudiante, con lo que respondió y si acertó. Es el que alimenta la plataforma externa de retroalimentación.
- **`resultados-resumen.csv`** — una fila por estudiante, para pasar las notas a la planilla.
- **`resultados.json`** — todo, anidado, incluidas las opciones **en el orden exacto en que las vio** cada estudiante.

## Por qué

Es el entregable del sistema: el motivo por el que el docente aplicó el examen aquí y no en papel. Y es su único punto de contacto con otra plataforma, así que el formato es un compromiso que se respeta al detalle.

El detalle pregunta a pregunta es lo que hace posible la retroalimentación real —qué falló cada estudiante, qué falló el curso entero— y también lo que permite responder a un reclamo meses después, porque la materialización de la feature 005 garantiza que el archivo refleja exactamente lo que hubo en pantalla.

## Criterios de aceptación

- [x] Se pueden descargar los tres archivos para una sesión cerrada.
- [x] Se puede filtrar la descarga por curso; sin filtro, salen todos los cursos convocados.
- [x] Las cabeceras de los CSV coinciden **exactamente** con las del contrato, en el mismo orden (test que las compara literalmente).
- [x] `formato_version` vale `1` en los tres archivos.
- [ ] Los CSV se generan en UTF-8 **con BOM** y las tildes se ven bien al abrirlos en Excel en Windows.
- [x] Los campos con comas, comillas o saltos de línea se escapan correctamente y el archivo sigue siendo válido.
- [x] Cada fila del detalle corresponde a una pregunta asignada; una pregunta a la que el estudiante nunca llegó aparece con `saltada = 1` y `segundos = 0`.
- [x] Una pregunta saltada tiene `opcion_elegida_texto` vacío y `acierto = 0`.
- [x] `opcion_correcta_texto` siempre trae la correcta, aunque el estudiante fallara.
- [x] En el resumen, `respondidas + saltadas = total_preguntas` para todos los estudiantes.
- [x] `porcentaje` coincide con `aciertos / total_preguntas * 100` con un decimal.
- [x] En el JSON, `opciones_mostradas` respeta el orden real que vio el estudiante, verificable contra `intento_preguntas.orden_opciones`.
- [x] Se exportan también los intentos sin entregar, con `entrega` vacía.
- [x] Los nombres de archivo descargados siguen el patrón `opentest_<sesion>_<curso>_<tipo>_<fecha>.<csv|json>`.
- [x] Exportar una sesión con 40 estudiantes y 20 preguntas tarda menos de 2 segundos.
- [x] Se puede exportar una sesión antigua ya cerrada, no solo la última.

## Cierre

Implementación cerrada con 15 de 16 criterios verificados. Abrir los CSV en Excel sobre Windows para confirmar visualmente tildes y columnas queda aplazado a la sesión final con el equipo destino; la presencia del BOM UTF-8 sí está verificada byte a byte.

## Fuera de alcance

- Exportar a `.xlsx` o a PDF: CSV y JSON cubren la planilla y la integración.
- Enviar los resultados a ninguna parte por red: el docente descarga archivos.
- Estadísticas agregadas por pregunta (backlog); el detalle ya contiene los datos para calcularlas fuera.
- Exportar el banco de preguntas.
