# 031 · Asistencia en la pantalla de proyección — Plan

## Enfoque

Dos piezas: saber **quién está conectado ahora** y **pintarlo**.

Quién entró o entregó ya lo sabe `estadoDeSesion` (008). Lo nuevo es la conexión. Ninguna tablet avisa al servidor cuando se cierra o pierde el wifi, así que se detecta por silencio: el examen (`examen.js`) y la sala de espera del portal (`portal.js`) ya consultan `/api/examen/estado` cada 5 s. Cada petición autenticada del estudiante deja una marca de "visto por última vez"; si la marca tiene más de 15 s (tres sondeos perdidos), el estudiante salió.

## Implementación

1. `server/presencia.js` — módulo en memoria, con el mismo estilo que `server/sesion.js`: `marcarVisto(intentoId, ahora)`, `marcarSalida(intentoId)`, `estaConectado(intentoId, ahora)` y `_reiniciar()` para los tests. Un `Map` de intento → instante.
2. `server/routes/examen.js` — `conIntento` llama a `marcarVisto`; `/entrar` marca al intento recién creado o retomado; `/salir` llama a `marcarSalida` (en `/salir`, resolviendo el intento por la cookie antes de borrarla).
3. `server/routes/docente.js` — la proyección arma `estudiantes` con forma mínima: `nombre`, `curso`, `estado`. `presentando` se traduce a `conectado` o `desconectado` según `estaConectado`.
4. `public/proyeccion/` — el panel de asistencia pasa a un tablero de cuadros con leyenda. Se mantiene el ajuste de letra por búsqueda binaria y `ResizeObserver`.
5. Tests: unidad de `presencia.js` (umbral de 15 s, salida explícita, reingreso) y API de proyección (sin entrar, conectado, desconectado por "Salir", entregado, sin datos reservados).

## Decisiones

- **En memoria, no en la base** — la conexión es un dato de este instante: no se exporta ni sobrevive a nada. Una columna nueva exigiría migración y una escritura en SQLite cada 5 s por tablet. Si el servidor se reinicia, cada tablet vuelve a verde en su siguiente sondeo (≤ 5 s).
- **Umbral de 15 s** — tres sondeos seguidos perdidos. Menos daría rojos falsos con un wifi de aula irregular; más haría que el rojo llegara tarde.
- **Entregado se queda en verde** — lo pidió el docente: terminar no es salirse.
- **✓ en el entregado y leyenda en pantalla** — un proyector lavado no distingue tonos, y la leyenda evita que la clase tenga que adivinar qué significa cada color.
- **Sin código de estudiante** — es con lo que se entra; proyectarlo permitiría entrar por otro.
- **Ajuste de letra por JS, no scroll** — la 012 exige cero barras de desplazamiento y un curso puede tener 20 o 45 estudiantes. La caja se vigila con `ResizeObserver`: en 4:3 la altura disponible depende del QR, que carga después del primer ajuste.

## Riesgos

- **Rojo falso cuando la tablet suspende la pestaña** — es exactamente "salió de la prueba", que es lo que el docente quiere ver. Al volver, el examen consulta en cuanto la página es visible y el cuadro vuelve a verde.
- **Exponer ante el grupo quién falta o se salió** — decisión explícita del docente, escrita en `mission.md` y en esta spec.
