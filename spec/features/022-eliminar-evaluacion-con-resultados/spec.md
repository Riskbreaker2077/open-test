# 022 · Eliminar evaluación con resultados ya descargados

**Estado:** implementado ✅

## Qué hace

Permite al docente borrar una evaluación cerrada **después** de haber
descargado sus resultados al menos una vez. Hoy, el botón "Borrar" sólo
aparece para sesiones en `borrador` (que es lo único que se puede borrar
sin perder datos de auditoría); cualquier sesión con intentos se queda
para siempre. Con esta feature, una vez que el docente ha bajado el
`.csv`/`.json`/`.xlsx` al menos una vez, la sesión y todos sus intentos
se pueden borrar de la base de datos.

## Por qué

El docente acumula evaluaciones cerradas sin manera de limpiarlas: hoy
sólo las puede dejar ahí, y al final del año lectivo la lista de
"Evaluaciones creadas" tiene 40+ sesiones que ya no va a usar. Eso
dificulta encontrar las que sí importan, y es data que ya no necesita.
El problema era la auditoría: si los resultados no se han descargado,
borrar destruye la evidencia. La solución es registrar que ya se bajó
la evidencia antes de permitir el borrado.

## Criterios de aceptación

### Esquema

- [x] `sesiones` gana una columna nueva **`descargado_en TEXT`** (nullable,
      sin valor por defecto). Se añade vía migración v4 con la receta
      estándar `ALTER TABLE ADD COLUMN`, sin tocar la tabla existente ni
      sus claves foráneas.
- [x] Una base ya creada (con la v3) aplica sólo el paso de v4 al
      arrancar; volver a arrancarlo no hace nada.

### Servidor

- [x] Cada vez que el docente descarga cualquiera de los cuatro archivos
      (`detalle`, `resumen`, `json`, `excel`) y la exportación se
      construye sin error, el servidor escribe la hora actual en
      `sesiones.descargado_en`. Es idempotente: la primera descarga
      queda registrada y las siguientes no la mueven.
- [x] `GET /api/docente/sesiones` devuelve también el campo
      `descargado_en` para que el panel pueda decidir si habilita el
      botón.
- [x] `DELETE /api/docente/sesiones/:id` (la regla de `borrarSesion`):
      - Sigue permitiendo borrar sesiones en `borrador` aunque no se
        hayan descargado (no tienen resultados que descargar).
      - Para sesiones en cualquier otro estado **sin intentos**:
        también permite (no hay nada que auditar).
      - Para sesiones con intentos pero **`descargado_en` NULL**:
        rechaza con 409 y mensaje en español: *"Antes de borrar la
        evaluación, descarga sus resultados al menos una vez."*
      - Para sesiones con intentos y **`descargado_en` poblado**:
        permite borrar. El borrado borra en cascada `intentos`,
        `intento_preguntas` y `respuestas` por las FK que ya existían.
- [x] El rechazo es independiente del orden de los argumentos: si el
  docente intenta borrar primero (con resultados sin descargar) y
  luego descarga, el segundo intento de borrar ya funciona.

### Cliente (panel del docente)

- [x] En la lista de "Evaluaciones creadas", la fila de una sesión
      `cerrada` con intentos muestra, junto al botón "Descargar
      resultados", un botón **"Borrar"** que está **deshabilitado**
      mientras `descargado_en` sea nulo. El botón tiene un
      `title="…"` que explica por qué.
- [x] El botón "Borrar" del estado `cerrada` con cero intentos sigue
      funcionando exactamente como antes (ya se podía borrar).
- [x] Cuando el docente termina de descargar cualquiera de los cuatro
      archivos (los enlaces de `resultados.html`) y vuelve a la lista
      de evaluaciones, el botón "Borrar" pasa a estar habilitado sin
      que tenga que recargar la página a mano.
- [x] El `window.confirm` previo al borrado pide confirmación con el
      texto: *"¿Borrar "X" y todos los intentos? Ya no podrás consultar
      los resultados."*
- [x] Si la API rechaza el borrado (por ejemplo, el docente abrió la
      lista en otra pestaña y borró la sesión), el panel muestra el
      mensaje del servidor y refresca la lista.

### Fuera de alcance

- Soft-delete: no se introduce un estado nuevo ni una papelera. El
  borrado es duro, igual que `eliminarEstudiante` y `borrarBanco`.
- Auditoría de quién descargó y cuándo: sólo se guarda la última fecha
  de descarga de la sesión, no un historial. Si más el importa
  distinguir entre descargas (p. ej., una por curso), va como feature
  aparte.
- Borrado en lote: sigue siendo uno a uno. Borrar 30 sesiones
  consecutivas es de 30 clics; si hace falta bulk, es otra feature.
- Limpieza automática por antigüedad: la columna `descargado_en` no se
  usa para borrar nada en piloto automático. Sólo el docente decide.