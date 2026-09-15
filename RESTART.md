# Restart

## Última actualización y rama activa

- 15/09/2026 — `main`. Se publicó **OpenTest 1.0.0**: release `v1.0.0` con `OpenTest-Setup.exe`, copia en `instalador/` y botón de descarga en el sitio.

## Feature/tarea en curso

- Ninguna. **030 · Descarga pública del instalador** quedó implementada, y con ella se cerró la **029** (el instalador se compiló y probó por primera vez).

## Qué se hizo en esta sesión

1. El usuario pidió el instalador descargable desde la web y dentro del repositorio. Eligió la versión **1.0.0**, y publicarlo en Releases **y** commitearlo.
2. Sin Windows local, se armó `.github/workflows/instalador.yml` (runner `windows-2025`, Node 22, Inno Setup de la imagen). Corre los mismos `build:exe` y `build:installer`, y hace una prueba de humo real: instalar en silencio, arrancar `OpenTest.exe` hasta HTTP 200, reinstalar sin tocar `data\opentest.db` y desinstalar conservándola.
3. Se corrigió `Excludes` del `.iss`: el patrón sin barra inicial excluía cualquier `data` en cualquier nivel. El instalador ahora tiene nombre fijo, `OpenTest-Setup.exe`, y `build-installer.js` pasa la versión de `package.json`.
4. Enlaces de descarga en `docs/index.html` (botón en el hero y en la navegación), `docs/guia.html`, `GUIA-DOCENTE.md` y `README.md`.
5. Corrida manual en verde (run 34968728449). Después, tag `v1.0.0` (run 34968970710): release creada y `instalador/OpenTest-Setup.exe` commiteado por el bot (`3143b0d`, 55,5 MB). Se verificó que `releases/latest/download/OpenTest-Setup.exe` responde 200.

## Estado

- Tests: 446/446, lint de 93 archivos limpio.
- Instalador: compilado y probado en Windows (runner), publicado como 1.0.0.
- Hay cambios sin commitear que **no son de esta sesión** y no se tocaron: borrados de `spec_template/`, que ya estaban al empezar, y en `.opencode/skills/` dos skills renombradas a `*-opentest`, que aparecieron durante la sesión. Preguntar al usuario antes de commitearlos o restaurarlos.

## Siguiente tarea

- Para publicar una versión nueva: subir `version` en `package.json`, commit, `git tag vX.Y.Z && git push origin vX.Y.Z`. El workflow hace el resto.
- Aparte de eso, nada obligatorio; ver `roadmap.md → Backlog / ideas`.

## Bloqueos / decisiones pendientes

- Ninguno. Cada versión suma unos 50 MB al historial de git por la copia commiteada (decisión del usuario, ver bitácora 15/09/2026).
