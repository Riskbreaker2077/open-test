# Tech stack y convenciones

_La referencia técnica que ningún plan de feature debería contradecir._

## Tecnologías

- **Lenguaje:** JavaScript moderno (ES2023+), ES modules (`"type": "module"`). Sin TypeScript, sin transpilación.
- **Runtime / framework:** Node 22 LTS + Express 5.
- **Base de datos:** SQLite mediante `better-sqlite3` (API síncrona, sin ORM). Un único archivo: `data/opentest.db`.
- **Frontend:** HTML + CSS + JavaScript vanilla con ES modules nativos, servido estático por Express. **Cero paso de build**, cero framework, cero dependencias de frontend.
- **Tests:** runner nativo `node:test` + `node:assert/strict`. Sin Jest, Vitest ni similares.
- **Despliegue:** no hay. Corre en el portátil del docente. Se distribuye como ejecutable único (`npm run build:exe`) o como carpeta con `npm start`.

## Archivos / módulos clave

- `server/app.js` — construye la app Express, monta rutas y estáticos. Exporta la app; no escucha.
- `server/index.js` — punto de entrada: abre la BD, arranca el servidor en `0.0.0.0` e imprime la URL de intranet.
- `server/db.js` — abre la conexión SQLite y aplica el esquema/migraciones al arrancar.
- `server/schema.sql` — definición de todas las tablas, siempre en su forma actual.
- `server/migraciones.js` — lista ordenada de pasos idempotentes para poner al día una base ya creada.
- `server/routes/docente.js` — API del panel del docente (`/api/docente/*`).
- `server/routes/examen.js` — API del estudiante (`/api/examen/*`).
- `server/services/` — lógica de dominio: `personalizacion.js`, `calificacion.js`, `sesiones.js`, `auth.js`, `bancos.js`, `examen.js`, `bloques.js` (leer/escribir los bloques de contenido de una pregunta).
- `server/qr.js` — generador de códigos QR sin dependencias, para la pantalla de proyección.
- `server/importers/` — `estudiantes.js`, `preguntas.js`, `paquete-zip.js`, `csv.js` (parser propio compartido) y `estandar-preguntas-icfes.js` (validador del estándar externo, vendorizado).
- `server/exporters/` — `resultados.js`, que produce los tres archivos del contrato v2.
- `public/docente/` — interfaz del docente.
- `public/proyeccion/` — la pantalla que se proyecta al aula.
- `public/estudiante/` — interfaz del examen.
- `public/shared/` — CSS de base y utilidades JS comunes.
- `scripts/lint.js` — revisión de sintaxis de todo el JavaScript, sin dependencias.
- `data/opentest.db` — la base de datos. `data/uploads/imagenes/` — imágenes de las preguntas. **No se versionan.**

## Comandos

- `npm start` — arranca el servidor local y muestra la URL para las tablets.
- `npm run dev` — igual, con `node --watch`.
- `npm test` — ejecuta la suite (`node --test`).
- `npm run lint` — revisa el estilo.
- `npm run build:exe` — genera el ejecutable único para el docente.

## Superficies y rutas

Las tres superficies de `mission.md` se traducen en tres espacios de URL, y la separación se aplica en el servidor, no solo escondiendo enlaces:

| Superficie | Páginas | API | Protección |
|---|---|---|---|
| Portal del estudiante | `/` (raíz, la dirección estable del QR) | `/api/examen/*` | Abierta; el código del estudiante identifica, no autentica |
| Pantalla de proyección | `/proyeccion/` | `/api/docente/*` | Contraseña de docente |
| Panel del docente | `/docente/*` | `/api/docente/*` | Contraseña de docente |

- **La raíz es del estudiante.** Es la dirección que se dicta, se proyecta y va en el QR, y no cambia nunca de una evaluación a otra. Ninguna página del estudiante enlaza al panel del docente.
- **Todo `/api/docente/*` exige sesión autenticada**, sin excepciones. Un endpoint nuevo bajo ese prefijo queda protegido por omisión, no por acordarse.
- La pantalla de proyección está tras la contraseña aunque la vea toda la clase: la abre el docente en su portátil y la proyecta. Que sea visible no significa que sea accesible desde una tablet.

## Evolución del esquema

`schema.sql` se aplica entero en cada arranque y describe siempre la forma **actual** de las tablas. Pero `CREATE TABLE IF NOT EXISTS` solo crea lo que falta: no añade una columna nueva ni amplía un `CHECK` en una base que ya existe, y el `.db` del docente puede llevar semanas con sus estudiantes y sus bancos dentro.

Por eso hay un contador `esquema_version` en `config` y una lista ordenada en `server/migraciones.js`:

- Una base **nueva** nace con el esquema al día y se marca directamente en la última versión.
- Una base **existente** aplica solo los pasos que le falten, en una transacción, y con `foreign_key_check` al terminar.
- Volver a arrancar no hace nada: los pasos son idempotentes.

