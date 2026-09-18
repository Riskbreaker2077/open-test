# Bitácora de sesiones

Historial acumulativo del trabajo entre sesiones. `RESTART.md` conserva únicamente el estado operativo más reciente.

## 26/08/2026 — Sistema de restart

Se incorporó un mecanismo independiente de la herramienta usada por el agente. `RESTART.md`, en la raíz, queda como punto de entrada breve y reemplazable de cada sesión; esta bitácora conserva el contexto narrativo acumulado. También se añadió a `AGENTS.md` la obligación explícita de leer el restart al comenzar y actualizar ambos documentos al terminar.

El repositorio estaba limpio antes de estos cambios. La rama activa era `main`, un commit por delante de `origin/main`; el commit local era `5b7c94a`, correspondiente al portal del estudiante de la feature 013. El roadmap mantiene seis features en “Hecho” y la 013 como siguiente/en curso. Su implementación principal está construida, pero quedan seis criterios sin verificar porque dependen de las features 012, 006 y 007 o de una prueba física con tablet y QR.

La documentación del 25/08/2026 registra 234 tests en verde. Al intentar validarlos el 26/08/2026 dentro del entorno restringido de esta sesión, 14 archivos de test pasaron y 7 suites HTTP terminaron como procesos fallidos sin mostrar el error interno; por eso el resultado se registró como no concluyente, no como una regresión confirmada. El lint tampoco fue concluyente: su comprobador informó que no pudo validar los 50 archivos JavaScript. No se ejecutó el build y no se encontraron migraciones pendientes documentadas.

La próxima decisión queda abierta: completar primero lo que pueda verificarse de la 013 o comenzar la 012, que aporta la pantalla de proyección, el QR, el reloj global y los controles de la sesión. Después siguen la 006 y la 007.

## 26/08/2026 — Cierre de 013 e implementación de 012

Se cerró la feature 013 dentro de su alcance y se movió a “Hecho” en el roadmap. Sus seis criterios diferidos permanecieron sin marcar: el cierre documental no se usó para dar por verificadas integraciones que todavía dependen de otras features o de hardware real.

La feature 012 quedó implementada en backend y frontend. Se añadió un generador QR propio en modo byte, sin red ni dependencias, con salida SVG y una prueba que recupera la dirección desde la matriz. La máquina de estados de sesiones ahora permite comenzar, pausar y reanudar; el reloj global se calcula en el servidor, acumula las pausas y cierra la sesión al vencer. Tanto el vencimiento como el cierre docente entregan en una transacción todos los intentos pendientes, conservando los que ya habían sido entregados. La calificación no se adelantó artificialmente: sigue siendo responsabilidad de la feature 007.

La API protegida de proyección devuelve únicamente nombre de la evaluación, estado, dirección estable, segundos restantes y contadores. La vista `/proyeccion/?sesion=ID` muestra el QR, la dirección, el reloj y los contadores, interpola el reloj entre sincronizaciones, se resincroniza al recuperar visibilidad y ofrece Comenzar, Pausar/Reanudar y Cerrar con confirmación. La lista docente incorpora el acceso “Proyectar”. El estado del estudiante usa la misma función de tiempo restante del servidor.

La vista se comprobó en navegador a 1024×768 y 1920×1080: en ambas el documento tuvo exactamente las dimensiones del viewport, sin barras de desplazamiento. A 1920×1080 el reloj resultó de 205 px y la dirección de 36 px. La habilidad de navegador permitió detectar una ganancia de un segundo tras una pausa mínima; se corrigió cambiando el redondeo del tiempo pausado.

La suite completa terminó con 243 de 243 tests aprobados y el lint revisó 53 archivos sin errores. La 012 queda con 11 de 15 criterios verificados. Faltan escanear el QR con una tablet real, confirmar legibilidad física en aula/proyector y, con la feature 006, comprobar que la pausa bloquea respuestas y comparar visualmente el reloj de la tablet con el proyectado. No se ejecutó el build. Los cambios permanecen sin commit y `main` ya estaba un commit por delante de `origin/main`.

## 26/08/2026 — Flujo completo: features 006 a 010

Por decisión del usuario, todas las verificaciones manuales y físicas se agruparon para una única sesión final con el equipo destino. Esto permitió avanzar sin marcar como cumplido nada que requiriera tablet, proyector, Windows o Excel real.

Se terminó la integración de la 012 con la 006: el examen presenta una pregunta por pantalla, guarda antes de avanzar, conserva pregunta y respuesta al recargar, aplica el tiempo mínimo según reloj del servidor, bloquea durante la pausa y entrega al vencer el reloj. La navegación persistente añadió `pregunta_actual` y `pregunta_mostrada_en` mediante la migración 2. La 012 quedó en 13/15 criterios y la 006 en 18/20; sus pendientes son físicos.

La 007 incorporó una ruta común de entrega calificada para entrega manual, última pregunta, vencimiento, cierre de sesión y entrega forzada. La nota se persiste una sola vez. El resultado filtra datos en servidor: `solo_puntaje` no envía preguntas, `aciertos` envía solo el enunciado y la respuesta elegida, y `completo` añade opciones, correcta y explicación. Un estudiante puede volver con su código a una sesión cerrada para consultar el mismo resultado. El docente puede cambiar únicamente el nivel de feedback después del cierre. Quedó 11/12, pendiente la comprobación física de la pantalla.

La 008 añadió el panel de monitoreo con selector de sesión, datos de convocatoria, estados `sin_entrar`/`presentando`/`entregado`, avance, reloj global, resultados y contadores. Sondea cada cinco segundos y se detiene con la pestaña oculta. Permite forzar la entrega individual y cerrar la sesión con confirmaciones. La consulta con 40 convocados quedó ampliamente por debajo de 200 ms. Sus 14 criterios quedaron verificados.

La 009 aisló el contrato v1 en `server/exporters/`: detalle CSV, resumen CSV y JSON nacen de una sola estructura. Los CSV llevan BOM UTF-8, CRLF y escapado correcto; las cabeceras se comparan literalmente contra el contrato. El filtro por curso, nombres saneados, intentos sin entrega, preguntas no alcanzadas y orden materializado de opciones están probados. La exportación 40×20 tarda decenas de milisegundos. Quedó 15/16, pendiente abrir el archivo en Excel sobre Windows.

