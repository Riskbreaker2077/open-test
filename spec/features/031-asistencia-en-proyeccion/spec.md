# 031 · Asistencia en la pantalla de proyección

**Estado:** implementado ✅ _(rediseño del 15/09/2026: de dos listas a un tablero de cuadros por estudiante)_

## Qué hace

La pantalla de proyección (feature 012) muestra un **tablero de asistencia**: un cuadro por cada estudiante convocado (por los cursos de la evaluación), con su **nombre y apellido**. El color del cuadro dice en qué está:

| Cuadro | Significa |
|---|---|
| **Blanco** | Todavía no ha entrado. |
| **Verde** | Entró y su tablet sigue conectada. |
| **Rojo** | Entró, pero salió: tocó "Salir", o su tablet dejó de comunicarse con el servidor (se cerró, perdió el wifi, cambió de aplicación). |
| **Verde con ✓** | Ya entregó. Se queda en verde aunque después cierre la tablet. |

Si un estudiante en rojo vuelve a entrar, su cuadro vuelve a verde. El tablero se actualiza solo cada 5 s, durante toda la evaluación.

Sigue sin mostrar notas, puntajes, preguntas, respuestas, avance ni códigos de estudiante.

## Por qué

Lo pidió el docente en el uso real (15/09/2026). En los primeros minutos la pregunta es "¿quién falta?" y, durante la prueba, "¿quién se salió?". Hoy las dos respuestas viven en el panel de monitoreo, que no se proyecta. Con el tablero en la misma pantalla del QR, el docente las ve de un vistazo sin dejar de proyectar.

Es una decisión consciente contra la regla original de la 012 ("nada de nombres"). La primera versión de esta feature mostraba dos listas (faltan / conectados); el docente la corrigió a este tablero de colores, que además distingue a quien salió.

## Criterios de aceptación

- [x] `GET /api/docente/proyeccion/:sesionId` devuelve `estudiantes`: uno por convocado, con `nombre`, `curso` y `estado` ∈ `sin_entrar`, `conectado`, `desconectado`, `entregado`.
- [x] Solo cuenta a los convocados; se ordenan por apellido y nombre, igual que el monitoreo.
- [x] Un estudiante que entra aparece `conectado`. Cualquier petición autenticada de su tablet (el sondeo de 5 s del examen o de la sala de espera) renueva esa marca.
- [x] Pasa a `desconectado` al tocar "Salir", o cuando su tablet lleva más de **15 s** sin comunicarse. _(umbral en `presencia.test.js`; "Salir" en el test de API.)_
- [x] Un estudiante que entregó aparece `entregado` sin importar su conexión.
- [x] La respuesta de proyección **sigue sin contener** puntajes, aciertos, preguntas, respuestas, pregunta actual ni códigos de estudiante.
- [x] La pantalla pinta un cuadro por estudiante: blanco, verde o rojo según el estado; el entregado, verde con ✓. Una leyenda explica los colores.
- [x] Con 40 convocados, la pantalla sigue sin barras de desplazamiento a 1024×768 y a 1920×1080; el QR y el reloj siguen visibles y grandes. _(capturas en Chromium headless con los cuatro estados.)_
- [x] La pantalla sigue exigiendo sesión de docente.
- [ ] Legibilidad real de los cuadros desde el fondo del aula con el proyector del colegio. _(verificación física.)_

## Fuera de alcance

- Guardar el historial de conexiones o mostrarlo en los resultados: la conexión vive en memoria y no se exporta.
- Avance, pregunta actual o notas en la proyección: siguen solo en el monitoreo (008).
- Acciones sobre un estudiante desde la proyección.
