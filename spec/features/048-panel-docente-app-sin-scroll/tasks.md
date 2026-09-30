# 048 · Panel del docente como app, sin scroll — Tareas

- [x] `spec.md`, `plan.md`, `tasks.md`.
- [x] `panel-shell.css` (marco fijo, `.encabezado-pantalla`, `.boton-engranaje`, `.panel-lista`, `.ajustes`, cabecera de tabla fija de dos `<table>`, `.celda-titulo`/`.celda-apoyo`/`.pastilla`, íconos SVG) enlazado en Estudiantes, Bancos, Sesiones y Monitoreo.
- [x] `panel.js`: `iniciarEngranaje()`.
- [x] `iconos.js`: set de íconos de línea (Heroicons, MIT) compartido.
- [x] Estudiantes: filtro + importación al engranaje; tabla partida (cabecera fija + cuerpo con scroll), íconos de fila.
- [x] Bancos: importación de paquete (.zip) en diálogo; lista/detalle con jerarquía por celda, íconos de fila.
- [x] Sesiones: creación completa en diálogo (no solo los parámetros); papelera como ícono; renombrar, retroalimentación y enviar al portal por ícono; tabla partida con pastillas de estado.
- [x] Monitoreo: detalles de la evaluación al engranaje; resumen delgado (nombre + pastilla + acciones); tabla partida con pastillas de estado.
- [x] Resultados: solo shell fijo, sin engranaje; contenido corto centrado verticalmente (`.contenido-centrado`).
- [x] Estadísticas: alcance y curso al engranaje; banco visible; "Por pregunta" con jerarquía por celda y cabecera fija; "Por competencia" compacta encima.
- [x] Portal: vinculación al engranaje y chip de estado; tabla con la cabecera fija de dos `<table>`, pastillas de estado y franja baja para lo ya enviado.
- [x] Inicio: "Ahora" y avisos de alto acotado, los tres pasos se reparten el resto con scroll propio.
- [x] Sincronizar cada pantalla completada a `/mnt/c/Users/Camil/AppData/Local/OpenTest/public/docente/` para que el usuario la vea en vivo.
- [x] Recorrido manual de las ocho pantallas + capturas a 1280 y 800 px.
- [x] `npm test` (510 en verde, sin tocar `server/` salvo lo ya documentado en la 049) y `npm run lint`, en cada paso.
- [x] Roadmap, `AGENTS.md`, `RESTART.md`, bitácora (se deja para el cierre de las ocho pantallas).
