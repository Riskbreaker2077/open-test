# 009 · Exportación de resultados — Tareas

- [ ] Implementar `server/exporters/csv.js` (`aCsv` con escapado, `\r\n` y BOM).
- [ ] Tests de `aCsv`: campo con coma, con comillas, con salto de línea, BOM presente.
- [ ] Implementar `armarExportacion` con la estructura anidada completa del contrato.
- [ ] Resolver `opciones_mostradas` a partir de `intento_preguntas.orden_opciones`.
- [ ] Implementar `aDetalleCsv`, `aResumenCsv` y `aJson` derivados de la estructura.
- [ ] Añadir los índices de apoyo a `server/schema.sql`.
- [ ] Añadir las tres rutas de exportación con filtro por curso y `Content-Disposition`.
- [ ] Sanear el nombre de archivo generado a partir de sesión y curso.
- [ ] Construir `public/docente/resultados.html` y `resultados.js` con los selectores y los tres botones.
- [ ] Test: las cabeceras coinciden literalmente con las del contrato, en orden.
- [ ] Test: pregunta no alcanzada aparece con `saltada = 1` y `segundos = 0`.
- [ ] Test: `respondidas + saltadas = total_preguntas` en el resumen.
- [ ] Test: `opciones_mostradas` coincide con el orden real del intento.
- [ ] Test: se exportan los intentos sin entregar con `entrega` vacía.
- [ ] Test de rendimiento: 40 estudiantes × 20 preguntas bajo 2 s.
- [ ] Prueba manual: abrir los CSV en Excel en Windows y comprobar las tildes.
- [ ] Validar contra los criterios de aceptación de `spec.md`.
- [ ] Mover la feature a "Hecho" en `../../constitution/roadmap.md`.
