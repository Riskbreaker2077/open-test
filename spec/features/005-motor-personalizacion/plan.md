# 005 · Motor de personalización — Plan

## Enfoque

Un módulo puro, `server/services/personalizacion.js`, sin acceso a la base: recibe la lista de preguntas del banco y una semilla, devuelve la estructura de la prueba. Esa pureza es lo que lo hace exhaustivamente testeable, y esta es la feature donde los tests valen más que en ninguna otra.

La aleatoriedad viene de un **PRNG con semilla implementado a mano** (`mulberry32`, seis líneas), no de `Math.random()`. `Math.random()` no acepta semilla, y sin semilla no hay determinismo, y sin determinismo no hay reanudación ni auditoría. El barajado es Fisher-Yates, que es el único que produce una distribución uniforme de permutaciones —el "ordenar por número aleatorio" que suele escribirse en su lugar está sesgado.

La escritura la hace un módulo aparte que llama al puro dentro de una transacción, para que la materialización sea atómica.

## Implementación

1. `server/services/prng.js` — `crearPrng(semilla)`: hash de la cadena semilla a un entero de 32 bits y `mulberry32` sobre él. Devuelve una función `() => [0,1)`.
2. `server/services/personalizacion.js` — módulo puro:
   - `barajar(array, prng)` — Fisher-Yates, devuelve un array nuevo.
   - `muestrear(array, n, prng)` — barajado parcial y corte a `n`: muestreo sin reemplazo en O(n).
   - `generarPrueba({ preguntas, nPreguntas, semilla })` — devuelve `[{ orden, preguntaId, ordenOpciones: [id,id,id,id] }]`. Lanza si `preguntas.length < nPreguntas`.
3. `server/services/intentos.js` — `materializarPrueba(db, intento)`: dentro de una transacción, comprueba si ya existen filas en `intento_preguntas` para ese intento y **si existen no hace nada**; si no, carga el banco, llama a `generarPrueba` e inserta.
4. Enganche en el flujo de la feature 004: al crear un intento nuevo, se materializa inmediatamente; al reanudar, se lee lo que ya está.
5. `server/services/personalizacion.test.js` — la suite más densa del proyecto:
   - determinismo: misma semilla → resultado idéntico, comparado campo a campo.
   - sin repeticiones dentro del intento; todas las preguntas del banco.
   - `orden_opciones` es una permutación exacta de los ids de la pregunta.
   - dispersión: 100 semillas, ningún par con selección idéntica, media de solapamiento cerca de 8/20.
   - uniformidad de la posición de la correcta sobre 1000 preguntas, con los umbrales del criterio.
   - borde: banco de tamaño exacto; banco corto lanza.
   - rendimiento: 50 preguntas en menos de 50 ms.
6. `server/services/intentos.test.js` — materializar dos veces no cambia nada; fallo a mitad no deja filas parciales.

## Decisiones

- **PRNG propio con semilla en vez de `Math.random()`** — sin semilla no hay reproducibilidad, y la reproducibilidad es lo que sostiene la reanudación (feature 006) y la auditoría (feature 009). `mulberry32` es suficiente: no necesitamos calidad criptográfica, necesitamos repartir preguntas.
- **La semilla se guarda en el intento, la prueba se guarda materializada** — podría haberse guardado solo la semilla y regenerado la prueba en cada petición. Se descarta: bastaría con borrar una pregunta del banco para que la prueba de un estudiante cambiara a mitad de examen. Las filas materializadas son un registro histórico, no una caché.
- **Módulo puro separado de la escritura** — permite probar la lógica anti-copia con miles de iteraciones sin base de datos.
- **Fisher-Yates y no `sort(() => Math.random() - 0.5)`** — el segundo produce permutaciones sesgadas; en el barajado de 4 opciones eso significaría que la correcta cae más en unas posiciones que en otras, que es exactamente lo que un estudiante espabilado detecta.
- **Muestreo uniforme, sin garantizar cobertura temática** — en v1 el docente controla la composición eligiendo qué mete en el banco. El sorteo estratificado queda en backlog.

## Riesgos

- **Bancos pequeños dan poca protección** — con 25 preguntas y 20 sorteadas, dos estudiantes comparten 16. El barajado de opciones sigue actuando, pero la protección baja. Mitigación: el panel muestra el solapamiento esperado al configurar la sesión, para que el docente vea el efecto de su tamaño de banco y decida con información.
- **Semillas colisionando** — dos intentos con la misma semilla darían pruebas idénticas. Mitigación: la semilla se genera con `crypto.randomBytes(16)`; la colisión es despreciable, y aun así hay un test que verifica que 1000 intentos generan 1000 semillas distintas.
- **Borrar preguntas de un banco en uso** rompería la integridad referencial de intentos ya materializados. Mitigación: ya está prohibido borrar bancos usados (feature 003), y las FK de `intento_preguntas` lo impiden a nivel de base.
