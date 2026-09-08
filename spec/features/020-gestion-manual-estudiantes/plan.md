# 020 · Plan técnico

## Pila y límites respetados

Sin nuevas dependencias, sin cambios en el esquema, sin pasar por build. Solo se aprovecha el elemento nativo `<dialog>` para el modal — accesible por teclado y cerrable con `Esc` sin código ni CSS adicional.

## Backend

### Servicio: `server/services/estudiantes.js`

Extraigo dos funciones nuevas y mantengo las existentes intactas:

- `validarEstudiante(datos)` — valida un objeto `{codigo, nombres, apellidos, curso}` aplicando las mismas reglas de longitud y obligatoriedad que `importers/estudiantes.js` (`LIMITES`). Devuelve `{registro, errores}` con los mismos mensajes en español que usa el importador, para que el docente vea los mismos textos por las dos vías. Devuelve varios errores a la vez, no el primero.
- `crearEstudiante(db, datos)` — llama a `validarEstudiante`, comprueba que el `codigo` no exista ya, y hace `INSERT`. Lanza `Error` con `.estado = 409` si el código está duplicado, `.estado = 400` si hay errores de validación, `.estado = 404` no aplica aquí.
- `actualizarEstudiante(db, codigo, datos)` — comprueba que el estudiante exista (404 si no), valida los nuevos datos (400), y hace `UPDATE` de `nombres`, `apellidos`, `curso`. **Nunca toca `codigo`**: ni lo lee de `datos` aunque venga en el cuerpo. Devuelve el estudiante actualizado.

Para la validación reutilizo los `LIMITES` que ya exporta `importers/estudiantes.js`. Centralizo ahí los números (40/120/120/40) y la lista de columnas (`COLUMNAS`).

### Rutas: `server/routes/docente.js`

Dos rutas nuevas, junto a las existentes:

- `POST /api/docente/estudiantes` — body `{codigo, nombres, apellidos, curso}`. Devuelve `{ok: true, estudiante}` en éxito, `{ok: false, errores}` con 400/409.
- `PUT /api/docente/estudiantes/:codigo` — body `{nombres, apellidos, curso}` (el `codigo` del path es la identidad; si viene en el body se ignora). Devuelve `{ok: true, estudiante}`, 404 si no existe, 400 si los datos son inválidos.

Las dos pasan por el middleware de sesión existente; cualquier ruta bajo `/api/docente/*` ya exige contraseña (`auth.js`), así que no hay que añadir nada.

### Tests

- `server/services/estudiantes.test.js` — agrego cobertura para `crearEstudiante`, `actualizarEstudiante` y `validarEstudiante`: caso feliz, código duplicado (409), estudiante inexistente al actualizar (404), edición con datos inválidos (no escribe), edición que ignora `codigo` aunque venga en el body.
- `server/routes/docente.estudiantes.test.js` — agrego casos de integración: `POST` crea y aparece en `GET`, `POST` con código duplicado devuelve 409, `PUT` edita una fila, `PUT` con datos inválidos no edita, `PUT` ignora `codigo` del body, ambas rutas sin contraseña devuelven 401.

## Frontend

### HTML: `public/docente/estudiantes.html`

- En la tarjeta **"Lista cargada"**, encima del filtro por curso, un botón **"+ Nuevo estudiante"** (`class="boton"`).
- Al final del documento, un `<dialog id="editor">` con el formulario: cuatro `<label class="campo">`, un bloque de errores visible cuando los haya, y dos botones al pie: **Guardar** (`type="submit"`) y **Cancelar** (`type="button"`).

### JS: `public/docente/estudiantes.js`

- Nueva función `abrirEditor(estudiante)`:
  - En modo **crear**: `estudiante` es `null`. Campos vacíos, `codigo` editable, foco en `codigo`.
  - En modo **editar**: `estudiante` es el objeto de la fila. `codigo` se muestra en solo lectura con un texto explicativo ("El código no se puede cambiar"). Foco en `nombres`.
- `editor.showModal()` para abrir, `editor.close()` para cerrar. Al cerrar, limpia los campos y los errores.
- `submit` del formulario:
  - Recoge los cuatro valores, hace `trim()` solo donde la importación lo hace (en realidad **ninguno**: el importador no recorta al inicio/final del código, solo separa), llama a la API.
  - Si la API devuelve errores, los pinta dentro del modal y **no cierra**.
  - Si va bien, cierra y llama a `recargar()`.
- `botonEditar(estudiante)` — añade la celda de acciones de cada fila. Quedan **Editar** + **Eliminar** lado a lado.

### Estilos

No toco `public/shared/base.css`. El `<dialog>` hereda tipografía del `body` y los campos usan las clases `.campo` y `.boton` ya existentes. Si hace falta un retoque mínimo para que el modal se vea con buen contraste sobre el fondo del panel, lo añado en un `<style>` dentro de `estudiantes.html` (no es alcance del sistema visual institucional, es estilo de un componente local).

## Cambios fuera de `server/` y `public/`

- `spec/constitution/roadmap.md`: muevo la 020 a "Hecho ✅" cuando termine.
- `AGENTS.md`, sección "Dónde estamos": actualizo la línea de estado.
- `RESTART.md`: al cerrar la sesión, resumo lo hecho.

## Lo que no cambia

- El esquema SQLite: ninguna migración nueva. `estudiantes` ya tiene las cuatro columnas y la unicidad por `codigo` ya está en el `PRIMARY KEY`.
- El importador por archivo: sigue siendo la vía principal al inicio del periodo; este flujo es complementario.
- La eliminación individual: ya existía en la feature 002; no se toca.
- El endpoint de listado `GET /api/docente/estudiantes`: misma forma, mismos campos.