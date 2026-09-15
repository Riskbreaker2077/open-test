# 030 · Descarga pública del instalador — Tareas

- [x] `.iss`: nombre fijo `OpenTest-Setup` y `Excludes` anclado a la raíz.
- [x] `build-installer.js`: versión desde `package.json`.
- [x] `package.json` → 1.0.0.
- [x] `.github/workflows/instalador.yml` con prueba de humo, release y commit del `.exe`.
- [x] `.gitattributes`.
- [x] Sitio, `README.md` y `GUIA-DOCENTE.md` con enlace de descarga.
- [x] Corrida manual (`workflow_dispatch`) en verde (run 34968728449; instalador de 52,9 MB).
- [x] Tag `v1.0.0` → release publicada e `instalador/OpenTest-Setup.exe` en `main` (run 34968970710, commit `3143b0d` del bot).
- [x] Verificar el enlace `releases/latest/download/OpenTest-Setup.exe` y el sitio publicado.
- [x] Cerrar la 029 (compilada y probada en Windows real vía runner) y mover 030 a "Hecho" en el roadmap.
