> **Obsoleto desde la feature 016.** OpenTest ya no acepta CSV ni este JSON
> plano para preguntas: el único formato es el del estándar externo
> `preguntas-icfes`, documentado en
> [`paquete-preguntas-icfes.md`](paquete-preguntas-icfes.md). Este archivo se
> conserva como referencia histórica de cómo funcionaba la importación en
> las features 003–015.

# Contrato · Importación de un banco de preguntas

Formato del archivo con el que el docente carga un paquete de preguntas (típicamente 40–50) del que después se sortearán las 20 que le toca a cada estudiante.

Consumido por la feature [003 · Banco de preguntas](../features/003-banco-de-preguntas/spec.md).

## CSV (formato recomendado)

Cabecera obligatoria, una fila por pregunta:

```csv
contexto,imagen,enunciado,opcion_a,opcion_b,opcion_c,opcion_d,correcta,explicacion
"Lee el siguiente fragmento: ...",,"¿Cuál es la idea principal?","La migración","El clima","La cosecha","El río",A,"La idea principal aparece en la primera oración."
,celula.png,"¿Qué organelo está señalado?","Mitocondria","Núcleo","Ribosoma","Vacuola",B,
```

| Columna | Obligatoria | Reglas |
|---|---|---|
| `contexto` | No | Texto introductorio compartido: una lectura, un caso, un enunciado largo. Se muestra encima de la pregunta. Vacío = la pregunta va sola |
| `imagen` | No | **Nombre de archivo**, no una ruta ni una URL. Debe existir en `data/uploads/imagenes/`. Extensiones aceptadas: `.png`, `.jpg`, `.jpeg`, `.webp` |
| `enunciado` | Sí | La pregunta. Máx. 1000 caracteres |
| `opcion_a` … `opcion_d` | Sí | Las cuatro opciones. Ninguna puede estar vacía. Máx. 500 caracteres cada una |
| `correcta` | Sí | Exactamente una letra: `A`, `B`, `C` o `D`. Se acepta en minúscula y se normaliza |
| `explicacion` | No | Por qué esa es la correcta. Solo se le muestra al estudiante si el nivel de feedback de la sesión es `completo` |

Reglas de parseo del CSV (BOM, separador `,` o `;`, comillas, columnas extra ignoradas): **las mismas que en [`import-estudiantes.md`](import-estudiantes.md)**, mismo parser.

## JSON (equivalente, anidado)

Más cómodo cuando los enunciados son largos o llevan saltos de línea:

```json
{
  "nombre_banco": "Ciencias · Periodo 2",
  "preguntas": [
    {
      "contexto": "Lee el siguiente fragmento: ...",
      "imagen": null,
      "enunciado": "¿Cuál es la idea principal?",
      "opciones": ["La migración", "El clima", "La cosecha", "El río"],
      "correcta": 0,
      "explicacion": "La idea principal aparece en la primera oración."
    }
  ]
}
```

- `opciones` es un array de **exactamente 4** cadenas.
- `correcta` es el **índice base 0** dentro de ese array (`0`–`3`). También se acepta la letra `"A"`–`"D"`.
- `nombre_banco` es opcional; si falta, se usa el nombre del archivo.

## Invariantes

Estas se validan en la importación y ninguna parte del sistema las vuelve a comprobar después:

1. **Exactamente 4 opciones por pregunta**, ninguna vacía.
2. **Exactamente una opción correcta** por pregunta.
3. Todo nombre en `imagen` corresponde a un archivo que **ya existe** en `data/uploads/imagenes/`.
4. Un banco tiene **al menos tantas preguntas como las que se van a sortear** en una sesión. Con menos de 20, la sesión por defecto no se puede abrir; el importador avisa pero no bloquea la carga.

## Reglas de importación

- **Todo o nada.** Un solo error rechaza el archivo completo, con la lista de todos los problemas encontrados. Nunca se importa media evaluación.
- **Cada importación crea un banco nuevo.** No se fusiona con uno existente ni se actualizan preguntas por ningún criterio: un archivo cargado = un paquete. Para corregir, se borra el banco y se vuelve a cargar.
- Un banco **usado en una sesión ya presentada no se puede borrar**: los resultados dejarían de ser auditables.

## Errores que el docente debe ver

- `Fila 7: la columna "correcta" dice "E". Debe ser A, B, C o D.`
- `Fila 12: la opción C está vacía. Las cuatro opciones son obligatorias.`
- `Fila 19: la imagen "celula.png" no está en la carpeta de imágenes. Súbela antes de importar.`
- `Fila 23: el enunciado supera los 1000 caracteres.`
- `El banco tiene 14 preguntas. Una sesión de 20 preguntas necesita al menos 20.`
- `El archivo JSON tiene una pregunta con 3 opciones (posición 5). Deben ser exactamente 4.`
