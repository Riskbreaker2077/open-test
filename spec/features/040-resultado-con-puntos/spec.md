# 040 · Resultado con puntos y pergamino

**Estado:** implementado ✅

## Qué hace

Rediseña la pantalla de resultado del estudiante (007) para los niveles de retroalimentación `aciertos` y `completo`:

- En lugar de una lista larga de tarjetas, el estudiante ve una **rejilla de puntos numerados**, uno por pregunta: **verde** si acertó, **rojo** si falló, **gris** si la saltó o no alcanzó a verla. Debajo, una leyenda breve.
- Al tocar un punto se abre una **pantalla nueva con diseño de pergamino** que muestra esa pregunta y su retroalimentación, con un botón **"Volver a mis resultados"** (el botón atrás de la tablet hace lo mismo) y flechas para pasar a la pregunta anterior o siguiente.
  - En `aciertos`: contexto, enunciado, lo que respondió y si acertó — **sin revelar la correcta**.
  - En `completo`: la pregunta entera con la opción correcta marcada y la justificación de cada opción.
- **Puntaje perfecto** (todas acertadas), en cualquier nivel incluido `solo_puntaje`: el puntaje aparece en **letras doradas** con una animación de celebración (cuenta ascendente, brillo metálico que recorre las letras, halo, estallido de chispas) y los puntos se vuelven **dorados y brillantes**. Encima del puntaje sale un mensaje de felicitación elegido al azar de una lista fija; **cada estudiante conserva el suyo**: si vuelve a entrar a ver su resultado, ve el mismo mensaje.

## Por qué

Con 20 o 30 preguntas, la lista actual obliga a bajar mucho para encontrar lo que el estudiante quiere revisar, y el resultado global se pierde. Una rejilla de colores se lee de un vistazo y convierte la revisión en algo que el estudiante elige hacer. La celebración del puntaje perfecto premia el esfuerzo en el momento en que más significa.

## Criterios de aceptación

### Rejilla
- [x] Con `aciertos` y `completo` aparece un punto por pregunta, numerado según el orden de la prueba.
- [x] Verde = acertada, rojo = fallada, gris = saltada o sin llegar; el estado también se anuncia en texto accesible ("Pregunta 3: fallada").
- [x] Hay una leyenda de los tres colores.
- [x] Los puntos tienen tamaño táctil (≥ `--toque`).
- [x] Con `solo_puntaje` no hay rejilla.

### Pergamino
- [x] Tocar un punto abre una pantalla aparte con esa pregunta, con aspecto de pergamino, sin volver a consultar el servidor.
- [x] "Volver a mis resultados" y el botón atrás del navegador regresan a la rejilla.
- [x] "Anterior" / "Siguiente" navegan entre preguntas sin pasar por la rejilla.
- [x] En `aciertos` el pergamino **no** muestra la correcta; en `completo` la muestra con las justificaciones.
- [ ] Imágenes, tablas y grupos (emparejamiento) se siguen leyendo bien sobre el pergamino. _(Pendiente: las capturas se hicieron con preguntas de solo texto; los estilos de tabla y opción sobre pergamino están, pero no se observaron con imágenes ni con un grupo real.)_

### Celebración
- [x] Con todas acertadas, en cualquier nivel, el puntaje sale dorado y animado.
- [x] El mensaje de felicitación es uno de: "Excellent!", "Felicitaciones", "¡Buena!", "¡Increíble!", "¡Magnánimo!", "¡Máaaaagicoooo!", "Cooooooool", "Me encanta <3", "¡El/La mejor!", "Booooonoooo para empanadaaaaa".
- [x] El mensaje varía entre estudiantes y es siempre el mismo para el mismo estudiante en la misma evaluación (recargar o volver a entrar no lo cambia).
- [x] Con todas acertadas, todos los puntos son dorados y brillan.
- [x] Con `prefers-reduced-motion`, se ve el estado dorado final sin animación. _(revisado en código: sin chispas ni rayos ni cuenta ascendente, y la regla global de `base.css` reduce el resto a su estado final; no se emuló en navegador.)_
- [x] Sin puntaje perfecto, no hay celebración.

### Límites
- [x] Sin cambios en la API ni en lo que el servidor revela por nivel.
- [x] Sin red, sin fuentes externas, sin dependencias nuevas.
- [x] Una prueba anulada (038) sigue mostrando su aviso, sin rejilla (el servidor no manda detalle) y sin celebración aunque el total coincidiera. _(test de `esPerfecto`)_
- [x] "Volver al inicio" y la vuelta automática al examen si el docente deshace la anulación (038) se conservan.
