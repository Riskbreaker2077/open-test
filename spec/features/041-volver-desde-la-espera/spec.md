# 041 · Volver desde la sala de espera y mínimo de 45 s

**Estado:** implementado ✅ _(pendiente de verificación en tablet real)_

## Qué hace

Dos ajustes pedidos tras usar la 1.4.0 en el aula:

1. **Volver desde la espera.** En el portal, la pantalla "Espera a que tu docente inicie la prueba" no tenía salida: si el estudiante escribió mal su código (y entró con el de un compañero) o eligió la evaluación equivocada, recargar lo devolvía a la misma espera, porque la cookie seguía viva. Ahora esa pantalla tiene un botón **Volver al inicio** que cierra su sesión en esa tablet (el mismo `POST /api/examen/salir` de la 033) y lo deja en el paso "Escribe tu código", listo para escribir otro. El botón aparece en todas las pantallas de mensaje del portal (espera, pausa, evaluación cerrada, ninguna prueba abierta) y en la lista para elegir evaluación, que tampoco tenían salida.
2. **Tiempo mínimo por pregunta por defecto: 45 s** (antes 60 s, desde la 031). Solo cambia el valor con el que arranca el formulario de una evaluación nueva y el de `POR_DEFECTO`; las evaluaciones ya creadas conservan el suyo y el docente lo sigue pudiendo cambiar.

## Por qué

1. Un estudiante atrapado en la espera con el código de otro ocupa el cuadro de su compañero en el tablero y obliga al docente a intervenir.
2. Decisión del docente: 60 s por pregunta resultó demasiado.

## Criterios de aceptación

- [x] La espera del portal muestra **Volver al inicio**; al pulsarlo se detiene el sondeo, se borra la cookie del estudiante y aparece el paso del código con el campo vacío. _(test de API para `salir` en espera; recorrido en Chrome sin cabeza)_
- [x] Tras volver, el mismo estudiante puede entrar otra vez a la misma evaluación y recupera **el mismo intento** (misma prueba sorteada); otro estudiante puede entrar con su propio código en esa tablet. _(test de API)_
- [x] En la proyección, quien vuelve desde la espera queda en rojo ("salió"), igual que con "Salir" de la 031: entró y se fue. Si vuelve a entrar, pasa a verde. _(test de API)_
- [x] La lista de evaluaciones y los demás mensajes del portal también tienen **Volver al inicio**.
- [x] Una evaluación nueva propone 45 s de tiempo mínimo por pregunta, tanto en el formulario como si la API la crea sin ese campo. _(test de API)_
- [ ] Recorrido en tablet real.

## Fuera de alcance

- Borrar el intento al volver. Se crea (y se sortea su prueba) al entrar; conservarlo es inofensivo y hace que el tablero diga la verdad: alguien entró con ese código.
- La espera dentro de `examen.html` (solo se ve si alguien abre esa dirección a mano antes de que empiece la prueba).
- Cambiar el mínimo de las evaluaciones ya creadas.
