# 003 · Banco de preguntas

**Estado:** implementado ✅

## Qué hace

El docente sube las imágenes que usarán sus preguntas y luego carga el paquete completo —40 o 50 preguntas— desde un CSV o un JSON. Cada pregunta lleva contexto opcional, imagen opcional, enunciado y cuatro opciones, una de ellas marcada como correcta.

Como en la importación de estudiantes, primero ve una previsualización y solo entonces confirma. Además puede **ver una pregunta exactamente como la verá el estudiante en la tablet**, para comprobar que la imagen se ve, que el contexto no está cortado y que las opciones caben.

Puede tener varios bancos guardados (uno por periodo, por materia o por tema) y borrar los que no haya usado todavía.

## Por qué

El banco es la materia prima de la personalización: si el paquete tiene 50 preguntas, sortear 20 para cada estudiante hace que dos compañeros compartan pocas preguntas y casi nunca en el mismo orden. Sin un banco suficientemente grande y bien cargado, el mecanismo anti-copia no tiene con qué trabajar.

La previsualización tal-como-la-verá-el-estudiante existe porque el error más caro es descubrir a mitad del examen que una imagen no cargó o que el contexto está ilegible en una pantalla de 10 pulgadas.

## Criterios de aceptación

- [x] Se pueden subir imágenes (`.png`, `.jpg`, `.jpeg`, `.webp`) que quedan en `data/uploads/imagenes/` y se listan en el panel.
- [x] Se puede importar un banco desde CSV según [`import-banco-preguntas.md`](../../contracts/import-banco-preguntas.md).
- [x] Se puede importar el JSON anidado equivalente, aceptando `correcta` como índice 0–3 o como letra A–D.
- [x] Una pregunta sin exactamente 4 opciones no vacías se reporta como error y **rechaza el archivo entero**.
- [x] Una pregunta sin exactamente una correcta se reporta como error y rechaza el archivo entero.
- [x] Una `imagen` que nombra un archivo inexistente se reporta como error, indicando la fila y el nombre buscado.
- [x] Si el banco tiene menos de 20 preguntas, se importa pero se advierte que no alcanzará para una sesión de 20.
- [x] La previsualización muestra el total de preguntas, cuántas llevan contexto, cuántas llevan imagen y las 3 primeras completas.
- [x] Existe una vista "así lo verá el estudiante" que renderiza una pregunta cualquiera con la misma maqueta que usará la tablet, mediante el módulo compartido `public/shared/pregunta.js`.
- [x] Se listan los bancos con su nombre, número de preguntas y fecha de carga.
- [x] Se puede borrar un banco no usado; intentar borrar uno con sesiones asociadas se impide con una explicación.
- [x] Ninguna respuesta de las rutas `/api/examen/*` expone `es_correcta` (se verifica con un test).

## Fuera de alcance

- Editar preguntas desde la interfaz: se corrige el archivo y se recarga el banco.
- Fusionar bancos o mover preguntas entre bancos.
- Etiquetas, dificultad o sorteo estratificado por tema (backlog).
- Subir imágenes en lote dentro de un ZIP (backlog).
