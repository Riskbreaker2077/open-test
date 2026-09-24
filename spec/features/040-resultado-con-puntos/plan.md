# 040 · Resultado con puntos y pergamino — Plan

_Cómo se implementa lo descrito en `spec.md`. Debe respetar la `constitution/`._

## Enfoque

Todo en el frontend del estudiante (`public/estudiante/resultado.*`). La API (`GET /api/examen/resultado`, `armarResultado` en `server/services/calificacion.js`) ya devuelve por pregunta `orden` y `estado` en `aciertos`/`completo`, y `aciertos`/`total` en todos los niveles: no se toca, así que la frontera de lo que se revela por nivel (tests de `examen.presentacion.test.js`) queda intacta.

## Convivencia con la 038

La 038 (anular la prueba) ya había tocado esta pantalla: aviso de anulación, botón "Volver al inicio" que cierra la sesión del estudiante y sondeo que devuelve la tablet al examen si se deshace la anulación. Todo eso se conserva tal cual; `esPerfecto` excluye explícitamente las pruebas anuladas, y la regla que pinta el puntaje en rojo se ajusta a que el puntaje ahora vive dentro de `.puntaje-marco`.

## Vistas

Una sola página y un solo `fetch`. `resultado.html` tiene dos vistas: `#vista-resumen` (tarjeta del puntaje + rejilla) y `#vista-pergamino`. El cambio se hace con `location.hash` (`#pregunta-7`) y el evento `hashchange`: el botón atrás de la tablet funciona igual que "Volver". Al volver se restaura el scroll y el foco en el punto tocado.

El contenido del pergamino reutiliza la lógica actual de `tarjetaDe()` (render completo con `renderizarPregunta` + `mostrarJustificacion`, o resumen en texto para `aciertos`).

## Lógica pura

`public/estudiante/resultado-logica.js` (sin DOM): `esPerfecto(resultado)`, `claseDePunto(estado)`, `etiquetaDeEstado(estado)`, `ordenDesdeHash(hash, total)`. Se prueba con `node:test`; el glob de `npm test` se amplía a `public/**/*.test.js`, lo que además hace correr `public/shared/pregunta.test.js`, que hoy no corría.

## Estilo

- Pergamino solo con CSS: gradientes radiales para manchas y bordes envejecidos, `box-shadow` interior, rollos arriba y abajo con pseudo-elementos, tipografía serif del sistema (`"Palatino Linotype", Palatino, "Book Antiqua", Georgia, serif`), sello de lacre con el número. Las opciones van sobre papel más claro para que imágenes y tablas sigan legibles.
- Dorado: `background-clip: text` con un degradado metálico que se desplaza, `text-shadow` pulsante, aparición con escala. Chispas: ~40 `<span>` generados por JS con variables CSS aleatorias, animadas con `transform`/`opacity`. Puntos dorados con brillo en cascada (`animation-delay` por índice).
- `prefers-reduced-motion: reduce`: sin animaciones ni chispas; estado dorado final.

Sin dependencias ni recursos externos.

## Mensaje de felicitación

El mensaje se elige con un hash (FNV-1a) de `estudiante|sesion|entregadoEn`, tres campos que `obtenerResultado` ya devuelve y que no cambian después de la entrega. Así se "guarda" para el estudiante sin columna nueva ni migración: la misma entrega da siempre el mismo mensaje, y estudiantes distintos reciben mensajes repartidos. La lista y la función (`mensajeDeFelicitacion`) viven en `resultado-logica.js` con sus tests.
