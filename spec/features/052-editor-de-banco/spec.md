# 052 · Editor de banco: lista + vista previa + edición completa

**Estado:** implementado ✅

## Qué hace

El detalle de un banco (Bancos de preguntas → Ver) deja de ser una columna larga de preguntas renderizadas, bajo un título enorme, y pasa a ser un **editor de dos paneles**:

- **Cabecera compacta:** el nombre del banco en una sola línea, en letra pequeña (con "…" si no cabe) y, debajo, en tenue, "N preguntas · M grupos". A la derecha: **+ Agregar pregunta**, **+ Agregar desde ZIP** y **Cerrar**.
- **Izquierda, la lista:** una fila por pregunta suelta (número, comienzo del enunciado y competencia) con sus botones **Editar** y **Eliminar**. Los grupos del estándar (026) aparecen como un encabezado (tipo de grupo y su número de preguntas) con **Editar grupo** y **Eliminar grupo**, y sus preguntas van debajo, con sangría.
- **Derecha, la vista previa:** la pregunta elegida completa, tal como la verá el estudiante (mismo `renderizarPregunta`/`renderizarGrupo`), con la correcta marcada, las justificaciones y una ficha de **datos pedagógicos** (competencia, componente, afirmación, evidencia, estándar asociado, qué evalúa, grado, prueba, nivel MCER, valor).

## Edición completa (revisa la 028)

La 028 solo dejaba editar preguntas sueltas de 4 opciones en texto plano y prohibía tocar las de un grupo. Ahora **cualquier pregunta del banco se puede corregir entera**:

- **Contenido por bloques:** contexto, enunciado y cada opción se editan como una lista de bloques del estándar (texto, imagen, tabla). Se pueden agregar, quitar y reordenar; un bloque de imagen permite cambiar el archivo y su descripción accesible y uno de tabla se edita celda a celda. Lo que no se toca queda como estaba: editar una pregunta importada por ZIP no le borra sus tablas ni sus imágenes.
- **Opciones:** de 2 a 8, una sola correcta, cada una con su justificación. En una miembro de emparejamiento (`banco_opciones`) no hay opciones propias: se elige cuál entrada del banco del grupo es la correcta.
- **Datos pedagógicos:** los diez campos de la ficha se editan en el mismo formulario.
- **Grupos:** "Editar grupo" corrige el contexto compartido (bloques), las entradas del banco de opciones (agregar, editar, quitar las que nadie usa como respuesta) y la metadata pedagógica del grupo.
- **Crear:** "+ Agregar pregunta" usa el mismo editor completo (empieza con un bloque de texto en el enunciado y 4 opciones vacías).

## Agregar desde ZIP a un banco existente

**+ Agregar desde ZIP** valida un paquete del estándar `preguntas-icfes` (mismo validador, misma previsualización que la importación) y, al confirmar, **añade** sus preguntas y grupos al banco abierto en vez de crear uno nuevo. Si un `id` de grupo del paquete ya existe en la base (por ejemplo, el mismo ZIP cargado dos veces), se renombra con un sufijo; esto también corrige la importación normal, que hasta ahora fallaba en ese caso.

## Criterios de aceptación

### Vista
- [x] El nombre del banco se muestra en una sola línea pequeña (≈1 rem), no como h2 de varias líneas.
- [x] La lista de la izquierda y la vista previa de la derecha se desplazan cada una por su cuenta; la cabecera no se mueve.
- [x] Al abrir el banco queda elegida la primera pregunta; elegir otra fila la muestra a la derecha.
- [x] Una pregunta ya usada en una evaluación lleva un candado en la lista y sus botones de editar/eliminar quedan deshabilitados con la explicación en el `title`.

### Edición
- [x] `PUT /api/docente/preguntas/:id` acepta el formato completo (bloques + opciones + metadata + `respuesta_pool_id`) y sigue aceptando el formato simple de la 028.
- [x] Una pregunta miembro de cualquier grupo se puede editar (ya no responde 409 por ser de grupo).
- [x] Los errores se devuelven todos juntos y en español: enunciado vacío, menos de 2 o más de 8 opciones, una opción sin contenido, cero o más de una correcta, bloque mal formado, valor no positivo, `respuesta_pool_id` que no existe en el grupo.
- [x] `PUT /api/docente/grupos/:id` edita contexto, banco de opciones y metadata del grupo; no deja quitar una entrada del banco que alguna miembro tiene como respuesta.
- [x] Una pregunta o un grupo con alguna pregunta usada en una evaluación sigue respondiendo 409 (auditoría, 028/009).

### Eliminación
- [x] Una pregunta suelta o miembro de `contexto_compartido` se elimina sola; si era la última del grupo, el grupo también desaparece.
- [x] Las miembros de emparejamiento y de texto con blancos no se eliminan sueltas (409: el pasaje o el banco dejaría huecos); se elimina el grupo entero con `DELETE /api/docente/grupos/:id`.

### ZIP adicional
- [x] `POST /api/docente/bancos/:id/paquete/validar` y `/confirmar` validan y añaden al banco `:id`; con errores no escriben nada.
- [x] Cargar dos veces el mismo ZIP con grupos (en el mismo banco o en bancos distintos) funciona: el segundo recibe ids de grupo nuevos.

### Comunes
- [x] Todas las rutas nuevas exigen la contraseña del docente.
- [x] Ninguna respuesta de la API del estudiante cambia.

## Fuera de alcance

- Reordenar preguntas dentro del banco.
- Agregar una miembro nueva a un grupo existente desde el formulario (se hace con un ZIP).
- Editar los campos de trazabilidad (`procedencia`, `verificado`, `fuentes`): se muestran pero se conservan tal cual.
