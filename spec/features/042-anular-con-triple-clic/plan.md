# 042 · Anular con triple clic — Plan

## Enfoque

Solo cambia el cliente de la proyección. La API (`POST`/`DELETE
/api/docente/intentos/:id/anular`), la base, la calificación y el exportador
de la 038 quedan intactos.

1. `public/proyeccion/triple-clic.js` — contador puro
   `crearContadorDeClics({ clics = 3, ventanaMs = 600 })` que recibe
   `(clave, instante)` y devuelve `true` al completar la serie. Cuenta por
   **clave de estudiante** (su `intentoId`, o nombre + curso si no ha entrado)
   y no por elemento: `pintarAsistencia` reconstruye los cuadros con
   `replaceChildren` cada vez que cambia la asistencia, así que un
   `event.detail` del navegador o un contador guardado en el nodo se perdería
   si alguien se conecta entre el primer y el tercer clic.
2. `public/proyeccion/index.html` — un `<dialog id="confirmar-anulacion">` con
   el texto de la pregunta y los botones **Anular la prueba** / **Cancelar**,
   dentro de un `<form method="dialog">` para que Esc y Cancelar lo cierren sin
   JavaScript extra. `showModal()` lo centra y bloquea el resto de la pantalla.
3. `public/proyeccion/proyeccion.js` — el cuadro escucha `click` y pasa por el
   contador; al completarse, `alternarAnulacion` abre el `<dialog>` en vez de
   `window.confirm`. El `<dialog>` devuelve una promesa que resuelve `true`
   solo con el botón de confirmar.
4. `public/proyeccion/proyeccion.css` — estilo del cuadro flotante acorde con
   la proyección (fondo claro, letra grande con `vmin`, botón rojo para anular
   y botón secundario para cancelar; el botón de revertir no es rojo).

## Decisiones

- **Triple clic reemplaza al doble**: no pueden convivir, porque todo triple
  clic dispara antes un `dblclick`.
- **600 ms entre clics**: el umbral habitual de doble clic de Windows es
  500 ms; un poco más de margen evita que un docente pausado no llegue a
  tres, y sigue siendo imposible completar la serie con toques sueltos.
- **`<dialog>` nativo, sin librerías**: ya se usa en la 020 y la 028, no añade
  dependencias ni paso de build y trae foco atrapado y Esc de serie.

## Riesgos

- **Pantallas táctiles**: los toques también generan `click`, así que el
  gesto funciona igual. Se mantiene `user-select: none` para que el triple
  clic no seleccione el nombre.
