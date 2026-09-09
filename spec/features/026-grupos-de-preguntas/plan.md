# Plan · 026 Grupos de preguntas y campos informativos

## Enfoque

La ampliación es aditiva: un banco sin grupos, sin `valor` y sin
procedencia sigue funcionando exactamente como antes. Por eso el orden
de los cambios importa: primero se desbloquea el formato (validador y
contrato), después el esquema (para que las preguntas nuevas quepan),
después el importador (para que se guarden), y por último el render y
la calificación (para que se vean y se puntúen). En cada paso hay una
suite de tests existente que debe seguir pasando sin modificación: es
la garantía de que la ampliación no rompió el camino viejo.

Cinco bloques de trabajo, en este orden:

1. **Contrato y validador** — el validador vendorizado se reemplaza
   por la versión v1.4.0 del estándar y el contrato local se amplía
   con la sección "Tipos de pregunta admitidos". La exportación de
   resultados sube a `formato_version: 3`.
2. **Esquema** — migración v5 que añade 16 columnas en 4 tablas y crea
   la tabla `grupos`. Todo `NOT NULL DEFAULT ''` (o `1` para `valor`),
   así que la migración es una secuencia de `ALTER TABLE ADD COLUMN`
   simples, más el `CREATE TABLE` de `grupos`.
3. **Importador** — `server/importers/preguntas.js` se reescribe para
   persistir los grupos (con su contexto, su banco y su
   metadata_pedagogica), para guardar los campos informativos de
   v1.1.0/v1.2.0/v1.3.0 en las columnas nuevas, y para filtrar las
   preguntas/grupos cuyo contenido traiga `{{numero:<id>}}`. El
   importador del ZIP (`paquete-zip.js`) no cambia: ya entrega el
   `paquete.json` parseado y los nombres de imágenes.
4. **Servicios y render** — `bancos.js` aprende a cargar un grupo con
   sus preguntas miembro; `examen.js` aprende a servir el grupo al
   estudiante con sus campos resueltos; `intentos.js` materializa las
   preguntas miembro preservando `grupo_id` y `orden_opciones` (que
   para matching será el orden de las entradas del banco, no de
   opciones); `calificacion.js` suma `valor` y compara
   `respuesta_banco_id`; `personalizacion.js` modifica el sorteo para
   no partir un grupo entre dos pruebas distintas. El renderer del
   estudiante (`public/shared/pregunta.js` +
   `public/estudiante/examen.js`) gana la función `renderizarGrupo` y
   el modo "varias preguntas en una pantalla" para matching y cloze.
5. **Panel del docente y exportación** — el detalle del banco en
   `public/docente/bancos.js` muestra los grupos como secciones
   plegables; `server/exporters/resultados.js` sube a `formato_version:
   3` con los campos nuevos.

## Decisiones

- **Validador reemplazado, no parcheado** — el comentario del archivo
  dice desde la 016 "se reemplaza entero por la nueva copia; no se edita
  a mano para no perder la sincronía con la fuente". Esta feature
  actualiza la copia a v1.4.0 respetando esa regla. La versión local
  que tenía OpenTest coincide con v1.0.0; la nueva cubre 1.0.0–1.4.0.

- **`valor` con default 1, no retroactivo** — los bancos cargados antes
  de la 026 tendrán `valor = 1` por el DEFAULT y suman como hasta ahora.
  No se recalifican sesiones ya cerradas.

- **Grupos como filas separadas en `intento_preguntas`, no como JSON
  dentro de la fila** — la materialización de la prueba es la
  inmutabilidad que sostiene la reanudación tras una tablet caída. Si
  el grupo se guardara como JSON dentro de una sola fila, perderíamos
  la granularidad por pregunta que las invariantes de la 005
  (`(sesion_id, codigo_estudiante)` único, respuestas por pregunta)
  necesitan. Cada miembro del grupo ocupa un `orden` propio en
  `intento_preguntas`, con su `grupo_id` para que el renderer los
  junte en una sola pantalla.

- **Tiempo mínimo se aplica al primer miembro de la pantalla de
  grupo** — decisión confirmada con el usuario. Un matching de 5
  miembros con `segundos_minimos_pregunta = 10` exige 10 s antes de
  poder enviar el primer miembro; los hermanos heredan el visto bueno
  mientras el estudiante siga en esa pantalla. Esto evita que el
  tiempo mínimo se dispare a `N * 10s` para un ejercicio pensado para
  resolverse de un vistazo.

