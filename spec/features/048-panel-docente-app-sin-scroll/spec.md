# 048 · Panel del docente como app, sin scroll — Spec

**Estado:** implementado ✅

## Por qué

El panel del docente (`/docente/*`) se usa y se lee como un sitio web: cada
pantalla es una página larga con tarjetas apiladas que hay que bajar con el
dedo o la rueda del ratón para terminar de ver. El docente lo abre en su
portátil durante la clase, bajo presión de tiempo — necesita ver de un
vistazo qué puede hacer y hacerlo, no desplazarse buscando el botón.

Este no es un ajuste de usabilidad puntual: es cambiar el patrón de
interacción de **todas** las pantallas del panel para que se comporten como
una aplicación de escritorio — un marco fijo (cabecera + contenido) que
siempre cabe en la pantalla, con los ajustes secundarios de cada pantalla
detrás de un botón de engranaje, en vez de formularios largos siempre
visibles.

## Alcance

**Dentro:** las ocho pantallas de `public/docente/` que ya existen:
`index.html` (inicio, 047), `estudiantes.html`, `bancos.html`,
`sesiones.html`, `monitoreo.html`, `resultados.html`, `estadisticas.html`,
`portal.html`. También el shell compartido (`barra`, `panel.js`) del que
todas dependen.

**Fuera:** el portal del estudiante (`public/estudiante/`, `public/index.html`)
y la pantalla de proyección (`public/proyeccion/`) — decisión explícita del
usuario, esas ya están bien. Tampoco `entrar.html` (login): es una sola
tarjeta centrada sin ajustes, ya cabe sin scroll. No se cambia ninguna ruta
de la API ni el modelo de datos: es una reorganización de las pantallas que
ya existen, con los mismos datos que ya cargan.

## Qué hace

### El patrón (aplica a las ocho pantallas)

- **Marco fijo.** La página ocupa `100dvh` y no se desplaza como un todo:
  cabecera arriba (fija) y un área de contenido debajo que ocupa el resto
  de la altura.
- **Diseño fluido, no a un tamaño de pantalla fijo.** Usa unidades relativas
  al viewport (`dvh`, `clamp()`) para que quepa tanto en una tablet en
  horizontal como en el portátil del docente, sin una medida objetivo única.
- **Un engranaje por pantalla**, arriba a la derecha del encabezado de
  contenido (bajo la barra superior). Abre un cuadro de diálogo con todo lo
  que **no** es la acción principal de esa pantalla: parámetros numéricos,
  filtros de una lista, formularios de importación masiva poco frecuentes.
  Si una pantalla no tiene nada así, no lleva engranaje.
- **El scroll solo vive dentro de las listas** (tablas de estudiantes,
  bancos, preguntas de un banco, evaluaciones, resultados de estadísticas):
  esas sí pueden crecer más que la pantalla y se desplazan por dentro, con
  el resto del marco (título, engranaje, acciones) siempre visible.
- **Se mantiene la línea gráfica institucional** (014/035): mismos colores,
  tipografía, logo y estilo de botones de `base.css`. Este rediseño cambia
  la estructura y la navegación, no el aspecto visual.
