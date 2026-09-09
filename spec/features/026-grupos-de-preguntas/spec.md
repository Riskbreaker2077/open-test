# 026 · Grupos de preguntas y campos informativos

**Estado:** implementado ✅ · verificación física (tablet/proyector/Excel real) pendiente para la sesión en equipo destino

## Qué hace

Adopta los tres tipos de grupo del estándar `preguntas-icfes` v1.2.0
(`contexto_compartido`, `banco_opciones` para ejercicios de emparejamiento,
`texto_con_blancos` para *cloze*) más los campos informativos de v1.1.0
(`grado`, `prueba`, `procedencia`, `verificado`, `fuentes` por pregunta;
`procedencia_justificacion` y `justificacion_verificada` por opción) y los
campos de v1.2.0 a nivel de pregunta (`nivel_mcer`, `valor`). Hasta hoy
OpenTest solo entendía v1.0.0 del estándar — exactamente 4 opciones, una
correcta, justificación por opción y bloques de contenido — y rechazaba
todo paquete que declarara otra forma.

El cambio se concreta en cinco movimientos:

1. **Validador actualizado** — `server/importers/estandar-preguntas-icfes.js`
   se reemplaza por la versión v1.4.0 del estándar (sin ediciones a mano:
   el comentario del archivo lo dice y se mantiene). Esto desbloquea los
   tres tipos de grupo, las preguntas de 3 o 5+ opciones standalone, y la
   validación de referencia del marcador `{{numero:<id>}}`.

2. **Esquema ampliado (migración v5)** — la BD pasa de asumir "una pregunta
   = un enunciado + 4 opciones + 1 correcta" a soportar grupos, peso por
   pregunta, y procedencia auditable. Las preguntas que no usen los campos
   nuevos siguen funcionando igual.

3. **Importador reescrito** — `server/importers/preguntas.js` deja de
   rechazar paquetes que declaren grupos. Las preguntas miembro se guardan
   con su `grupo_id` y `tipo_item`; el banco se guarda entero, con sus
   `grupos` y sus imágenes. Las preguntas o grupos cuyo contenido traiga
   el marcador `{{numero:<id>}}` se filtran del banco antes de confirmar,
   con un aviso claro por cada exclusión (no se pueden sustituir en
   runtime todavía y mostrarlos crudos en la tablet sería enseñar contenido
   roto).

4. **Render del estudiante consciente de grupos** — `public/shared/pregunta.js`
   deja de asumir que cada pregunta se pinta sola. Para `contexto_compartido`
   pinta el contexto una sola vez y después las preguntas miembro una a una
   (cada una con su propio `enunciado` y sus 4 opciones). Para
   `banco_opciones` (matching) y `texto_con_blancos` (cloze) pinta todos
   los miembros en una sola pantalla, con el banco o el pasaje compartido
   arriba, y deja que el estudiante responda cada uno antes de avanzar.

5. **Calificación con peso por pregunta** — `server/services/calificacion.js`
   suma `valor` por defecto 1 cuando el campo está ausente, igual que dice el
   estándar. Un emparejamiento de 5 miembros sigue sumando 5 puntos sin que
   el docente tenga que hacer nada.

Los campos informativos de v1.1.0 se **guardan** en la BD pero no se
muestran ni se filtran todavía en el panel del docente. Eso queda para
features futuras; lo único que cambia con esta adopción es que el dato
sobrevive al viaje de importación → exportación y que la exportación puede
incluirlo si la feature de exportación correspondiente decide usarlo.

## Por qué

Los bancos reales de Sociales, Español y sobre todo Inglés no caben en
v1.0.0:

- En **Sociales y Español** es habitual que varias preguntas compartan
  una lectura o una tabla común (los cuadernillos ICFES imprimen un párrafo
  largo y luego 3-4 preguntas sobre él). Hoy OpenTest importaría esas
  preguntas, pero el mismo párrafo aparecería copiado debajo de cada una
  en la pantalla del estudiante.