- **`{{numero:<id>}}` se filtra, no se sustituye** — la sustitución
  depende de "qué posición ocupa la pregunta X en el examen que se le
  está sirviendo a este estudiante", que es información del lado de
  la plataforma. OpenTest tiene orden fijo por intento, así que la
  sustitución sería viable, pero se aplaza a una feature aparte para
  no estirar esta. Mientras tanto, las preguntas con el marcador se
  excluyen del banco al importar.

- **Exposición del grupo al estudiante** — la ruta
  `/api/examen/pregunta/:orden` (en `server/services/examen.js`)
  resuelve el grupo completo: devuelve la pregunta del `orden` pedido
  junto con sus hermanos del mismo grupo (si los hay), el contexto del
  grupo, y — solo para matching — el banco con `es_ejemplo` filtrado
  para que el estudiante no pueda elegirlo. La respuesta de la API es
  siempre la misma forma: `{ pregunta: {...}, grupo?: { id, tipo,
  contexto, banco?, preguntas: [...] } }`. Para matching, las preguntas
  miembro del grupo no tienen `opciones` propias y el cliente usa
  `banco` para pintarlas.

- **Renderer del docente reutiliza `public/shared/pregunta.js`** — la
  previsualización del banco en `bancos.js` también debe mostrar los
  grupos con el contexto compartido y las preguntas miembro. La
  misma función `renderizarGrupo` cubre ambos consumidores sin
  divergencias.

- **Excluir preguntas con `{{numero}}` en el importador, no en el
  validador** — el validador de referencia solo comprueba que el `id`
  referenciado exista (y eso está bien, es una validación de
  referencia). OpenTest añade una regla local en
  `server/importers/preguntas.js` que escanea los bloques de texto y
  emite el aviso de exclusión antes de confirmar. Es una regla de
  OpenTest, no del estándar.

- **Trece columnas en `preguntas` se añaden en una sola migración**
  — están correlacionadas (forman el conjunto de campos
  informativos + v1.2.0+), y separarlas en pasos de migración v5a,
  v5b, v5c solo añadiría complejidad al contador de versión sin
  beneficio. La lista vive en `server/migraciones.js` en una sola
  entrada que las aplica en orden.

## Implementación

### 1. Contratos

- `spec/contracts/paquete-preguntas-icfes.md` — añadir sección
  "Tipos de pregunta admitidos" con los tres tipos de grupo, los
  campos informativos de v1.1.0, los nuevos campos de v1.2.0, y la
  nota sobre `{{numero:<id>}}` (validación de referencia, sustitución
  fuera de OpenTest, exclusión en importación). No retirar nada de lo
  que ya está.
- `spec/contracts/export-resultados-v2.md` — marcar como
  **obsoleto**, sustituido por `export-resultados-v3.md`.
- `spec/contracts/export-resultados-v3.md` — mismo contenido que v2
  más los campos nuevos: `valor`, `grupo_id`, `tipo_item`, `nivel_mcer`,
  `grado`, `prueba`, `procedencia`, `verificado`, `fuentes`, y por
  opción `procedencia_justificacion`, `justificacion_verificada`. La
  columna de respuesta para matching incluye `respuesta_banco_id`.
  `formato_version` literal `"3"`.

### 2. Validador

- Reemplazar `server/importers/estandar-preguntas-icfes.js` por la
  copia de `validador/validar.js` de la v1.4.0 del estándar.
- Verificar que los mensajes de error de la nueva copia están en
  español (la copia de referencia los emite en español; si no,
  mantenerlos en español). Si vienen en inglés, traducirlos sin
  tocar la lógica.
- Actualizar el comentario de cabecera para que diga "v1.4.0".

### 3. Migración v5

`server/migraciones.js` gana una entrada nueva después de la v4:

- `CREATE TABLE grupos (...)` — la tabla ya documentada en
  `spec.md`.
- `ALTER TABLE preguntas ADD COLUMN` × 13 (grupo_id, tipo_item,
  respuesta_pool_id, numero_blanco, nivel_mcer, valor, grado, prueba,
  procedencia, verificado, fuentes, version_estandar). Más una para
  `imagen` que ya existe como heredada — no se duplica.
