# Tareas · 016 Estándar preguntas-icfes

- [x] Escribir el contrato `paquete-preguntas-icfes.md` y subir la exportación a `export-resultados-v2.md`; marcar los tres contratos anteriores como obsoletos.
- [x] Vendorizar el validador del estándar (`server/importers/estandar-preguntas-icfes.js`).
- [x] Reescribir `server/importers/preguntas.js`: retirar CSV, delegar la validación de contenido al estándar.
- [x] Migrar el esquema: metadata pedagógica en `preguntas`, `justificacion` en `opciones` (feature de migración 3).
- [x] `server/services/bloques.js` (analizar/serializar/texto plano/detección de imagen) y reescritura de `server/services/bancos.js` sobre él.
- [x] Actualizar `server/routes/docente.js`: retirar rutas de CSV/JSON plano, ajustar el resumen de previsualización.
- [x] Actualizar `server/services/examen.js` y `server/services/calificacion.js` para bloques y justificación por opción, sin filtrar nada al estudiante antes de tiempo.
- [x] Actualizar `server/exporters/resultados.js` a `formato_version: 2`.
- [x] `server/fixtures-preguntas.js` y migración de los tests existentes que usaban el formato plano (bancos, calificación, examen, exportación, intentos, monitoreo, sesiones, rutas de docente y examen).
- [x] `public/shared/pregunta.js` y `base.css`: renderizado por bloques, tabla nueva.
- [x] `public/docente/bancos.html`/`.js` y `public/estudiante/resultado.js`: quitar la carga en texto plano, adaptar a bloques y justificación.
- [x] Regenerar `ejemplos/paquete-participacion-ciudadana` (paquete.json + zip) y `ejemplos/banco-ejemplo.json`; actualizar `GUIA-DOCENTE.md`.
- [x] `npm test`, `npm run lint` y `git diff --check` en verde.
