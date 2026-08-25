# 012 · Pantalla de proyección — Plan

## Enfoque

Una página bajo `/proyeccion/`, protegida por la sesión de docente (feature 011), que consulta un único endpoint cada segundo para el reloj y cada 5 s para los contadores. El reloj lo calcula siempre el servidor y el cliente solo interpola entre consultas: si la pantalla del proyector y las tablets contaran cada una por su cuenta, acabarían discrepando a la vista de todos, que es la peor forma de perder credibilidad delante de un aula.

El generador de QR se escribe a mano —estaba previsto en la feature 010 y se adelanta aquí, porque es esta pantalla la que lo necesita—. Codificar una URL corta en QR es un problema acotado: modo alfanumérico o byte, corrección de errores baja, y salida como SVG de rectángulos.

## Implementación

1. `server/qr.js` — generador de QR mínimo: `matrizQr(texto)` y `svgQr(texto, opciones)`. Sin dependencias, salida SVG que escala a cualquier tamaño de proyector.
2. `server/services/sesiones.js` — máquina de estados ampliada con el reloj global:
   - `comenzarSesion(db, id)` → `en_curso`, fija `comenzada_en`.
   - `pausarSesion` / `reanudarSesion` → acumulan en `segundos_pausados`.
   - `tiempoRestante(db, sesion)` → segundos, única fuente de verdad del reloj; devuelve 0 y dispara el cierre cuando vence.
3. `server/routes/docente.js` — `GET /api/docente/proyeccion/:sesionId` devuelve nombre, URL del portal, tiempo restante, estado y los dos contadores. **Nunca nombres ni notas.** Y las transiciones `comenzar`, `pausar`, `reanudar`.
4. `GET /api/docente/qr.svg?texto=` — el QR de la dirección del portal, generado al vuelo.
5. `public/proyeccion/index.html` + `proyeccion.js` + `proyeccion.css` — maquetación a pantalla completa con unidades relativas a la ventana (`clamp`, `vmin`) para que el mismo diseño funcione en 1024×768 y en 1920×1080; sondeo del estado y reloj interpolado entre consultas.
6. La dirección del portal se obtiene de `urlsDeIntranet()` (feature 001), que ya marca la más probable.
7. Tests: el QR se decodifica de vuelta al texto original; `tiempoRestante` con sesión sin comenzar, en curso, pausada y vencida; el endpoint de proyección **no contiene** nombres ni puntajes; las transiciones de estado válidas e inválidas; sin sesión de docente responde 401.

## Decisiones

- **El reloj lo calcula el servidor** — es la única forma de que el proyector y treinta tablets muestren lo mismo, y de que cambiar la hora de una tablet no dé tiempo extra.
- **El QR apunta a la raíz, no a la sesión** — la dirección tiene que ser estable entre evaluaciones, así lo pidió el uso real: el docente proyecta siempre el mismo QR y no depende de qué examen sea. La elección de la evaluación ocurre dentro del portal (feature 013).
- **Adelantar el generador de QR desde la feature 010** — allí era un accesorio del empaquetado; aquí es el mecanismo por el que entra el aula.
- **Solo tres controles** — cada control adicional es un clic accidental delante de treinta personas. Todo lo demás vive en el panel, que no se proyecta.
- **Pausa que suma al plazo en lugar de congelar la hora de fin** — es lo que espera el docente cuando interrumpe por un simulacro o una incidencia: recuperar el tiempo perdido.
- **Estado `abierta` separado de `en_curso`** — deja que los estudiantes entren y se identifiquen antes de que el reloj corra, que es como funciona un examen de verdad: primero se sientan, luego empieza.

## Riesgos

- **Un proyector con poco contraste o resolución baja** — mitigación: negro sobre blanco, sin colores como único portador de información, y tamaños en `vmin` probados a 1024×768.
- **La cámara de la tablet no enfoca el QR desde lejos** — mitigación: el QR ocupa una fracción grande de la pantalla, con corrección de errores suficiente, y la dirección en letra grande sirve de alternativa.
- **El docente pulsa "Cerrar" por error delante de la clase** — mitigación: confirmación que dice a cuántos afecta, y el botón separado de los otros dos.
- **El reloj se congela si el navegador del proyector suspende la pestaña** — mitigación: al volver a estar visible se resincroniza inmediatamente con el servidor.
