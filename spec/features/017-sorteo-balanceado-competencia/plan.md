# 017 · Sorteo balanceado por competencia — Plan

## Enfoque

Todo el cambio vive dentro del módulo puro `server/services/personalizacion.js` (feature 005), que ya era la pieza pensada para probarse con miles de iteraciones sin base de datos. Se le añade un paso de **muestreo estratificado** antes del muestreo uniforme que ya existía: agrupar las preguntas por `competencia`, decidir cuántas le tocan a cada grupo, y muestrear dentro de cada grupo con las funciones (`muestrear`, `barajar`) que ya estaban probadas.

La cuota por grupo usa el **método del resto mayor** (Hamilton): reparte primero la parte entera de `tamaño_grupo / tamaño_banco * n_preguntas`, y lo que sobra hasta llegar a `n_preguntas` se lo lleva quien tenga el resto más alto (empate roto alfabéticamente, para que el resultado sea reproducible sin depender del orden de inserción). Es el mismo método que se usa para repartir escaños en systems proporcionales; aquí garantiza que la suma de cupos sea exactamente `n_preguntas` sin que ningún grupo se pase de su propio tamaño.

Después de sortear dentro de cada grupo, se baraja el conjunto combinado con la misma `prng` antes de asignar el `orden`, para que el estudiante no vea las preguntas agrupadas por competencia.

**Compatibilidad hacia atrás:** si todas las preguntas comparten (o no tienen) `competencia`, agrupar produce un único grupo con cupo = `n_preguntas`, que es exactamente el camino que ya existía. No hace falta ninguna rama especial para bancos anteriores a la 016.

## Implementación

1. `server/services/personalizacion.js`:
   - Nueva función exportada `cuotasPorCompetencia(tamanosPorGrupo, total)`: recibe un `Map<nombre, tamaño>` y devuelve un `Map<nombre, cupo>` con el resto mayor descrito arriba.
   - `generarPrueba` agrupa `preguntas` por `pregunta.competencia ?? ''`, calcula las cuotas, muestrea cada grupo con `muestrear` (ya existente), concatena y baraja el resultado con `barajar` (ya existente) antes de numerar y de barajar las opciones de cada pregunta.
2. `server/services/bancos.js` — `idsDePreguntasYOpciones` ahora también selecciona `competencia` de `preguntas` (antes solo `id`), para que llegue hasta `generarPrueba` vía `materializarPrueba` en `intentos.js`. Sin este cambio, todo el banco caería siempre en el grupo `''`.
3. Tests en `server/services/personalizacion.test.js`:
   - `cuotasPorCompetencia` sola: reparto proporcional exacto, reparto con resto y empate alfabético, y que ningún grupo exceda su propio tamaño.
   - `generarPrueba` con un banco de cuatro competencias iguales: cobertura exactamente proporcional en cada uno de varios semillas distintas (no solo en promedio).
   - `generarPrueba` con el fixture `banco()` existente (sin `competencia`): sigue produciendo pruebas válidas, mismo comportamiento de siempre.
   - Toda la suite existente de la 005 (determinismo, dispersión, uniformidad de la posición correcta, bordes, rendimiento) queda intacta sin modificar ni un assert: es la prueba de que el cambio no rompió lo anterior.

## Decisiones

- **Resto mayor y no redondeo simple** — redondear cada cuota por separado (`Math.round`) no garantiza que la suma dé exactamente `n_preguntas`; el resto mayor sí, y es el método estándar para este problema (apportionment).
- **Empate de resto roto por nombre alfabético, no por orden de aparición en el banco** — el orden de aparición depende del `ORDER BY id` de la consulta SQL, que es estable pero arbitrario respecto a las competencias; alfabético es reproducible y fácil de razonar sin mirar la base.
- **Barajar el conjunto combinado antes de numerar, en vez de solo cambiar el orden de los grupos** — con solo intercalar grupos, un estudiante vería un patrón (ej. "primero lectura, luego ciencias") si el reparto fuera fijo; barajar el conjunto entero evita cualquier patrón perceptible.
- **Un solo grupo cuando no hay `competencia`** — evaluado explícitamente contra la alternativa de detectar "banco viejo" y saltarse el paso de agrupar: la alternativa añadiría una rama de código a mantener para un caso que el agrupamiento ya cubre solo, sin ninguna diferencia observable.
- **No se tocó `solapamientoEsperado()`** — sigue siendo la aproximación uniforme (`n²/tamaño_banco`) que ya usaba el panel del docente antes de abrir la sesión; ajustarla a la estratificación queda fuera de alcance porque el docente todavía no ve el desglose por competencia de su banco al configurar la sesión.

## Riesgos

- **Bancos con una competencia mucho más grande que las demás** — el resto mayor puede dejar competencias pequeñas con cupo 0 si su proporción no alcanza ni un cupo entero. Es el comportamiento correcto (no se le puede garantizar representación a un grupo de una sola pregunta cuando se sortean 20), y sigue siendo mejor que el sorteo puramente uniforme anterior, que también podía dejarlas en 0 pero sin ninguna garantía sobre las demás.
- **Rendimiento** — agrupar y repartir cuotas es lineal sobre el banco; el test de rendimiento de la 005 (bajo 50 ms con 50 preguntas) se mantuvo sin tocar y sigue pasando.
