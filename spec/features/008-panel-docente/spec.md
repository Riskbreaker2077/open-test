# 008 · Panel del docente

**Estado:** propuesta

## Qué hace

Mientras el examen transcurre, el docente tiene en su portátil una vista de la sesión abierta: quiénes han entrado, por qué pregunta va cada uno, cuánto tiempo les queda y quiénes ya entregaron. La vista se actualiza sola.

Desde ahí puede **forzar la entrega** de un estudiante concreto —la tablet se quedó bloqueada, el estudiante se fue sin entregar— y **cerrar la sesión**, lo que entrega automáticamente a todo el que siga presentando y deja los resultados listos para descargar.

También reúne en un solo sitio la URL que se dicta a las tablets y el recuento de quién falta por entrar.

## Por qué

El docente necesita saber si el examen está yendo bien sin recorrer treinta tablets. Dos preguntas concretas se responden solo aquí: *¿entraron todos?* —el que no aparece probablemente no está en la lista o escribió mal su código, y se puede resolver en el momento— y *¿puedo cerrar ya?*, que hoy significaría ir preguntando uno a uno.

Es también el contrapeso práctico a que el login no tenga contraseña: ver el nombre de quién está presentando en cada puesto hace visible la suplantación.

## Criterios de aceptación

- [ ] El panel permite elegir entre las sesiones abiertas o en curso, ya que puede haber varias, y muestra la elegida con su nombre, banco, cursos y parámetros.
- [ ] Enlaza a la pantalla de proyección (feature [012](../012-pantalla-proyeccion/spec.md)), que es donde viven el QR y el reloj para el aula.
- [ ] Exige sesión de docente (feature [011](../011-autenticacion-docente/spec.md)): sin contraseña no es alcanzable desde una tablet.
- [ ] Lista los estudiantes convocados con su estado: `sin entrar`, `presentando` o `entregado`.
- [ ] De quien está presentando, muestra por qué pregunta va y cuánto tiempo le queda.
- [ ] De quien entregó, muestra su puntaje, su porcentaje y el motivo de entrega.
- [ ] Muestra los contadores agregados: convocados, dentro, entregados, sin entrar.
- [ ] La vista se actualiza sola al menos cada 5 segundos, sin que el docente recargue.
- [ ] Se puede forzar la entrega de un estudiante concreto, con confirmación; queda con `motivo_entrega = "forzada_docente"`.
- [ ] Se puede cerrar la sesión, con confirmación que indica cuántos siguen presentando.
- [ ] Al cerrar la sesión, todos los intentos vivos se entregan y se califican automáticamente.
- [ ] Una vez cerrada, ningún estudiante puede entrar ni responder.
- [ ] El panel funciona con 40 estudiantes presentando a la vez sin degradarse de forma perceptible.
- [ ] Si no hay ninguna sesión abierta, el panel lo dice y ofrece crear una, en lugar de mostrarse vacío.

## Fuera de alcance

- La descarga de resultados (feature 009), aunque el panel enlace a ella.
- Estadísticas por pregunta o análisis de dificultad (backlog).
- Alertas de inactividad y análisis de ritmo por estudiante (backlog).
- Cualquier forma de intervenir en el examen de un estudiante más allá de forzar su entrega.
