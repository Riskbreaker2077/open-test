# Contrato · Exportación de resultados, versión 3

`formato_version: 3`

Lo que el docente descarga al terminar una sesión. Es el contrato con **la plataforma externa de retroalimentación**, así que es el documento más estable del proyecto: cambiarlo rompe a un consumidor que no controlamos.

Producido por la feature [026 · Grupos de preguntas y campos informativos](../features/026-grupos-de-preguntas/spec.md), que parte de la [025 · Exportaciones: Excel rico + ZIP reproducible](../features/025-exporaciones-excel-zip/spec.md) (que sustituyó a las descargas separadas de la [009 · Exportación de resultados](../features/009-exportacion-resultados/spec.md), `formato_version: 1`, ver [`export-resultados-v1.md`](export-resultados-v1.md)) y la [016 · Estándar preguntas-icfes](../features/016-estandar-preguntas-icfes/spec.md) (`formato_version: 2`). El contrato v2 sigue publicado en [`export-resultados-v2.md`](export-resultados-v2.md) como referencia histórica.

## Qué cambia respecto a v2

La subida de v2 → v3 es **aditiva**: todos los consumidores que ya leían v2 siguen entendiendo v3, porque los campos nuevos son opcionales y la estructura general no cambia. Lo que se añade:

- Por pregunta: `valor` (peso en la calificación), `grupo_id`, `tipo_item`,
  `nivel_mcer`, `grado`, `prueba`, `procedencia`, `verificado`, `fuentes`,
  y `version_estandar` (si la pregunta lo declara).
- Por opción: `procedencia_justificacion` y `justificacion_verificada`.
- Para preguntas `miembro_banco_opciones`: la columna de respuesta del
  detalle pasa a llamarse `respuesta_banco_id` y guarda el `id` elegido del
  banco del grupo (en lugar de `opcion_elegida_id`, que en ese caso queda
  vacío porque la pregunta no tiene `opciones` propias).
- En el JSON, `opciones_mostradas` para preguntas `miembro_banco_opciones`
  es la lista de entradas del banco tal como se le mostraron (sin la entrada
  `es_ejemplo`), cada una con `contenido` (bloques) y la marca de cuál es la
  correcta al final.
- Las hojas del Excel crecen con los mismos campos nuevos sin obligar a que
  estén presentes: una columna omitida significa que su valor es el default
  (`valor = 1`, sin procedencia, etc.).

## Qué se descarga

Sin cambios respecto a v2. Dos archivos, elegibles por separado, siempre referidos a **una sesión** y opcionalmente filtrados **por curso**:

| Archivo | Grano | Para qué |
|---|---|---|
| `resultados.xlsx` | Tres hojas en un libro | Ver en planilla: resumen por estudiante, detalle por pregunta con las cuatro opciones, y el banco visto por la clase |
| `reproduccion.zip` | JSON + `imagenes/` + (opcional) `imagenes_faltantes.txt` | Reconstruir la evaluación en otra plataforma, con las imágenes referenciadas empaquetadas |

Nombre de archivo sugerido:

- `opentest_<sesion>_<curso>_resultados_<AAAA-MM-DD>.xlsx`
- `opentest_<sesion>_<curso>_reproduccion_<AAAA-MM-DD>.zip`

Los endpoints `GET /api/docente/sesiones/:id/export/detalle` y `/resumen` y `/json` quedan **obsoletos** desde la 025: devuelven 404. El JSON sólo se distribuye dentro del ZIP. Quien necesite el JSON suelto puede extraerlo del ZIP con cualquier herramienta estándar.

## `resultados.xlsx`

Libro con tres hojas, en este orden. Cabecera de cada hoja en **negrita** sobre fondo verde institucional; fila 1 congelada. Las celdas numéricas salen como número (no como texto) para que se puedan ordenar y sumar directamente desde la planilla.

### Hoja `Resumen`

Una fila por intento. Igual que en v2.

Cabeceras: `formato_version, sesion, codigo, nombres, apellidos, curso, total_preguntas, respondidas, saltadas, aciertos, puntaje, porcentaje, inicio, entrega, motivo_entrega`.

### Hoja `Detalle`

Una fila por `(intento, pregunta)`. Trae **las cuatro opciones** que se le mostraron al estudiante (o, si la pregunta es `miembro_banco_opciones`, el banco compartido con sus entradas), además de la opción elegida y la metadata pedagógica de la pregunta.

Cabeceras (ordenadas, separadas por coma): `formato_version, sesion, curso, codigo, nombres, apellidos, n_pregunta, pregunta_id, grupo_id, tipo_item, valor, nivel_mcer, grado, prueba, competencia, componente, afirmacion, evidencia, estandar_asociado, que_evalua, procedencia_contenido, procedencia_clasificacion, procedencia_respuesta_correcta, verificado_contenido, verificado_clasificacion, verificado_respuesta_correcta, fuentes_contenido, fuentes_clasificacion, fuentes_respuesta_correcta, version_estandar, opcion_a_id, opcion_a_texto, opcion_a_es_correcta, opcion_a_procedencia_justificacion, opcion_a_justificacion_verificada, opcion_b_id, opcion_b_texto, opcion_b_es_correcta, opcion_b_procedencia_justificacion, opcion_b_justificacion_verificada, opcion_c_id, opcion_c_texto, opcion_c_es_correcta, opcion_c_procedencia_justificacion, opcion_c_justificacion_verificada, opcion_d_id, opcion_d_texto, opcion_d_es_correcta, opcion_d_procedencia_justificacion, opcion_d_justificacion_verificada, respuesta_banco_id, opcion_elegida_id, acierto, saltada, segundos`.

