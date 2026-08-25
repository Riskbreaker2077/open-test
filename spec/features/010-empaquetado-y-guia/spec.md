# 010 · Empaquetado y guía docente

**Estado:** propuesta

## Qué hace

Convierte el proyecto en algo que un docente puede usar sin saber qué es Node: un **ejecutable único** que se copia a su portátil y se abre con doble clic. Al abrirlo se levanta el servidor, se abre el navegador en el panel y aparece en pantalla —grande— la dirección que deben escribir las tablets, junto a un **código QR** de esa misma dirección para que los estudiantes lo escaneen en lugar de teclearla.

Incluye además `GUIA-DOCENTE.md`: el manual del flujo completo, escrito sin jerga, con la resolución de los problemas que de verdad ocurren el primer día.

## Por qué

Todo lo anterior es inútil si el docente no consigue arrancarlo. `npm install` es una barrera infranqueable para el usuario objetivo, y la misión dice explícitamente que necesitar una terminal para el uso diario es un fracaso de diseño.

El QR resuelve el otro punto de fricción medible: treinta adolescentes tecleando `http://192.168.1.34:3000` producen una decena de errores de tipeo y una cola de manos levantadas en los primeros cinco minutos del examen.

## Criterios de aceptación

- [ ] `npm run build:exe` produce un ejecutable que arranca OpenTest sin Node instalado en la máquina.
- [ ] El ejecutable funciona en Windows 10/11 de 64 bits, que es lo que hay en los colegios.
- [ ] Al abrirlo se levanta el servidor y se abre el navegador por defecto en el panel del docente.
- [ ] El ejecutable abre el navegador en el panel del docente; el QR y el reloj para el aula viven en la pantalla de proyección (feature [012](../012-pantalla-proyeccion/spec.md)).
- [ ] La guía explica cómo proyectar la pantalla de proyección y cómo dictar la dirección estable del portal.
- [ ] La base de datos y las imágenes se crean junto al ejecutable, en una carpeta `data/` que el docente puede copiar a una USB.
- [ ] Cerrar la ventana detiene el servidor limpiamente, sin dejar la base de datos corrupta.
- [ ] Si el puerto está ocupado, se prueba el siguiente libre y se avisa en pantalla en lugar de fallar.
- [ ] `GUIA-DOCENTE.md` cubre el flujo completo: instalar → preparar archivos → importar estudiantes → importar banco → crear y abrir sesión → dictar la URL o mostrar el QR → monitorear → cerrar → descargar resultados.
- [ ] La guía incluye plantillas de ejemplo de los dos archivos de importación, listas para copiar.
- [ ] La guía incluye una sección de problemas frecuentes con, al menos: el cortafuegos de Windows bloqueando el puerto, las tablets en otra red wifi, el aislamiento de clientes del router, el CSV con tildes rotas y Excel comiéndose los ceros a la izquierda de los códigos, y el olvido de la contraseña del panel.
- [ ] La guía no usa vocabulario técnico sin explicarlo, y ningún paso obligatorio requiere abrir una terminal.
- [ ] Existe una prueba de humo documentada: de portátil apagado a primer estudiante respondiendo, en menos de 10 minutos.

## Fuera de alcance

- Instalador con asistente (`.msi`) o firma de código: se distribuye el ejecutable tal cual.
- Versiones para macOS y Linux: se documenta cómo generarlas, pero la soportada es Windows.
- Actualizaciones automáticas: implicaría red, prohibida por la constitución.
- Vídeos o capturas animadas; la guía es texto con capturas fijas.