Añadir una columna es un `ALTER TABLE ADD COLUMN` condicionado. Cambiar un `CHECK` obliga a rehacer la tabla, porque SQLite no sabe modificarlo; se usa la receta estándar (crear, copiar, borrar, renombrar) con las claves foráneas desactivadas durante el paso.

**Esto no es un sistema de migraciones**: es una lista que se recorre una vez. No hay reversión ni ramas. Si un paso necesita deshacerse, se escribe otro paso.

## Modelo de datos

Tablas SQLite. Se documentan los campos no obvios y, sobre todo, **las invariantes**.

### `config`
- `clave` TEXT PK, `valor` TEXT — ajustes del equipo en formato clave/valor.
- Guarda `docente_hash` y `docente_salt` (contraseña del panel, derivada con `scrypt`). **Nunca la contraseña en claro.**

### `estudiantes`
- `codigo` TEXT PK — el código institucional con el que el estudiante entra. Es su identidad; no hay contraseña.
- `nombres`, `apellidos`, `curso` TEXT NOT NULL.
- Invariante: `codigo` único. Reimportar la lista actualiza por `codigo`, nunca duplica.

### `bancos`
- `id` INTEGER PK, `nombre` TEXT, `creado_en` TEXT (ISO 8601).
- Un banco es el paquete de 40–50 preguntas que el docente carga de una vez.

### `preguntas`
Sigue el estándar externo **preguntas-icfes v1**
(github.com/riskbreaker2077/preguntas-icfes; contrato local en
`spec/contracts/paquete-preguntas-icfes.md`).

- `id` INTEGER PK, `banco_id` FK → `bancos.id`.
- `contexto` TEXT NOT NULL DEFAULT `'[]'` — JSON de un array de **bloques**
  (`{tipo: "texto"|"imagen"|"tabla", ...}`), nunca texto plano. Array vacío =
  sin contexto propio.
- `enunciado` TEXT NOT NULL — igual que `contexto`, JSON de bloques; nunca vacío.
- `imagen` TEXT NULL — **columna heredada, sin usar desde la 016.** Las
  imágenes ahora son bloques dentro de `contexto`/`enunciado`/opciones.
- `competencia`, `componente`, `afirmacion`, `evidencia`, `estandar_asociado`,
  `que_evalua` TEXT NOT NULL DEFAULT `''` — la tabla de especificaciones de la
  pregunta. En blanco solo en bancos cargados antes de la 016 y no
  reimportados; el importador exige que un paquete nuevo los traiga todos.
- Se leen con `server/services/bloques.js` (`analizarBloques`): si el
  contenido no es JSON válido (banco anterior a la 016), se envuelve como un
  único bloque de texto en vez de romper.

### `opciones`
- `id` INTEGER PK, `pregunta_id` FK, `texto` TEXT NOT NULL, `es_correcta` INTEGER (0/1), `justificacion` TEXT NOT NULL DEFAULT `''`.
- `texto` guarda JSON de bloques, igual que `contexto`/`enunciado` (el nombre
  de columna no cambió, pero ya no es texto plano).
- `justificacion` es la razón de esa opción en particular, correcta o no —
  **no** una única explicación general de la pregunta. En blanco solo en
  opciones de un banco anterior a la 016.
- **Invariante: exactamente 4 opciones por pregunta, exactamente una con
  `es_correcta = 1`, y las 4 con `justificacion` no vacía en un banco
  cargado desde la 016.** Se valida en la importación; un banco que la
  incumpla se rechaza entero.

### `sesiones`
- `id` INTEGER PK, `nombre` TEXT, `banco_id` FK.
- `cursos` TEXT — lista de cursos convocados, separada por comas.
- `n_preguntas` INTEGER — cuántas se sortean del banco para cada estudiante (por defecto 20).
- `duracion_minutos` INTEGER — temporizador global del examen.
- `segundos_minimos_pregunta` INTEGER — tiempo mínimo en pantalla antes de poder avanzar (por defecto 10; `0` desactiva el mecanismo).
- `nivel_feedback` TEXT — `solo_puntaje` | `aciertos` | `completo`. Por defecto `aciertos`.
- `preguntas_extra_por_rapidez` INTEGER — **por defecto 0 (desactivado)**. Mecanismo alternativo previsto pero no activo; ver backlog del roadmap.
- `estado` TEXT — `borrador` | `abierta` | `en_curso` | `pausada` | `cerrada`.
- `comenzada_en` TEXT NULL — momento en que el docente pulsó "Comenzar". Marca el arranque del **reloj global**.
- `pausada_en` TEXT NULL — si está en pausa, cuándo empezó.
- `segundos_pausados` INTEGER — total acumulado de pausas, que se suma al plazo.
- **Pueden coexistir varias sesiones abiertas**: 10A en Ciencias mientras 10B está en Matemáticas. El estudiante ve en el portal las que estén convocadas para su curso.
- **El reloj es de la sesión, no del estudiante.** El plazo termina en `comenzada_en + duracion_minutos + segundos_pausados`; todos acaban a la misma hora, y quien entra tarde dispone de menos tiempo. Es el mismo reloj que se proyecta y el que ve cada tablet.
- Invariante: los parámetros de una sesión **no se pueden modificar una vez abierta**; cambiarlos a mitad del examen produciría pruebas incomparables.
- Invariante: solo se responde mientras la sesión está `en_curso`. En `abierta` el estudiante ya entró pero espera; en `pausada` el reloj se detiene y nadie puede responder.

