# 010 · Empaquetado y guía docente — Tareas

- [ ] Implementar `server/rutas.js` (`raizDeDatos`, `raizDeEstaticos`) y migrar todo el acceso a rutas.
- [ ] Test: las rutas se resuelven correctamente en ejecución normal y bajo SEA simulado.
- [ ] Construir `public/docente/inicio.html` con los accesos del panel (el QR vive en la proyección, feature 012).
- [ ] Implementar la apertura automática del navegador al arrancar.
- [ ] Implementar la búsqueda del siguiente puerto libre con aviso en pantalla.
- [ ] Implementar el cierre limpio de la base de datos ante `SIGINT` y cierre de ventana.
- [ ] Escribir `scripts/build-exe.js` (configuración SEA, binario, carpeta de distribución con el `.node`).
- [ ] Crear `ejemplos/estudiantes-ejemplo.csv` y `ejemplos/banco-ejemplo.csv` importables tal cual.
- [ ] Escribir `GUIA-DOCENTE.md` con el flujo completo y las capturas.
- [ ] Añadir a la guía las plantillas de los dos archivos de importación.
- [ ] Añadir la sección de problemas frecuentes (cortafuegos, wifi distinta, aislamiento de clientes, tildes, ceros a la izquierda, SmartScreen, antivirus, contraseña olvidada).
- [ ] Documentar, para quien desarrolle en WSL2, que el servidor queda en una red NAT invisible al wifi y hace falta `networkingMode=mirrored` o `netsh portproxy`.
- [ ] Prueba de humo en una máquina Windows limpia sin Node: de apagado a estudiante respondiendo en menos de 10 minutos.
- [ ] Validar contra los criterios de aceptación de `spec.md`.
- [ ] Mover la feature a "Hecho" en `../../constitution/roadmap.md`.

## Mantenimiento (checklist recurrente)

- [ ] Cada vez que una feature cambie una pantalla que aparezca en `GUIA-DOCENTE.md`, actualizar su captura y su texto.
- [ ] Rehacer la prueba de humo en Windows limpio antes de cada entrega al docente.
- [ ] Revisar que los archivos de `ejemplos/` siguen importándose sin errores tras cambios en los contratos.