La 010 añadió rutas de datos/estáticos compatibles con SEA, búsqueda automática del siguiente puerto, apertura del panel en el navegador y cierre limpio. El script `build:exe` usa Node SEA y `postject` como dependencia exclusiva de desarrollo, y arma una distribución junto con servidor, estáticos, dependencias, guía y ejemplos existentes. Se escribió `GUIA-DOCENTE.md` con el flujo completo, plantillas, problemas frecuentes y prueba de humo. Los ejemplos originales del repositorio se conservaron y ahora tienen una prueba automática que confirma 10 estudiantes y 50 preguntas válidas. La construcción se rechaza explícitamente fuera de Windows; el binario real y la prueba sin Node quedan pendientes.

La suite final pasó 281/281 tests; el lint revisó 74 archivos y `git diff --check` quedó limpio. Todas las trece features aparecen implementadas en el roadmap. Los cambios siguen sin commit sobre `main`, que ya estaba un commit por delante de `origin/main`; tampoco se hizo push.

## 26/08/2026 — Prueba integral, línea visual y paquete ZIP

Se hizo una prueba integral en el navegador local del flujo docente y estudiante: acceso, creación y proyección de sesión, inicio, pausa, recarga, reanudación, respuesta, monitoreo, entrega, cierre, resultado y exportación. Durante la prueba se corrigió la pantalla de proyección para que el sondeo no reconstruya los controles en cada actualización y para que la confirmación de cierre use los contadores vigentes. También se corrigieron el cálculo de cruces al reutilizar el formulario de sesiones y un conflicto de identificadores en el enlace de resumen CSV. Una prueba aislada confirmó que un intento sin respuestas no recibe información reservada sobre las soluciones.

La feature 014 adaptó la línea gráfica institucional del proyecto hermano `portal-estudiantes` a todas las superficies de OpenTest. Se incorporaron la paleta, el logotipo local y el tratamiento editorial, sin dependencias de red. Se comprobó la interfaz a 320 px sin desbordamiento y se revisó visualmente la proyección. Además, las distintas salidas hacia el panel se convirtieron en botones visibles y la pantalla de una proyección cerrada ofrece una acción explícita para volver a Evaluaciones.

La feature 015 definió el contrato v1 para paquetes de preguntas y unificó la importación en una sola carga ZIP. El lector se implementó con capacidades nativas de Node, sin dependencias nuevas, y valida estructura, duplicados, cifrado, rutas inseguras y límites de tamaño antes de permitir la confirmación. El flujo de validación previa y confirmación quedó integrado en la pantalla docente de bancos.

Se creó `ejemplos/participacion-ciudadana-20-preguntas.zip`, un paquete de prueba de aproximadamente 13 MB con 20 preguntas, imágenes educativas locales y retroalimentación. El contenido se contrastó con fuentes oficiales colombianas. El paquete se importó en los datos locales como banco 2 y se preparó la sesión 4, `Participación ciudadana · Prueba manual`, para los cursos 10A y 10B, con 20 preguntas, 30 minutos y retroalimentación completa. Como `data/` no se versiona, esa sesión solo viajará a la máquina destino si se copia la base de datos; en caso contrario, el ZIP queda listo para importarla de nuevo. Las pruebas de rutas también se aislaron para eliminar únicamente las imágenes creadas por cada prueba y no tocar datos reales.

La validación final terminó con 286 de 286 tests aprobados, lint sobre 76 archivos sin errores y `git diff --check` limpio. El servidor quedó apagado. Todos los cambios acumulados permanecen sin commit en `main`, que estaba un commit por delante de `origin/main`; no hay ramas sin fusionar. La próxima sesión será la prueba manual en Windows con las tablets y el proyector, incluyendo alcance por red local, escaneo QR, legibilidad, sincronía de relojes, bloqueo por pausa, resultado en tablet, exportación abierta en Excel y ejecución del paquete SEA sin Node instalado.

## 28/08/2026 — Estándar preguntas-icfes (feature 016)

Antes de esta feature, se creó un repositorio nuevo e independiente,
`preguntas-icfes` (github.com/riskbreaker2077/preguntas-icfes, público, con
GitHub Pages), que define un estándar abierto para preguntas tipo ICFES:
metadata pedagógica obligatoria (competencia, componente, afirmación,
evidencia, estándar asociado, qué evalúa), contenido en bloques
(texto/imagen/tabla combinables) y justificación individual por cada una de
las 4 opciones. Nace para que OpenTest y el proyecto hermano
`portal-estudiantes` dejen de inventar su propio formato cada uno.

La feature 016 migró el banco de preguntas de OpenTest para consumir ese
estándar. Se vendorizó el validador de referencia (sin dependencias) en
`server/importers/estandar-preguntas-icfes.js`; `preguntas.js` quedó reducido
a comprobar tamaño/codificación y delegarle toda la validación de contenido.
Se retiró el importador CSV y las rutas HTTP de JSON plano: la única entrada
es el ZIP ya existente desde la 015, ahora con `paquete.json` en vez de
`banco.json`. El esquema ganó las 6 columnas de metadata en `preguntas` y
`justificacion` en `opciones`, todas `NOT NULL DEFAULT ''` (migración 3, sin
rehacer tablas). `contexto`/`enunciado`/`texto` de opciones pasaron a guardar
JSON de bloques; `server/services/bloques.js` los lee de forma tolerante,
envolviendo en un bloque de texto el contenido plano de un banco anterior a
esta feature en vez de romperlo — esos bancos siguen viéndose, pero con la
metadata en blanco hasta que se reimporten.

`public/shared/pregunta.js` pasó de pintar strings a iterar bloques, con una
clase nueva `.pregunta__tabla`; sus tres consumidores (previsualización y
detalle del docente, examen del estudiante) no cambiaron su forma de
llamarlo. La retroalimentación de nivel `completo` muestra la justificación
de cada opción en vez de una única explicación general, y se comprobó
explícitamente que ninguna ruta abierta al estudiante filtra `justificacion`
antes de entregar, con la misma disciplina que ya existía para `es_correcta`.
La exportación de resultados subió a `formato_version: 2`
(`export-resultados-v2.md`): el JSON pierde `explicacion` y gana metadata y
justificación por opción; el CSV de detalle solo gana una columna
`competencia` al final.

Se regeneraron los dos ejemplos: `ejemplos/banco-ejemplo.json` (50 preguntas
genéricas, reemplaza al CSV) y `ejemplos/paquete-participacion-ciudadana`
(paquete.json + zip reconstruido), con las 20 preguntas originales sobre
mecanismos de participación ciudadana ahora completas: metadata pedagógica y
justificación redactada para cada una de las 80 opciones. Se creó
`server/fixtures-preguntas.js` para no repetir el modelo completo en cada
test de otro módulo, y se migraron a él los ocho archivos de test que
armaban bancos con el formato plano anterior.

