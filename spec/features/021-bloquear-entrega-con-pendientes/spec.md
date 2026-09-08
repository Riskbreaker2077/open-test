# 021 · Bloquear entrega con preguntas pendientes

**Estado:** implementado ✅

## Qué hace

Quita del examen del estudiante la posibilidad de cerrar el intento mientras
queden preguntas sin responder, por ninguno de los dos caminos que existían:

1. El botón explícito **"Terminar la prueba"** ya no aparece.
2. En la última pregunta, los botones **"Saltar y terminar"** y
   **"Guardar y terminar"** se siguen mostrando (siguen siendo la forma de
   cerrar la prueba cuando todas están respondidas), pero si el estudiante
   intenta usarlos cuando aún queda alguna sin responder, el servidor rechaza
   la entrega con un mensaje claro y el intento sigue abierto.

La regla se aplica en el servidor: aunque la tablet fabrique una petición
`POST /api/examen/entregar` con `motivo: 'manual'` o `'ultima_pregunta'`
mientras `sinResponder > 0`, la respuesta es **409** y el intento queda
intacto. Los motivos **legítimos** del sistema —el cierre por vencimiento
del reloj (`tiempo`) y la entrega forzada por el docente
(`forzada_docente`)— no se ven afectados: cuentan como respondidas las
preguntas que el estudiante llegó a abrir y respondidas; las que ni siquiera abrió cuentan como saltadas.

## Por qué

El requisito original de la 006 decía "el estudiante puede terminar la
prueba en cualquier momento". Eso era útil comosalida de emergencia para tablets que se
quedan sin batería o alumnos que se sienten mal a mitad del examen, pero
en la práctica se convirtió en el camino común para entregar a medias,
dejar 8 de 20 en blanco y obtener 12/20 sin esfuerzo. Eso degrada la
señal que mide la evaluación. La integridad del examen —que es el
producto entero, no un detalle— se defiende mejor si la única salida
limpia es haber pasado por todas las preguntas.

El servidor endurecido garantiza que la regla se cumpla aunque alguien
manipule la tablet, simule el clic o intente saltarse la UI.

## Criterios de aceptación

### Cliente (portal del estudiante)

- [x] La pantalla del examen **no muestra** el botón "Terminar la prueba"
      que existía en la esquina inferior.
- [x] En cualquier pregunta intermedia, los tres botones de navegación
      son **Anterior**, **Saltar** y **Siguiente**, sin etiquetas
      alternativas.
- [x] En la última pregunta, los botones mantienen su rol:
      - **"Guardar y terminar"** sigue deshabilitado si no hay opción
        elegida.
      - **"Saltar y terminar"** sigue disponible: salta esta pregunta y
        entrega (si todas las demás están respondidas).
- [x] Si el estudiante usa "Saltar y terminar" o "Guardar y terminar" en
      la última pregunta pero aún quedan pendientes, ve un mensaje en
      pantalla con la cuenta de preguntas sin responder y la instrucción
      de revisar las anteriores usando **Anterior**. El intento **no** se
      cierra.
- [x] El reloj, la pausa, el guardado inmediato y la reanudación tras
      cerrar la tablet siguen funcionando igual.

### Servidor

- [x] `POST /api/examen/entregar` rechaza con **409** y mensaje en
      español si el motivo es `'manual'` o `'ultima_pregunta'` y
      `sinResponder > 0`. El mensaje nombra la cantidad pendiente:
      *"Aún te quedan N pregunta(s) sin responder."*
- [x] `POST /api/examen/entregar` con `motivo: 'ultima_pregunta'` sigue
      exigiendo que el estudiante esté viendo la última pregunta (regla
      existente, no se relaja).
- [x] Los motivos generados por el sistema (`tiempo`,
      `forzada_docente`) **bypasean** esta comprobación: si se acaba el
      reloj o el docente fuerza el cierre, el intento se cierra igual
      aunque haya preguntas sin responder. Las preguntas que el
      estudiante **abrió** cuentan como respondidas (con o sin opción);
      las que ni siquiera abrió se cuentan como saltadas y obtienen 0.
- [x] La API nunca revela cuál es la respuesta correcta de una pregunta
      no respondida (no cambia nada aquí, pero se sigue cumpliendo).

### Fuera de alcance

- Cambiar la calificación de las preguntas saltadas (siguen contando 0 sobre el
  total): no se premia al estudiante que deja en blanco; simplemente no
  suma acierto. Si más adelante se quiere premiar el intento completo,
  va como feature aparte.
- Impedir al docente cerrar la sesión con intentos sin entregar: ya
  puede, con "Entrega forzada" desde el panel.
- Mostrar durante el examen un contador visible de "te quedan N sin
  responder": el estado ya lo expone, pero mostrarlo siempre cambia el
  comportamiento del estudiante (lo empuja a responder al tuntún para
  vaciar el contador). Se prefiere el mensaje explícito sólo cuando
  intenta cerrar.
- Migrar los requisitos originales: la línea 65 de la matriz de
  trazabilidad del `roadmap.md` se actualiza para reflejar la nueva
  semántica, pero no se reabre la 006.