# Contrato · Exportación de resultados, versión 1

`formato_version: 1`

Lo que el docente descarga al terminar una sesión. Es el contrato con **la plataforma externa de retroalimentación**, así que es el documento más estable del proyecto: cambiarlo rompe a un consumidor que no controlamos.

Producido por la feature [009 · Exportación de resultados](../features/009-exportacion-resultados/spec.md).

## Qué se descarga

Tres archivos, elegibles por separado, siempre referidos a **una sesión** y opcionalmente filtrados **por curso**:

| Archivo | Grano | Para qué |
|---|---|---|
| `resultados-detalle.csv` | Una fila por respuesta | Retroalimentación pregunta a pregunta. Es el que consume la otra plataforma |
| `resultados-resumen.csv` | Una fila por estudiante | Pasar notas a la planilla |
| `resultados.json` | Todo, anidado | Reproceso completo y auditoría |

Nombre de archivo sugerido: `opentest_<sesion>_<curso>_<detalle|resumen>_<AAAA-MM-DD>.csv`.

## `resultados-detalle.csv`

Una fila por cada pregunta que se le presentó a cada estudiante, en el orden en que la vio.

```csv
formato_version,sesion,curso,codigo,nombres,apellidos,n_pregunta,pregunta_id,enunciado,opcion_elegida_texto,opcion_correcta_texto,acierto,saltada,segundos
1,Ciencias P2,10A,2024001,María Fernanda,Gómez Ruiz,1,58,"¿Cuál es la idea principal?","La migración","La migración",1,0,34
1,Ciencias P2,10A,2024001,María Fernanda,Gómez Ruiz,2,61,"¿Qué organelo está señalado?","Ribosoma","Núcleo",0,0,21
1,Ciencias P2,10A,2024001,María Fernanda,Gómez Ruiz,3,44,"¿Cuál es la causa descrita?","","La sequía",0,1,12
```

| Columna | Tipo | Significado |
|---|---|---|
| `formato_version` | entero | Siempre `1` en esta versión. Permite al consumidor detectar cambios |
| `sesion` | texto | Nombre de la sesión de examen |
| `curso` | texto | Curso del estudiante |
| `codigo` | texto | Código del estudiante |
| `nombres`, `apellidos` | texto | |
| `n_pregunta` | entero | Posición **en la prueba de este estudiante** (1..N). No es comparable entre estudiantes |
| `pregunta_id` | entero | Identidad de la pregunta en el banco. **Esta sí es comparable entre estudiantes** y es la clave para agregar por pregunta |
| `enunciado` | texto | Texto de la pregunta, para que el archivo se lea sin la base de datos |
| `opcion_elegida_texto` | texto | Lo que respondió. **Vacío si la saltó** |
| `opcion_correcta_texto` | texto | La respuesta correcta |
| `acierto` | 0/1 | `1` solo si respondió y acertó |
| `saltada` | 0/1 | `1` si la vio y no respondió |
| `segundos` | entero | Segundos que estuvo en pantalla |

Una pregunta a la que el estudiante **nunca llegó** (entregó antes) aparece igualmente, con `saltada=1` y `segundos=0`: el consumidor necesita saber que esa pregunta le fue asignada.

## `resultados-resumen.csv`

```csv
formato_version,sesion,codigo,nombres,apellidos,curso,total_preguntas,respondidas,saltadas,aciertos,puntaje,porcentaje,inicio,entrega,motivo_entrega
1,Ciencias P2,2024001,María Fernanda,Gómez Ruiz,10A,20,18,2,14,14,70.0,2026-08-24T08:05:11,2026-08-24T08:47:32,manual
```

| Columna | Significado |
|---|---|
| `total_preguntas` | Cuántas se le asignaron |
| `respondidas` / `saltadas` | Suman `total_preguntas` |
| `aciertos` | Respuestas correctas |
| `puntaje` | Puntos obtenidos. En v1, **1 punto por acierto y 0 por error o salto** (sin penalización por error) |
| `porcentaje` | `aciertos / total_preguntas * 100`, un decimal |
| `inicio`, `entrega` | ISO 8601, hora local del servidor. `entrega` vacío si no entregó |
| `motivo_entrega` | `manual` \| `tiempo` \| `ultima_pregunta` \| `forzada_docente` |

## `resultados.json`

Estructura completa, pensada para reproceso:

```json
{
  "formato_version": 1,
  "exportado_en": "2026-08-24T09:10:00",
  "sesion": {
    "nombre": "Ciencias P2",
    "banco": "Ciencias · Periodo 2",
    "cursos": ["10A", "10B"],
    "n_preguntas": 20,
    "duracion_minutos": 60,
    "segundos_minimos_pregunta": 10
  },
  "intentos": [
    {
      "codigo": "2024001",
      "nombres": "María Fernanda",
      "apellidos": "Gómez Ruiz",
      "curso": "10A",
      "inicio": "2026-08-24T08:05:11",
      "entrega": "2026-08-24T08:47:32",
      "motivo_entrega": "manual",
      "aciertos": 14,
      "puntaje": 14,
      "porcentaje": 70.0,
      "preguntas": [
        {
          "n_pregunta": 1,
          "pregunta_id": 58,
          "contexto": "Lee el siguiente fragmento: ...",
          "imagen": null,
          "enunciado": "¿Cuál es la idea principal?",
          "explicacion": "La idea principal aparece en la primera oración.",
          "opciones_mostradas": [
            { "opcion_id": 231, "texto": "La migración", "es_correcta": true },
            { "opcion_id": 233, "texto": "La cosecha", "es_correcta": false },
            { "opcion_id": 232, "texto": "El clima", "es_correcta": false },
            { "opcion_id": 234, "texto": "El río", "es_correcta": false }
          ],
          "opcion_elegida_id": 231,
          "acierto": true,
          "saltada": false,
          "segundos": 34
        }
      ]
    }
  ]
}
```

`opciones_mostradas` va **en el orden exacto en que el estudiante las vio**. Es lo que hace auditable la personalización y lo que permite reconstruir su pantalla meses después.

## Política de versiones

- **Compatible (no sube la versión):** añadir columnas **al final** de un CSV; añadir claves nuevas al JSON.
- **Rompe (sube a `formato_version: 2`):** renombrar, quitar o reordenar columnas; cambiar el tipo o el significado de un campo; cambiar la fórmula del puntaje.
- El consumidor debe leer los CSV **por nombre de cabecera**, nunca por posición.

## Reglas

- Codificación UTF-8 **con BOM** en los CSV, para que Excel en Windows muestre las tildes correctamente sin que el docente configure nada.
- Separador `,` y campos con comas o saltos de línea entre comillas dobles.
- Números sin separador de miles; el decimal es el punto.
- Se exportan **todos los intentos de la sesión**, incluidos los que no entregaron (con `entrega` vacío). Excluirlos sería ocultar información al docente.
