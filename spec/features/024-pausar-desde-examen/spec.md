# 024 · Pausar la evaluación desde el examen del estudiante

**Estado:** implementado ✅

## Qué hace

Agrega un botón **"Pausar y salir"** en la pantalla del examen del
estudiante. Al pulsarlo (tras una confirmación explícita), el servidor
marca la sesión como `pausada` — el mismo estado al que la lleva la
docente desde el panel—, borra la cookie del estudiante en esa tablet y
lo devuelve al portal. El intento del estudiante queda intacto: cuando
la docente reanude la sesión y el estudiante vuelva a entrar con su
código, retoma exactamente donde iba.

El botón existe en paralelo a "Guardar y terminar" / "Saltar y terminar"
de la última pregunta (que sí cierran el intento, característica 021) y
al lado de los botones de navegación de cualquier otra pregunta.

## Por qué

Antes, el estudiante que necesitaba ausentarse unos minutos (baño,
malestar, batería, lo que fuera) sólo tenía la opción de cerrar la
tablet y dejar la pantalla a la vista de todos: el reloj seguía
corriendo, el intento quedaba abierto, y dependía de la buena fe de
la docente no cerrar la sesión antes de que volviera. Eso convertía un
incidente menor en una decisión de carrera: ¿entrego o me espero?

Ahora, el estudiante tiene una salida limpia y consciente: pausa la
evaluación para todos — todos ven el aviso "La prueba está en pausa" en
su pantalla y el reloj se congela—, sale del aula si necesita, y vuelve
a entrar cuando la docente reanuda. La docente, por su parte, no tiene
que adivinar qué pasó: la sesión está `pausada` con un timestamp en
`pausada_en` que ya se muestra en el panel de monitoreo.

## Criterios de aceptación

### Cliente (portal del estudiante)

- [x] La pantalla del examen tiene un nuevo botón **"Pausar y salir"**
      visible en cualquier pregunta, debajo de la fila de navegación
      (`Anterior` / `Saltar` / `Siguiente`) y al lado del contador de
      tiempo mínimo.
- [x] El botón es del mismo estilo visual que tenía antes el botón
      "Terminar la prueba" (texto, color de error, subrayado) para
      que el docente y el estudiante lo identifiquen como acción
      excepcional, no como un botón más de navegación.
- [x] Al pulsarlo se muestra un `window.confirm` con el texto:
      *"Vas a pausar la evaluación para todos. ¿Continuar?"*
- [x] Si el estudiante cancela el confirm, no pasa nada: sigue en la
      misma pregunta, sin recargar.
- [x] Si el estudiante acepta, el cliente hace
      `POST /api/examen/pausar` y, si el servidor responde 200,
      redirige a `/`. Si responde con error, muestra el mensaje del
      servidor en `#error`.
- [x] El botón está deshabilitado mientras hay una operación en vuelo
      (mismo patrón que el resto: `ocupada` en `actualizarBloqueo`).

### Servidor

- [x] Nueva ruta `POST /api/examen/pausar` detrás del middleware
      `conIntento(db)` (la misma protección por cookie que el resto de
      `/api/examen/*`).
- [x] La ruta pausa la sesión del intento asociado al token de la
      cookie. Si la sesión ya está `pausada`, es **idempotente**: no
      lanza 409 y devuelve 200 igualmente.
- [x] La ruta siempre limpia la cookie `opentest_estudiante` de la
      tablet, incluso si la pausa falla por una condición inesperada
      (defensa: si el estudiante tocó el botón, ya no queremos que esa
      tablet siga mandando respuestas a un intento que no le
      corresponde).
- [x] Si la sesión está en cualquier otro estado (`borrador`,
      `abierta`, `cerrada`) — algo que no debería pasar si el cliente
      está en la pantalla de examen, pero que el servidor debe
      validar—, devuelve **409** con un mensaje claro: *"No se puede
      pausar una evaluación en estado X."*
- [x] La ruta no exige contraseña de docente. La autenticación es la
      misma que para responder una pregunta: la cookie del estudiante
      basta. Esto es deliberado: la pausa es una acción del
      estudiante, no del docente.

### Reanudar la sesión después

- [x] Cuando la docente pulsa **"Reanudar"** desde el panel (acción
      existente, `POST /api/docente/sesiones/:id/reanudar`), la sesión
      pasa a `en_curso` y todos los estudiantes que vuelvan a entrar
      con su código reanudan su intento exactamente donde lo
      dejaron. Esto ya estaba cubierto por la 008; la 024 no lo
      duplica.

### Lo que NO hace

- No es una pausa "por estudiante" con reloj individual: la pausa es
  global y el reloj se congela para todos. La 005/006/008 ya
  establecieron que el reloj es de sesión, no de intento.
- No requiere confirmación del docente. Cualquier estudiante puede
  pausar la evaluación para todos los demás — es un botón de
  emergencia, no una función administrativa. El copy del confirm
  deja eso explícito.
- No permite "salir sin entregar" sin pausar: si la sesión está
  cerrada (`cerrada`) o nunca se abrió (`borrador`/`abierta`), la
  ruta rechaza con 409. El estudiante que entre a una sesión que no
  está en curso no ve la pantalla de examen, así que no llega al
  botón.
- No introduce un nuevo estado. Reusa el `pausada` que ya existe.