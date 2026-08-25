# 009 · Exportación de resultados — Plan

## Enfoque

Un módulo `server/exporters/resultados.js` que es la **única** parte del sistema que conoce el formato v1. Ese aislamiento es el punto: cuando la plataforma externa pida un cambio, se toca un archivo y sus tests, y nada más.

Se construye primero la estructura completa en memoria —la misma que serializa el JSON— y los dos CSV se derivan de ella. Así los tres archivos no pueden discrepar entre sí, que es el fallo clásico de tener tres generadores independientes.

## Implementación

1. `server/exporters/csv.js` — `aCsv(cabeceras, filas)`: escapa comillas y campos con separadores o saltos de línea, une con `\r\n` y antepone el BOM. Es el complemento de escritura del parser de lectura de la feature 002.
2. `server/exporters/resultados.js`:
   - `armarExportacion(db, sesionId, curso?)` — una consulta que trae sesión, estudiantes, intentos, `intento_preguntas`, preguntas, opciones y respuestas, y arma el objeto anidado del contrato, resolviendo `opciones_mostradas` a partir de `orden_opciones`.
   - `aDetalleCsv(exportacion)`, `aResumenCsv(exportacion)`, `aJson(exportacion)`.
3. Rutas `GET /api/docente/sesiones/:id/export/{detalle|resumen|json}` con `?curso=`, que responden con `Content-Disposition: attachment` y el nombre del patrón acordado.
4. `public/docente/resultados.html` + `resultados.js` — selector de sesión (incluidas las antiguas), selector de curso, tres botones de descarga y una explicación de una línea de para qué sirve cada archivo.
5. Índices de apoyo en `intento_preguntas(intento_id)` y `respuestas(intento_pregunta_id)` para que el armado sea una sola pasada.
6. Tests:
   - comparación literal de las cabeceras contra las del contrato;
   - escapado: campo con coma, con comillas, con salto de línea; presencia del BOM;
   - fila por pregunta no alcanzada con `saltada = 1` y `segundos = 0`;
   - `respondidas + saltadas = total_preguntas`;
   - `opciones_mostradas` coincide con `orden_opciones` del intento;
   - intento sin entregar exportado con `entrega` vacía;
   - rendimiento: 40 × 20 bajo 2 s.

## Decisiones

- **Un único módulo dueño del formato** — el contrato es con un sistema externo; dispersarlo por rutas y consultas garantizaría que se rompa sin que nadie lo note.
- **Estructura en memoria primero, CSV derivados** — con 40 estudiantes y 20 preguntas son 800 filas: caben de sobra en memoria y la consistencia entre los tres archivos queda garantizada por construcción. Se descarta el streaming por innecesario a esta escala.
- **BOM en los CSV** — sin él, Excel en Windows muestra `MarÃ­a`. Es feo, parece un error de la aplicación y el docente no sabe arreglarlo. El BOM es la diferencia entre "funciona" y "está roto" para el usuario real.
- **Incluir las preguntas nunca alcanzadas** — la plataforma de retroalimentación necesita saber qué se le asignó a cada estudiante, no solo qué contestó; y el total tiene que cuadrar.
- **`pregunta_id` en el detalle** — es la única columna que permite agregar por pregunta entre estudiantes, ya que `n_pregunta` es distinto para cada uno. Es lo que hace útil el archivo para el análisis del curso.
- **Permitir exportar sesiones antiguas** — el docente descarga cuando puede, no cuando termina el examen.

## Riesgos

- **La plataforma externa espera otro formato** — es el riesgo abierto conocido: el usuario aún no ha facilitado su especificación. Mitigación: el formato está documentado, versionado y aislado en un módulo; adaptarlo será cambiar `resultados.js` y sus tests, no rehacer nada más.
- **Nombres de sesión o curso con caracteres inválidos para un nombre de archivo** — se sanean al construir el `Content-Disposition`.
- **Un docente abre el CSV en Excel y el código del estudiante se convierte en número**, perdiendo ceros a la izquierda — es un comportamiento de Excel, no del archivo. Se advierte en la guía docente (feature 010) con la indicación de importar como texto.
