# 025 · Tareas

## Servicio

- [x] Agregar `imagenesDeSesion(db, sesionId)` a
      `server/services/imagenes.js` que devuelve `Set<string>` con los
      nombres de archivo (basename) referenciados por los bloques
      `tipo: 'imagen'` en contexto/enunciado/opciones de las preguntas
      que efectivamente aparecieron en `intento_preguntas` de la
      sesión.
- [x] Tests para `imagenesDeSesion`:
      - Detecta imagen en enunciado.
      - Detecta imagen en `opciones[].texto`.
      - No detecta si no hay imágenes.
      - Dedup cuando dos preguntas referencian el mismo archivo.
- [x] Agregar `id: sesion.id` al objeto `sesion` dentro del árbol de
      `armarExportacion(...)` (cambio mínimo, sólo el campo nuevo).

## Exportador

- [x] En `server/exporters/resultados.js`:
      - Eliminar `aDetalleCsv`, `aResumenCsv`, `CABECERAS_DETALLE`,
        `CABECERAS_RESUMEN`.
      - Renombrar `aExcel(...)` a `aExcelRico(exportacion)` con tres
        hojas: `Resumen`, `Detalle`, `Banco`. `Detalle` y `Banco`
        traen las opciones con id + texto + `es_correcta` +
        justificación.
      - Agregar `aReproduccionZip(db, exportacion)` que arma el ZIP
        con `resultados.json` + `imagenes/<archivo>` +
        opcionalmente `imagenes_faltantes.txt`.
      - `aJson` se conserva tal cual y se usa internamente para el
        ZIP.
- [x] Tests en `server/exporters/resultados.test.js`:
      - Reemplazar el primer test de cabeceras CSV por uno que
        verifique que `aJson` conserva `formato_version: 2` y los
        bloques completos.
      - `aExcelRico` produce tres hojas en orden con las cabeceras
        esperadas.
      - `aExcelRico` incluye las 4 opciones por pregunta con sus ids
        en el orden mostrado.
      - La hoja `Banco` incluye la metadata pedagógica y los
        conteos por pregunta.
      - La hoja `Banco` cuenta correctamente `veces_presentada`,
        `veces_acertada`, `veces_saltada` (test con una mezcla de
        respondidas/saltadas).
- [x] Tests en un archivo nuevo
      `server/exporters/resultados-zip.test.js`:
      - El ZIP contiene `resultados.json` parseable y `imagenes/`
        con cada archivo referenciado.
      - Si una imagen referenciada falta en disco, se incluye
        `imagenes_faltantes.txt` sin abortar.
      - No incluye imágenes de disco que nadie referencia.

## Ruta

- [x] En `server/routes/docente.js`, cambiar el whitelist de tipos a
      `new Set(['excel', 'zip'])`.
- [x] Adaptar la rama de respuesta: `excel` →
      `aExcelRico(exportacion)` con MIME XLSX; `zip` →
      `aReproduccionZip(db, exportacion)` con MIME `application/zip`.
- [x] Tests en `server/routes/docente.sesiones.test.js`:
      - `GET /export/excel` devuelve 200, contenido XLSX.
      - `GET /export/zip` devuelve 200, contenido ZIP válido.
      - `GET /export/detalle` (o cualquier otro tipo) devuelve 404.
      - La marca `descargado_en` se sigue escribiendo en ambas
        descargas.

## Cliente

- [x] En `public/docente/resultados.html`, reemplazar los cuatro
      `<a class="acceso">` por dos: `excel` y `zip`. Ajustar los
      textos descriptivos.
- [x] En `public/docente/resultados.js`, cambiar el loop para iterar
      `['excel', 'zip']` y reescribir los `href` correspondientes.

## Contrato

- [x] Actualizar `spec/contracts/export-resultados-v2.md`:
      - Marcar como obsoletos los endpoints `detalle.csv` y
        `resumen.csv`.
      - Documentar `resultados.xlsx` con sus tres hojas y
        `reproduccion.zip` con la lista de archivos esperada.
      - Confirmar que `formato_version: 2` sigue vigente.

## Cierre

- [x] `npm test` — los nuevos y los anteriores en verde.
- [x] `npm run lint` — sin errores.
- [x] Mover la 025 a **"Hecho ✅"** en
      `spec/constitution/roadmap.md`.
- [x] Actualizar la sección **"Dónde estamos"** de `AGENTS.md`.
- [x] Sobrescribir `RESTART.md` y agregar entrada a
      `spec/bitacora.md` antes de cerrar la sesión.
- [ ] Commit y push.