- Las columnas `grupo_id`, `tipo_item`, `valor`, `nivel_mcer`, `grado`,
  `prueba`, `procedencia_*`, `verificado_*`, `fuentes_*`, `version_estandar`
  van vacías cuando el banco o la pregunta no las trae; `valor` ausente se
  trata como `1`.
- `respuesta_banco_id` es el `id` que el estudiante eligió dentro del banco
  del grupo (preguntas `miembro_banco_opciones`). En el resto de las
  preguntas queda vacío.
- `opcion_elegida_id` es el `opcion_id` elegido, o vacío si la pregunta fue
  saltada. Para `miembro_banco_opciones` queda vacío (la respuesta está en
  `respuesta_banco_id`).
- `opcion_X_procedencia_justificacion` y `opcion_X_justificacion_verificada`
  son las nuevas columnas por opción de v1.1.0. Vacías si el banco no las
  trae.
- Las cuatro opciones van **en el orden exacto** que se le presentaron al
  estudiante (mismo orden que `opciones_mostradas` en el JSON).
- `opcion_X_texto` son sólo los bloques `texto` concatenados de cada opción
  (las imágenes y tablas no entran en el Excel, igual que en el CSV v1).
- `opcion_X_es_correcta` es `1` o `0`.

### Hoja `Banco`

Una fila por pregunta del banco, con su metadata pedagógica, los textos de las cuatro opciones y los conteos de cuántas veces la pregunta fue presentada / acertada / saltada en la sesión. Si el banco tiene grupos, las preguntas miembro aparecen como filas separadas (una por miembro) con sus `grupo_id` y `tipo_item`, igual que en la hoja Detalle.

Cabeceras (ordenadas): `pregunta_id, grupo_id, tipo_item, valor, nivel_mcer, grado, prueba, competencia, componente, afirmacion, evidencia, estandar_asociado, que_evalua, procedencia_contenido, procedencia_clasificacion, procedencia_respuesta_correcta, verificado_contenido, verificado_clasificacion, verificado_respuesta_correcta, fuentes_contenido, fuentes_clasificacion, fuentes_respuesta_correcta, version_estandar, opcion_a_texto, opcion_b_texto, opcion_c_texto, opcion_d_texto, veces_presentada, veces_acertada, veces_saltada`.

- `veces_presentada`: cantidad de intentos en cuya prueba sorteada cayó esta pregunta.
- `veces_acertada`: cuántas veces la opción marcada coincide con la correcta del banco (o, para `miembro_banco_opciones`, cuántas veces el `id` elegido coincide con el `id` de la entrada correcta del banco).
- `veces_saltada`: cuántas veces la pregunta quedó con `opcion_id = NULL` y `respuesta_banco_id IS NULL` (el estudiante abrió la pregunta pero no eligió nada).

## `reproduccion.zip`

ZIP con tres tipos de entradas:

```
reproduccion.zip
├── resultados.json
├── imagenes/<archivo>.<ext>
├── imagenes/<archivo2>.<ext>
└── imagenes_faltantes.txt   ← sólo si falta alguna imagen en disco
```

### `resultados.json`

El árbol `formato_version: 3` completo, byte-casi-idéntico al JSON de v2 (más los campos nuevos). Ver el bloque de abajo.

### `imagenes/<archivo>`

Igual que en v2: cada nombre de archivo que aparezca como bloque `{tipo: 'imagen', archivo: 'X.png'}` en `contexto`, `enunciado`, `opciones[].contenido` o `grupo.banco[].contenido` de las preguntas efectivamente usadas. El archivo se copia tal cual desde `data/uploads/imagenes/`. Si una imagen referenciada no existe en disco, se omite y se nombra en `imagenes_faltantes.txt`.

### `imagenes_faltantes.txt`

Sólo aparece cuando hay imágenes referenciadas que no se pudieron empaquetar. Un nombre de archivo por línea. La exportación **no** falla por esto.

## `resultados.json` (dentro del ZIP)

