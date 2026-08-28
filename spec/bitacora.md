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
