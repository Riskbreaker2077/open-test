# Contrato · Exportación de resultados, versión 2

`formato_version: 2`

Lo que el docente descarga al terminar una sesión. Es el contrato con **la plataforma externa de retroalimentación**, así que es el documento más estable del proyecto: cambiarlo rompe a un consumidor que no controlamos.

Producido por la feature [016 · Estándar preguntas-icfes](../features/016-estandar-preguntas-icfes/spec.md), que reemplaza a la [009 · Exportación de resultados](../features/009-exportacion-resultados/spec.md) original (`formato_version: 1`, ver [`export-resultados-v1.md`](export-resultados-v1.md)).

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
- **CSV detalle:** gana una columna `competencia` al final. El resto de
  columnas no cambia de nombre ni de posición; `enunciado`,
  `opcion_elegida_texto` y `opcion_correcta_texto` siguen siendo texto plano
  (se concatenan solo los bloques de tipo `texto`; imágenes y tablas no
  aparecen en el CSV).
- **CSV resumen:** sin cambios de columnas.

## Qué se descarga

Tres archivos, elegibles por separado, siempre referidos a **una sesión** y opcionalmente filtrados **por curso**:

| Archivo | Grano | Para qué |
|---|---|---|
| `resultados-detalle.csv` | Una fila por respuesta | Retroalimentación pregunta a pregunta. Es el que consume la otra plataforma |
| `resultados-resumen.csv` | Una fila por estudiante | Pasar notas a la planilla |
| `resultados.json` | Todo, anidado | Reproceso completo y auditoría |

Nombre de archivo sugerido: `opentest_<sesion>_<curso>_<detalle|resumen>_<AAAA-MM-DD>.csv`.

## `resultados-detalle.csv`

```csv
formato_version,sesion,curso,codigo,nombres,apellidos,n_pregunta,pregunta_id,enunciado,opcion_elegida_texto,opcion_correcta_texto,acierto,saltada,segundos,competencia
2,Ciencias P2,10A,2024001,María Fernanda,Gómez Ruiz,1,58,"¿Cuál es la idea principal?","La migración","La migración",1,0,34,"Pensamiento social"
```

| Columna | Tipo | Significado |
|---|---|---|
| `formato_version` | entero | `2` en esta versión |
| `sesion`, `curso`, `codigo`, `nombres`, `apellidos` | texto | Igual que en v1 |
| `n_pregunta` | entero | Posición en la prueba de este estudiante (1..N) |
| `pregunta_id` | entero | Identidad de la pregunta en el banco |
| `enunciado` | texto | Solo los bloques de tipo texto del enunciado, concatenados |
| `opcion_elegida_texto` / `opcion_correcta_texto` | texto | Solo los bloques de texto de esa opción. Vacío si la saltó o si la opción es puramente imagen/tabla |
| `acierto`, `saltada`, `segundos` | igual que en v1 | |
| `competencia` | texto | La competencia pedagógica de la pregunta, según el estándar preguntas-icfes |

## `resultados-resumen.csv`

Sin cambios respecto a v1 (ver [`export-resultados-v1.md`](export-resultados-v1.md)), salvo `formato_version: 2`.

## `resultados.json`

```json
{
  "formato_version": 2,
  "exportado_en": "2026-08-24T09:10:00",
  "sesion": { "nombre": "Ciencias P2", "banco": "Ciencias · Periodo 2", "cursos": ["10A", "10B"], "n_preguntas": 20, "duracion_minutos": 60, "segundos_minimos_pregunta": 10 },
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

## Política de versiones

Sin cambios respecto a v1:

- **Compatible (no sube la versión):** añadir columnas **al final** de un CSV; añadir claves nuevas al JSON.
- **Rompe (sube de versión):** renombrar, quitar o reordenar columnas; cambiar el tipo o el significado de un campo; cambiar la fórmula del puntaje.
- El consumidor debe leer los CSV **por nombre de cabecera**, nunca por posición.

## Reglas

Sin cambios respecto a v1: UTF-8 con BOM en los CSV, separador `,`, números sin separador de miles, se exportan todos los intentos incluidos los que no entregaron.
