# 019 · Estadísticas por pregunta y por competencia

**Estado:** implementado ✅

## Qué hace

Una nueva pantalla del panel del docente, `/docente/estadisticas.html`, que muestra qué preguntas y qué competencias falla más el grupo, para que el docente sepa qué revisar del banco o qué reforzar en clase.

El docente elige:

1. **Un banco** de preguntas.
2. **El alcance**: una sesión cerrada concreta que usó ese banco, o **todas** las sesiones cerradas que lo han usado, acumuladas.
3. Opcionalmente, **un curso**, para ver solo ese grupo dentro del alcance elegido.

Con eso, dos tablas:

- **Por pregunta** — enunciado (recortado), competencia, veces mostrada, % de acierto, % de saltada, segundos promedio en pantalla. Ordenada de **menor a mayor % de acierto** (lo más fallado primero).
- **Por competencia** — competencia, preguntas distintas evaluadas, veces mostradas en total, % de acierto agregado. Mismo orden.

Solo aparecen preguntas que efectivamente salieron sorteadas al menos una vez dentro del alcance elegido; una pregunta del banco que nunca le tocó a nadie no tiene nada que reportar.

## Por qué

Pendiente del backlog del roadmap. Hoy el docente descarga el detalle CSV/JSON/Excel y podría calcular esto a mano fuera de OpenTest, pero eso es justo el tipo de fricción que la aplicación existe para evitar (principio "Simple para el docente"). Ver un ranking de lo más fallado, sin abrir una hoja de cálculo, es lo que hace útil la retroalimentación al banco mismo, no solo al estudiante.

La opción de acumular por banco (y no solo por sesión) importa porque un banco se reutiliza entre grupos y entre periodos: una pregunta que un curso entero falla puede ser una mala pregunta, no un mal curso, y eso solo se ve agregando varias aplicaciones.

## Por qué "por banco" es seguro de calcular

Cada importación de un paquete crea una fila nueva en `bancos` (`guardarBanco` siempre `INSERT`, nunca actualiza una existente) y sus `preguntas` no cambian después de creadas. Por eso agregar "todas las sesiones cerradas de un banco" no tiene el problema de que las preguntas hayan cambiado entremedias: un `banco_id` es una foto fija desde que se crea. Si el docente reimporta, es simplemente otro banco distinto en el selector, con su propio acumulado.

## Criterios de aceptación

- [x] El panel (`/docente/index.html`) tiene un nuevo acceso a "Estadísticas".
- [x] Al elegir un banco sin ninguna sesión cerrada que lo use, se muestra un mensaje claro en vez de una tabla vacía.
- [x] El selector de alcance ofrece "Todas las sesiones cerradas" y cada sesión cerrada individual de ese banco, por nombre.
- [x] El selector de curso se limita a los cursos convocados dentro del alcance elegido (unión de cursos si es "todas").
- [x] La tabla "por pregunta" muestra, para cada pregunta con al menos una aparición: veces mostrada, % de acierto, % de saltada, segundos promedio, y está ordenada ascendente por % de acierto.
- [x] La tabla "por competencia" agrega correctamente: la suma de "veces mostrada" de sus preguntas y el % de acierto ponderado por esas apariciones (no el promedio simple de los % de cada pregunta).
- [x] % de acierto + % de saltada + % de fallo (opción incorrecta) suman 100 para cada pregunta.
- [x] Elegir una sola sesión da el mismo resultado que "todas" cuando el banco solo tiene esa sesión cerrada.
- [x] El curso filtra correctamente tanto en modo "una sesión" como en modo "todas".
- [x] Calcular las estadísticas de un banco con 10 sesiones cerradas de 40 estudiantes × 20 preguntas cada una (8000 filas de `intento_preguntas`) tarda menos de 2 segundos (~20 ms medidos solo para la consulta, sin contar la inserción de los datos de prueba).
- [x] No se agrega ninguna dependencia nueva.

## Fuera de alcance

- Editar preguntas desde esta pantalla (es de solo lectura; para corregir una pregunta mala, el docente reimporta el banco).
- Exportar estas estadísticas a CSV/Excel — si hace falta después, es una extensión del contrato de exportación, no de esta feature.
- Estadísticas por estudiante individual (más allá de lo que ya cubre resultados.html) o por componente/afirmación/evidencia (metadata más fina que la 016 también trae, pero el backlog original solo pidió pregunta y competencia).
- Comparar el desempeño entre bancos distintos.
