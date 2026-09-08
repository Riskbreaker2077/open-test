# 020 · Gestión manual de estudiantes

**Estado:** implementado ✅

## Qué hace

Agrega al panel del docente la posibilidad de **crear y editar estudiantes uno a uno** desde la pantalla de Estudiantes, sin pasar por un archivo CSV/JSON. Hoy la única vía es importar un archivo (feature 002); este flujo llena el hueco de "me llegó un estudiante nuevo a mitad de periodo" o "se me equivocó un nombre".

- Un botón **"Nuevo estudiante"** abre un formulario modal con los cuatro campos del contrato (`codigo`, `nombres`, `apellidos`, `curso`).
- Cada fila de la lista cargada gana un botón **"Editar"** que abre el mismo modal con los datos prellenados y el `codigo` en solo lectura.
- La importación por archivo sigue existiendo y funcionando igual; este flujo es complementario, no la reemplaza.

## Por qué

La pantalla de Estudiantes hoy obliga a generar un archivo (CSV o JSON), aunque sea para agregar a un solo estudiante. Eso saca al docente del panel y abre una app externa. La consecuencia práctica es que agregar un estudiante nuevo a mitad de periodo nunca se hace, y el estudiante queda fuera del examen. La corrección se hace por reimportación, lo que también obliga a exportar primero la lista actual — y nadie hace eso. Es un trabajo que debería ser de un clic.

## Criterios de aceptación

### Crear
- [x] Existe un botón **"Nuevo estudiante"** visible en la pantalla de Estudiantes.
- [x] Al pulsarlo se abre un formulario modal con los cuatro campos del contrato.
- [x] El modal se cierra con la X, con la tecla `Esc` o pulsando **Cancelar**.
- [x] Si el `codigo` ya existe, la creación falla con un mensaje en español claro: `Ya existe un estudiante con ese código.`
- [x] Si cualquier campo está vacío o supera el límite de longitud, no se crea y el docente ve los **cuatro problemas** a la vez, no uno por uno.
- [x] En éxito, el estudiante aparece de inmediato en la lista cargada (sin recargar la página).
- [x] El modal queda con los campos en blanco y enfocado en el primer campo, listo para crear el siguiente.

### Editar
- [x] Cada fila de la lista cargada tiene un botón **"Editar"** además del de **Eliminar**.
- [x] Al pulsarlo se abre el mismo modal, con `codigo` **en solo lectura** y los otros tres campos prellenados.
- [x] El `codigo` no se puede cambiar (es la identidad y la clave foránea de `intentos.codigo_estudiante`); si se intenta por la API, devuelve `400`.
- [x] Si los nuevos datos son válidos, se actualizan y la fila se refresca en pantalla.
- [x] Si los datos son inválidos, no se actualiza nada y se muestran todos los problemas.

### Reglas comunes
- [x] Se aplican las mismas reglas de validación que la importación por archivo: `codigo` y `curso` ≤ 40 caracteres, `nombres` y `apellidos` ≤ 120, los cuatro obligatorios.
- [x] El `codigo` se guarda tal cual se escribe (distingue mayúsculas, sin recortar espacios al inicio/final — coherente con la importación).
- [x] Editar a un estudiante que ya presentó exámenes está permitido: cambiar nombres/apellidos/curso no afecta a sus intentos.
- [x] La lista, el filtro por curso y la eliminación individual siguen funcionando exactamente como en la feature 002.
- [x] Los mensajes de error son en español y aparecen dentro del modal, no como `alert()`.
- [x] El modal es accesible por teclado: tab navega los campos en orden, `Esc` cierra, el foco vuelve al botón que lo abrió.
- [x] El modal se ve bien en la pantalla del docente (portátil, ≥ 1024 px de ancho).
- [x] Las dos rutas nuevas (`POST /api/docente/estudiantes` y `PUT /api/docente/estudiantes/:codigo`) exigen contraseña de docente, como el resto de `/api/docente/*`.

### Fuera de alcance
- Eliminar masivamente (la eliminación individual ya existe).
- Cambiar el `codigo` de un estudiante existente: requiere migrar `intentos.codigo_estudiante`, lo que es un caso raro y mejor como feature aparte si hace falta.
- Autocompletar `curso` desde un listado de cursos conocidos: el `curso` es texto libre y se sigue respetando esa decisión (ver `tech-stack.md`, convenciones).
- Eliminar el flujo de importación por archivo: sigue siendo la vía principal al inicio del periodo.