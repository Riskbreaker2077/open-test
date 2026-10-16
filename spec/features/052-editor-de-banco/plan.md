# 052 · Plan

Sin dependencias nuevas ni migración: todas las columnas ya existen (016/026).

## Servidor (`server/services/bancos.js`)

- `insertarContenido(db, bancoId, preguntas, grupos)`: el cuerpo de `guardarBanco` sin crear el banco. Antes de insertar, renombra los `id` de grupo que ya existan en `grupos` (`<id>-2`, `-3`…) y reescribe el `grupo_id` de sus miembros. `guardarBanco` y la nueva `agregarPaqueteABanco` lo reutilizan dentro de una transacción.
- `validarBloques(bloques, campo, errores)`: texto con `texto` string; imagen con `archivo` saneado (sin rutas); tabla con `encabezados` (strings) y `filas` (arrays de strings del mismo ancho). Los bloques de texto vacíos se descartan. Se conservan las propiedades extra del bloque.
- `normalizarDatosPregunta(datos)`: si llega el formato simple de la 028 (`opciones[].texto`, `esCorrecta`, `archivoImagen`) lo convierte al completo; así `POST`/`PUT` aceptan ambos.
- `validarPreguntaCompleta(datos, contextoGrupo)`: devuelve `{registro, errores}`; `contextoGrupo` dice si es miembro de matching (sin opciones; `respuesta_pool_id` debe existir en el banco del grupo).
- `actualizarPreguntaManual` pasa a usar la validación completa y escribe contenido, opciones (conservando `procedencia_justificacion`/`justificacion_verificada` si vuelven) y los campos pedagógicos. `preguntaEditable` deja de rechazar las de grupo; solo rechaza las usadas.
- `agregarPreguntaManual` acepta también el formato completo (siempre pregunta suelta).
- `eliminarPregunta`: rechaza miembros de `banco_opciones`/`texto_con_blancos`; borra el grupo si queda vacío.
- `actualizarGrupo(db, grupoId, datos)` y `eliminarGrupo(db, grupoId)`, con el mismo candado de uso.
- `preguntasDeBanco` añade `usos` (count en `intento_preguntas`).

## Rutas (`server/routes/docente.js`)

`POST /bancos/:id/paquete/validar|confirmar`, `PUT /grupos/:id`, `DELETE /grupos/:id`.

## Cliente

- `public/docente/editor-bloques.js`: componente `crearEditorBloques(bloques, {subirImagen})` → `{elemento, valor()}`. Filas de texto (textarea), imagen (miniatura, cambiar, descripción) y tabla (inputs por celda, +fila/+columna); ↑ ↓ ✕ por bloque; botones + Texto / + Imagen / + Tabla.
- `bancos.html`/`bancos.js`: el detalle pasa a cabecera compacta + rejilla `minmax(16rem, 24rem) 1fr`; lista con filas seleccionables; vista previa con ficha pedagógica. El modal del editor se reconstruye con el componente de bloques, opciones variables y un `<details>` de datos pedagógicos. Nuevo modal de grupo. El diálogo de importar se reutiliza en modo "agregar a este banco" (cambia las rutas y oculta el nombre).
- Estilos en el `<style>` de `bancos.html` bajo `.editor-banco` (nada suelto de `.acciones-fila`, regla de la 048).

## Pruebas

Servicio: validación completa, edición de miembro con metadata, conservación de tablas, matching con `respuesta_pool_id`, borrar última miembro borra el grupo, matching/cloze no se borran sueltas, editar/eliminar grupo, ZIP repetido con grupos, agregar ZIP a banco. Rutas: las nuevas exigen contraseña y responden 409 con uso.