**Aviso para la máquina destino:** `data/opentest.db` local (no versionado)
todavía tiene el banco "Participación ciudadana" en el formato anterior a
esta feature. Al abrirlo, la migración 3 le añade las columnas nuevas en
blanco automáticamente, pero ese banco no tendrá metadata ni justificación
por opción hasta que se reimporte con el `paquete.json` regenerado.

La suite completa terminó con 295 de 295 tests aprobados y lint sobre 79
archivos sin errores. No se hizo la prueba manual en navegador (fuera del
alcance de este cambio, que es de datos/backend) ni commit: los cambios
quedan pendientes de revisión y aprobación explícita del usuario antes de
confirmarlos.

## 28/08/2026 — Commit de 014-016, correcciones de revisión y feature 017

Se revisó y aprobó todo el trabajo acumulado de las features 014, 015 y 016,
y se comiteó en un solo commit (`1b42496`) porque los cambios de archivo
estaban entrelazados entre las tres. `main` quedó por delante de
`origin/main`, sin `push`.

Una revisión de código sobre ese commit encontró tres problemas reales, que
se corrigieron y comitearon aparte (`5d29fcf`): `pausarSesion` no comprobaba
el tiempo restante antes de pausar, así que pausar justo cuando el reloj ya
había llegado a cero dejaba la sesión aparentemente pausada hasta que el
siguiente sondeo la cerraba en silencio — ahora pausar con el reloj vencido
cierra la sesión de una vez, igual que el vencimiento normal. `leerZip()`
confiaba en el tamaño descomprimido que el propio ZIP declara para el tope
global de 50 MB, pero `inflateRawSync()` descomprimía cada entrada entera
antes de comparar ese tamaño contra el real: una entrada que mintiera su
tamaño declarado podía inflar sin límite en memoria; ahora cada entrada se
descomprime con un tope igual a su propio tamaño declarado. Y
`armarExportacion()` asumía que siempre hay una opción correcta entre las
mostradas, lo que ya no es cierto si el banco cambia después de materializar
la sesión; ahora lanza un error claro en vez de un `TypeError` críptico.

Se implementó además la feature 017, sorteo balanceado por competencia:
`personalizacion.js` agrupa las preguntas del banco por `competencia` y
reparte los cupos de cada prueba en proporción al tamaño de cada grupo
(método del resto mayor), en vez de sortear uniformemente sobre todo el
banco. Un banco sin metadata de competencia (anterior a la 016) cae entero
en un único grupo y se comporta exactamente como antes. `bancos.js` ganó
`competencia` en `idsDePreguntasYOpciones` para que el dato llegue hasta el
motor. Toda la suite existente de la 005 quedó intacta sin tocar un solo
assert, que es la prueba de que no se rompió nada.

La suite completa terminó con 304 de 304 tests aprobados y lint sobre 79
archivos sin errores.

## 28/08/2026 — Exportación a Excel con diseño (feature 018)

Del backlog del roadmap: el panel de resultados ganó una cuarta descarga,
`.xlsx`, junto a las tres CSV/JSON del contrato v2. Antes de tocar código se
decidió explícitamente con el usuario cómo generarlo — un `.xlsx` es un ZIP
con XML adentro, y el proyecto nunca había *escrito* un ZIP, solo leído (la
015). Se optó por seguir sin dependencias nuevas, igual que el resto del
proyecto, en vez de añadir una librería como `exceljs`.

Se creó `server/exporters/zip-escritor.js`, un escritor de ZIP mínimo (sin
ZIP64, sin cifrado) con `deflateRawSync` de `node:zlib`, reutilizando el
`crc32()` ya exportado por `paquete-zip.js` en vez de reimplementarlo. Por
encima, `server/exporters/xlsx.js` arma las partes fijas de un libro
SpreadsheetML (Content Types, relaciones, `workbook.xml`, `styles.xml`) más
una hoja por entrada, con strings inline (sin tabla de shared strings),
cabecera en negrita con relleno de color, fila 1 congelada y ancho de
columna calculado por el contenido más largo de cada una.

En `resultados.js` se extrajeron `filasDetalle`/`filasResumen` de dentro de
`aDetalleCsv`/`aResumenCsv` (mismo resultado, ningún test cambió), para que
la nueva `aExcel()` arme las dos hojas ("Resumen", "Detalle") a partir de la
misma fuente de filas que ya usa el CSV, sin inventar un tercer formato de
columnas. La ruta `GET /sesiones/:id/export/:tipo` ganó el tipo `excel`, y
el panel (`resultados.html`/`.js`) un cuarto acceso.

Se decidió explícitamente que este Excel **no** entra al contrato
`export-resultados-v2.md`: es una vista de conveniencia para el docente, sin
consumidor externo, así que puede evolucionar sin subir versión de nada.

Fuera de la suite automatizada, se generó un libro de prueba con tildes,
`&` y `<` en los datos y se validó con las herramientas de Python del
sistema (`zipfile.testzip()` y `xml.dom.minidom` sobre las 7 partes XML):
ZIP íntegro, XML bien formado en todas. La apertura real en Excel/LibreOffice
sin diálogo de reparación queda para la sesión de validación manual final,
igual que las demás piezas visuales del proyecto.

La suite completa terminó con 315 de 315 tests aprobados (11 nuevos) y lint
sobre 83 archivos sin errores. Exportar 40 estudiantes × 20 preguntas a
Excel tomó ~134 ms, muy por debajo del límite de 2 s. Se comiteó (`e16de7c`,
más `775adeb` corrigiendo `RESTART.md`) y se hizo `push` a `origin/main`.

## 28/08/2026 — Estadísticas por pregunta y por competencia (feature 019)

Del backlog del roadmap: nueva pantalla `/docente/estadisticas.html` para
que el docente vea qué preguntas y qué competencias falla más el grupo. El
usuario pidió explícitamente cubrir **ambas** formas de alcance que se le
plantearon: una sesión cerrada concreta (como ya hacen resultados y
monitoreo) o acumulado por **banco**, sumando todas las sesiones cerradas
que lo usaron. Esto último es seguro de calcular porque `guardarBanco`
siempre inserta un banco nuevo — nunca reescribe uno existente — así que un
`banco_id` es una foto fija desde que se crea: reimportar es simplemente
otro banco distinto, no cambia el que ya existía.