- `ALTER TABLE opciones ADD COLUMN` × 2 (procedencia_justificacion,
  justificacion_verificada).
- `ALTER TABLE intento_preguntas ADD COLUMN respuesta_banco_id`.

`server/schema.sql` se actualiza para que una base **nueva** nazca
con todas las columnas al día.

### 4. Importador

- `server/importers/preguntas.js` se reescribe:
  - Delega en `validarPaquete` la validación de contenido (sin
    cambios).
  - Después de validar, recorre `paquete.grupos` y construye la lista
    de preguntas válidas (pertenecientes a un grupo conocido y con
    `tipo_item` coherente) y la lista de preguntas inválidas (con
    motivo: grupo inexistente, tipo_item incoherente, marcador
    `{{numero:...}}`).
  - Devuelve `{ nombre, preguntas, grupos, exclusiones, errores,
    avisos }`. Las exclusiones son avisos accionables para el
    docente, no errores que rechazan el paquete.
- `server/services/bancos.js` — `crearBanco` y `obtenerBanco`
  actualizados:
  - `crearBanco` escribe `grupos` (con su `contexto`, `banco`,
    `metadata_pedagogica`) en una transacción junto con las
    preguntas.
  - `obtenerBanco` devuelve las preguntas y los grupos del banco
    con sus preguntas miembro agrupadas.
- `server/services/bloques.js` — sin cambios; ya sabe leer y
  escribir arrays de bloques.

### 5. Servicios

- `server/services/intentos.js` — `materializarPrueba` agrupa por
  `grupo_id` antes de barajar: si la prueba sortea una pregunta
  miembro, sortea también sus hermanos (o, equivalentemente, sortea
  grupos y dentro de cada grupo sortea las preguntas miembro que
  entren). La invariante "no partir un grupo entre dos pruebas" se
  mantiene porque las preguntas de un grupo se sirven juntas o no se
  sirven.
- `server/services/examen.js` — la ruta de servir la pregunta actual
  resuelve el grupo completo: si la pregunta actual pertenece a un
  grupo, devuelve `{ pregunta, grupo: { id, tipo, contexto, banco?,
  preguntas: [...] } }`. Los campos `es_correcta` y `justificacion`
  siguen sin salir. `respuesta_banco_id` solo se escribe al
  responder, no se devuelve al estudiante después.
- `server/services/calificacion.js` — al calificar, suma `valor` (1
  por defecto). Para `miembro_banco_opciones`, compara
  `intento_preguntas.respuesta_banco_id` contra el `id` de la entrada
  correcta del banco (que el importador traduce a partir de la
  pregunta original, que en el estándar v1.2.0 tiene
  `respuesta_pool_id` apuntando al `id` del banco).
- `server/services/personalizacion.js` — el muestreador ya no parte
  un grupo. Cuando sortea para una prueba, si toca una pregunta
  miembro, sortea el grupo entero (o, visto de otro modo: trata cada
  grupo como una unidad indivisible a efectos de cuota; las preguntas
  standalone siguen siendo unidades). Si el banco tiene N grupos de
  tamaño variable y se sortea una prueba de M preguntas, se reparten
  los cupos por "peso" (cada grupo = `cantidad_de_miembros *
  valor_promedio`) o, más simple, se sortea primero la lista de
  grupos a incluir y después las preguntas miembro de cada grupo.
  Decisión final en `plan.md` si hay duda.

### 6. Renderer del estudiante

- `public/shared/pregunta.js`:
  - `renderizarPregunta(pregunta, opciones)` — sin cambios para
    preguntas `estandar`; para `miembro_banco_opciones` renderiza un
    selector con las entradas del banco (sin `es_ejemplo`); para
    `miembro_texto_con_blancos` renderiza la opción múltiple sobre
    el hueco (la pregunta ya tiene sus opciones). Se quita el hardcode
    "siempre 4 letras A-D" y se calcula el array de letras a partir
    del número de opciones real (preservando el comportamiento
    existente para 4 opciones).
  - Nueva función `renderizarGrupo(grupo, preguntas, opciones)`:
    pinta el contexto/banco/pasaje del grupo arriba y, debajo, las
    preguntas miembro. Para `contexto_compartido` solo pinta el
    contexto arriba y devuelve la primera pregunta miembro (las
    demás se renderizan en llamadas separadas porque se muestran una
    por una). Para `banco_opciones` y `texto_con_blancos` pinta
    todas las preguntas miembro en una sola pantalla.
