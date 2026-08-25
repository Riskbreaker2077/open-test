# 002 · Importar estudiantes

**Estado:** implementado ✅

## Qué hace

El docente entra al panel, elige su archivo de estudiantes (CSV o JSON), ve una **previsualización** de lo que se va a importar y confirma. A partir de ahí la lista queda guardada: es una tarea de principio de periodo, no algo que se repita en cada examen.

Si el archivo tiene errores, no se importa nada y el docente ve la lista completa de problemas, cada uno con su número de fila, para corregirlos de una sola pasada.

También puede consultar la lista cargada, filtrarla por curso y eliminar estudiantes puntuales.

## Por qué

Sin estudiantes en la base no hay login, y sin login no hay examen. Es el primer dato que entra al sistema. La calidad de esta pantalla marca la primera impresión del docente: si su archivo de Excel exportado a CSV "simplemente funciona" —con `;` como separador y BOM incluido—, confía en la herramienta; si le devuelve un error críptico, no vuelve.

## Criterios de aceptación

- [x] Se puede importar un CSV que cumpla [`import-estudiantes.md`](../../contracts/import-estudiantes.md) y los estudiantes quedan en la base.
- [x] Se puede importar el JSON equivalente, con el mismo resultado.
- [x] Un CSV exportado por Excel en español (separador `;`, UTF-8 con BOM) se importa correctamente sin que el docente configure nada.
- [x] Antes de confirmar, se muestra una previsualización con el total de filas, cuántas son nuevas, cuántas actualizan a un estudiante existente y los primeros 10 registros.
- [x] Si hay al menos un error, **no se importa ninguna fila** y se listan todos los errores con su número de fila.
- [x] Reimportar un archivo con los mismos códigos actualiza los datos y **no crea duplicados**.
- [x] Un estudiante que está en la base y no aparece en el archivo nuevo se conserva.
- [x] Un código repetido dentro del mismo archivo se reporta como error, indicando ambas filas.
- [x] La lista de estudiantes se puede ver y filtrar por curso, y muestra el total por curso.
- [x] Se puede eliminar un estudiante, con confirmación previa; si ya tiene intentos registrados, se impide el borrado y se explica por qué.
- [x] Los mensajes de error son los del contrato: en español, accionables y con la fila.

## Fuera de alcance

- Editar los datos de un estudiante desde la interfaz (se corrige el archivo y se reimporta).
- Cualquier autenticación del panel del docente.
- Fusionar cursos, renombrarlos o gestionarlos como entidad propia: el curso es una etiqueta de texto.
