# 045 · El portal solo muestra evaluaciones abiertas

**Estado:** implementado ✅

## Qué hace

Hasta ahora, al escribir su código en el portal, el estudiante veía también las evaluaciones **ya cerradas en las que había entregado** y podía volver a entrar a cualquiera de ellas para ver otra vez su nota y la retroalimentación. Eso se decidió en la 004/013 ("si ya entregó, ve su resultado"), pero choca con `tech-stack.md` ("un estudiante que ya entregó no puede volver a entrar") y el docente lo reportó como un problema: las pruebas presentadas no deben quedar consultables desde el portal.

Ahora:

1. La lista del portal muestra **solo evaluaciones abiertas, en curso o en pausa** de su curso, y **excluye las que ese estudiante ya entregó**, aunque sigan abiertas.
2. Intentar entrar a una evaluación ya entregada (por ejemplo, con una petición hecha a mano) se rechaza con **"Ya entregaste esta prueba."**
3. El resultado se sigue viendo **en el momento de entregar**, en esa misma tablet, igual que hoy. Si el estudiante abre el portal con la cookie de una prueba que ya entregó (cerró la pestaña y volvió, o es otro estudiante en la misma tablet), el portal cierra esa sesión y pide el código otra vez, en vez de llevarlo al resultado.

Revisa el criterio "si ya entregó, ve su resultado" de la 004 y la 013.

## Criterios de aceptación

- [x] `POST /api/examen/sesiones` no devuelve sesiones cerradas, ni siquiera aquellas en las que el estudiante entregó. _(test de servicio y de API)_
- [x] Tampoco devuelve una sesión abierta o en curso en la que el estudiante ya entregó; otro estudiante del mismo curso sí la ve. _(test)_
- [x] `POST /api/examen/entrar` a una sesión en la que ya entregó responde 409 con "Ya entregaste esta prueba." y no renueva el token. Vale también para una prueba anulada. _(tests de API)_
- [x] Entregar sigue llevando a `resultado.html`, y el resultado sigue disponible con la cookie de esa entrega. _(test de API y recorrido en Chrome sin cabeza)_
- [x] Abrir `/` con la cookie de un intento entregado cierra esa sesión y muestra el paso del código. _(recorrido en Chrome sin cabeza: `/api/examen/estado` pasa a 401 y queda visible `#paso-codigo`)_
- [x] Si no queda ninguna prueba disponible, el portal dice que no hay ninguna prueba abierta para su curso (mensaje existente). _(recorrido en Chrome sin cabeza)_

## Fuera de alcance

- Borrar el intento o su resultado: la nota queda intacta para el docente (resultados, exportación, portal).
- `resultado.html` cargado a mano con la cookie de la entrega recién hecha sigue funcionando: es la misma pantalla que se ve al entregar.
