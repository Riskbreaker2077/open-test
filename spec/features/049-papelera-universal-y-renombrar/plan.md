# 049 · Papelera universal y renombrar evaluaciones — Plan

**API/servicio.**

- `server/services/sesiones.js`: `borrarSesion` pierde la rama de borrado
  inmediato (`total === 0`); siempre marca `en_papelera_en` tras el mismo
  chequeo de `ESTADOS_VISIBLES`. Sin migración: la columna ya existe (046).
- `renombrarSesion(db, id, nombre)`, junto a `actualizarNivelFeedback`:
  valida con la misma regla de `normalizar()` (no vacío, recortado) y
  actualiza `nombre` sin tocar el resto.
- `server/routes/docente.js`: `PATCH /sesiones/:id/nombre`, mismo patrón
  que `PATCH /sesiones/:id/feedback`.

**Frontend.** El botón "Renombrar" y el nuevo flujo de creación de
Evaluaciones (diálogo en vez de formulario siempre visible) se resuelven
como parte del rediseño de la 048 (`public/docente/sesiones.html/js`), no
aquí: esta feature es solo el cambio de comportamiento del servidor del que
esa pantalla depende.

**Tests.** `server/services/sesiones.test.js`: se actualizan los dos tests
que verificaban el borrado inmediato (ahora esperan `enPapelera: true` y la
fila conservada) y se agrega uno para `renombrarSesion` en los tres
estados representativos (borrador, abierta, cerrada) más el caso de nombre
vacío. `server/routes/docente.sesiones.test.js` no necesitó cambios: su
único test de borrado ya usaba una sesión con intentos.

Sin dependencias nuevas ni migración de esquema.
