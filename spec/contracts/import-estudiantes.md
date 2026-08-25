# Contrato · Importación de estudiantes

Formato del archivo con el que el docente carga su lista de estudiantes. Se importa **una sola vez** al principio del año o del periodo; reimportarlo actualiza los datos existentes.

Consumido por la feature [002 · Importar estudiantes](../features/002-importar-estudiantes/spec.md).

## CSV (formato recomendado)

Cabecera obligatoria, exactamente estos cuatro nombres de columna:

```csv
codigo,nombres,apellidos,curso
2024001,María Fernanda,Gómez Ruiz,10A
2024002,Juan Sebastián,Pérez Loaiza,10A
2024003,Ana Lucía,Ramírez Osorio,10B
```

| Columna | Obligatoria | Reglas |
|---|---|---|
| `codigo` | Sí | Identidad del estudiante. Único en todo el archivo y en la base. Se recorta de espacios; se compara tal cual (distingue mayúsculas). Máx. 40 caracteres |
| `nombres` | Sí | Texto libre, máx. 120 caracteres |
| `apellidos` | Sí | Texto libre, máx. 120 caracteres |
| `curso` | Sí | Etiqueta del grupo, p. ej. `10A`. Máx. 40 caracteres. Es lo que el docente selecciona al convocar una sesión y por lo que se agrupan los exports |

### Detalles del parseo

- **Codificación:** UTF-8. Se acepta y se descarta el BOM inicial (es lo que produce Excel en Windows).
- **Separador:** se detecta automáticamente entre `,` y `;` mirando la línea de cabecera. Excel en español suele usar `;`.
- **Comillas:** se soportan campos entre `"` con comas dentro, y `""` como comilla escapada.
- **Saltos de línea:** `\n` o `\r\n`.
- **Filas vacías:** se ignoran silenciosamente.
- **Columnas extra:** se ignoran, no son un error. Así el docente puede reutilizar un archivo que ya tiene con más datos.
- **Orden de columnas:** irrelevante; se localizan por nombre de cabecera.

## JSON (equivalente)

```json
{
  "estudiantes": [
    { "codigo": "2024001", "nombres": "María Fernanda", "apellidos": "Gómez Ruiz", "curso": "10A" },
    { "codigo": "2024002", "nombres": "Juan Sebastián", "apellidos": "Pérez Loaiza", "curso": "10A" }
  ]
}
```

También se acepta un array plano en la raíz (`[ {...}, {...} ]`). Mismas reglas de validación por campo.

## Reglas de importación

- **Todo o nada.** Si alguna fila es inválida, no se importa ninguna. El docente recibe la lista completa de problemas y corrige su archivo de una vez, en lugar de descubrirlos de a uno.
- **Actualiza por `codigo`.** Si el código ya existe, se actualizan nombres, apellidos y curso. Nunca se crean duplicados.
- **No borra.** Un estudiante que estaba en la base y no aparece en el archivo nuevo **se conserva**. Eliminar es una acción explícita y separada.
- **Códigos repetidos dentro del mismo archivo** son un error, no una actualización silenciosa.

## Errores que el docente debe ver

Siempre en español, con el número de fila del archivo (contando la cabecera como fila 1):

- `Falta la columna obligatoria "curso" en la cabecera del archivo.`
- `Fila 8: la columna "codigo" está vacía.`
- `Fila 14: el código "2024001" está repetido (ya aparece en la fila 3).`
- `Fila 22: "apellidos" supera los 120 caracteres.`
- `El archivo no contiene ninguna fila de datos.`