- En **Inglés** (y en menor medida en Español) los ejercicios de
  emparejamiento y de *cloze* sobre un pasaje son la norma. Un
  emparejamiento es "varias descripciones + un banco de palabras, todas
  en la misma pantalla"; un *cloze* es "un pasaje con espacios marcados,
  cada espacio con sus opciones". Ninguno de los dos tiene la forma
  "1 enunciado + 4 opciones" que OpenTest exige hoy.

Y, aparte del contenido que cambia, hay metadatos de auditoría que v1.0.0
no contemplaba: de dónde salió cada bloque de la pregunta (`procedencia`),
si un humano lo verificó (`verificado`), y de qué PDF se extrajo
(`fuentes`). Hoy se pierden en silencio al importar — el validador los
ignoraba y la BD no los guardaba.

El estándar `preguntas-icfes` resuelve estos tres problemas con una sola
adopción: subir el validador a v1.4.0, ampliar el esquema, ampliar el
render. Mantener el contrato local `paquete-preguntas-icfes.md` no se
rompe: lo que se hace es ampliar el rango de paquetes válidos que pasan el
validador, sin tocar la forma del archivo ZIP.

## Contrato

- El formato de importación sigue siendo el ZIP con `paquete.json` del
  estándar externo, ahora en cualquier versión SemVer entre `1.0.0` y
  `1.4.0`. El contrato local `paquete-preguntas-icfes.md` se amplía con
  una sección "Tipos de pregunta admitidos" que lista los tres grupos y
  los campos opcionales que ahora sobreviven a la importación.
- La exportación de resultados (`export-resultados-v2.md`) gana un campo
  `valor` por pregunta, el `grupo_id` y `tipo_item` cuando apliquen, y los
  nuevos campos informativos como columnas opcionales. El `formato_version`
  sube a `3` por la adición de estos campos.

## Modelo de datos (migración v5)

La BD actual vive en `server/schema.sql` y se aplica al arrancar; la
migración se añade como una entrada nueva en `server/migraciones.js`
después de la v4 (la columna `descargado_en` de la 022). Cada paso es
`ALTER TABLE ... ADD COLUMN` simple — no hay que rehacer ninguna tabla.

### Tabla nueva: `grupos`

```sql
CREATE TABLE grupos (
  id        TEXT PRIMARY KEY,        -- el mismo id que aparece en paquete.json
  banco_id  INTEGER NOT NULL REFERENCES bancos (id) ON DELETE CASCADE,
  tipo      TEXT NOT NULL CHECK (tipo IN (
            'contexto_compartido', 'banco_opciones', 'texto_con_blancos')),
  contexto  TEXT NOT NULL DEFAULT '[]',  -- JSON de bloques (texto|imagen|tabla)
  banco     TEXT NOT NULL DEFAULT '[]',  -- JSON: [{id, contenido: bloques[], es_ejemplo?}]
  metadata_pedagogica TEXT NOT NULL DEFAULT '{}'  -- JSON con los 6 campos
);
```

- `contexto` aplica a `contexto_compartido` y `texto_con_blancos`.
- `banco` aplica solo a `banco_opciones` (lista de entradas con `id`,
  `contenido` (bloques) y opcionalmente `es_ejemplo: true`).
- `metadata_pedagogica` aplica a los tres tipos: si una pregunta miembro
  no trae sus 6 campos, hereda los del grupo.

### `preguntas` gana columnas

