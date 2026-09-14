# 028 · Ingreso manual de preguntas — Plan

_Cómo se implementa lo descrito en `spec.md`. Debe respetar la `constitution/`._

## Enfoque

Mismo patrón que la 020 (gestión manual de estudiantes): un servicio con validación explícita en español, dos rutas REST bajo `/api/docente/*`, y un `<dialog>` nativo en el frontend. Sin dependencias nuevas, sin migración de esquema — la tabla `preguntas`/`opciones` ya tiene todas las columnas que hacen falta (con `DEFAULT` para lo que el formulario mínimo no pide) desde la 026.

La pieza que lo hace más simple que la 020: `guardarBanco` (importación ZIP) ya sabe insertar una pregunta con sus opciones dentro de una transacción; para el alta manual basta una versión reducida que solo llena `contexto`, `enunciado` y las 4 opciones, dejando el resto de columnas en su valor por defecto.

## Implementación

1. **`server/services/bancos.js`** — agrego, junto a lo existente:
   - `LETRAS_OPCION` (`['A', 'B', 'C', 'D']`), reutilizada en los mensajes de error.
   - `validarPreguntaManual(datos)` — valida `{contexto, enunciado, archivoImagen, opciones: [{texto, esCorrecta, justificacion}] × 4}`. Devuelve `{registro, errores}` con todos los problemas a la vez (enunciado vacío, opción N vacía, ni una o más de una marcada como correcta). No valida que `archivoImagen` exista en disco — ya lo hace `nombresDisponibles()`/`guardarImagen` en la ruta de imágenes, igual que hoy hace el importador ZIP con la suya.
   - `bloquesDeContexto({contexto, archivoImagen})` — arma el array de bloques: bloque de texto si hay contexto, bloque de imagen si hay `archivoImagen`.
   - `crearBancoVacio(db, nombre)` — valida el nombre (no vacío) e inserta en `bancos` sin preguntas. Devuelve el banco vía `obtenerBanco`.
   - `agregarPreguntaManual(db, bancoId, datos)` — 404 si el banco no existe; valida con `validarPreguntaManual`; inserta la pregunta (solo `banco_id, contexto, enunciado`, el resto por `DEFAULT`) y sus 4 opciones en una transacción. Devuelve la pregunta creada (mismo shape que `preguntasDeBanco`, para que el frontend la pinte con `renderizarPregunta` sin pedir nada más).
   - `actualizarPreguntaManual(db, preguntaId, datos)` — 404 si no existe; 409 si `grupo_id` no es nulo (pertenece a un grupo del ZIP) o si la pregunta ya aparece en `intento_preguntas` (ya se usó en una evaluación); valida con `validarPreguntaManual`; `UPDATE` de `contexto`/`enunciado` y reemplazo completo de sus opciones (`DELETE` + `INSERT`, más simple que un diff y consistente con que las opciones no tienen identidad propia para el docente).
   - `eliminarPregunta(db, preguntaId)` — mismas 404/409 que actualizar; `DELETE FROM preguntas` (cascada a `opciones` por la FK `ON DELETE CASCADE` ya existente).
   - Extraigo un `preguntaUnica(db, id)` privado que reutilizan `agregarPreguntaManual` y `actualizarPreguntaManual`, con la misma forma de fila + `conBloquesParseados` que ya usa `preguntasDeBanco`.

2. **`server/routes/docente.js`** — cuatro rutas nuevas junto a las de bancos existentes, mismo estilo try/catch que estudiantes (`err.errores` → 400/409 con lista; si no, `err.estado ?? 400` con `mensaje`):
   - `POST /bancos` — body `{nombre}` → `{ok: true, banco}`.
   - `POST /bancos/:id/preguntas` — body de la pregunta → `{ok: true, pregunta}`.
   - `PUT /preguntas/:id` — mismo body → `{ok: true, pregunta}`.
   - `DELETE /preguntas/:id` → `{ok: true, pregunta}`.
   Las cuatro caen bajo el router que monta `docente.js`, que ya exige la sesión de docente para todo `/api/docente/*` (sin tocar `auth.js`).

3. **`public/docente/bancos.html`** — añado:
   - Encabezado de la sección "Bancos cargados" con un botón **"+ Nuevo banco vacío"** (mismo patrón `.encabezado-seccion` que `estudiantes.html`).
   - Dentro de la tarjeta de detalle (`#detalle`), un botón **"+ Agregar pregunta"** antes de `#detalle-preguntas`.
   - Un `<dialog id="editor-pregunta">` con el formulario: contexto (`<textarea>`), imagen (`<input type="file">` con su propio estado de subida, igual que la sección 1 de la página), enunciado (`<textarea required>`), 4 filas de opción (`<textarea>` de texto + `<input type="radio" name="correcta">` + `<textarea>` de justificación), bloque de errores y los botones Guardar/Cancelar.