```json
{
  "formato_version": 3,
  "exportado_en": "2026-09-08T09:10:00",
  "sesion": {
    "id": 42,
    "nombre": "Ciencias P2",
    "banco": "Ciencias · Periodo 2",
    "cursos": ["10A", "10B"],
    "n_preguntas": 20,
    "duracion_minutos": 60,
    "segundos_minimos_pregunta": 10
  },
  "banco": {
    "id": 7,
    "nombre": "Ciencias · Periodo 2",
    "grupos": [
      {
        "id": "g-001",
        "tipo": "banco_opciones",
        "banco": [
          { "id": "p1", "contenido": [{ "tipo": "texto", "texto": "phloem" }] },
          { "id": "p2", "contenido": [{ "tipo": "texto", "texto": "xylem" }] }
        ]
      }
    ]
  },
  "intentos": [
    {
      "codigo": "2024001", "nombres": "María Fernanda", "apellidos": "Gómez Ruiz", "curso": "10A",
      "inicio": "2026-09-08T08:05:11", "entrega": "2026-09-08T08:47:32", "motivo_entrega": "manual",
      "aciertos": 14, "puntaje": 15, "porcentaje": 75.0,
      "preguntas": [
        {
          "n_pregunta": 1,
          "pregunta_id": 58,
          "grupo_id": null,
          "tipo_item": "estandar",
          "valor": 1,
          "nivel_mcer": null,
          "grado": "9",
          "prueba": "saber11",
          "procedencia": { "contenido": "oficial", "clasificacion": "ia_generada", "respuesta_correcta": "oficial" },
          "verificado": { "contenido": true, "clasificacion": false, "respuesta_correcta": true },
          "fuentes": { "contenido": "cuadernillo-2024-grado9.pdf", "clasificacion": null, "respuesta_correcta": "clave-2024.pdf" },
          "version_estandar": "1.1.0",
          "competencia": "Pensamiento social",
          "componente": "Sujeto, sociedad y estado",
          "afirmacion": "Reconoce mecanismos de participación democrática",
          "evidencia": "Identifica el mecanismo adecuado según el caso planteado",
          "estandar_asociado": "Analizo críticamente los elementos constituyentes de la democracia.",
          "que_evalua": "Diferenciar mecanismos de participación ciudadana según el caso.",
          "contexto": [{ "tipo": "texto", "texto": "Lee el siguiente fragmento: ..." }],
          "enunciado": [{ "tipo": "texto", "texto": "¿Cuál es la idea principal?" }],
          "opciones_mostradas": [
            { "opcion_id": 231, "contenido": [{ "tipo": "texto", "texto": "La migración" }], "es_correcta": true, "justificacion": "Correcta: aparece en la primera oración.", "procedencia_justificacion": "oficial", "justificacion_verificada": true },
            { "opcion_id": 232, "contenido": [{ "tipo": "texto", "texto": "El clima" }], "es_correcta": false, "justificacion": "Incorrecta: el clima no se menciona como causa en el fragmento.", "procedencia_justificacion": "ia_generada", "justificacion_verificada": false }
          ],
          "opcion_elegida_id": 231,
          "opcion_elegida_texto": "La migración",
          "opcion_correcta_texto": "La migración",
          "respuesta_banco_id": null,
          "acierto": true,
          "saltada": false,
          "segundos": 34
        },
        {
          "n_pregunta": 5,
          "pregunta_id": 62,
          "grupo_id": "g-001",
          "tipo_item": "miembro_banco_opciones",
          "valor": 1,
          "opciones_mostradas": [
            { "banco_id": "p1", "contenido": [{ "tipo": "texto", "texto": "phloem" }], "es_correcta": false },
            { "banco_id": "p2", "contenido": [{ "tipo": "texto", "texto": "xylem" }], "es_correcta": true }
          ],
          "opcion_elegida_id": null,
          "respuesta_banco_id": "p2",
          "acierto": true,
          "saltada": false,
          "segundos": 12
        }
      ]
    }
  ]
}
```

- `opciones_mostradas` va **en el orden exacto en que el estudiante las vio**,
  igual que en v1 y v2.
- Para preguntas `miembro_banco_opciones`, `opciones_mostradas` es la lista de
  entradas del banco (sin la marcada `es_ejemplo`) y la respuesta va en
  `respuesta_banco_id` con el `id` elegido. `opcion_elegida_id` y
  `opcion_elegida_texto` quedan vacíos.
- `puntaje` puede diferir de `aciertos` cuando una o más preguntas tienen
  `valor` distinto de 1 (un matching de 5 miembros acertado vale 5 puntos).
- Los campos nuevos a nivel de pregunta/procedencia/verificado/fuentes
  pueden omitirse cuando el banco no los trae, sin que eso signifique un
  cambio semántico: ausencia = no declarado (igual que en el estándar).

## Política de versiones

Sin cambios respecto a v1 y v2:

- **Compatible (no sube la versión):** añadir columnas **al final** de un CSV; añadir claves nuevas al JSON.
- **Rompe (sube de versión):** renombrar, quitar o reordenar columnas; cambiar el tipo o el significado de un campo; cambiar la fórmula del puntaje.
- El consumidor debe leer los CSV **por nombre de cabecera**, nunca por posición.

## Reglas

UTF-8 con BOM sólo en los CSV (ya no se sirven). En el Excel y el ZIP el encoding es UTF-8 sin BOM (es la convención del formato). El JSON dentro del ZIP va formateado con dos espacios de indentación.

Se exportan todos los intentos incluidos los que no entregaron.
