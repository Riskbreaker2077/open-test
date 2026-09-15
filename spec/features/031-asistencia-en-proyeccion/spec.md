# 031 · Asistencia en la pantalla de proyección

**Estado:** implementado ✅

## Qué hace

La pantalla de proyección (feature 012) gana un panel de **asistencia** con dos listas, actualizadas solas cada 5 s:

- **Faltan por entrar**: los estudiantes convocados (por los cursos de la evaluación) que todavía no han entrado.
- **Conectados**: los que ya entraron, marcando cuáles ya entregaron.

Cada estudiante aparece con **nombre y apellido** y su curso cuando la evaluación convoca a más de uno. El panel se ve durante toda la evaluación, en cualquier estado.

Sigue sin mostrar notas, puntajes, preguntas, respuestas, avance ni pregunta actual: solo quién está y quién falta.

## Por qué

Lo pidió el docente en el uso real (15/09/2026): en los primeros minutos, la pregunta que más se repite es "¿quién falta?", y hoy la respuesta vive en el panel de monitoreo, que obliga a dejar de proyectar o a tener dos pantallas. Con la lista proyectada, el propio grupo ve a quién le falta escanear el QR y el docente no tiene que salir de la proyección.

Es una decisión consciente contra la regla original de la 012 ("nada de nombres"): el docente eligió la lista completa, por encima de la variante mínima (solo los que faltan, antes de comenzar). Se corrige la constitución primero (`mission.md`).

## Criterios de aceptación

- [x] `GET /api/docente/proyeccion/:sesionId` devuelve `asistencia.faltan` y `asistencia.conectados`, cada estudiante con `nombre` y `curso`; los conectados además con `entregado` (booleano). _(test de API.)_
- [x] Solo cuenta a los convocados: un estudiante de un curso que la evaluación no convoca no aparece en ninguna lista.
- [x] La respuesta de proyección **sigue sin contener** puntajes, aciertos, preguntas, respuestas, pregunta actual ni códigos de estudiante.
- [x] Las listas vienen ordenadas por apellido y nombre, igual que el monitoreo.
- [x] La pantalla muestra ambas listas con su recuento; cuando no falta nadie lo dice ("Ya entraron todos").
- [x] Los que ya entregaron se distinguen de los que siguen presentando por algo más que el color.
- [x] Las listas se actualizan con la sincronización existente, sin recargar.
- [x] Con 40 convocados, la pantalla sigue sin barras de desplazamiento a 1024×768 y a 1920×1080; el QR y el reloj siguen siendo los elementos dominantes. _(capturas en Chromium headless con 40 convocados en 10A/10B, al inicio —4 dentro— y avanzada —34 dentro, 10 entregados—.)_
- [ ] Legibilidad real de las listas desde el fondo del aula con el proyector del colegio. _(pendiente de verificación física.)_
- [x] La pantalla sigue exigiendo sesión de docente (sin cambios en la protección).

## Fuera de alcance

- Mostrar avance, pregunta actual o notas en la proyección: siguen solo en el monitoreo (008).
- Una opción para ocultar el panel desde la interfaz: si el uso real la pide, será otra feature.
- Forzar entregas o cualquier acción sobre un estudiante desde la proyección.
