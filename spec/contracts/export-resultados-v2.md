# Contrato · Exportación de resultados, versión 2

`formato_version: 2`

Lo que el docente descarga al terminar una sesión. Es el contrato con **la plataforma externa de retroalimentación**, así que es el documento más estable del proyecto: cambiarlo rompe a un consumidor que no controlamos.

Producido por la feature [016 · Estándar preguntas-icfes](../features/016-estandar-preguntas-icfes/spec.md), que reemplaza a la [009 · Exportación de resultados](../features/009-exportacion-resultados/spec.md) original (`formato_version: 1`, ver [`export-resultados-v1.md`](export-resultados-v1.md)). La reducción a dos formatos (Excel + ZIP) es de la [025 · Exportaciones: Excel rico + ZIP reproducible](../features/025-exporaciones-excel-zip/spec.md).

## Qué cambia respecto a v1

OpenTest adoptó el estándar externo `preguntas-icfes`
(https://github.com/riskbreaker2077/preguntas-icfes): cada pregunta trae
metadata pedagógica (competencia, componente, afirmación, evidencia, estándar
asociado, qué evalúa) y cada opción trae su propia justificación, no una sola
`explicacion` general de la pregunta. Eso **cambia el significado de un
campo existente** (`explicacion` desaparece, cada opción mostrada gana
`justificacion`) y por eso sube la versión, según la propia política de
versionado del contrato.

- **JSON:** `preguntas[].explicacion` (una por pregunta) desaparece.
  `preguntas[].opciones_mostradas[]` gana `justificacion` (una por opción,
  correcta o no) y `contenido` (array de bloques) en vez de `texto` (string).
  `preguntas[].contexto` y `preguntas[].enunciado` pasan de string a array de
  bloques. Cada pregunta gana `competencia`, `componente`, `afirmacion`,
  `evidencia`, `estandar_asociado` y `que_evalua`. El campo `imagen` (nombre
  de archivo único) desaparece: las imágenes ahora son bloques dentro de
  `contexto`, `enunciado` u `opciones_mostradas[].contenido`.

## Qué se descarga (a partir de la 025)

Dos archivos, elegibles por separado, siempre referidos a **una sesión** y opcionalmente filtrados **por curso**:

| Archivo | Grano | Para qué |
|---|---|---|
| `resultados.xlsx` | Tres hojas en un libro | Ver en planilla: resumen por estudiante, detalle por pregunta con las cuatro opciones, y el banco visto por la clase |
| `reproduccion.zip` | JSON + `imagenes/` + (opcional) `imagenes_faltantes.txt` | Reconstruir la evaluación en otra plataforma, con las imágenes referenciadas empaquetadas |

Nombre de archivo sugerido:

- `opentest_<sesion>_<curso>_resultados_<AAAA-MM-DD>.xlsx`
- `opentest_<sesion>_<curso>_reproduccion_<AAAA-MM-DD>.zip`

Los endpoints `GET /api/docente/sesiones/:id/export/detalle` y
`/resumen` y `/json` quedan **obsoletos** desde la 025: devuelven 404.
El JSON sólo se distribuye dentro del ZIP. Quien necesite el JSON
suelto puede extraerlo del ZIP con cualquier herramienta estándar.

## `resultados.xlsx`

Libro con tres hojas, en este orden. Cabecera de cada hoja en **negrita**
sobre fondo verde institucional; fila 1 congelada. Las celdas numéricas
salen como número (no como texto) para que se puedan ordenar y sumar
directamente desde la planilla.

### Hoja `Resumen`

Una fila por intento, igual que el CSV resumen de v1 más `formato_version: 2`.

Cabeceras: `formato_version, sesion, codigo, nombres, apellidos, curso, total_preguntas, respondidas, saltadas, aciertos, puntaje, porcentaje, inicio, entrega, motivo_entrega`.

### Hoja `Detalle`

Una fila por `(intento, pregunta)`. Trae **las cuatro opciones** que se le
mostraron al estudiante, cada una con su `id`, su texto y la marca de
correcta, además de la opción que eligió y la metadata pedagógica de la
pregunta.

Cabeceras: `formato_version, sesion, curso, codigo, nombres, apellidos, n_pregunta, pregunta_id, competencia, componente, afirmacion, evidencia, estandar_asociado, que_evalua, opcion_a_id, opcion_a_texto, opcion_a_es_correcta, opcion_b_id, opcion_b_texto, opcion_b_es_correcta, opcion_c_id, opcion_c_texto, opcion_c_es_correcta, opcion_d_id, opcion_d_texto, opcion_d_es_correcta, opcion_elegida_id, acierto, saltada, segundos`.

- Las cuatro opciones van **en el orden exacto** que se le presentaron al
  estudiante (mismo orden que `opciones_mostradas` en el JSON).
- `opcion_a_texto` / `opcion_b_texto` / `opcion_c_texto` / `opcion_d_texto`
  son sólo los bloques `texto` concatenados de cada opción (las
  imágenes y tablas no entran en el Excel, igual que en el CSV v1).
- `opcion_a_es_correcta` etc. es `1` o `0`.
- `opcion_elegida_id` es el `opcion_id` elegido, o vacío si la pregunta
  fue saltada.

### Hoja `Banco`

Una fila por pregunta del banco, con su metadata pedagógica, los textos
de las cuatro opciones y los conteos de cuántas veces la pregunta fue
presentada / acertada / saltada en la sesión.

Cabeceras: `pregunta_id, competencia, componente, afirmacion, evidencia, estandar_asociado, que_evalua, opcion_a_texto, opcion_b_texto, opcion_c_texto, opcion_d_texto, veces_presentada, veces_acertada, veces_saltada`.

- `veces_presentada`: cantidad de intentos en cuya prueba sorteada
  cayó esta pregunta.
- `veces_acertada`: cuántas veces la opción marcada coincide con la
  correcta del banco.
- `veces_saltada`: cuántas veces la pregunta quedó con `opcion_id = NULL`
  en `respuestas` (el estudiante abrió la pregunta pero no eligió
  opción).

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

El árbol `formato_version: 2` completo, byte-idéntico al JSON de v2.
Ver el bloque de abajo.

### `imagenes/<archivo>`

Cada nombre de archivo que aparezca como bloque
`{tipo: 'imagen', archivo: 'X.png'}` en `contexto`, `enunciado` o
`opciones[].contenido` de las preguntas que efectivamente se usaron en
los `intento_preguntas` de la sesión. El archivo se copia tal cual desde
`data/uploads/imagenes/`. Si una imagen referenciada no existe en
disco, se omite y se nombra en `imagenes_faltantes.txt`.

### `imagenes_faltantes.txt`

Sólo aparece cuando hay imágenes referenciadas que no se pudieron
empaquetar. Un nombre de archivo por línea. La exportación **no**
falla por esto.

## `resultados.json` (dentro del ZIP)

```json
{
  "formato_version": 2,
  "exportado_en": "2026-08-24T09:10:00",
  "sesion": {
    "id": 42,
    "nombre": "Ciencias P2",
    "banco": "Ciencias · Periodo 2",
    "cursos": ["10A", "10B"],
    "n_preguntas": 20,
    "duracion_minutos": 60,
    "segundos_minimos_pregunta": 10
  },
  "intentos": [
    {
      "codigo": "2024001", "nombres": "María Fernanda", "apellidos": "Gómez Ruiz", "curso": "10A",
      "inicio": "2026-08-24T08:05:11", "entrega": "2026-08-24T08:47:32", "motivo_entrega": "manual",
      "aciertos": 14, "puntaje": 14, "porcentaje": 70.0,
      "preguntas": [
        {
          "n_pregunta": 1,
          "pregunta_id": 58,
          "competencia": "Pensamiento social",
          "componente": "Sujeto, sociedad y estado",
          "afirmacion": "Reconoce mecanismos de participación democrática",
          "evidencia": "Identifica el mecanismo adecuado según el caso planteado",
          "estandar_asociado": "Analizo críticamente los elementos constituyentes de la democracia.",
          "que_evalua": "Diferenciar mecanismos de participación ciudadana según el caso.",
          "contexto": [{ "tipo": "texto", "texto": "Lee el siguiente fragmento: ..." }],
          "enunciado": [{ "tipo": "texto", "texto": "¿Cuál es la idea principal?" }],
          "opciones_mostradas": [
            { "opcion_id": 231, "contenido": [{ "tipo": "texto", "texto": "La migración" }], "es_correcta": true, "justificacion": "Correcta: aparece en la primera oración." },
            { "opcion_id": 232, "contenido": [{ "tipo": "texto", "texto": "El clima" }], "es_correcta": false, "justificacion": "Incorrecta: el clima no se menciona como causa en el fragmento." }
          ],
          "opcion_elegida_id": 231,
          "opcion_elegida_texto": "La migración",
          "opcion_correcta_texto": "La migración",
          "acierto": true,
          "saltada": false,
          "segundos": 34
        }
      ]
    }
  ]
}
```

`opciones_mostradas` va **en el orden exacto en que el estudiante las vio**, igual que en v1.

El campo `sesion.id` se agregó en la 025. Es opcional para los
consumidores que sólo leen `sesion.nombre` y compañía.

## Política de versiones

Sin cambios respecto a v1:

- **Compatible (no sube la versión):** añadir columnas **al final** de un CSV; añadir claves nuevas al JSON.
- **Rompe (sube de versión):** renombrar, quitar o reordenar columnas; cambiar el tipo o el significado de un campo; cambiar la fórmula del puntaje.
- El consumidor debe leer los CSV **por nombre de cabecera**, nunca por posición.

## Reglas

UTF-8 con BOM sólo en los CSV (ya no se sirven). En el Excel y el ZIP el
encoding es UTF-8 sin BOM (es la convención del formato). El JSON dentro
del ZIP va formateado con dos espacios de indentación.

Se exportan todos los intentos incluidos los que no entregaron.