```sql
ALTER TABLE preguntas ADD COLUMN grupo_id    TEXT REFERENCES grupos (id) ON DELETE CASCADE;
ALTER TABLE preguntas ADD COLUMN tipo_item   TEXT
  CHECK (tipo_item IN ('estandar', 'miembro_banco_opciones', 'miembro_texto_con_blancos'));
ALTER TABLE preguntas ADD COLUMN respuesta_pool_id TEXT;  -- solo miembro_banco_opciones
ALTER TABLE preguntas ADD COLUMN numero_blanco INTEGER;   -- solo miembro_texto_con_blancos
ALTER TABLE preguntas ADD COLUMN nivel_mcer   TEXT;       -- enum cerrado Pre-A1..C2
ALTER TABLE preguntas ADD COLUMN valor        REAL NOT NULL DEFAULT 1 CHECK (valor > 0);
ALTER TABLE preguntas ADD COLUMN grado        TEXT;       -- "3".."11"
ALTER TABLE preguntas ADD COLUMN prueba       TEXT;       -- enum "saber11", "evaluar_para_avanzar"
ALTER TABLE preguntas ADD COLUMN procedencia  TEXT NOT NULL DEFAULT '{}';  -- JSON
ALTER TABLE preguntas ADD COLUMN verificado   TEXT NOT NULL DEFAULT '{}';  -- JSON
ALTER TABLE preguntas ADD COLUMN fuentes      TEXT NOT NULL DEFAULT '{}';  -- JSON
ALTER TABLE preguntas ADD COLUMN version_estandar TEXT;  -- SemVer por pregunta (v1.3.0+)
```

- `grupo_id` y `tipo_item` solo se llenan para preguntas miembro; el resto
  queda en sus defaults.
- `respuesta_pool_id` referencia un `id` dentro del `banco` del grupo
  (solo `miembro_banco_opciones`); la validación se hace en el importador.
- `numero_blanco` es el ordinal del espacio dentro del pasaje (1..N),
  único dentro de cada grupo `texto_con_blancos`.
- `procedencia`, `verificado`, `fuentes` se guardan como JSON con hasta
  tres llaves (`contenido`, `clasificacion`, `respuesta_correcta`) cada
  una. Ausencia = `"{}"`, igual que dice el estándar para "origen no
  declarado".

### `opciones` gana columnas

```sql
ALTER TABLE opciones ADD COLUMN procedencia_justificacion TEXT;
ALTER TABLE opciones ADD COLUMN justificacion_verificada   INTEGER;
```

- `procedencia_justificacion` es el mismo enum cerrado de tres valores
  que `preguntas.procedencia`.
- `justificacion_verificada` es 0/1 nullable; NULL = no declarada.

### `intento_preguntas` gana columnas

```sql
ALTER TABLE intento_preguntas ADD COLUMN respuesta_banco_id TEXT;
```

- Para preguntas miembro de `banco_opciones`, la respuesta del estudiante
  es un `id` del banco del grupo, no un `opcion_id`. Esta columna
  almacena ese id; `opcion_id` en `respuestas` queda NULL para esos
  miembros.

### `respuestas` admite opción NULL cuando hay banco

- Hoy `respuestas.opcion_id` es FK a `opciones.id` y NULL significa
  "saltada". A partir de aquí, NULL también puede significar "esta
  pregunta es de tipo `miembro_banco_opciones` y la respuesta está en
  `intento_preguntas.respuesta_banco_id`". La CHECK actual no necesita
  cambios porque sigue permitiendo NULL; la regla se valida en
  `server/services/calificacion.js` y en el importador.

## Invariantes

Las del estándar que el importador valida y rechaza en paquete entero
siguen valiendo (4 opciones para preguntas estándar, 1 correcta,
justificación por opción, imágenes existentes, tablas rectangulares,
metadata pedagógica obligatoria propia o heredada del grupo). Las nuevas
que añade v1.2.0+ y que esta feature valida:

- `grupo_id` de una pregunta existe en `grupos` de su banco, y su
  `tipo_item` coincide con el `tipo` del grupo.
- `respuesta_pool_id` existe en el `banco` del grupo y no es la entrada
  marcada `es_ejemplo`.