`server/services/estadisticas.js` resuelve el alcance a una lista de
`sesion_id` (una sola, o todas las cerradas de ese banco) y ejecuta una
única consulta SQL agregada por `pregunta_id`, comparando `respuestas.opcion_id`
contra la opción `es_correcta` de esa pregunta — más simple que
`armarExportacion()` de la 009/016, que sí necesita reconstruir el orden
exacto de opciones mostradas para la auditoría; aquí ese orden es
irrelevante. La agregación por competencia suma conteos (veces mostrada,
aciertos) en vez de promediar los porcentajes ya calculados de cada
pregunta, para no pesar igual una pregunta vista 3 veces que una vista 300.

Dos rutas nuevas bajo `/api/docente/bancos/:id/`: `sesiones-cerradas` (para
poblar los selects en cascada del frontend) y `estadisticas` (el cálculo).
La UI (`estadisticas.html`/`.js`) sigue el patrón visual ya usado en
`resultados.html`, con tres selects en cascada (banco → alcance → curso) y
dos tablas ordenadas de menor a mayor % de acierto, usando la clase `.tabla`
que ya existía para el monitoreo en vivo.

Se verificó el flujo completo con un servidor desechable en `:memory:`
(banco con dos competencias, dos sesiones cerradas con estudiantes que
aciertan y fallan a propósito), sin tocar `data/opentest.db`: login real,
las páginas nuevas sirven 200, y las dos rutas devuelven datos correctos
por HTTP. No se pudo hacer clic-a-clic en un navegador real porque este
entorno no tiene una herramienta de automatización de navegador disponible;
esa verificación visual queda para la sesión de validación manual final.

La suite completa terminó con 329 de 329 tests aprobados (14 nuevos) y lint
sobre 87 archivos sin errores. La consulta agregada sobre 8000 filas de
`intento_preguntas` (10 sesiones × 40 estudiantes × 20 preguntas) tomó
~20 ms, muy por debajo del límite de 2 s. Cambios sin commit.

## 28/08/2026 — 020 · Gestión manual de estudiantes

