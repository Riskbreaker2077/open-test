# 034 · Abrir OpenTest sin ventana — Plan

## Enfoque

`OpenTest.exe` es un ejecutable de consola (Node SEA) y lo sigue siendo: cambiarle el subsistema a "ventana" rompería la recuperación de contraseña (027), que necesita la consola. Lo que cambia es **cómo lo abren los accesos directos**: un lanzador `OpenTest.vbs` lo ejecuta con la ventana oculta (`WScript.Shell.Run …, 0`). `wscript.exe` viene con Windows, así que no hay dependencia nueva.

## Implementación

1. `scripts/installer/OpenTest.vbs` — lanzador oculto, con la carpeta del programa como directorio de trabajo.
2. `scripts/installer/opentest.iss` — se instalan el `.vbs` y el ícono; los accesos directos y `[Run]` apuntan a `{sys}\wscript.exe "{app}\OpenTest.vbs"` con `IconFilename` del logo (035); `CloseApplications=force` para cerrar el servidor al actualizar.
3. `server/arranque.js` — `yaEstaAbierto(puerto)`: `GET /api/salud` con 1,5 s de límite; es OpenTest si responde `{ ok: true, version }`.
4. `server/index.js` — antes de buscar puerto, si `yaEstaAbierto` abre el navegador y sale. `app.locals.apagar = apagar`; `apagar` llama también a `closeAllConnections()`, porque las tablets mantienen conexiones vivas que harían esperar a `close()` indefinidamente.
5. `server/routes/docente.js` — `POST /apagar`: responde `{ ok: true }` y apaga al terminar la respuesta (`res.on('finish')`). Sin `app.locals.apagar` (tests, otros usos) responde 501.
6. `public/docente/index.html` + `panel.js` — botón con confirmación y pantalla final "OpenTest está apagado".
7. Guías — sección "Cerrar OpenTest" y paso 1 de la recuperación de contraseña.

## Decisiones

- **Lanzador VBS y no cambiar el subsistema del exe** — conserva la consola para la 027 y para diagnosticar ejecutando el exe a mano.
- **Detectar la instancia por `/api/salud`, no por puerto ocupado** — un puerto ocupado por otro programa no es OpenTest; en ese caso se sigue buscando el siguiente libre, como antes.
- **Apagar después de responder** — si se apaga antes, el navegador ve un error de red y el docente no sabe si funcionó.
