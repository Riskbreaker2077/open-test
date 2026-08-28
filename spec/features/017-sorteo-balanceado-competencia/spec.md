# 017 · Sorteo balanceado por competencia

**Estado:** implementado ✅

## Qué hace

El motor de personalización ([005 · Motor de personalización](../005-motor-personalizacion/spec.md)) sorteaba `n_preguntas` uniformemente sobre el banco entero. Desde la 016 cada pregunta trae su `competencia` (metadata obligatoria del estándar preguntas-icfes), y esta feature hace que el sorteo la use: reparte las preguntas de la prueba entre las competencias presentes en el banco, en proporción al tamaño de cada una, en vez de dejarlo puramente al azar.

Con un banco balanceado (mismo número de preguntas por competencia), cada intento cubre las competencias en la misma proporción exacta. Con un banco desbalanceado, el reparto sigue proporcional al tamaño de cada grupo, así que ninguna competencia queda sistemáticamente sub- o sobre-representada por azar.

Un banco sin metadata de competencia (anterior a la 016, o reimportado sin ella) cae entero en un único grupo: el sorteo se comporta exactamente como antes, uniforme sobre todo el banco.

## Por qué

Nota informal en `/home/camilo/projects/notas.md` (fuera de las specs formales): la motivación original de que el estándar preguntas-icfes tratara `competencia` como campo obligatorio por pregunta era justamente poder balancear el sorteo por ella. La 016 dejó el dato disponible; esta feature lo usa.

Sin esto, dos estudiantes con el mismo tamaño de banco podían recibir pruebas con cobertura de competencias muy distinta por puro azar — uno con seis preguntas de lectura y ninguna de matemáticas, otro al revés — lo que hace menos comparable el puntaje entre estudiantes de un mismo grupo.

## Criterios de aceptación

- [x] Con un banco donde todas las competencias tienen el mismo tamaño, cada intento recibe exactamente la misma cantidad de preguntas de cada competencia (no solo "en promedio").
- [x] Con un banco de competencias de tamaño desigual, el reparto es proporcional al tamaño de cada grupo (método del resto mayor), y ningún grupo recibe más cupos de los que tiene preguntas.
- [x] Un banco sin `competencia` (o con todas las preguntas en la misma competencia, típico de un banco anterior a la 016) se sortea exactamente como antes de esta feature: al azar sobre todo el conjunto.
- [x] El sorteo sigue siendo determinista: la misma semilla y el mismo banco producen siempre la misma prueba.
- [x] Se conservan todos los criterios de aceptación de la 005 (sin repetidas, todas del banco, permutación exacta de opciones, rendimiento bajo 50 ms, banco corto falla con error claro).

## Fuera de alcance

- Balancear también por `componente` u otra metadata pedagógica: solo `competencia`, que es lo que pidió la nota original.
- Cambiar `solapamientoEsperado()` (el aviso de tamaño de banco al docente) para que tenga en cuenta la estratificación: sigue siendo la aproximación uniforme anterior.
- Mostrar en el panel del docente el reparto por competencia de una sesión ya sorteada.