Por pedido del usuario ("Creemos la opción para que esto sea posible"),
se implementó la feature 020 como flujo complementario a la importación por
archivo de la 002. La pregunta directa fue si se podía crear un estudiante
manualmente: la 002 lo dejó explícitamente fuera de alcance ("se corrige el
archivo y se reimporta"), y en la sesión se confirmó por código que no había
ningún endpoint de creación ni edición individual. La elección de alcance
fue **crear y editar**, descartando eliminación masiva y dejando el cambio
de `codigo` para una feature aparte (rompería la FK de `intentos`).

Decisiones técnicas: la validación de los cuatro campos del contrato
(`codigo`, `nombres`, `apellidos`, `curso`) se extrajo del importador a una
función reutilizable (`validarEstudianteIndividual`) para que el modal y la
importación compartan los mismos mensajes en español. Las dos rutas nuevas
(`POST /api/docente/estudiantes` y `PUT /api/docente/estudiantes/:codigo`)
viven bajo `/api/docente/*`, así que la contraseña del docente las protege
sin código nuevo. Errores tipados: `400` con `errores[]` cuando la validación
falla (varios problemas a la vez, no uno por uno, como pidió el criterio),
`409` cuando el código ya existe al crear, `404` al editar un código que no
está. Al editar, el `codigo` del body se ignora aunque venga: nunca cambia
porque es la identidad y la FK de `intentos.codigo_estudiante`.

El frontend usa el elemento `<dialog>` nativo: accesible por teclado
(`Esc` cierra, `Tab` recorre los campos en orden), cerrable con la X del
navegador, sin CSS nuevo en `base.css` — los estilos mínimos del modal
quedan en un `<style>` local del archivo. La misma función `abrirEditor`
sirve para crear y para editar; en modo edición el `codigo` queda
`readonly` y los otros tres campos prellenados. Al guardar con éxito,
`recargar()` repinta la lista sin recargar la página; el modal queda con
los campos en blanco y foco en el primer campo, listo para crear el
siguiente. Cada fila gana un botón **Editar** al lado de **Eliminar**.

La suite completa terminó con **345 de 345 tests aprobados** (16 nuevos:
9 en el servicio, 7 en la integración de las rutas) y lint sobre 87
archivos sin errores. Cambios sin commit.

## 08/09/2026 — Spec/plan/tasks de la 026 (sin código)

El estándar externo `preguntas-icfes` está en v1.4.0 y OpenTest solo había
adoptado v1.0.0 — un banco real de Sociales/Inglés con lecturas
compartidas, emparejamientos o *cloze* no se podía importar. El validador
vendorizado rechazaba cualquier paquete que declarara los tres tipos de
grupo de v1.2.0 (`contexto_compartido`, `banco_opciones`,
`texto_con_blancos`), los campos informativos de v1.1.0 (`grado`,
`prueba`, `procedencia`, `verificado`, `fuentes` por pregunta;
`procedencia_justificacion` y `justificacion_verificada` por opción) o los
nuevos campos de v1.2.0+ (`nivel_mcer`, `valor` por pregunta). El
estándar también añadió en v1.4.0 el marcador `{{numero:<id>}}` para los
pasajes *cloze*, que el validador solo valida como referencia pero no
sustituye.

Se decidió ampliar la adopción en una sola feature (026), no en tres
separadas, porque los cambios van juntos: validador, esquema, importador,
render y calificación tocan las mismas preguntas. Decisiones acordadas
con el usuario:

- Validador se reemplaza por la copia v1.4.0 upstream, sin ediciones a
  mano (la regla de la 016).
- Los campos informativos se guardan en la BD pero no se muestran en el
  panel del docente (queda para feature futura).
- El marcador `{{numero:<id>}}` se excluye del banco al importar, no se
  sustituye (la sustitución depende del orden de entrega, información
  que vive del lado de la plataforma; OpenTest tiene orden fijo por
  intento pero la implementación se aplaza).
- El tiempo mínimo por pregunta en matching/cloze se aplica al primer
  miembro de la pantalla del grupo; los hermanos heredan el visto bueno
  mientras el estudiante siga en esa pantalla. Confirmado por el
  usuario.
- Los grupos se materializan como filas separadas en `intento_preguntas`,
  una por miembro, con `grupo_id` para que el renderer las reúna en una
  sola pantalla cuando el tipo lo requiera. Así se mantiene la
  invariante crítica de la 005 (cada `orden` es una fila inmutable).

Se escribieron los tres documentos en
`spec/features/026-grupos-de-preguntas/`:

- `spec.md` — alcance, contrato, modelo de datos (migración v5: tabla
  `grupos` + 16 columnas nuevas), invariantes, render del estudiante,
  calificación con `valor`, criterios de aceptación y fuera de alcance.
- `plan.md` — enfoque en cinco bloques (contrato+validador, esquema,
  importador, servicios+render, panel+export), decisiones con
  justificación, orden de implementación.
- `tasks.md` — 29 tareas granulares, ya marcadas como `[ ]`.

Cambios sin commit. `RESTART.md` actualizado para apuntar a la 026 como
siguiente tarea.

## 08/09/2026 — 026 · Grupos de preguntas y campos informativos (implementación)

Implementación completa de la 026 en una sola sesión, siguiendo el orden del
plan (contrato+validador → esquema → importador → servicios → render →
panel+export → tests → ejemplo/guía).

- **Validador v1.4.0**: reemplazado entero desde upstream
  (github.com/riskbreaker2077/preguntas-icfes, rama `main`). Los mensajes ya
  venían en español. Cualquier test que dependa de la regla vieja de
  "exactamente 4 opciones" se actualizó: v1.2.0 exige 2+.
- **Migración v5**: tabla `grupos` + columnas nuevas. Una lección: el índice
  `idx_preguntas_grupo` no puede vivir en `schema.sql` porque sobre una base
  antigua el `CREATE TABLE preguntas` es un no-op y la columna `grupo_id` no
  existe aún cuando se aplica el esquema; se crea en `db.js` después de
  aplicar `schema.sql` y migraciones.
- **Sorteo con grupos**: las unidades son la pregunta standalone (peso 1) y el
  grupo entero (peso = miembros). Se detectó y corrigió un overshoot del
  fallback (podía superar `nPreguntas` al añadir un grupo completo); test de
  regresión incluido.
- **Seguridad**: `respuesta_pool_id` (la correcta del matching) nunca sale por
  `/api/examen/*`; verificado con `doesNotMatch` sobre la respuesta completa,
  incluidos los hermanos del grupo. `guardarRespuesta` valida el
  `respuestaBancoId` contra el banco del grupo y rechaza el id `es_ejemplo`.
- **Render**: `renderizarGrupo` cubre los tres tipos y lo consumen el examen
  del estudiante y el panel del docente (misma función, sin divergencias).
  Matching y cloze se rinden en una sola pantalla; contexto compartido, una
  pregunta por pantalla con el contexto arriba.
- **Exportación v3**: JSON con `banco.grupos` y campos informativos; hojas
  Detalle y Banco con columnas nuevas; `export-resultados-v2.md` obsoleto.
- **Ejemplo**: `ejemplos/banco-grupos-ingles.zip` (10 preguntas, un grupo de
  cada tipo), validado contra el importador real. El validador mismo detectó
  un error del primer borrador: la entrada `es_ejemplo` no puede ser respuesta
  de una pregunta real.
- **Guía**: `GUIA-DOCENTE.md` ganó la sección "Tipos de pregunta admitidos"
  con el aviso de exclusión por `{{numero:...}}`; de paso se corrigió la
  sección de descargas (aún listaba los CSV/JSON que la 025 retiró).

Estado final: 412 tests en verde, lint limpio, `git diff --check` limpio.
Todo sin commit (hay tres lotes mezclados: 020, fix de postject, 026).
Criterios visuales (tablet, proyector, Excel real) aplazados a la sesión de
validación física, como en las features anteriores. `RESTART.md`
actualizado.

## 09/09/2026 — Cierre de la 026 y 027 · Recuperación de la contraseña

La sesión empezó retomando la nota del restart de que había tres lotes sin
commitear. Resultó incorrecta: `git log` mostró que la 020 (`a64331d`) y el fix
de `postject` (`8a061d7`) ya estaban commiteados. Solo quedaba el lote de la 026,
que se verificó (412/412 tests, lint de 90 archivos) y se commiteó como un solo
commit (`edec510`, 42 archivos) y se pusheó.

Luego se implementó la 027 siguiendo el protocolo SDD: spec, plan y tasks en
`spec/features/027-recuperar-contrasena/` antes de tocar código. El diseño lo
fijó la propia 011: la recuperación exige acceso físico al equipo y no vive en
la interfaz web (ni enlace, ni aviso en la pantalla de entrada; las preguntas de
seguridad y el correo quedaron descartados por los límites de `mission.md`).

La implementación es `server/recuperacion.js`, con `esModoRecuperacion` (función
pura sobre argv), `restablecerContrasena` (función pura testeable que reutiliza
`establecerContrasena` de la 011: misma regla de longitud, sal nueva, transacción
sobre `config`) y `recuperarContrasena` (flujo de consola con entrada/salida/
rutaBd/abrir inyectables). El gancho va en `server/index.js` antes de abrir la
base o calcular puertos; sin el parámetro el arranque es idéntico, y el SEA lo
recibe gratis porque `sea-entry.cjs` importa ese mismo `index.js`.

Tres bugs del propio desarrollo se encontraron con tests: (1) el lector de
entradas sin TTY descartaba el resto del trozo después del primer `\n` y
consumía el evento `end`, colgando la segunda lectura; se creó `crearLector`
con un búfer compartido por flujo; (2) el alias de guión simple estaba mal
construido (`slice(1)` ya quita un guión y se le agregaba otro); (3) el
`argv.slice(2)` de la detección rompía el caso SEA, donde el ejecutable es
`argv[0]` y el parámetro llega en `argv[1]`; se cambió por un filtro de
elementos que empiezan por guión.

La suite quedó en 426/426 (412 + 14 nuevos) y el lint en 92 archivos limpios.
`GUIA-DOCENTE.md → Olvidé la contraseña` se reescribió con el procedimiento
paso a paso y el criterio pendiente de la 011 quedó marcado apuntando a la 027.
Pendiente solo la verificación física del diálogo en una terminal Windows real
(máscara por carácter y `Ctrl+C`), en cola con la sesión de validación final.

## 14/09/2026 — Validación final en equipo destino

El usuario realizó la sesión física única en el equipo destino que quedaba
como último punto del roadmap: QR y legibilidad en proyector, corte de red,
usabilidad táctil, línea gráfica, apertura del `.xlsx` en Excel/LibreOffice,
pantalla de estadísticas (019), botones de la 021/022, el recorrido completo
de los tres tipos de grupo de la 026 con `ejemplos/banco-grupos-ingles.zip`
(lectura compartida, matching, cloze y el aviso de exclusión
`{{numero:...}}`), y el diálogo `OpenTest.exe --recuperar-contrasena` de la
027 (máscara de escritura y contraseña nueva aceptada al reabrir).

Confirmó que todo el checklist funcionó sin novedades. No quedan criterios
diferidos por hardware real en ninguna feature del roadmap original; el
encargo inicial queda completo. `roadmap.md` mueve la validación a "Hecho" y
vacía `Siguiente`; `RESTART.md` refleja que no hay feature en curso. Lo que
siga, si se decide continuar, sale de `roadmap.md → Backlog / ideas`.

## 14/09/2026 — 028 · Ingreso manual de preguntas

Con el roadmap original completo, el usuario pidió una feature nueva: un
docente que no arma el ZIP del estándar preguntas-icfes (por ejemplo, porque
no usa una IA como asistente) debía poder escribir sus preguntas directamente
en el panel. Antes de tocar código se acotó el alcance con tres preguntas: (1)
formulario **mínimo** — contexto opcional, imagen opcional, enunciado y 4
opciones, sin competencia/componente/grado/prueba ni grupos de matching/cloze;
(2) un banco para esto se crea **vacío desde el panel**, no solo agregando a
uno ya importado; (3) las preguntas creadas a mano se pueden **editar y
eliminar**, simétrico a la 020 con estudiantes.

Se siguió el protocolo SDD completo: spec, plan y tasks en
`spec/features/028-ingreso-manual-preguntas/` antes de escribir nada. La
implementación reutiliza al máximo lo que ya existía: `server/services/
bancos.js` gana `crearBancoVacio`, `validarPreguntaManual` (todos los errores
a la vez, como `validarEstudiante`), `agregarPreguntaManual` y
`actualizarPreguntaManual`/`eliminarPregunta` — estas dos últimas con dos
guardas 409: una pregunta miembro de un grupo del ZIP no se toca desde aquí,
y una pregunta que ya aparece en `intento_preguntas` (ya se usó en una
evaluación) tampoco, mismo principio que `borrarBanco` (009) y `borrarSesion`
(022) aunque no era un requisito explícito del usuario. Cuatro rutas nuevas
en `docente.js` (`POST /bancos`, `POST /bancos/:id/preguntas`, `PUT
/preguntas/:id`, `DELETE /preguntas/:id`), mismo estilo try/catch que
estudiantes. El frontend añade a `bancos.html`/`bancos.js` un botón "+ Nuevo
banco vacío", un botón "+ Agregar pregunta" en el detalle de cualquier banco
(no solo los vacíos: técnicamente no distingue el origen) y un `<dialog>` con
4 filas de opción fijas (radio + texto + justificación opcional), reutilizando
la subida de imágenes ya existente y `renderizarPregunta` para pintar el
resultado igual que una pregunta importada. Cada pregunta suelta del detalle
gana botones Editar/Eliminar.

La suite subió a 446/446 (20 tests nuevos de servicio, 6 de integración de
rutas) y el lint se mantuvo en 92 archivos limpios. No hubo forma de probar
visualmente en navegador (la extensión Claude in Chrome no estaba conectada
en esta sesión); se verificó por revisión estática cuidadosa de que todos los
`id` del HTML y el JS coinciden, además de la cobertura de integración HTTP
real (con `crearApp` + `fetch`, no mocks). `GUIA-DOCENTE.md` gana la sección
"Escribir preguntas una a una, sin ZIP". La feature queda en "Hecho ✅" en
`roadmap.md`.

## 14/09/2026 — 029 · Instalador de Windows, GitHub Pages y README

Mismo mensaje del usuario que pidió la 028 traía tres pedidos más: instalador
de Windows, una página del proyecto en GitHub Pages y un README más cuidado.

**029 (instalador).** La 010 dejó el instalador explícitamente fuera de
alcance ("se distribuye el ejecutable tal cual") mientras el producto estaba
en construcción; con el roadmap completo, se revirtió esa decisión y se
documentó por qué en `spec/features/029-instalador-windows/`. Se escribió
`scripts/installer/opentest.iss` (Inno Setup 6): empaqueta `dist/
OpenTest-Windows` (la salida de `build:exe`, sin tocarla), instala sin pedir
administrador (`%localappdata%`) y excluye `data\` del paquete a propósito
para que reinstalar sobre una copia con evaluaciones cargadas no las borre —
el desinstalador de Inno tampoco la toca porque nunca la instaló.
`scripts/build-installer.js` sigue el mismo patrón que `build-exe.js`: se
niega a correr fuera de Windows y explica qué falta si `ISCC` no está en el
PATH. **Limitación honesta:** esta sesión fue en un Linux sin Windows ni Inno
Setup instalados, así que el `.iss` se escribió y se revisó con cuidado
contra la documentación de Inno pero **nunca se compiló de verdad**. Queda
marcado como pendiente tanto en su `spec.md` como en el roadmap, para la
próxima sesión con equipo Windows real — el mismo tipo de pendiente que ya
tuvieron 012, 018 y 026 antes de su validación física.

**Sitio de GitHub Pages.** `docs/index.html`: una página de presentación
estática, sin paso de build ni dependencias externas (CSS inline, ícono SVG
embebido), con la misma paleta e identidad tipográfica que `public/shared/
base.css` — qué es OpenTest, cómo funciona de punta a punta, las funciones
actuales y las decisiones de diseño. Se decidió **no** usar `public/assets/
logo-institucional.png` como marca del sitio: ese archivo es el escudo real
de un colegio (Santa Teresa de Jesús) usado como ejemplo de la línea gráfica
adaptable (014) dentro de la app, y ponerlo como identidad pública del
proyecto en GitHub habría sugerido que OpenTest pertenece a ese colegio en
particular. Se optó por una marca tipográfica genérica en los mismos colores
institucionales. El repo tenía el scope `repo` disponible en `gh auth
status`, así que se activó Pages directamente por API
(`POST /repos/.../pages` con `source: main:/docs`), se esperó el build
(~20 segundos) y se verificó `HTTP 200` en `https://riskbreaker2077.github.io/
open-test/` antes de darlo por hecho. Con confirmación del usuario, también
se fijó esa URL como "Website" del repo (`PATCH /repos/.../ homepage`).

**README.md.** Ya no decía "en construcción" — quedó así desde antes de que
existieran la mitad de las features del roadmap. Se reescribió: enlaza la
página nueva, la guía docente y el roadmap arriba de todo, resume las
funciones que trae hoy el producto (incluidas 028 y 029) en vez de listar lo
que había hace meses, y agrega instrucciones para `build:exe`/`build:installer`.

**Lo que no se pudo hacer esta sesión:** ninguna prueba visual en navegador
real (la extensión Claude in Chrome no se conectó), y el instalador no se
compiló. Todo lo demás — 028, la página, el README, la activación de Pages —
se verificó de verdad antes de reportarlo como terminado: 446/446 tests, lint
de 93 archivos, y la URL de Pages respondiendo 200 en vivo.

---

## 15/09/2026 — 030: instalador compilado, probado y publicado

**Pedido.** El usuario quería el instalador descargable desde la web y también
dentro del repositorio. Eligió publicar como **1.0.0** y guardarlo en los dos
lugares: Releases y una copia commiteada en `instalador/`.

**Cómo se compiló sin Windows.** Esta sesión también fue en WSL, sin Node de
Windows ni Inno Setup. En vez de dejarlo pendiente otra vez, se armó un
workflow de GitHub Actions en `windows-2025`, cuya imagen trae Inno Setup 6. El
workflow corre los mismos `npm run build:exe` y `npm run build:installer`
documentados, sin un camino de build paralelo. La primera corrida
(`workflow_dispatch`, run 34968728449) fue también la primera compilación real
del `.iss` de la 029: compiló en 22 s y el instalador pesa 52,9 MB.

**Defecto encontrado antes de compilar.** Al revisar la documentación de
`Excludes` de Inno Setup: un patrón sin barra inicial compara contra el
*final* de la ruta. `data\*,data` habría excluido cualquier archivo o carpeta
llamado `data` en cualquier nivel del paquete, `node_modules` incluido. Hoy
no hay ninguno, pero la próxima dependencia que traiga uno se habría roto en
silencio solo en el instalador. Quedó `\data,\data\*`, anclado a la raíz.

**La prueba de humo sustituye la verificación manual pendiente de la 029.**
Instalación silenciosa en una carpeta con espacios; `OpenTest.exe` arrancado
de verdad hasta responder HTTP 200 (prueba el blob SEA, `server/` junto al
ejecutable y el `better-sqlite3` nativo); reinstalación encima comparando el
hash de `data\opentest.db`; y desinstalación comprobando que la base
sobrevive. Si falla, no se publica.

**Nombre fijo `OpenTest-Setup.exe`.** `releases/latest/download/<nombre>`
necesita un nombre estable para que el botón del sitio no cambie con cada
versión. La versión se ve en "Agregar o quitar programas" y en el título de
la release.

**Costo aceptado de commitear el binario.** Cada versión agrega unos 50 MB al
historial de git. Se le explicó al usuario al preguntarle y lo eligió igual.
El workflow falla antes de hacer push si el instalador pasa de 95 MB (el
límite de GitHub es 100 MB).


## 15/09/2026 — 031 · Asistencia en la pantalla de proyección

El docente pidió ver en la pantalla del QR quién está conectado y quién falta. La regla original ("nada de nombres" en la proyección, en `mission.md` y en la 012) lo impedía, así que se le plantearon tres opciones: seguir con el monitoreo en una segunda pantalla, proyectar solo a los que faltan antes de comenzar, o la lista completa durante toda la prueba. Eligió la lista completa. Se corrigió `mission.md` antes que el código, como manda la jerarquía.

**Forma mínima en la API.** La proyección reutiliza `estadoDeSesion` (008) pero copia campo a campo solo nombre, curso y entregado. Así, si el monitoreo gana datos nuevos, no se filtran al proyector. El código del estudiante queda fuera a propósito: es con lo que se entra, y proyectarlo permitiría entrar por otro.

**Sin desplazamiento con cursos grandes.** Las listas usan una grilla `auto-fill` y una búsqueda binaria sobre el tamaño de letra hasta que caben. En la primera captura las filas se aplastaban: `overflow: hidden` en cada nombre anulaba su altura mínima. Se resolvió con `grid-auto-rows: max-content`.

## 15/09/2026 — Tiempo mínimo por pregunta por defecto: 60 s

El docente pidió que el tiempo mínimo por pregunta predeterminado sea de 1 minuto. Se corrigió primero el criterio de la 004 y `tech-stack.md`, y luego `POR_DEFECTO` y el valor inicial del formulario de evaluaciones. La columna `sesiones.segundos_minimos_pregunta` conserva `DEFAULT 10`: el servicio siempre escribe el valor explícito, y cambiar un `DEFAULT` en SQLite exige reconstruir la tabla con una migración que no aporta nada. Las evaluaciones ya creadas mantienen su valor.

## 15/09/2026 — 031 rediseñada: tablero de asistencia por colores

Al ver las dos listas, el docente precisó lo que quería: un cuadro blanco por estudiante que se pone verde al entrar, rojo si sale y sigue verde al terminar. La diferencia de fondo es "salió", que las listas no mostraban.

**Presencia por silencio y en memoria.** Una tablet que se cierra o pierde el wifi no avisa. Pero el examen y la sala de espera ya consultan `/api/examen/estado` cada 5 s, así que `conIntento` deja una marca de "visto" en `server/presencia.js`. Con más de 15 s sin marca (tres sondeos perdidos) el estudiante cuenta como salido; "Pausar y salir" y "Salir" lo marcan al instante. Se descartó una columna en la base: habría exigido migración y una escritura en SQLite cada 5 s por tablet, para un dato que no se exporta. Tras un reinicio del servidor, las tablets vuelven a verde en su siguiente sondeo.

**Entregado sigue en verde**, con ✓ para distinguirlo, como pidió el docente. La leyenda en pantalla evita que el color sea la única pista.

**A 1024×768, 40 cuadros no cabían** ni con la letra mínima, porque QR y reloj se llevaban media pantalla. En 4:3 se achicaron el QR, el nombre y el reloj, y se bajó la altura mínima de cada cuadro.

## 15/09/2026 — 032 · Quitar "Pausar y salir" (revierte la 024)

Tras instalar la 1.1.0, el docente reportó como bug grave el botón "Pausar y salir" del examen. El problema de fondo es de diseño, no de implementación: la 024 lo conectó a la misma pausa del docente, así que cualquier estudiante podía detener el reloj y bloquear las respuestas de todo el grupo con un toque.

Se quitó de punta a punta, no solo el botón: una ruta viva seguiría llamable desde cualquier tablet con su cookie. Salen el botón y su lógica, `POST /api/examen/pausar` y `pausarIntentoComoEstudiante` con sus tests. Un test nuevo confirma que la ruta responde 404 y la sesión sigue `en_curso`. No se agregó un sustituto: cerrar la tablet ya es seguro, porque el examen se retoma donde iba (006) y la proyección la marca en rojo (031).

## 15/09/2026 — 033, 034 y 035: usabilidad, OpenTest sin consola y logo

Tras usar la 1.1.1, el docente pidió varios ajustes de una vez; se agruparon en tres features por naturaleza.

**033 · usabilidad.** La proyección no tenía salida que no fuera cerrar la prueba para todos: se agregó **Volver** y "Cerrar" pasó a **Finalizar**. Con grupos de 35 a 45 estudiantes los cuadros no cabían ni con la letra mínima: por encima de 30 convocados el servidor manda primer nombre y primer apellido y el tablero pasa a cuadros de una línea; el recorte vive en el servidor para que la regla tenga un solo sitio y test. Se retiró la exigencia de la 022 de descargar antes de borrar: estorbaba más de lo que protegía; la confirmación avisa si no hay descarga. Y la pantalla de resultados era una trampa: sin salida, y un enlace a `/` no bastaba porque el portal redirige a resultados a quien ya entregó; el botón nuevo cierra la sesión del estudiante antes.

**034 · sin consola.** `OpenTest.exe` sigue siendo de consola (la recuperación de contraseña de la 027 la necesita); lo que cambia es el acceso directo, que lo lanza oculto con un `.vbs` y `wscript.exe`, ambos nativos de Windows. Sin ventana aparecieron dos problemas que la ventana resolvía sola: cómo apagarlo (botón en el panel, que responde antes de apagar y cierra también las conexiones vivas de las tablets) y qué pasa al abrirlo dos veces (antes levantaba un segundo servidor en el puerto siguiente; ahora detecta el primero por `/api/salud` y solo abre el navegador). El instalador fuerza el cierre al actualizar para no chocar con archivos en uso.

**035 · logo.** El PNG entregado trae fondo casi blanco; se pasó a transparencia des-multiplicando el blanco para no dejar halo, se recortaron el logo completo y el cubo solo, y se generó un `.ico` (16/32/48 en mapa de bits, 256 en PNG). Todo con un script fuera del repo: no entra ninguna dependencia. En barras oscuras va el cubo sobre blanco: la palabra "open" es azul marino y no se leería.

## 15/09/2026 — 036 · Presencia casi inmediata

El docente conectó un estudiante, cortó el internet de la tablet y el cuadro tardó mucho en ponerse rojo. Las tres demoras se sumaban: sondeo de 5 s, umbral de 15 s y proyección cada 5 s, hasta ~25 s en el peor caso.

Se separó un **latido** ligero (`/api/examen/latido`, cada 2 s, solo con la página visible) del sondeo de estado, que calcula tiempo y avance y no conviene hacer cada 2 s. Salir de la prueba sin perder la red (cerrar, cambiar de app, bloquear) se avisa al instante con `sendBeacon` a `/api/examen/ausente`, así que ahí el rojo solo espera a la proyección (~2 s). Perder la red no puede avisarse: se baja el umbral a 6 s, tres latidos perdidos. Se le explicó al docente el costo: con un wifi que parpadea 6 s o más aparecen rojos falsos breves, que vuelven a verde solos.

## 18/09/2026 — 037 y 038: revisar sin castigo y anular desde el proyector

Dos mejoras pedidas tras aplicar evaluaciones con la 1.2.1. Antes de empezar, la copia local del repo estaba 37 commits atrás (iba por la 005) y se puso al día: conviene comprobarlo al abrir sesión, porque las specs que se leen desde una copia vieja describen un producto que ya no existe.

**037 · el tiempo mínimo dejó de cobrarse dos veces.** El mínimo por pregunta (60 s desde la 031) se reiniciaba cada vez que el estudiante abría una pregunta, incluso una que ya había contestado. Sumado a la 021 —que quitó "Terminar la prueba" y obliga a responderlo todo—, volver atrás a completar lo saltado costaba un minuto por pregunta, así que en la práctica nadie revisaba: el mecanismo terminaba castigando justo la conducta que se quiere fomentar.

La corrección es de servidor y no necesitó ni columna ni migración: la fila en `respuestas` ya significa "la vio y decidió", porque se escribe tanto al responder como al saltar. Con eso, `obtenerPregunta` manda `segundosParaAvanzar = 0` en las pantallas ya despachadas y `guardarRespuesta` se salta la comprobación. El cliente no se tocó, porque ya obedecía al valor del servidor. Se descartó un mínimo corto (3 s) para las revisitas: no hay abuso que prevenir, ya que para volver hay que haber pagado antes el mínimo completo de esa misma pregunta, y era una regla más que explicar a cambio de nada. En las pantallas de grupo se conserva la decisión de la 026: mientras quede un miembro sin responder, el mínimo vuelve a correr.

**038 · anular una prueba con doble clic.** El docente que pilla a alguien copiando no tenía nada que hacer dentro de OpenTest: forzar la entrega lo calificaba normalmente y la sanción había que aplicarla después, a mano y sin constancia. Ahora el doble clic sobre el cuadro del tablero de la proyección (031) anula, previa confirmación con el nombre completo.

Tres decisiones que vale la pena recordar:

- **Anular es un estado, no una nota.** Vive en `intentos.anulado_en`, no en un puntaje cero, porque un cero también lo saca quien falla las veinte preguntas y la sanción tiene que poder demostrarse meses después cuando se reclame.
- **No se borra ni una respuesta.** Eso es lo que hace reversible un doble clic accidental delante del curso, y lo que conserva la evidencia. Como la calificación es función pura de las respuestas, revertir devuelve la nota exacta: a quien fue anulado presentando se le devuelve el examen vivo; a quien ya había entregado se le recalcula y se le restituye su entrega original.
- **El filtro de la retroalimentación va en `armarResultado`**, el punto único por el que sale todo hacia la tablet. Hacerlo en el cliente dejaría las respuestas correctas viajando en la respuesta HTTP de alguien a quien se acaba de sancionar por copiar. Hay un test por cada uno de los tres niveles de feedback.

Sobre la nota: el usuario pidió "que su nota sea 1", que es el mínimo de la escala colombiana. OpenTest no tiene escala 1–5 en ninguna parte —guarda puntaje y porcentaje—, así que se representa como 0 puntos y 0 %, más una marca `anulado` explícita en el Excel y en el JSON. Se descartó añadir una columna `nota` 1–5 para todos: obligaría a fijar la fórmula de conversión (¿lineal?, ¿el 3.0 en qué porcentaje?), que es una decisión institucional y no técnica.

El paso delicado fue la **migración v6**: ampliar el CHECK de `motivo_entrega` obliga a rehacer la tabla `intentos`, de la que cuelgan `intento_preguntas` y `respuestas`. Se siguió la receta de la migración 1 (crear, copiar, borrar, renombrar) conservando los `id`, con las claves foráneas desactivadas por el runner y `foreign_key_check` al terminar. Hay una prueba que parte de una base v5 con un examen ya aplicado y comprueba que la semilla, la nota, las preguntas materializadas y los segundos por respuesta siguen ahí.
