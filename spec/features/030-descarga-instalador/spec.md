# 030 · Descarga pública del instalador

**Estado:** implementado; ver criterios 🔧

## Qué hace

Publica el instalador de Windows de la 029 para que el docente lo descargue sin compilar nada:

- Un workflow de GitHub Actions (`.github/workflows/instalador.yml`) compila `OpenTest.exe` y `OpenTest-Setup.exe` en un runner de Windows, los prueba instalando de verdad y, al empujar un tag `vX.Y.Z`, publica el instalador en **Releases** del repositorio.
- El mismo workflow deja una copia en el repositorio, en `instalador/OpenTest-Setup.exe`, sobrescrita con cada versión.
- El sitio (`docs/index.html`, `docs/guia.html`), `README.md` y `GUIA-DOCENTE.md` enlazan la descarga directa de la última versión.

## Por qué

La 029 dejó el instalador como algo que cada quien compila en su Windows con Node e Inno Setup instalados — justo lo que un docente no tiene. Y la 029 nunca se había compilado: el runner de Windows es, además, la primera verificación real del `.iss`.

## Criterios de aceptación

- [ ] El workflow compila `build:exe` y `build:installer` en Windows sin intervención manual.
- [ ] El workflow instala en silencio, arranca `OpenTest.exe` y recibe `HTTP 200`, reinstala encima sin alterar `data\opentest.db` y desinstala sin borrar `data\`. Si algo falla, no se publica.
- [ ] Un tag `vX.Y.Z` que no coincide con `package.json` hace fallar el workflow antes de publicar.
- [ ] La release `v1.0.0` existe con `OpenTest-Setup.exe` adjunto.
- [ ] `instalador/OpenTest-Setup.exe` está en `main`.
- [ ] `https://github.com/Riskbreaker2077/open-test/releases/latest/download/OpenTest-Setup.exe` descarga el instalador, y el sitio publicado lo enlaza.

## Fuera de alcance

- **Firma de código**: igual que en la 029.
- **Descarga de la carpeta portable** (`OpenTest-Windows` en ZIP): no se pidió; se puede agregar al mismo workflow si hace falta.
- **Actualización automática desde la app**: sigue prohibida por "cero red en runtime". La descarga ocurre en el sitio web, nunca desde OpenTest.
