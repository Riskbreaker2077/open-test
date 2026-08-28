# 010 · Empaquetado y guía docente — Plan

## Enfoque

Se usa **Node SEA** (Single Executable Application, nativo desde Node 20) para producir el binario, sin traer un empaquetador de terceros. Node genera el blob nativamente y la utilidad oficial `postject`, añadida solo como dependencia de desarrollo, lo inyecta en la copia de `node.exe`. El obstáculo conocido es `better-sqlite3`, que es un módulo nativo: se resuelve distribuyendo sus archivos de runtime junto al ejecutable, en lugar de intentar incrustarlos.

Las rutas son el otro punto crítico: dentro de un SEA, `__dirname` no apunta donde uno espera. Todo acceso a `data/` y a `public/` se resuelve desde `process.execPath`, de modo que la carpeta de datos nace junto al ejecutable —donde el docente la ve y la puede copiar.

El QR se genera con un generador propio y pequeño, no con una librería: es una matriz de módulos que se pinta como SVG, y traer una dependencia entera para codificar una URL de 30 caracteres contradice el `package.json` mínimo.

## Implementación

1. `server/rutas.js` — `raizDeDatos()` y `raizDeEstaticos()`, que distinguen ejecución bajo SEA (`process.execPath`) de ejecución normal (`import.meta.url`). Todo el código pasa a pedirle las rutas aquí.
2. El generador de QR se adelanta a la feature 012, que es la que lo necesita para proyectarlo.
3. `public/docente/inicio.html` — la pantalla que se abre sola tras iniciar sesión: accesos a estudiantes, bancos, sesiones, proyección y resultados.
4. `server/index.js` — abre el navegador por defecto al arrancar (`start` en Windows), busca el siguiente puerto libre si el 3000 está ocupado, y captura `SIGINT`/cierre de ventana para cerrar la base de datos limpiamente.
5. `scripts/build-exe.js` — en Windows, genera la configuración SEA, produce el binario con `postject`, y arma la carpeta de distribución con el ejecutable, el runtime externo mínimo (`server/`, dependencias, `public/`) y `GUIA-DOCENTE.md`.
6. `GUIA-DOCENTE.md` — el manual, con capturas, las plantillas de los dos CSV y la sección de problemas frecuentes.
7. `ejemplos/estudiantes-ejemplo.csv` y `ejemplos/banco-ejemplo.csv` — archivos reales de muestra, importables tal cual para que el docente pruebe el sistema completo antes de usar sus datos.
8. Prueba de humo documentada en la guía y ejecutada en una máquina Windows limpia, sin Node.

## Decisiones

- **Node SEA en vez de `pkg`** — SEA es parte de Node; `postject` se usa únicamente en desarrollo porque es el paso de inyección indicado por Node. El runtime del aula no instala paquetes ni usa red.
- **`data/` junto al ejecutable, no en `%APPDATA%`** — el docente tiene que poder copiar sus datos a una USB y verlos. Una carpeta oculta del sistema hace invisible su propia información y convierte la copia de seguridad en una tarea imposible sin ayuda.
- **QR propio en lugar de una librería** — coherente con el límite de dependencias, y el generador para una URL corta es acotado y testeable.
- **Abrir el navegador automáticamente** — elimina un paso donde el docente se pregunta "¿y ahora qué?".
- **Buscar el siguiente puerto libre** — un puerto ocupado no es motivo para dejar a un aula sin examen.
- **Archivos de ejemplo importables** — la guía se puede seguir de principio a fin antes del día del examen, sin preparar nada. Es la mejor defensa contra descubrir un problema con treinta estudiantes esperando.

## Riesgos

- **Windows SmartScreen bloquea un ejecutable sin firmar** — pasa siempre y asusta. Mitigación: la guía muestra la pantalla exacta y explica dónde pulsar "Más información → Ejecutar de todas formas". Firmar el código queda fuera de alcance.
- **El módulo nativo no carga en la máquina destino** — es el punto de fallo más probable del empaquetado. Mitigación: la prueba de humo en una máquina Windows limpia y sin Node es obligatoria antes de dar la feature por hecha.
- **El antivirus del colegio bloquea el binario o el puerto** — se documenta en problemas frecuentes, con la alternativa de ejecutar desde la carpeta con Node instalado.
- **Una guía que envejece** — mitigación: la guía se actualiza como parte de las tareas de cualquier feature que cambie una pantalla que ella muestre; se añade como recordatorio recurrente en este `tasks.md`.
