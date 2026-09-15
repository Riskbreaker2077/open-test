# 029 · Instalador de Windows — Tareas

- [x] `scripts/installer/opentest.iss` con `[Setup]`, `[Files]` (excluyendo `data\`), `[Icons]`, `[Tasks]`, `[Run]`.
- [x] `scripts/build-installer.js` (guardia de plataforma + de build previo + llamada a `ISCC`).
- [x] `package.json`: script `build:installer`.
- [x] `GUIA-DOCENTE.md → 1. Preparar OpenTest`: documentar la alternativa del instalador.
- [x] Compilar con Inno Setup 6 real en Windows (`npm run build:installer`) y corregir lo que falle. (Runner de Windows, 030; se corrigió `Excludes`.)
- [x] Probar: instalación limpia, instalación encima de una copia con `data\opentest.db` ya cargado (no se pierde nada), desinstalación (no borra `data\`).
- [x] Validar contra los criterios de aceptación de `spec.md`.
- [x] Mover la feature a "Hecho" en `../../constitution/roadmap.md` (o dejar la marca de verificación física pendiente, como ya hace la 010).
