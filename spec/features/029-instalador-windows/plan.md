# 029 · Instalador de Windows — Plan

## Enfoque

Inno Setup es la herramienta estándar de facto para instaladores de Windows sencillos: gratis, sin dependencia de red en tiempo de instalación, un único `.iss` de texto plano versionable como cualquier script del repo. No es una dependencia de npm ni de runtime — es una herramienta externa que solo usa quien genera el instalador (igual que `signtool`, ya invocado hoy en `build-exe.js`), así que no choca con "sin dependencias nuevas" de `tech-stack.md` (esa regla es sobre lo que el producto necesita para funcionar, no sobre las herramientas de quien lo empaqueta).

El instalador **envuelve** la salida de `build:exe`, no la reemplaza ni la duplica: sigue siendo la misma carpeta `dist/OpenTest-Windows` la que se empaqueta, así que cualquier cambio futuro en qué archivos trae el build (`server/`, `public/`, `ejemplos/`, etc.) llega gratis al instalador sin tocar el `.iss`.

## Implementación

1. **`scripts/installer/opentest.iss`** — script de Inno Setup 6:
   - `[Setup]`: `AppId` fijo (no cambia entre versiones, para que Windows trate cada instalador como una actualización del mismo producto); `DefaultDirName={localappdata}\OpenTest` y `PrivilegesRequired=lowest` para instalar sin admin; `ArchitecturesInstallIn64BitMode=x64compatible` (coherente con que `build:exe` solo genera Windows x64).
   - `[Files]`: copia todo `dist/OpenTest-Windows\*` **excepto** `data\` (`Excludes: "data\*,data"`). Es la única línea que protege los datos del docente en una reinstalación.
   - `[Icons]`: acceso directo al ejecutable y a la guía en el grupo del menú Inicio; acceso directo opcional en el escritorio vía `[Tasks]`.
   - `[Run]`: casilla "Abrir OpenTest ahora" al terminar, como cualquier instalador de Windows.
   - Sin `[UninstallDelete]` a propósito: así el desinstalador nunca toca `data\`, ni siquiera por error futuro — no hay nada que lo liste para borrar.

2. **`scripts/build-installer.js`** — wrapper node, mismo patrón que `build-exe.js`: se niega a correr fuera de `win32`, comprueba que `dist/OpenTest-Windows` exista (si no, indica correr `build:exe` primero) y llama a `ISCC` (el compilador de línea de comandos de Inno Setup) sobre el `.iss`. Si `ISCC` no está en el PATH, explica qué instalar en vez de un stacktrace de Node.

3. **`package.json`** — nuevo script `build:installer`.

4. **`GUIA-DOCENTE.md` → 1. Preparar OpenTest** — se agrega el instalador como alternativa a la copia manual de la carpeta, dejando ambas documentadas (la copia manual sigue siendo válida, en particular para quien prefiera todo portable en una USB sin dejar rastro en el registro de Windows).

## Decisiones

- **Sin admin (`PrivilegesRequired=lowest`)** — un docente en un portátil del colegio puede no tener privilegios de administrador; instalar en `%localappdata%` evita ese bloqueo. Alternativa descartada: `DefaultDirName={autopf}` (Archivos de programa), que exigiría UAC y fallaría para ese docente.
- **Excluir `data\` explícitamente en vez de confiar solo en el comportamiento por defecto de Inno** — Inno ya no sobreescribiría una carpeta que no lista en `[Files]`, pero declararlo con `Excludes` dentro de la línea que sí copia el resto deja la intención escrita y a prueba de que alguien "simplifique" el wildcard más adelante sin darse cuenta de por qué estaba así.
- **Sin firma de código** — un certificado de firma de editor tiene un costo recurrente y no cambia el límite duro de "cero red"; SmartScreen seguirá avisando la primera vez, igual que ya avisa hoy con `OpenTest.exe` suelto (documentado en `GUIA-DOCENTE.md → SmartScreen o el antivirus bloquean OpenTest`).
- **No se compiló ni se probó en esta sesión** — se trabajó desde Linux, sin Inno Setup ni Windows disponibles. El script se escribió con el mismo cuidado que el resto del repo y se revisó dos veces contra la documentación de Inno Setup, pero un `.iss` que nunca corrió puede tener un error de sintaxis o una ruta relativa mal calculada que solo aparece al compilarlo de verdad. Queda marcado como pendiente en `spec.md` y en el roadmap, para la sesión de validación física con Windows real.

## Riesgos

- **El `.iss` nunca se compiló**: es el riesgo principal de esta feature. Mitigación: la próxima vez que haya acceso a Windows, `npm run build:installer` debe ser lo primero que se pruebe, antes de dar el criterio por cumplido.
- **`ArchitecturesInstallIn64BitMode=x64compatible` en un Windows ARM64** — Inno Setup 6 moderno lo soporta vía emulación x64; si algún colegio tuviera un equipo ARM (muy improbable en este contexto), igual funcionaría por compatibilidad x64, pero no se optimiza para eso.
