# 009 · Exportación de resultados

**Estado:** propuesta

## Qué hace

Terminada la sesión, el docente descarga los resultados. Elige la sesión, opcionalmente un curso, y obtiene los tres archivos de [`export-resultados-v1.md`](../../contracts/export-resultados-v1.md):

- **`resultados-detalle.csv`** — una fila por cada pregunta que se le presentó a cada estudiante, con lo que respondió y si acertó. Es el que alimenta la plataforma externa de retroalimentación.
- **`resultados-resumen.csv`** — una fila por estudiante, para pasar las notas a la planilla.
- **`resultados.json`** — todo, anidado, incluidas las opciones **en el orden exacto en que las vio** cada estudiante.

## Por qué

Es el entregable del sistema: el motivo por el que el docente aplicó el examen aquí y no en papel. Y es su único punto de contacto con otra plataforma, así que el formato es un compromiso que se respeta al detalle.

El detalle pregunta a pregunta es lo que hace posible la retroalimentación real —qué falló cada estudiante, qué falló el curso entero— y también lo que permite responder a un reclamo meses después, porque la materialización de la feature 005 garantiza que el archivo refleja exactamente lo que hubo en pantalla.

## Criterios de aceptación

- [ ] Se pueden descargar los tres archivos para una sesión cerrada.
- [ ] Se puede filtrar la descarga por curso; sin filtro, salen todos los cursos convocados.
- [ ] Las cabeceras de los CSV coinciden **exactamente** con las del contrato, en el mismo orden (test que las compara literalmente).
- [ ] `formato_version` vale `1` en los tres archivos.
- [ ] Los CSV se generan en UTF-8 **con BOM** y las tildes se ven bien al abrirlos en Excel en Windows.
- [ ] Los campos con comas, comillas o saltos de línea se escapan correctamente y el archivo sigue siendo válido.
- [ ] Cada fila del detalle corresponde a una pregunta asignada; una pregunta a la que el estudiante nunca llegó aparece con `saltada = 1` y `segundos = 0`.
- [ ] Una pregunta saltada tiene `opcion_elegida_texto` vacío y `acierto = 0`.
- [ ] `opcion_correcta_texto` siempre trae la correcta, aunque el estudiante fallara.
- [ ] En el resumen, `respondidas + saltadas = total_preguntas` para todos los estudiantes.
- [ ] `porcentaje` coincide con `aciertos / total_preguntas * 100` con un decimal.
- [ ] En el JSON, `opciones_mostradas` respeta el orden real que vio el estudiante, verificable contra `intento_preguntas.orden_opciones`.
- [ ] Se exportan también los intentos sin entregar, con `entrega` vacía.
- [ ] Los nombres de archivo descargados siguen el patrón `opentest_<sesion>_<curso>_<tipo>_<fecha>.csv`.
- [ ] Exportar una sesión con 40 estudiantes y 20 preguntas tarda menos de 2 segundos.
- [ ] Se puede exportar una sesión antigua ya cerrada, no solo la última.

## Fuera de alcance

- Exportar a `.xlsx` o a PDF: CSV y JSON cubren la planilla y la integración.
- Enviar los resultados a ninguna parte por red: el docente descarga archivos.
- Estadísticas agregadas por pregunta (backlog); el detalle ya contiene los datos para calcularlas fuera.
- Exportar el banco de preguntas.