4. **`public/docente/bancos.js`** — añado:
   - `crearBancoVacio()` — pide el nombre con un `<input>` simple junto al botón (no hace falta un modal aparte: es un solo campo), llama a `POST /bancos`, recarga el listado y abre `verBanco(id)` del banco creado.
   - `abrirEditorPregunta(pregunta, bancoId, desde)` — modo crear (`pregunta` es `null`) o editar (prellena contexto/enunciado/opciones a partir de los bloques ya parseados que devuelve la API; la imagen prellenada se muestra como nombre de archivo ya adjunto, no se vuelve a pedir el archivo salvo que el docente elija uno nuevo).
   - Subida de imagen dentro del modal: reutiliza el mismo `POST /api/docente/imagenes` que la sección 1, guardando el nombre devuelto en una variable local hasta el submit (no hace falta un componente nuevo).
   - `submit` del formulario: arma `{contexto, archivoImagen, enunciado, opciones: [...]}` desde los 4 bloques de opción, llama a `POST .../preguntas` o `PUT /preguntas/:id` según el modo, pinta errores dentro del modal si los hay, y si va bien refresca `verBanco(bancoId)` (para ver la pregunta ya renderizada) y dispara `recargar()` (para el conteo de la tabla de bancos).
   - `accionesDePregunta(pregunta, bancoId)` — botones Editar/Eliminar que se insertan junto al bloque que devuelve `renderizarPregunta` para cada pregunta suelta de `verBanco`; **no** se agregan a las preguntas dentro de un grupo (`seccionDeGrupo` no cambia).
   - `eliminar` pide `window.confirm`, llama `DELETE /preguntas/:id`, y en éxito refresca detalle + listado.

## Decisiones

- **Reusar `renderizarPregunta` para la vista del formulario también en el detalle, no dentro del propio modal** — el modal es un formulario de edición plano (textareas), no una previsualización en vivo; mantiene el modal simple y evita duplicar la lógica de bloques en el cliente. Quien quiera ver cómo queda, guarda y lo ve en el detalle, igual que ya ocurre con el ZIP (la previsualización del ZIP sí existe porque ahí el riesgo es un archivo generado por una IA con errores; un formulario campo a campo no tiene esa clase de sorpresa).
- **Reemplazar todas las opciones en cada edición (`DELETE` + `INSERT`) en vez de hacer diff por id** — las opciones no tienen identidad estable desde el punto de vista del docente (no hay "opción B" como concepto persistente más allá de su posición); es la misma simplicidad que ya usa la exportación y evita rastrear altas/bajas de filas de opciones.
- **Bloquear edición/eliminación de preguntas ya usadas en una evaluación (`intento_preguntas`)** — no estaba en el criterio explícito del usuario, pero es el mismo principio que ya aplican `borrarBanco` (009) y `borrarSesion` (022): los datos de un estudiante que ya presentó deben seguir siendo auditables. Alternativa descartada: permitirlo igual, porque cambiaría en silencio lo que un estudiante ya respondió sin dejar rastro.
- **"Agregar pregunta" disponible en cualquier banco, no solo en los creados vacíos** — técnicamente no cuesta nada distinguirlo (la función no mira el origen del banco) y es más útil: un docente puede importar un ZIP y luego corregir/añadir una pregunta suelta a mano sin reimportar todo.
- **Sin campo `imagen` en la tabla `preguntas`** — esa columna existe en el esquema pero ya no se usa desde la 016 (las imágenes viven como bloque `{tipo: 'imagen', archivo}` dentro de `contexto`/`enunciado`); el alta manual sigue esa misma convención en vez de reactivar la columna vieja.

## Riesgos

- **Un docente arma un banco entero pregunta por pregunta y pierde el trabajo si cierra el navegador a mitad de una** — cada pregunta se guarda individualmente al enviarse (no hay borrador local), así que solo se pierde la que estaba escribiendo en ese momento, no las anteriores. Igual que ya ocurre con "Nuevo estudiante" en la 020; no se introduce autosave por ahora.
- **El formulario manual y el ZIP divergen en qué campos exigen** (el ZIP exige justificación por opción; el manual la deja opcional) — es intencional (ver "Fuera de alcance" en `spec.md`), pero hay que dejarlo explícito en la ayuda del formulario para que no se lea como un bug.
