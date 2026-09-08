---
name: listado-estudiantes
description: Genera el archivo CSV o JSON de estudiantes listo para importar a OpenTest. Usa cuando el usuario pida "armar el listado", "crear la lista de estudiantes", "exportar a CSV para OpenTest", "darle los códigos al docente", o mencione importar estudiantes. Produce un CSV con la cabecera obligatoria `codigo,nombres,apellidos,curso` (o su equivalente JSON), respetando los límites del contrato.
---

# Listado de estudiantes para OpenTest

Esta skill produce el archivo que el docente arrastra a la pantalla **Estudiantes → Cargar la lista** del panel. OpenTest lo lee, lo valida todo-o-nada y actualiza por `codigo` (no duplica, no borra a quien falte).

## Antes de empezar

1. Lee `spec/contracts/import-estudiantes.md`. Es el contrato; cambiarlo rompe al docente y a cualquier otra herramienta que dependa del formato.
2. Decide el formato:
   - **CSV** si el docente va a editar la lista en Excel o equivalente (recomendado).
   - **JSON** si los datos vienen ya estructurados o si hay caracteres que se van a pelear con comillas y comas.

## CSV — formato recomendado

Cabecera obligatoria, **exactamente** estos cuatro nombres (en cualquier orden, pero estas cadenas literales):

```
codigo,nombres,apellidos,curso
```

### Detalles del parseo que el importador respeta

- **Codificación:** UTF-8. Si el archivo empieza con el BOM (`﻿`), OpenTest lo descarta; Excel en Windows lo agrega siempre, así que es esperado.
- **Separador:** se autodetecta entre `,` y `;` mirando la primera línea. Si el docente trabaja con Excel en español, normalmente quiere `;`.
- **Comillas:** RFC 4180: campos con `"..."` admiten comas y saltos de línea dentro, y `""` es la comilla escapada.
- **Saltos de línea:** `\n` o `\r\n`.
- **Filas vacías:** se ignoran.
- **Columnas extra:** se ignoran. El docente puede reusar un archivo con más columnas sin problema.

### Reglas de validación por columna

| Columna | Obligatoria | Máx. caracteres | Notas |
|---|---|---|---|
| `codigo` | sí | 40 | Único en el archivo y en la base. Distingue mayúsculas. No recortar espacios al inicio/final |
| `nombres` | sí | 120 | Texto libre |
| `apellidos` | sí | 120 | Texto libre |
| `curso` | sí | 40 | Etiqueta del grupo (p. ej. `10A`). Es lo que selecciona el docente al convocar |

Cualquier fila que incumpla hace fallar la importación **entera** (no se guarda nada). El docente ve la lista de errores con su número de fila.

### Reglas entre filas

- **Códigos repetidos dentro del mismo archivo** son un error. No se actualiza silenciosamente.
- **Códigos ya existentes en la base** se actualizan (nombres, apellidos, curso). Nunca duplican.
- **Estudiantes que están en la base y no aparecen en el archivo nuevo** se conservan.

## Ejemplo mínimo CSV

```csv
codigo,nombres,apellidos,curso
2024001,María Fernanda,Gómez Ruiz,10A
2024002,Juan Sebastián,Pérez Loaiza,10A
2024003,Ana Lucía,Ramírez Osorio,10B
```

Y la misma lista tal como la exporta Excel en español (separador `;`):

```csv
codigo;nombres;apellidos;curso
2024001;María Fernanda;Gómez Ruiz;10A
2024002;Juan Sebastián;Pérez Loaiza;10A
2024003;Ana Lucía;Ramírez Osorio;10B
```

Para que Excel en español lo abra con tildes correctas, **guarda el archivo como "CSV UTF-8"**. La versión "CSV (separado por comas)" de Excel escribe en latin-1 y rompe las tildes.

## JSON — equivalente

Dos formas equivalentes; la primera es más explícita, la segunda es más corta:

```json
{
  "estudiantes": [
    { "codigo": "2024001", "nombres": "María Fernanda", "apellidos": "Gómez Ruiz", "curso": "10A" },
    { "codigo": "2024002", "nombres": "Juan Sebastián", "apellidos": "Pérez Loaiza", "curso": "10A" }
  ]
}
```

```json
[
  { "codigo": "2024001", "nombres": "María Fernanda", "apellidos": "Gómez Ruiz", "curso": "10A" }
]
```

Las mismas reglas de validación por campo se aplican. `JSON.parse` estricto, nada de comentarios ni claves con tildes.

## Cómo producir el archivo desde shell

Para CSV:

```bash
# Si los datos vienen en variables simples:
printf 'codigo,nombres,apellidos,curso\n' > estudiantes.csv
printf '2024001,María Fernanda,Gómez Ruiz,10A\n' >> estudiantes.csv
printf '2024002,Juan Sebastián,Pérez Loaiza,10A\n' >> estudiantes.csv

# Con BOM para Excel en Windows:
printf '\xef\xbb\xbfcodigo,nombres,apellidos,curso\n' > estudiantes.csv
```

Para JSON:

```bash
cat > estudiantes.json <<'EOF'
{
  "estudiantes": [
    { "codigo": "2024001", "nombres": "María Fernanda", "apellidos": "Gómez Ruiz", "curso": "10A" }
  ]
}
EOF
```

## Lista de verificación antes de entregar

- [ ] Cabecera del CSV con los **nombres exactos** `codigo`, `nombres`, `apellidos`, `curso`.
- [ ] Separador único (todo `,` o todo `;`) y consistente con la cabecera.
- [ ] UTF-8 con o sin BOM; si es para Excel en Windows, con BOM.
- [ ] Ningún `codigo` repetido dentro del archivo.
- [ ] Todos los `codigo` ≤ 40 caracteres, todos los `nombres`/`apellidos` ≤ 120, todos los `curso` ≤ 40.
- [ ] Ninguna fila con campos vacíos.
- [ ] Si es JSON, parsea sin errores y trae la clave `estudiantes` o es un array plano en la raíz.

## Lo que NO hace esta skill

- Generar los códigos institucionales (eso es del colegio, no de OpenTest).
- Validar contra una lista censurada. OpenTest acepta cualquier cadena; el docente decide.
- Detectar duplicados contra la base. La validación aquí es solo dentro del archivo; la unicidad contra lo que ya está guardado se resuelve en el importador.
- Convertir desde otros formatos (Excel `.xlsx`, Google Sheets, etc.) — el docente exporta a CSV UTF-8 desde su app y nosotros recibimos el CSV.

## Salidas típicas del docente

- "Tengo 30 estudiantes, te paso los nombres y tú me armas el CSV" → producir un CSV con códigos sintéticos `2024NNN` si no los hay, agrupando por curso.
- "Te paso el listado del colegio en este Excel, ¿lo dejas listo?" → si viene con códigos institucionales, respetarlos; si no, preguntar.
- "Necesito agregar a uno nuevo" → esto es mejor con la pantalla del docente (feature 020, botón "+ Nuevo estudiante"), no con un CSV.