### `intentos`
- `id` INTEGER PK, `sesion_id` FK, `codigo_estudiante` FK → `estudiantes.codigo`.
- `semilla` TEXT — determina íntegramente qué prueba le tocó a este estudiante. Se genera al iniciar y no cambia jamás.
- `token` TEXT — identifica al estudiante en las peticiones siguientes; se guarda en el navegador de la tablet.
- `iniciado_en`, `entregado_en` TEXT (ISO 8601, `entregado_en` NULL mientras presenta).
- `motivo_entrega` TEXT — `manual` | `tiempo` | `ultima_pregunta` | `forzada_docente`.
- `puntaje`, `aciertos` INTEGER — se calculan al entregar.
- `pregunta_actual` INTEGER — orden que estaba viendo; permite recargar o cambiar de tablet y retomar exactamente ahí.
- `pregunta_mostrada_en` TEXT NULL — inicio de la vista actual según el servidor; hace exigible el tiempo mínimo sin confiar en la tablet.
- Invariante: un `(sesion_id, codigo_estudiante)` como máximo. Un estudiante que ya entregó no puede volver a entrar.

### `intento_preguntas`
- `id` INTEGER PK, `intento_id` FK, `orden` INTEGER (1..N), `pregunta_id` FK.
- `orden_opciones` TEXT — la permutación de los ids de opción tal como se le mostraron, p. ej. `"14,12,15,13"`.
- **Invariante crítica: estas filas se escriben una sola vez, al iniciar el intento, y NUNCA se regeneran ni se reordenan.** Es lo que permite reanudar tras una caída y auditar después qué vio exactamente cada estudiante.

### `respuestas`
- `id` INTEGER PK, `intento_pregunta_id` FK UNIQUE.
- `opcion_id` FK NULL — **NULL significa saltada**; ausencia de fila significa que ni siquiera llegó a esa pregunta.
- `segundos_en_pantalla` INTEGER, `respondido_en` TEXT.
- Invariante: no se aceptan respuestas de un intento ya entregado.

## Convenciones

- `camelCase` en JavaScript, `snake_case` en SQL y en las columnas de los CSV.
- Los tests van junto al archivo que prueban: `personalizacion.js` + `personalizacion.test.js`.
- **Validación en el borde**: importadores y rutas validan toda entrada antes de tocar la BD. Los servicios asumen datos válidos.
- Los errores que ve el docente son mensajes **en español, accionables y con la fila del archivo**: "Fila 12: la columna `correcta` dice 'E', debe ser A, B, C o D".
- Rutas API: `/api/docente/*` (panel y proyección, autenticadas) y `/api/examen/*` (estudiante, abierta). Nada de la primera es alcanzable sin la contraseña del docente.
- Toda la interfaz y toda la documentación, en español.
- Fechas siempre en ISO 8601 y en hora local del servidor.

## Estilo visual

- Diseñado para tablet en manos de un adolescente: legible a un metro, objetivos táctiles de 44 px como mínimo.
- Una sola columna, un elemento principal por pantalla. Nada de menús anidados durante el examen.
- Alto contraste, tipografía del sistema (`system-ui`), tamaño base 18 px.
- Sin animaciones ni transiciones que distraigan o hagan dudar de si el toque registró.
- Estados de error y de "guardado" siempre visibles: el estudiante nunca debe preguntarse si su respuesta quedó.

## Límites duros

- **Ninguna petición de red saliente en runtime.** Ni fuentes web, ni CDNs, ni telemetría, ni comprobación de versiones. Todo activo se sirve desde `public/` o `data/`.
- **Ningún paso de build en el frontend.** Si un cambio necesita compilarse para funcionar en el navegador, está mal planteado.
- **No añadir dependencias** sin justificarlo en el `plan.md` de la feature. El objetivo es un `package.json` que quepa en una pantalla.
- **La API del estudiante nunca expone `es_correcta`** ni ningún dato del que se deduzca, mientras el intento esté sin entregar.
- **No borrar ni truncar `data/opentest.db` desde código.** Ninguna ruta, ningún script de mantenimiento.
- **Ninguna página del estudiante enlaza ni revela el panel del docente.** Ni un enlace, ni un comentario en el HTML, ni un mensaje de error que delate la ruta.
- **La contraseña del docente nunca se guarda ni se registra en claro**, ni en la base, ni en logs, ni en respuestas de la API.
- **No modificar `spec_template/`.** Es la plantilla de referencia.
