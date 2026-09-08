# 022 · Plan técnico

## Pila y límites respetados

Una migración nueva (`v4`) que sólo añade una columna. Sin nuevas
dependencias, sin cambios en el contrato `export-resultados-v2.md`, sin
cambios en el modelo de personalización ni en el del estudiante. Cambios
en un archivo de servicio, uno de rutas, uno de migraciones, dos del
cliente y los de pruebas.

## Backend

### Esquema y migración

En `server/migraciones.js`, agrego un paso nuevo al final del array
`MIGRACIONES`:

```js
{
  version: 4,
  descripcion: 'Borrar evaluaciones cerradas con resultados ya descargados',
  aplicar(db) {
    anadirColumna(db, 'sesiones', 'descargado_en', 'TEXT');
  },
},
```

`anadirColumna` ya existe (`migraciones.js:17-20`) y es idempotente. La
receta `ALTER TABLE ADD COLUMN` no toca las FK existentes, así que no
necesito la complicación de `CREATE TABLE _nueva` que usa la v1.

`ULTIMA_VERSION` pasa automáticamente a `4` porque se calcula del array
(`migraciones.js:105`).

### Servicio: `server/services/sesiones.js`

Dos cambios pequeños:

1. **`borrarSesion(db, id)`** — la regla actual rechaza cualquier sesión
   con `intentos > 0`. La nueva regla rechaza sólo cuando hay intentos y
   la sesión **no** se ha descargado. Reescribo el guard:

```js
if (intentos > 0 && !sesion.descargado_en) {
  throw error(
    'Antes de borrar la evaluación, descarga sus resultados al menos una vez.',
    409,
  );
}
```

El comentario del export header (`// Una evaluación con intentos no se
borra: sus resultados deben poder auditarse.`) lo actualizo para
reflejar la nueva semántica.

2. **`listarSesiones(db)`** — el `SELECT` ya devuelve `s.*`, así que
   `descargado_en` viaja automáticamente. No hace falta tocar nada
   aquí.

### Rutas: `server/routes/docente.js`

El handler de exportación en `docente.js:301-325` se actualiza así,
justo después de que `armarExportacion` construya el export sin lanzar:

```js
if (!exportacion.sesion.descargado_en) {
  db.prepare("UPDATE sesiones SET descargado_en = ? WHERE id = ?")
    .run(new Date().toISOString(), exportacion.sesion.id);
}
```

Lo coloco **antes** de empezar a serializar/enviar el cuerpo, no
después: así, aunque el `send()` falle por red del cliente, la marca
queda escrita (el docente hizo clic y el servidor produjo los bytes;
si el navegador perdió la conexión al guardarlo, eso ya no es nuestro
problema). Si la exportación lanza (sesión no cerrada, banco borrado,
lo que sea), `armarExportacion` corta con `throw` y la marca no se
escribe — que es lo correcto: un fallo de construcción no es una
descarga exitosa.

No toco la ruta `DELETE /api/docente/sesiones/:id`: la regla vive en el
servicio y queda protegida para cualquier llamador futuro.

### Tests

**`server/migraciones.test.js`** — añado un caso: una base con esquema
v3 que arranca y queda en v4 con la columna presente. Y otro: una base
nueva (sin `esquema_version`) que aplica v1+v2+v3+v4 de un tirón y
tiene la columna.

**`server/services/sesiones.test.js`** — actualizo el test "una sesión
sin intentos se borra; con intentos, no" (`sesiones.test.js:306-319`):
hoy espera `/ya la presentaron/`; ahora espero el mensaje nuevo
`/Antes de borrar la evaluación, descarga sus resultados/` cuando la
sesión tiene intentos y `descargado_en` nulo. Agrego tres casos más:

- Sesión cerrada con intentos y `descargado_en` poblado: se borra sin
  tirar.
- Sesión cerrada con intentos y `descargado_en` poblado: borrar borra
  también los `intentos`, `intento_preguntas` y `respuestas` (cascade).
- Sesión en estado `cerrada` con cero intentos: se borra (caso que
  ya cubre el test viejo, pero lo dejo explícito en uno nuevo para
  que la intención quede documentada).

**`server/routes/docente.sesiones.test.js`** — agrego dos casos
integrales:

- `GET /api/docente/sesiones/:id/export/detalle` sobre una sesión
  cerrada con intentos escribe `descargado_en` la primera vez y la
  deja como estaba la segunda.
- `DELETE /api/docente/sesiones/:id` sobre una sesión cerrada con
  intentos devuelve 409 sin `descargado_en` y 200 con `descargado_en`
  poblado.

## Frontend

### JS: `public/docente/sesiones.js`

En la rama `else` de `acciones(sesion)` (la de `sesion.estado === 'cerrada'`,
`siones.js:171-200`), agrego el botón "Borrar" cuando hay intentos
registrados:

- Si `sesion.descargado_en` es nulo, el botón se renderiza con
  `disabled` y `title="Descarga los resultados al menos una vez antes de
  borrar"`.
- Si `sesion.descargado_en` viene poblado, el botón está habilitado y
  su `confirm()` pide: *'¿Borrar "${nombre}" y todos los intentos? Ya
  no podrás consultar los resultados.'*
- Después de un borrado exitoso, llamo a `recargar()` igual que ya se
  hace en el caso de `borrador`.

### HTML: `public/docente/sesiones.html`

No necesita cambios: el botón se construye con `accion()` (que ya
acepta el parámetro `disabled` y `title`).

### JS: `public/docente/resultados.js`

Cuando el docente hace clic en cualquiera de los cuatro enlaces de
descarga (`actualizarEnlaces` en `resultados.js:16-22`), el navegador
navega al `href`. Si vuelve a la lista de sesiones (que es lo que
suele pasar: la siguiente pestaña), la lista se vuelve a pedir vía
`GET /api/docente/sesiones` y el botón aparece habilitado. No hace
falta sincronización en tiempo real entre pestañas: el docente las
recarga a mano y punto. Eso es coherente con el resto del panel.

## Cambios fuera de `server/` y `public/`

- `server/schema.sql` — la columna `descargado_en TEXT` se documenta en
  la tabla `sesiones` con un comentario aclaratorio, igual que el resto
  de campos. La tabla que `CREATE TABLE` describe sigue siendo la
  forma actual, lo que ve una base nueva.
- `spec/constitution/roadmap.md`: muevo la 022 a "Hecho ✅".
- `AGENTS.md`, sección "Dónde estamos": actualizo la línea de estado.
- `RESTART.md` y `spec/bitacora.md`: al cerrar la sesión.

## Lo que no cambia

- El modelo de personalización, el de estudiantes, el del examen, las
  preguntas, los bancos: nada.
- Los exports: los cuatro archivos salen idénticos a antes; sólo se
  añade un `UPDATE` antes de mandarlos.
- La ruta `DELETE` en sí: sigue siendo `DELETE /api/docente/sesiones/:id`,
  sigue exigiendo contraseña, sigue tirando 404 si no existe.
- El botón "Borrar" del estado `borrador`: misma ruta, misma copia.
- El panel de estadísticas (019), el de resultados, el de monitoreo:
  ningún cambio.