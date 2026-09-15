# 031 · Tareas

## Constitución y specs

- [x] `spec/constitution/mission.md`: la proyección muestra quién falta y quién está conectado; sigue sin notas ni preguntas.
- [x] `spec/features/012-pantalla-proyeccion/spec.md`: nota de que la 031 revisa el criterio "sin nombres" y el fuera de alcance.

## Servidor

- [x] `GET /api/docente/proyeccion/:sesionId` devuelve `asistencia.faltan` y `asistencia.conectados` con forma mínima.
- [x] Actualizar el test de proyección: conectados, faltan, no convocados excluidos, sin datos reservados.

## Pantalla

- [x] Sección de asistencia en `index.html`.
- [x] `pintarAsistencia` y ajuste de letra en `proyeccion.js`.
- [x] Maquetación de tres columnas (ancha) y fila propia (4:3) en `proyeccion.css`.
- [x] Verificar a 1024×768 y 1920×1080 con 40 convocados, sin desplazamiento.

## Cierre

- [x] `npm test` y `npm run lint` en verde.
- [x] Roadmap, `AGENTS.md → Dónde estamos`, `RESTART.md` y `spec/bitacora.md`.
