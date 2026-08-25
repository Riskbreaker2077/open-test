# 003 · Banco de preguntas — Tareas

- [x] Implementar `server/importers/preguntas.js` (normalización CSV/JSON, invariantes, acumulación de errores con fila).
- [x] Tests del importador: 4 opciones, opción vacía, una sola correcta, letra inválida, índice fuera de rango, imagen inexistente, banco corto.
- [x] Implementar `server/services/bancos.js` (guardado transaccional, listado con conteo, borrado protegido, `obtenerPregunta`).
- [x] Implementar la subida de imágenes con validación de extensión, límite de tamaño y saneado del nombre.
- [x] Test de seguridad del saneado: un nombre con `../` no escribe fuera de `data/uploads/imagenes/`.
- [x] Servir `/imagenes/*` como estáticos de solo lectura.
- [x] Añadir las siete rutas a `server/routes/docente.js`.
- [x] Implementar `public/shared/pregunta.js` como módulo de renderizado compartido.
- [x] Construir `public/docente/bancos.html` y `bancos.js` (imágenes, importación, previsualización, listado).
- [x] Implementar la vista "así lo verá el estudiante" usando el módulo compartido y marcando la correcta.
- [x] Test que verifica que ninguna respuesta de `/api/examen/*` contiene `es_correcta`.
- [x] Probar de extremo a extremo con un banco real de 50 preguntas (`ejemplos/banco-ejemplo.csv`); la subida de imágenes está probada por separado, sin imágenes reales de aula.
- [x] Validar contra los criterios de aceptación de `spec.md`.
- [x] Mover la feature a "Hecho" en `../../constitution/roadmap.md`.