- `numero_blanco` es único dentro de cada grupo `texto_con_blancos`.
- `nivel_mcer` pertenece al catálogo cerrado MCER si está presente.
- `valor` es un número > 0 si está presente.
- `version_estandar` de la pregunta, si está presente, no es menor que la
  versión mínima que exigen los campos que esa pregunta usa (la tabla de
  v1.3.0 del estándar).

Y la invariante local que añade esta feature:

- **Exclusión de `{{numero:<id>}}`** — cualquier pregunta o grupo cuyo
  contenido (en cualquier bloque `texto` de contexto/enunciado/opciones/
  banco-de-grupo/contexto-de-grupo) contenga el marcador, queda fuera
  del banco en el momento de confirmar la importación. El docente ve una
  lista de las preguntas/grupos excluidos con el motivo, no puede hacer
  nada al respecto en esta versión, y el banco importado no los contiene.
  El validador de referencia solo comprueba que el `id` referenciado
  exista; OpenTest añade la regla de excluirlas porque no implementa la
  sustitución.

## Render del estudiante

`public/shared/pregunta.js` exporta una nueva función
`renderizarGrupo(grupo, { preguntas, ... })` para los tipos donde varias
preguntas comparten pantalla. La función `renderizarPregunta` existente
sigue siendo la pieza base para una sola pregunta, pero se ajusta para:

- **No asumir exactamente 4 opciones**: itera sobre `pregunta.opciones` y
  deja que el caller le pase las letras (`LETRAS` sigue siendo `A,B,C,D`
  por defecto, pero se puede extender). El render de matching no usa
  letras — usa el contenido del banco.
- **Saber leer `contexto` propio y del grupo**: cuando una pregunta
  miembro tiene `grupo_id` y su `contexto` propio está vacío, se omite
  pintar contexto duplicado; el caller (`renderizarGrupo` o el examen
  del estudiante) se encarga de pintar el contexto del grupo arriba.
- **Saber pintar una pregunta `miembro_banco_opciones`**: cada miembro
  recibe un selector (botones con el contenido de cada entrada del
  banco) en vez de opciones propias. La entrada marcada `es_ejemplo` no
  aparece como elegible.

`public/estudiante/examen.js` se actualiza para detectar cuando la
pregunta actual pertenece a un grupo:

- Si el grupo es `contexto_compartido`, pinta el contexto del grupo una
  sola vez encima de la pregunta miembro, y cada miembro ocupa un
  `orden` propio en `intento_preguntas` (la navegación sigue siendo una
  pregunta por pantalla, como hoy).
- Si el grupo es `banco_opciones` o `texto_con_blancos`, pinta todos los
  miembros en una sola pantalla con el banco o el pasaje arriba, y
  `pregunta_actual` apunta siempre al **primer** miembro del grupo
  mientras se esté en él. Al avanzar, se guardan las respuestas de todos
  los miembros a la vez y `pregunta_actual` salta al primer `orden`
  fuera del grupo.

La fila de tiempo mínimo por pregunta y la regla de "no responder antes
de N segundos" (`server/services/examen.js`) se aplican a la pregunta
miembro, no al grupo entero: el estudiante puede pasar al siguiente
miembro del grupo cuando el mínimo del actual se cumpla, y la pantalla
completa del grupo se considera "vista" cuando el primer miembro cumplió
su mínimo.

## Calificación

`server/services/calificacion.js` calcula puntaje y aciertos sumando
`valor` por defecto 1, leyendo la nueva columna. Para preguntas
`miembro_banco_opciones`, compara `intento_preguntas.respuesta_banco_id`
contra la entrada del banco marcada como correcta (que el importador
tradujo a un puntero estable: el `id` del banco del grupo cuyo contenido
se marcó como respuesta correcta al empaquetar). La invariante "1
pregunta = `valor` puntos" se mantiene exactamente como dice el
estándar.

## Criterios de aceptación

