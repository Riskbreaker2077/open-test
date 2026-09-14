# Restart

## Última actualización y rama activa

- 14/09/2026 — `main`, **limpio y pusheado** hasta `7d67a87` (docs: GitHub Pages + README). Roadmap del encargo original completo; además, dos extensiones nuevas (028, 029).

## Feature/tarea en curso

- Ninguna. Esta sesión, después de cerrar la validación física, agregó por pedido del usuario:
  - **028 · Ingreso manual de preguntas** — implementada, probada (446/446) y documentada. Ver `spec/features/028-ingreso-manual-preguntas/`.
  - **029 · Instalador de Windows** — el script de Inno Setup y su wrapper están escritos y revisados, pero **nunca se compilaron** (esta sesión fue en Linux, sin Windows ni Inno Setup disponibles). Queda pendiente compilarlo y probarlo de verdad en la próxima sesión con equipo real. Ver `spec/features/029-instalador-windows/spec.md`.
  - **Sitio de GitHub Pages** — `docs/index.html`, publicado y verificado en `https://riskbreaker2077.github.io/open-test/` (Pages activado vía API sobre `main:/docs`; el build ya corrió y la página responde 200). El repo también quedó con esa URL como "Website".
  - **README.md** — reescrito: ya no dice "en construcción", enlaza la página nueva y la guía, resume las funciones actuales.

## Qué se hizo en esta sesión

1. Se confirmó con el usuario que la validación física cubrió el checklist completo de `Siguiente` sin problemas; se cerró esa parte (commit `3c45962`).
2. El usuario pidió, en un solo mensaje: instalador de Windows, página de GitHub Pages, README más cuidado, y una feature nueva (ingreso manual de preguntas). Antes de programar la feature nueva se acotó su alcance con el usuario (formulario mínimo, banco vacío creable desde el panel, editar/eliminar sí).
3. **028 implementada de punta a punta** con SDD (spec/plan/tasks en `spec/features/028-ingreso-manual-preguntas/`): `crearBancoVacio`, `agregarPreguntaManual`, `actualizarPreguntaManual`, `eliminarPregunta` en `server/services/bancos.js` (con 409 si la pregunta es de un grupo o ya se usó en una evaluación); cuatro rutas nuevas; modal nuevo en `bancos.html`/`bancos.js` con Editar/Eliminar por pregunta suelta. 26 tests nuevos. Commit `7d9f604`.
4. **029 escrita** (`scripts/installer/opentest.iss` + `scripts/build-installer.js` + `npm run build:installer`): empaqueta `dist/OpenTest-Windows` con Inno Setup, sin admin, excluyendo `data\` para no pisar evaluaciones ya cargadas al reinstalar. **No se pudo compilar ni probar** — sin Windows en esta sesión. Commit `545633e`.
5. **GitHub Pages + README** (commit `7d67a87`): página estática de presentación en `docs/index.html` (misma paleta que `public/shared/base.css`, sin dependencias externas), y README renovado. Se activó Pages vía `gh api` (`source: main:/docs`), se esperó el build (~20s) y se verificó `HTTP 200` en la URL real. Se fijó como "Website" del repo en GitHub.
6. No hubo forma de probar la 028 visualmente en navegador: la extensión Claude in Chrome no se conectó en esta sesión. Se compensó con revisión estática cuidadosa de los `id` HTML↔JS y con la cobertura de integración HTTP real de las pruebas (no mocks).

## Estado

- Git: limpio, pusheado hasta `7d67a87`.
- Tests: 446/446 en verde, lint de 93 archivos limpio.
- GitHub Pages: activo y verificado (`https://riskbreaker2077.github.io/open-test/`).
- Instalador de Windows: código listo, **sin compilar ni probar** — es lo único que quedó a medias esta sesión.

## Siguiente tarea

1. **Compilar y probar el instalador (029)** en un Windows real: `npm run build:exe && npm run build:installer`, luego instalar limpio, instalar encima de una copia con datos (no debe perderlos) y desinstalar (no debe borrar `data\`). Corregir el `.iss` si algo falla — nunca se compiló de verdad.
2. Fuera de eso, nada obligatorio. Lo siguiente sale de `roadmap.md → Backlog / ideas` si el usuario decide continuar.

## Bloqueos / decisiones pendientes

- Ninguno, salvo la verificación pendiente de la 029 (necesita Windows, no es un bloqueo de diseño).