- `public/estudiante/examen.js` — al recibir la pregunta del
  servidor, detecta si viene con `grupo`. Si sí:
  - `contexto_compartido`: pinta el contexto del grupo una vez
    encima de la pregunta actual (no repite el contexto de la propia
    pregunta, que se omite si está vacío).
  - `banco_opciones` / `texto_con_blancos`: pinta todas las
    preguntas del grupo en una sola pantalla con el banco/pasaje
    arriba. Al pulsar "Siguiente", envía las respuestas de todos
    los miembros a la vez y avanza al siguiente `orden` fuera del
    grupo.
- `public/estudiante/examen.html` — un contenedor extra para el
  grupo (no toca el responsive existente).

### 7. Panel del docente

- `public/docente/bancos.js` — el detalle del banco agrupa las
  preguntas por `grupo_id`: las preguntas miembro se muestran dentro
  de una sección plegable del grupo, con el contexto/banco del
  grupo visible arriba. Preguntas sin grupo se muestran como
  siempre.
- `public/docente/bancos.html` — la pestaña de detalle gana un
  contenedor para grupos (mismo patrón que las preguntas).
- Sin cambios en `sesiones.js`, `monitoreo.js`, ni `resultados.js`
  del docente: la lista de sesiones, el monitoreo y el panel de
  resultados se mantienen como hasta ahora. Las preguntas
  agrupadas siguen apareciendo como N filas en el monitoreo, igual
  que el estudiante las ve como N preguntas contables.

### 8. Exportación

- `server/exporters/resultados.js`:
  - `formato_version` pasa de `"2"` a `"3"`.
  - Cada pregunta en el JSON exportado gana los campos nuevos
    opcionales (`grupo_id`, `tipo_item`, `nivel_mcer`, `valor`,
    `grado`, `prueba`, `procedencia`, `verificado`, `fuentes`).
  - Cada opción gana `procedencia_justificacion` y
    `justificacion_verificada`.
  - El detalle del Excel (la hoja Detalle de `resultados.xlsx`
    generada por la 025) gana columnas para los campos nuevos
    cuando estén presentes (sin obligar a que estén).
  - El banco de preguntas exportado en
    `reproduccion.zip`/`resultados.xlsx` (la hoja Banco de la 025)
    preserva los grupos: si el banco original tenía grupos, el
    archivo ZIP exportado los incluye.
- Sin cambios en el contrato CSV (los CSV detalle y resumen son
  hojas de conveniencia, no contrato, y se mantienen igual).

### 9. Pruebas

- `server/fixtures-preguntas.js` — gana factories para los tres
  tipos de grupo y para preguntas con campos informativos.
- `server/importers/estandar-preguntas-icfes.test.js` — casos de
  cada nueva invariante: `grupo_id` resuelto, `tipo_item` coherente
  con el tipo del grupo, `respuesta_pool_id` válido y no ejemplo,
  `numero_blanco` único, `nivel_mcer` del catálogo, `valor > 0`,
  `version_estandar` por pregunta coherente con los campos
  usados, `{{numero:ID}}` referencia existente. (Estos tests pueden
  no ser necesarios si la copia vendorizada ya los trae — la 016 no
  añadió tests para invariantes simples; verificar antes de
  duplicarlos.)
- `server/importers/preguntas.test.js` — banco con grupos importa
  entero; banco con `{{numero:ID}}` excluye las preguntas afectadas
  con motivo claro.
- `server/migraciones.test.js` — una base pre-v5 gana las columnas
  y la tabla `grupos` sin perder preguntas/opciones preexistentes.
- `server/services/bancos.test.js`, `server/services/examen.test.js`,
  `server/services/intentos.test.js`,
  `server/services/calificacion.test.js`,
  `server/services/personalizacion.test.js` — cada uno con un caso
  nuevo para el tipo de pregunta que le corresponda. Y todos los
  tests existentes (los del fixture `banco()` sin grupos) deben
  pasar sin tocar un solo assert: es la prueba de que la ampliación
  no rompió nada.
- `server/exporters/resultados.test.js` — `formato_version: 3`,
  campos nuevos en JSON y en Excel.