> **Nota de cierre (08/09/2026).** Verificados por la suite (412 tests en
> verde, lint y `git diff --check` limpios) y contra el importador real: la
> importación de los tres tipos de grupo, la exclusión por `{{numero:...}}`
> con aviso, la persistencia de los campos informativos y su salida en la
> exportación v3, la calificación con `valor` y matching por
> `respuesta_banco_id`, el sorteo que no parte grupos, el validador v1.4.0
> reemplazado, los contratos ampliados y el paquete
> `participacion-ciudadana-20-preguntas.zip` importando igual que antes.
> **Sin marcar a propósito** los criterios que exigen mirar la tablet o
> abrir el `.xlsx` en Excel/LibreOffice: igual que en las features
> anteriores, quedan para la sesión de validación física en el equipo
> destino (junto con el clic-a-clic de la pantalla de estadísticas y los
> botones de la 021/022).

- [ ] Un paquete v1.4.0 con un grupo `contexto_compartido` de 3 preguntas
  se importa entero; en la tablet, las 3 preguntas miembro comparten el
  mismo párrafo de contexto (pintado una sola vez, no repetido). *(importación verificada por test; render en tablet pendiente)*
- [ ] Un paquete v1.4.0 con un grupo `banco_opciones` (matching) de 5
  miembros y un banco de 8 palabras se importa entero; el estudiante ve
  las 8 palabras y las 5 descripciones en la misma pantalla, marca una
  palabra por descripción, y al entregar recibe un punto por cada
  respuesta correcta (5 puntos totales por el grupo, no 1). *(importación, render de API y calificación verificados por test; visual pendiente)*
- [ ] Un paquete v1.4.0 con un grupo `texto_con_blancos` (cloze) de 4
  espacios sobre un pasaje se importa entero; el estudiante ve el
  pasaje con los 4 huecos numerados y, debajo de cada hueco, las
  opciones que llenarlo, marca una opción por hueco, y al entregar
  recibe 4 puntos. *(idem)*
- [x] Un paquete con campos `grado`, `prueba`, `procedencia`,
  `verificado`, `fuentes` por pregunta, y `procedencia_justificacion` /
  `justificacion_verificada` por opción, se importa sin perder esos
  datos: la BD los guarda y la exportación de resultados los incluye.
- [x] Un paquete con `nivel_mcer` y `valor` por pregunta se importa y la
  calificación suma `valor` (con 1 por defecto) en vez de contar
  preguntas.
- [x] Un paquete que contenga el marcador `{{numero:<id>}}` en cualquier
  bloque de texto se importa con las preguntas y grupos afectados
  excluidos, y el docente ve una lista clara de qué se excluyó y por
  qué. No se importan preguntas miembro cuyo grupo tiene el marcador
  en el banco o en el contexto del grupo.
- [x] El validador `server/importers/estandar-preguntas-icfes.js` es la
  versión v1.4.0 del estándar, reemplazada tal cual (sin ediciones a
  mano) — el comentario del archivo sigue diciendo eso.
- [x] El contrato `paquete-preguntas-icfes.md` se amplía con la sección
  "Tipos de pregunta admitidos" sin retirar lo anterior (los paquetes
  v1.0.0 siguen importando igual).
- [x] La exportación de resultados (`export-resultados-v2.md`) sube a
  `formato_version: 3` con los campos nuevos opcionales, sin romper lo
  que ya consumía la 025.
- [x] El paquete de ejemplo `participacion-ciudadana-20-preguntas.zip`
  sigue importando y mostrando igual que antes (no usa grupos ni
  campos nuevos: verifica que la ampliación es aditiva). *(importación verificada contra el importador real; la visual es la de siempre, sin cambios de código en esa ruta)*
- [x] `npm test`, `npm run lint` y `git diff --check` en verde.
- [x] Ninguna ruta `/api/examen/*` expone `es_correcta`, `justificacion`,
  `valor` (si difiere de 1), ni la entrada correcta del banco de un
  grupo, antes de que el estudiante entregue. *(verificado por tests con `doesNotMatch` sobre la respuesta de la ruta, incluidos hermanos de matching)*

