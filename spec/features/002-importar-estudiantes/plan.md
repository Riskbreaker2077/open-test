# 002 · Importar estudiantes — Plan

## Enfoque

Un parser de CSV propio y pequeño en `server/importers/csv.js`, compartido después con la importación de preguntas. Escribirlo en lugar de traer una dependencia se justifica por el límite duro del `package.json` mínimo y porque el subconjunto que necesitamos —cabecera, comillas, dos separadores, BOM— cabe en unas 80 líneas y se prueba exhaustivamente.

La importación se separa en dos pasos con dos endpoints: **validar** (parsea, valida, devuelve la previsualización y los errores, no toca la BD) y **confirmar** (repite la validación y escribe en una transacción). El docente ve lo que va a pasar antes de que pase, y la escritura es todo-o-nada por construcción.

## Implementación

1. `server/importers/csv.js` — `parsearCsv(texto)`: descarta BOM, detecta el separador en la cabecera, respeta comillas y saltos de línea internos, ignora filas vacías, y devuelve `{ cabecera, filas }` donde cada fila conserva su número de línea real para los mensajes de error.
2. `server/importers/estudiantes.js` — `validarEstudiantes(texto, tipo)`: normaliza CSV y JSON a la misma forma intermedia y aplica las reglas del contrato (obligatorios, longitudes, códigos repetidos). Devuelve `{ registros, errores }`, nunca lanza por datos malos.
3. `server/services/estudiantes.js` — `guardarEstudiantes(db, registros)` en una transacción de `better-sqlite3` con `INSERT ... ON CONFLICT(codigo) DO UPDATE`; `listarEstudiantes(db, { curso })`; `eliminarEstudiante(db, codigo)`, que comprueba antes si existen intentos asociados.
4. `server/routes/docente.js` — `POST /api/docente/estudiantes/validar`, `POST /api/docente/estudiantes/confirmar`, `GET /api/docente/estudiantes`, `DELETE /api/docente/estudiantes/:codigo`.
5. `public/docente/estudiantes.html` + `estudiantes.js` — selector de archivo, tabla de previsualización, panel de errores y listado con filtro por curso.
6. Tests: `csv.test.js` (BOM, `;` vs `,`, comillas, campo con coma, salto de línea dentro de comillas, columnas extra), `estudiantes.test.js` del importador (cada error del contrato, uno por prueba) y del servicio (upsert no duplica, no borra ausentes, borrado bloqueado con intentos).

## Decisiones

- **Parser CSV propio** — evita una dependencia para un subconjunto pequeño y perfectamente acotado. Si aparece un caso real que no cubra, se reevalúa; se descarta `csv-parse` por peso frente a lo que necesitamos.
- **Validar y confirmar como dos llamadas** — la alternativa (importar directo y reportar) obliga al docente a deshacer. Aquí no hay nada que deshacer. El coste es parsear dos veces un archivo de 500 filas: irrelevante.
- **La importación actualiza pero nunca borra** — un docente que carga por error el archivo de otro curso no destruye su lista. Borrar es una acción explícita y por estudiante.
- **El curso es texto libre, no una tabla** — una tabla `cursos` exigiría gestionarla, y el docente ya tiene sus etiquetas en su archivo. Se documenta en `mission.md` como límite de alcance.

## Riesgos

- **Archivos con codificaciones raras (Latin-1 desde un Excel viejo)** — las tildes salen mal. Mitigación: si tras decodificar como UTF-8 aparece `�`, se avisa explícitamente ("el archivo no está en UTF-8, guárdalo como CSV UTF-8") en lugar de importar nombres corruptos.
- **Códigos con espacios invisibles al final**, típicos de copiar y pegar desde una planilla — se recortan siempre antes de comparar; se prueba explícitamente.
- **Archivos enormes** por un pegado accidental — se limita el tamaño aceptado y se responde con un mensaje claro.
