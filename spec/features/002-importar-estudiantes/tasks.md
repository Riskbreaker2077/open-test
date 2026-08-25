# 002 · Importar estudiantes — Tareas

- [x] Implementar `server/importers/csv.js` (BOM, detección de separador, comillas, números de fila reales).
- [x] Tests exhaustivos de `csv.js`: separadores, comillas, comas y saltos dentro de campos, columnas extra, filas vacías.
- [x] Implementar `server/importers/estudiantes.js` (normalización CSV/JSON + todas las reglas del contrato).
- [x] Tests del importador: una prueba por cada mensaje de error del contrato.
- [x] Implementar `server/services/estudiantes.js` (upsert transaccional, listado con filtro, borrado protegido).
- [x] Tests del servicio: upsert no duplica, ausentes se conservan, borrado bloqueado si hay intentos.
- [x] Añadir las cuatro rutas a `server/routes/docente.js`.
- [x] Construir `public/docente/estudiantes.html` y `estudiantes.js` (carga, previsualización, errores, listado).
- [x] Detección de archivo mal codificado con mensaje accionable.
- [x] Límite de tamaño de archivo con mensaje claro.
- [x] Probar de extremo a extremo con un CSV real exportado de Excel en español.
- [x] Validar contra los criterios de aceptación de `spec.md`.
- [x] Mover la feature a "Hecho" en `../../constitution/roadmap.md`.
