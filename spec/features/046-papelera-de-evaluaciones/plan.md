# 046 · Papelera de evaluaciones — Plan

_Cómo se implementa lo descrito en `spec.md`. Debe respetar la `constitution/`._

**Esquema.** Migración **v8**: `anadirColumna(db, 'sesiones', 'en_papelera_en', 'TEXT')` y la misma columna en `schema.sql`. NULL significa que la evaluación no está en la papelera.

**Servicio (`server/services/sesiones.js`).**

- `DIAS_PAPELERA = 30`.
- `borrarSesion(db, id, ahora)`: si tiene intentos y está abierta, en curso o en pausa, responde 409. Si tiene intentos, escribe `en_papelera_en = ahora`. Si no tiene intentos, hace `DELETE` como hoy.
- `obtenerSesion` y `listarSesiones` filtran `en_papelera_en IS NULL`, así que todas las rutas del docente que usan `obtenerSesion` (exportar, monitoreo, proyección, feedback, código del portal) responden 404 para una evaluación en la papelera, y `/entrar` del estudiante también.
- `listarPapelera(db)` (id, nombre, cursos, banco, intentos, `en_papelera_en`, `se_elimina_en`), `restaurarSesion(db, id)`, `eliminarDePapelera(db, id)` y `vaciarPapeleraVencida(db, ahora)`, que devuelve cuántas eliminó.
- `sesionesDisponiblesPara` ya excluye las cerradas. Por las dudas también filtra `en_papelera_en IS NULL`.

**Otros listados.** `listarEnvios` (y por tanto `enviarPendientes`) y `sesionesCerradasDeBanco` (estadísticas) filtran `en_papelera_en IS NULL`. `bancos.js` sigue contando todas las evaluaciones: un banco con evaluaciones en la papelera no se puede borrar.

**Purga.** En `server/index.js`, `vaciarPapeleraVencida(db)` se ejecuta al abrir la base y después con `setInterval(…, 24 h).unref()`.

**Rutas (`server/routes/docente.js`).** `GET /papelera`, `POST /papelera/:id/restaurar`, `DELETE /papelera/:id`.

**Interfaz.**

- `sesiones.html/js`: el texto de confirmación de Borrar cambia, se agrega un enlace «Papelera (N)» junto al título de la lista, y una sección `#papelera` (oculta si está vacía) con una tabla: nombre, cursos, intentos, «se elimina el …», Restaurar y Borrar ya.
- `portal.js/html`: después de `enviar`, por cada evaluación que quedó con estado `enviado` se muestra una tarjeta de sugerencia con **Mover a la papelera**, que llama a `DELETE /api/docente/sesiones/:id` y vuelve a cargar la lista.

Sin dependencias nuevas. No se tocan contratos de importación ni de exportación.
