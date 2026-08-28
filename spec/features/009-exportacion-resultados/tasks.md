# 009 · Exportación de resultados — Tareas

- [x] Implementar `server/exporters/csv.js` (`aCsv` con escapado, `\r\n` y BOM).
- [x] Tests de `aCsv`: campo con coma, con comillas, con salto de línea, BOM presente.
- [x] Implementar `armarExportacion` con la estructura anidada completa del contrato.
- [x] Resolver `opciones_mostradas` a partir de `intento_preguntas.orden_opciones`.
- [x] Implementar `aDetalleCsv`, `aResumenCsv` y `aJson` derivados de la estructura.
- [x] Verificar los índices de apoyo ya existentes en `server/schema.sql`.
- [x] Añadir las tres rutas de exportación con filtro por curso y `Content-Disposition`.
- [x] Sanear el nombre de archivo generado a partir de sesión y curso.
- [x] Construir `public/docente/resultados.html` y `resultados.js` con los selectores y los tres botones.
- [x] Test: las cabeceras coinciden literalmente con las del contrato, en orden.
- [x] Test: pregunta no alcanzada aparece con `saltada = 1` y `segundos = 0`.
- [x] Test: `respondidas + saltadas = total_preguntas` en el resumen.
- [x] Test: `opciones_mostradas` coincide con el orden real del intento.
- [x] Test: se exportan los intentos sin entregar con `entrega` vacía.
- [x] Test de rendimiento: 40 estudiantes × 20 preguntas bajo 2 s.
- [ ] Prueba manual: abrir los CSV en Excel en Windows y comprobar las tildes.
- [x] Validar los 15 criterios automatizables; Excel/Windows queda para el equipo destino.
- [x] Mover la feature a "Hecho" en `../../constitution/roadmap.md`.
