# 028 · Ingreso manual de preguntas

**Estado:** implementado ✅

## Qué hace

Agrega a la pantalla de Bancos la posibilidad de **crear un banco vacío y escribir preguntas una a una** desde el panel, sin pasar por el ZIP del estándar `preguntas-icfes` (feature 016/026). Hoy la única vía para tener un banco es preparar ese paquete completo, algo pensado para un docente que usa una IA como asistente; este flujo cubre al que no.

- Un botón **"+ Nuevo banco vacío"** en la pantalla de Bancos crea un banco con nombre y 0 preguntas, y abre su detalle de inmediato.
- Dentro del detalle de **cualquier** banco (recién creado o importado por ZIP) hay un botón **"+ Agregar pregunta"** que abre un formulario modal con la forma simple original de la feature 003: contexto opcional, imagen opcional, enunciado y **4 opciones de respuesta**, marcando cuál es la correcta y, opcionalmente, una justificación por opción.
- Cada pregunta suelta (sin grupo) del detalle gana botones **Editar** y **Eliminar**, con el mismo modal.
- La carga por ZIP (015/016/026) sigue existiendo igual; este flujo es complementario, igual que la 020 lo es de la 002.

## Por qué

El banco de preguntas hoy exige generar un JSON dentro de un ZIP que sigue un estándar externo con metadata pedagógica (competencia, componente, afirmación, evidencia...) y justificación por cada opción. Un docente que sabe pedirle ese archivo a una IA lo hace sin problema; uno que no, queda fuera de la plataforma aunque solo quiera escribir 20 preguntas de toda la vida. La consecuencia es la misma que motivó la 020 con estudiantes: el trabajo nunca se hace, o se hace a mano en otra herramienta y luego alguien más tiene que convertirlo.

## Criterios de aceptación

### Crear banco vacío
- [x] Existe un botón **"+ Nuevo banco vacío"** en la pantalla de Bancos.
- [x] Pide un nombre; si está vacío, no crea nada y muestra el error.
- [x] En éxito, el banco aparece en "Bancos cargados" con 0 preguntas y su detalle se abre automáticamente.

### Agregar pregunta
- [x] El detalle de un banco (recién creado o importado) tiene un botón **"+ Agregar pregunta"**.
- [x] El formulario pide: contexto (opcional, texto libre), una imagen (opcional, se sube igual que en la carga por ZIP), enunciado (obligatorio) y **4 opciones** de texto.
- [x] Cada opción tiene un campo de justificación opcional y un selector para marcar cuál es la correcta; se exige marcar **exactamente una**.
- [x] Si el enunciado está vacío, si alguna opción queda vacía o si no hay exactamente una correcta marcada, no se guarda nada y se muestran **todos** los problemas a la vez.
- [x] En éxito, la pregunta aparece de inmediato en el detalle del banco, renderizada igual que las importadas por ZIP (mismo componente de vista `renderizarPregunta`).
- [x] El modal queda listo para escribir la siguiente pregunta sin cerrarse el flujo de trabajo (se puede reabrir vacío de un clic).

### Editar y eliminar
- [x] Cada pregunta suelta (`grupo_id` nulo) del detalle tiene botones **Editar** y **Eliminar**, igual que un estudiante en la 020.
- [x] Editar abre el mismo modal con los datos prellenados (contexto, imagen si tenía, enunciado, las 4 opciones, cuál era correcta, justificaciones).
- [x] Una pregunta que ya se usó en una evaluación (existe en `intento_preguntas`) **no se puede editar ni eliminar**: la API devuelve `409` con un mensaje explicando que sus respuestas deben seguir siendo auditables — mismo principio que `borrarBanco` (009) y `borrarSesion` (022).
- [x] Una pregunta que pertenece a un grupo de matching/cloze (026) no se puede editar ni eliminar desde aquí: la API devuelve `409`; esos solo se corrigen reimportando el ZIP del grupo.
- [x] Eliminar pide confirmación (`window.confirm`) antes de llamar a la API.

### Reglas comunes
- [x] Las cuatro rutas nuevas (`POST /bancos`, `POST /bancos/:id/preguntas`, `PUT /preguntas/:id`, `DELETE /preguntas/:id`) exigen contraseña de docente, como el resto de `/api/docente/*`.
- [x] Los mensajes de error son en español y aparecen dentro del modal (o del bloque de errores de "Nuevo banco"), no como `alert()` salvo los casos ya cubiertos por un `409`/`404` inesperado (mismo criterio que estudiantes y bancos existentes).
- [x] El modal es accesible por teclado: `Esc` cierra, el foco vuelve al botón que lo abrió (mismo comportamiento que el `<dialog>` de la 020).
- [x] Una pregunta creada a mano se sortea, se presenta y se califica exactamente igual que una importada: no lleva ninguna marca especial en el motor de personalización (005/017) ni en la calificación (007).

## Fuera de alcance

- **Metadata pedagógica del estándar** (competencia, componente, afirmación, evidencia, estándar asociado, qué evalúa, grado, prueba, nivel MCER, procedencia/verificado/fuentes): el formulario manual no la pide; queda en blanco/por defecto, igual que si viniera de un banco anterior a la 016. Quien la necesite sigue usando el ZIP.
- **Grupos de preguntas** (contexto compartido, matching, cloze — feature 026): el formulario manual solo crea preguntas sueltas de 4 opciones. Los grupos siguen siendo exclusivos del ZIP.
- **Más o menos de 4 opciones**: se mantiene el número original de la feature 003. Un banco con otro número de opciones por pregunta sigue necesitando el ZIP.
- **Tablas como bloque de contenido**: el contexto y el enunciado manual son texto plano (con una imagen opcional); las tablas del estándar (`tipo: 'tabla'`) no se pueden componer a mano.
- **Reordenar preguntas dentro de un banco**: quedan en el orden en que se crearon, como ya ocurre con las importadas.
- **Editar preguntas de un banco antiguo pre-016** (contexto/enunciado en texto plano sin bloques): esta feature no migra ese formato; solo opera sobre preguntas creadas con el esquema de bloques actual.