## Fuera de alcance

- **Implementar la sustitución de `{{numero:<id>}}`** — la sustitución
  del marcador por la posición real de la pregunta en el examen del
  estudiante es una feature aparte. El estándar la deja al consumidor y
  el examen actual de OpenTest tiene orden fijo por intento, así que la
  sustitución sería viable, pero no cabe en esta feature sin estirarla
  más. Lo que sí se hace es **excluir** las preguntas con el marcador
  para no mostrar contenido roto.
- **Mostrar los campos informativos en el panel del docente** — el panel
  sigue mostrando el banco igual que antes (metadata pedagógica de 6
  campos, contexto/enunciado/opciones, justificación). Los nuevos campos
  se guardan pero no se renderizan en `bancos.html`. Una feature futura
  puede añadirlos como pestañas o columnas.
- **Filtrar por `grado` o `prueba` al armar sesiones** — no se añade un
  selector de grado en la creación de la sesión. Los campos están
  guardados y exportados; usarlos para filtrar es otra feature.
- **Catálogo cerrado de `competencia`/`componente`** — siguen siendo
  texto libre, igual que en la 016. El estándar tiene esto como
  "Extensión futura" y OpenTest no lo aborda.
- **Migrar bancos anteriores a esta feature** — los bancos cargados
  antes de la 026 siguen leyéndose (sus campos nuevos quedan en blanco)
  pero no se les añade `valor` retroactivo: cuentan 1 punto por pregunta
  como hasta ahora.
- **Tocar la pantalla de proyección ni la del docente más allá del
  detalle del banco** — esta feature no cambia `proyeccion/` ni la lista
  de sesiones.
- **Bloques de contenido nuevos** (audio, fórmulas) — el estándar los
  marca como "Extensiones futuras" fuera de v1; OpenTest sigue aceptando
  solo `texto`, `imagen` y `tabla`.

## Riesgos

- **Tamaño de la migración de esquema**: 16 columnas nuevas en 4 tablas y
  una tabla nueva. Es trabajo mecánico con `ALTER TABLE ADD COLUMN` y
  todo es `NOT NULL DEFAULT ''` (o `1` para `valor`), así que es
  compatible con bases existentes. La tabla `grupos` no entra en
  conflicto con nada porque es nombre nuevo.
- **Coherencia entre BD y JSON**: `preguntas.contexto` sigue siendo
  texto/JSON serializado (igual que en la 016). El nuevo
  `grupos.contexto` y `grupos.banco` siguen el mismo patrón. La lectura
  pasa por `server/services/bloques.js` (existente) para no reinventar
  el helper.
- **Determinismo de la prueba**: los grupos rompen la asunción "un
  `orden` = una pantalla independiente". El cambio se hace *después* de
  que la prueba está materializada (cada miembro sigue ocupando un
  `orden` propio), no antes, así que el determinismo de la 005 se
  mantiene. Lo único nuevo es que la pantalla del estudiante tiene que
  saber resolver el grupo.
- **Tiempo mínimo por pregunta en grupos de varias preguntas en una
  pantalla**: si la pantalla es `banco_opciones` con 5 miembros y el
  mínimo por pregunta es 10 s, ¿el estudiante tiene que esperar 10 s por
  miembro (50 s) o 10 s para empezar a responder el primero? Decisión:
  se aplica 10 s al primer miembro mostrado, y los siguientes heredan
  ese visto bueno mientras siga en la misma pantalla. Se documenta en
  el plan.
- **Tests del fixture `banco()`**: los tests existentes de la 005, 006,
  007, 008, 009, 017, 018, 019, 020, 021, 022, 023, 024 y 025 usan un
  banco sin grupos. Esta feature debe pasar toda esa suite sin tocar
  sus asserts (igual que hizo la 017 con la 005) — es la prueba de que
  la ampliación no rompió el camino sin grupos.