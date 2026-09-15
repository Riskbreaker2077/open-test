# 034 · Abrir OpenTest sin ventana de consola

**Estado:** implementado ✅ _(pendiente de verificación en Windows real)_

## Qué hace

Al abrir OpenTest desde el acceso directo del escritorio o del menú Inicio, **no aparece la ventana negra** de la consola: el servidor arranca en segundo plano y se abre el navegador en el panel del docente, como hasta ahora.

Como ya no hay ventana que cerrar:

- El panel del docente tiene un botón **Apagar OpenTest**, que pide confirmación, detiene el servidor y cierra la base de datos limpiamente.
- Abrir OpenTest cuando **ya está abierto** no levanta un segundo servidor en otro puerto: solo abre el navegador en el que ya funciona.
- Al instalar una versión nueva encima, el instalador cierra el OpenTest que esté corriendo.

## Por qué

Lo pidió el docente (15/09/2026). La ventana de comandos confunde a quien no es informático, se cierra por accidente (y con ella el examen de todo el grupo) y ocupa la barra de tareas durante toda la clase.

## Criterios de aceptación

- [ ] Los accesos directos que crea el instalador (menú Inicio y escritorio) y la opción "Abrir OpenTest ahora" arrancan el servidor **sin ventana visible**.
- [x] Ejecutar `OpenTest.exe` directamente sigue mostrando la consola: `OpenTest.exe --recuperar-contrasena` (027) funciona igual.
- [x] Si `http://127.0.0.1:<puerto>/api/salud` ya responde como OpenTest, un segundo arranque abre el navegador y termina sin levantar otro servidor.
- [x] `POST /api/docente/apagar` (protegida por contraseña) responde y después apaga el servidor, cerrando también las conexiones abiertas de las tablets.
- [x] El panel del docente muestra **Apagar OpenTest** con confirmación; al apagarse, la página lo dice y explica cómo volver a abrirlo.
- [ ] Reinstalar mientras OpenTest corre no falla por "archivo en uso": el instalador lo cierra.
- [x] `GUIA-DOCENTE.md` y `docs/guia.html` explican que se apaga desde el panel, no cerrando una ventana.
- [ ] Verificación física en Windows: sin ventana al abrir, apagar desde el panel, segunda apertura sin duplicar servidor.

## Fuera de alcance

- Un ícono en la bandeja del sistema: exigiría una dependencia nativa.
- Arrancar OpenTest con Windows.
