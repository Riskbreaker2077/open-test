# 030 · Descarga pública del instalador — Plan

## Enfoque

GitHub Actions con `runs-on: windows-2025`: la imagen trae Inno Setup 6 (paquete `innosetup` de Chocolatey); si alguna vez deja de traerlo, el workflow lo instala. Node 22 con `actions/setup-node`, `npm ci` (que baja el binario precompilado de `better-sqlite3` para Windows x64) y luego los mismos `npm run build:exe` y `npm run build:installer` que usaría una persona. No hay un segundo camino de build que pueda divergir del documentado.

Disparadores: `push` de tags `v*` (compila, prueba y publica) y `workflow_dispatch` (compila y prueba, deja el `.exe` como artefacto, no publica).

## Cambios

1. **`scripts/installer/opentest.iss`**
   - `OutputBaseFilename=OpenTest-Setup`, sin versión en el nombre: `releases/latest/download/<nombre>` necesita un nombre fijo para que el enlace del sitio no cambie con cada versión. La versión se sigue viendo en "Agregar o quitar programas" y en el título de la release.
   - `Excludes: "\data,\data\*"`, anclado a la raíz. El patrón anterior (`data\*,data`), sin barra inicial, excluía **cualquier** archivo o carpeta llamado `data` en cualquier nivel, `node_modules` incluido (ver la documentación de `Excludes` de Inno Setup).
2. **`scripts/build-installer.js`**: lee `version` de `package.json` y la pasa como `/DMyAppVersion`.
3. **`package.json`**: `1.0.0`, la primera versión publicada.
4. **`.github/workflows/instalador.yml`**: versión ↔ tag, build, prueba de humo, artefacto, release, commit de `instalador/OpenTest-Setup.exe` en `main` como `github-actions[bot]`.
5. **`.gitattributes`**: `*.exe binary`.
6. **Sitio, README y guía**: botón y enlaces de descarga.

## Prueba de humo en el runner

1. Instalación silenciosa (`/VERYSILENT /SUPPRESSMSGBOXES /NORESTART /DIR=…`). Deben existir `OpenTest.exe` y no debe existir `data\` (el paquete no la trae).
2. Arrancar `OpenTest.exe` con `PORT=3456` y esperar `HTTP 200` en `/`. Esto prueba el SEA de verdad: blob inyectado, `server/` junto al ejecutable y `better-sqlite3` nativo. Al arrancar se crea `data\opentest.db`.
3. Reinstalar encima: el hash de `data\opentest.db` no cambia.
4. `unins000.exe /VERYSILENT`: `OpenTest.exe` desaparece y `data\opentest.db` sigue ahí.

## Decisiones

- **Release y además copia commiteada.** Así lo pidió el usuario. El costo es que cada versión agrega un binario de decenas de MB al historial de git. GitHub rechaza archivos de más de 100 MB, así que el workflow falla con un mensaje claro por encima de 95 MB en vez de dejar un push a medias.
- **La copia la commitea el workflow, no una persona.** Así la release y el archivo del repo salen del mismo build ya probado.
- **Los tests no corren en el runner de Windows.** La suite está validada en Linux, y este workflow verifica el empaquetado, no la lógica. La prueba de humo cubre lo que solo falla en Windows.