- Renderer: añadir tests del helper `textoPlano` y de un helper
  nuevo `letrasDeOpciones(n)` que devuelva `['A','B',...,'A'+n-1]`,
  para no depender del hardcode `LETRAS = ['A','B','C','D']` en los
  consumidores.

### 10. Ejemplos

- `ejemplos/banco-grupos-ingles.zip` — un banco pequeño (8-10
  preguntas) con un grupo `contexto_compartido`, un grupo
  `banco_opciones` (matching) y un grupo `texto_con_blancos`
  (cloze). Pensado para que el docente y el validador de la sesión
  final puedan importar y verificar visualmente los tres tipos.
- `ejemplos/banco-ejemplo.json` se queda como está (banco sin
  grupos, comprueba que el camino viejo sigue funcionando).

## Seguridad y límites

- Los límites del ZIP (25 MB, 101 archivos, 3 MB por imagen)
  heredados de la 015 y mantenidos en la 016 siguen igual.
- Los campos informativos de v1.1.0/v1.2.0 se validan pero no se
  sanitizan agresivamente: el estándar dice que son texto libre. La
  BD los guarda como TEXT y el render los pinta con `textContent` en
  el frontend (nunca `innerHTML`), así que no hay superficie de XSS.
- `grupo_id` se valida como FK referencial en la importación
  (existe en `paquete.grupos`); después es FK SQLite con
  `ON DELETE CASCADE` para que borrar un banco borre sus grupos.
- `respuesta_banco_id` se valida contra el banco del grupo en la
  importación; después no necesita CHECK porque vive dentro de la
  BD y solo se compara en calificación.
- El validador vendorizado no añade ninguna ruta de red ni llamada
  externa: es código puro JS sobre el JSON ya parseado.

## Riesgos

- **Cobertura del validador v1.4.0** — la copia de referencia en el
  upstream cubre los casos del README, pero el CHANGELOG menciona
  validaciones adicionales (`procedencia`, `verificado`, `fuentes`,
  grupos, cloze, `{{numero}}`) que se fueron sumando. Hay que
  comparar caso por caso contra el archivo que se vendoriza para
  confirmar que cubre todo lo que esta feature expone. Riesgo bajo:
  si falta alguna invariante, se detecta en los tests de importador
  con un caso adversarial.
- **Determinismo de la prueba con grupos** — si la materialización
  trata un grupo como una unidad indivisible, el orden entre
  grupos sigue siendo barajado (igual que con preguntas
  standalone), y el orden entre miembros de un mismo grupo también
  se baraja (porque son N filas en `intento_preguntas` con su
  `orden` propio). El determinismo de la 005 se mantiene.
- **Tiempo mínimo por pantalla de grupo** — la pantalla de matching
  tiene 5 entradas y 5 selectores. Si el mínimo es 10 s, el
  estudiante tiene 10 s antes de poder enviar el primero; después
  puede enviar todos los demás sin esperar más mientras siga en
  esa pantalla. Si sale y vuelve a entrar (reanudación), el mínimo
  se vuelve a aplicar al primer miembro que no haya enviado aún.
- **Hojas de Excel con celdas vacías** — la 025 ya maneja la
  ausencia de campos en celdas vacías. Los campos nuevos se añaden
  con el mismo patrón (omitir la columna cuando el valor es el
  default).
- **Reimportación de un banco** — la 016 ya tiene el patrón "borrar
  y recrear" para reimportar un banco (cascada por `banco_id`).
  Esta feature lo hereda: borrar el banco borra sus `grupos`
  automáticamente por la cascada del FK. No hace falta tocar la
  ruta de borrado.

## Trabajo que NO se hace

- Implementar la sustitución de `{{numero:<id>}}` (fuera de alcance).
- Mostrar los campos informativos en el panel del docente (fuera de
  alcance; solo se guardan y se exportan).
- Filtrar sesiones por `grado` o `prueba` (fuera de alcance).
- Catálogo cerrado de `competencia` (fuera de alcance; sigue siendo
  texto libre).
- Bloques nuevos (audio, fórmulas) — el estándar los marca como
  fuera de v1; OpenTest sigue aceptando solo `texto`, `imagen`,
  `tabla`.
- Migrar retroactivamente bancos anteriores a esta feature.
- Tocar `proyeccion/` ni la lista de sesiones del docente.