- **Sin "sobretítulo" en el encabezado de pantalla.** La etiqueta en
  mayúsculas que iba encima del `<h1>` ("DIRECTORIO DEL AULA", "PREPARACIÓN
  DEL AULA"...) se quita en las ocho pantallas: no aporta información y le
  roba una línea entera al contenido. El nombre de la pantalla ya está en
  la barra superior.
- **Listas compactas.** Las tablas del panel usan menos relleno por fila
  (`padding` y tamaño de letra reducidos) que el resto de la aplicación,
  para que quepan más filas sin desplazarse.
- **Acciones de fila como íconos, no botones de texto.** Cuando una fila
  tiene varias acciones (Renombrar, Borrar, Descargar, Enviar al portal...),
  van como símbolos con `title`/`aria-label` (tooltip nativo), en vez de
  botones de texto que no caben o compiten con los datos de la tabla. Las
  transiciones de estado poco frecuentes y con consecuencias claras para el
  aula (Abrir, Monitorear, Proyectar, Cerrar evaluación) se quedan como
  texto: no son la clase de acción que conviene reducir a un símbolo.

### Qué va detrás del engranaje, pantalla por pantalla

| Pantalla | Queda visible (acción principal) | Va al engranaje |
|---|---|---|
| Inicio | Todo — es un panel de lectura, sin ajustes | — (sin engranaje) |
| Estudiantes | Lista cargada (tabla) + **+ Nuevo estudiante** | Filtro por curso; importar lista desde archivo (CSV/JSON) |
| Bancos de preguntas | Bancos cargados (tabla) + **+ Nuevo banco vacío** + detalle de un banco (preguntas) + **+ Agregar pregunta** | Importar paquete completo (.zip): subir imágenes y `paquete.json` |
| Evaluaciones | Lista de evaluaciones creadas + **+ Nueva evaluación** | Todo lo de crear (nombre, banco, cursos y también los parámetros) vive en el diálogo de creación, igual que ya hacían Estudiantes/Bancos; la papelera es un ícono con contador, no una sección |
| Monitoreo | Selector de evaluación, nombre, contadores, **Proyectar**/**Cerrar evaluación**, tabla de estudiantes | Detalles de la evaluación (parámetros, dirección de las tablets) |
| Resultados | Selectores de evaluación/curso + descargas (Excel, ZIP) | — (sin engranaje: ya es mínima) |
| Estadísticas | Selector de banco + tablas de competencias/preguntas | Alcance (sesión concreta o acumulado) y filtro de curso |
| Enviar al portal | Tabla de evaluaciones cerradas, **Buscar evaluaciones disponibles**, **Enviar ahora** | Vinculación con el portal (dirección + clave, vincular/desvincular) |

Los diálogos de creación/edición que ya existen como `<dialog>` (editor de
pregunta, editor de estudiante) no cambian: ya son el patrón correcto de
"acción enfocada en una ventana", distinto del engranaje de ajustes.

### Ajustes tras la primera revisión en vivo

Al ver Estudiantes y Evaluaciones ya instaladas, el usuario pidió corregir
tres cosas antes de seguir con el resto de pantallas — quedan incorporadas
arriba como parte del patrón, no como excepción de Evaluaciones:

1. Evaluaciones no separaba "crear" de "la lista": el formulario de
   convocar, siempre visible, empujaba la tabla fuera de la vista. Se
   corrigió llevando **todo** el formulario (no solo los parámetros) a un
   diálogo de creación, igual que ya hacían Estudiantes y Bancos — el
   engranaje de esa pantalla ya no existe, no hacía falta.
2. Cada fila de Evaluaciones cerrada, además de Renombrar/Borrar, ahora
   tiene **Descargar resultados** (enlace a Resultados, sin elegir el
   formato ahí mismo: eso se sigue eligiendo en Resultados) y **Enviar al
   portal** (ícono que abre un diálogo con la lista de evaluaciones
   disponibles en el portal, un botón Enviar y el mensaje "Cargado en la
   plataforma" — mismos endpoints de 043/044, sin ir a `portal.html`).
3. Se agregaron las tres políticas de la sección anterior (sin sobretítulo,
   listas compactas, acciones de fila como íconos).

### Línea gráfica de referencia (Evaluaciones, tras cargar el skill `frontend-design`)

Evaluaciones quedó como la pantalla de referencia visual: lo que se replica
igual en Bancos, Monitoreo, Resultados, Estadísticas y Portal, no solo el
patrón de layout sin scroll. Componentes nuevos en `panel-shell.css`:

- **`.celda-titulo`** — lo que identifica la fila, en negrita y color de
  marca, con una `<small>` tenue debajo para lo que solo la describe (p.
  ej. nombre de la evaluación arriba, banco y cursos debajo). Antes cada
  dato vivía en su propia columna con el mismo peso visual que las demás.
- **`.celda-apoyo`** — datos de consulta ocasional (preguntas sorteadas,
  cuánto comparten dos estudiantes, progreso de entrega), en gris tenue,
  nunca compitiendo con `.celda-titulo`.
- **`.pastilla` + modificadores** (`--neutro/--ambar/--verde/--rojo/--azul`)
  — el estado se lee de un vistazo por color, no leyendo la palabra.
- **`.boton-fila`** pasó de cuadrado con borde a ícono "fantasma" (sin
  borde, fondo solo al pasar/enfocar) y su tamaño subió a `var(--toque)`
  (44px): la versión anterior medía 2.1rem (~34px), por debajo del mínimo
  táctil que exige `tech-stack.md` — se corrige aquí y aplica a todas las
  pantallas que ya usaban `.boton-fila`.
- **`.vacio-lista`** — estado vacío como invitación a actuar (título +
  frase + botón de crear), no una frase suelta arriba de una tabla vacía.
- Cabecera de tabla (`.tabla th`) baja de peso: sin franja de fondo azul,
  solo un borde inferior — es una etiqueta que se lee una vez, no debe
  pesar tanto como los datos que se escanean fila a fila.
- Columnas que antes eran una por dato (Banco, Cursos, Dentro, Entregados)
  se consolidan cuando cuentan la misma historia: Evaluación ya incluye
  banco y cursos; Progreso reemplaza a Dentro+Entregados con una sola frase
  que cambia de forma según el estado (nada que progresar en borrador,
  "N entregaron" cuando ya cerró).
- **Cabecera de tabla fija con dos `<table>` independientes**
  (`.tabla-cabecera` fuera del área con scroll + `.panel-lista` adentro),
  ambas con el mismo `<colgroup>` y `table-layout: fixed`, en vez de
  `position: sticky` sobre un `<th>`. Se cambió después de que `sticky` no
  se sostuviera de forma confiable; el detalle está en `plan.md`. Aplica ya
  en Estudiantes, Bancos y Evaluaciones — es la forma correcta de armar
  cualquier lista nueva del panel, no un caso especial de esta pantalla.
- **Íconos de línea (Heroicons, MIT) en vez de emoji.** `public/docente/iconos.js`
  incrusta los trazos (sin red en tiempo de ejecución) y `crearIcono(nombre)`
  arma el `<svg>`. Un emoji se ve distinto en cada sistema operativo y lee
  como "sin terminar"; un ícono de trazo fino, con el mismo grosor en todos,
  es lo que corresponde a esta línea gráfica editorial.

## Criterios de aceptación

- [x] Ninguna de las ocho pantallas necesita scroll de página en un viewport
  típico de tablet horizontal (~1280×800) ni de portátil (~1366×768), con
  datos normales (unas pocas evaluaciones, bancos y estudiantes). _(capturas)_
- [x] Una lista con muchos elementos (p. ej. 100 estudiantes, un banco de 50
  preguntas) se desplaza **dentro** de su tabla/lista, sin mover el resto
  de la pantalla. _(prueba manual con `ejemplos/estudiantes-ejemplo.csv`
  ampliado o datos de prueba)_
- [x] Cada pantalla con ajustes secundarios (tabla de arriba) muestra un
  botón de engranaje arriba a la derecha de su encabezado de contenido, que
  abre un diálogo con exactamente esos ajustes. _(recorrido)_
- [x] Crear una evaluación sigue funcionando igual (mismos valores por
  defecto, misma validación) con los parámetros numéricos movidos al
  engranaje. _(test existente + recorrido)_
- [x] Importar estudiantes y bancos desde archivo sigue funcionando igual
  desde dentro del engranaje: previsualización, errores fila por fila,
  confirmar/cancelar. _(recorrido)_
- [x] No hay cambios de comportamiento en la API ni en el modelo de datos:
  `npm test` sigue en verde sin tocar `server/`. _(`npm test`)_
- [x] `npm run lint` en verde.
- [x] Ninguna dependencia nueva; cero paso de build.
- [x] La línea gráfica (colores, tipografía, logo) es la misma de antes.

_Criterios verificados el 29/09/2026: `npm test` (510) y `npm run lint` en verde, y recorrido de las pantallas por el usuario sobre su instalación real, con ajustes en vivo (ver «Ajustes tras la primera revisión»)._

## Fuera de alcance

- Portal del estudiante, examen, resultado del estudiante y proyección.
- Cambiar colores, tipografía o el logo.
- Cualquier endpoint nuevo o cambio de esquema: esta feature es de interfaz.
