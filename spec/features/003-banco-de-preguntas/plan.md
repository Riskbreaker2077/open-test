# 003 · Banco de preguntas — Plan

## Enfoque

Reutiliza íntegramente el parser de `server/importers/csv.js` y el patrón validar/confirmar de la feature 002; lo nuevo es la validación de las invariantes de la pregunta y el manejo de imágenes.

Las imágenes se suben **antes** que el archivo de preguntas, deliberadamente: así el importador puede comprobar que cada nombre referenciado existe realmente y fallar en el momento de la carga, no en mitad del examen. Se guardan como archivos en `data/uploads/imagenes/` y en la base solo va el nombre; meterlas como BLOB complicaría la copia de seguridad que el docente hace copiando la carpeta.

La vista previa del estudiante **reutiliza el mismo módulo de renderizado** que usará la feature 006, no una copia. Si divergen, la previsualización deja de servir para lo único que sirve.

## Implementación

1. `server/importers/preguntas.js` — `validarBanco(texto, tipo)`: normaliza CSV y JSON a la forma intermedia `{ contexto, imagen, enunciado, opciones[4], indiceCorrecta, explicacion }` y aplica las invariantes del contrato, acumulando todos los errores con su fila.
2. `server/services/bancos.js` — `guardarBanco(db, nombre, preguntas)` en una transacción que inserta el banco, sus preguntas y sus opciones; `listarBancos(db)` con el conteo; `borrarBanco(db, id)` que rechaza si hay sesiones asociadas; `obtenerPregunta(db, id)` para la previsualización.
3. Subida de imágenes en `server/routes/docente.js` con `express` y un manejador de `multipart` mínimo: valida extensión y tamaño, sanea el nombre de archivo (sin rutas, sin `..`) y guarda en `data/uploads/imagenes/`.
4. Servir las imágenes como estáticos desde `/imagenes/*`, solo lectura.
5. Rutas: `POST /api/docente/imagenes`, `GET /api/docente/imagenes`, `POST /api/docente/bancos/validar`, `POST /api/docente/bancos/confirmar`, `GET /api/docente/bancos`, `DELETE /api/docente/bancos/:id`, `GET /api/docente/bancos/:id/vista-previa`.
6. `public/shared/pregunta.js` — **módulo de renderizado compartido**: recibe `{ contexto, imagen, enunciado, opciones }` y pinta la tarjeta de pregunta. Lo usarán tanto la previsualización del docente como la app del estudiante (feature 006).
7. `public/docente/bancos.html` + `bancos.js` — subida de imágenes, carga del archivo, previsualización, listado de bancos y vista "así lo verá el estudiante".
8. Tests: `preguntas.test.js` (cada invariante y cada mensaje del contrato, CSV y JSON), `bancos.test.js` (transacción completa, borrado protegido), y un test de seguridad que recorre las respuestas de `/api/examen/*` comprobando que no aparece `es_correcta`.

## Decisiones

- **Imágenes como archivos, no BLOB en SQLite** — el docente hace su copia de seguridad copiando la carpeta `data/`; los archivos sueltos se inspeccionan y se reemplazan sin herramientas. Se descarta el BLOB pese a que daría un único archivo portable.
- **Imágenes primero, preguntas después** — permite validar la referencia en la importación. La alternativa (referencias colgando hasta que alguien suba la imagen) traslada el fallo al día del examen.
- **Cada importación crea un banco nuevo, sin fusionar ni actualizar** — no existe una clave natural de pregunta en el archivo del docente, así que cualquier criterio de actualización sería adivinar. Un archivo = un paquete es predecible.
- **Módulo de renderizado compartido entre panel y examen** — es lo que hace que la previsualización sea una garantía y no una aproximación.
- **Sanear el nombre del archivo subido** — sin esto, un nombre con `../` escribe fuera de `data/`. Es la única superficie de escritura de archivos del sistema.

## Riesgos

- **Fotos de móvil de 5 MB** — 50 preguntas ilustradas así hacen la carga lenta en tablets modestas. Mitigación: límite de tamaño por imagen y aviso en el panel cuando una supere el umbral recomendado, con la sugerencia de reducirla.
- **El docente marca mal la correcta** en su archivo — indetectable por el sistema. Mitigación: la previsualización señala visiblemente cuál es la correcta en cada pregunta, para que lo revise antes del examen.
- **Nombres de imagen con tildes o espacios** — se conservan pero se sanean; se prueba explícitamente que `célula 1.png` funciona.
