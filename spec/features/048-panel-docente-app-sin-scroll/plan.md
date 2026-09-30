# 048 · Panel del docente como app, sin scroll — Plan

_Cómo se implementa lo descrito en `spec.md`. Debe respetar la `constitution/`._

Es una feature solo de interfaz: HTML/CSS/JS de `public/docente/`. No toca
`server/` ni el esquema. Se implementa pantalla por pantalla, sincronizando
cada una a la instalación local del usuario
(`/mnt/c/Users/Camil/AppData/Local/OpenTest/public/docente/`) para que la
vea de inmediato con solo recargar el navegador — `OpenTest.exe` sirve los
archivos de `public/` en disco tal cual, sin empaquetarlos (ver
`scripts/sea-entry.cjs`), así que copiar los archivos actualizados basta;
no hace falta recompilar ni reiniciar el proceso.

## El shell (nuevo, compartido)

Nuevo archivo `public/docente/panel-shell.css`, enlazado por las ocho
páginas después de `base.css`. No se mete en `base.css` porque estas reglas
son exclusivas del panel del docente (`body.superficie-docente`, que ninguna
otra superficie usa — verificado por grep) y no deben arriesgarse a afectar
portal, examen o proyección.

```css
body.superficie-docente:not(.pagina-acceso) {
  display: flex;
  flex-direction: column;
  height: 100dvh;
  padding: 0;
  overflow: hidden;
}
body.superficie-docente:not(.pagina-acceso) > .barra {
  flex: 0 0 auto;
  width: 100%;
  margin: 0;
  padding-inline: max(1rem, calc((100vw - var(--ancho)) / 2));
}
body.superficie-docente:not(.pagina-acceso) > main.contenedor {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-height: 0;
  padding: clamp(0.85rem, 2.5vw, 1.5rem) max(1rem, calc((100vw - var(--ancho)) / 2)) 1rem;
  gap: 0.85rem;
  overflow: hidden;
}
.encabezado-pantalla { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; flex: 0 0 auto; }
.boton-engranaje { display: inline-flex; width: var(--toque); height: var(--toque); flex: 0 0 auto; align-items: center; justify-content: center; font-size: 1.35rem; border-radius: 999px; }
.panel-lista { flex: 1 1 auto; min-height: 0; overflow: auto; }
.ajustes { width: min(34rem, 94vw); max-height: 86dvh; overflow: auto; }
```

`.panel-lista` es la clase que se pone al contenedor inmediato de cada
tabla/lista larga (el `<section class="tarjeta">` que la envuelve, o un
`<div>` nuevo si la tarjeta mezcla lista con otra cosa), para que sea el
único punto de la pantalla con scroll propio. `.ajustes` reutiliza el mismo
tratamiento visual que ya tienen `.editor-pregunta`/`.editor-estudiante`
(borde, radio, sombra, `::backdrop`), así que se declara junto a ellas o se
factoriza un selector común — se decide al escribir el CSS, sin duplicar
declaraciones si el diff queda más simple compartiéndolo.

**`overflow: hidden` va también en `<html>`, no solo en `<body>`.** El
primer intento del marco fijo solo tocaba `body`, y la página seguía
desplazándose completa pese a `overflow: hidden` ahí: el elemento que
controla la barra de scroll del navegador es `<html>`, y fijar el overflow
solo en `body` depende de una propagación entre ambos que no es fiable
(agravado aquí porque `base.css` ya le pone `overflow-x: clip` a `html`,
lo que además interfiere con esa propagación). La solución documentada es
fijar `overflow: hidden` (y la altura) en los dos. Como `panel-shell.css`
solo se carga en las pantallas del panel (nunca en `entrar.html`, portal,
examen o proyección), tocar `html` sin condición aquí es seguro.

**Sin salida a scroll de página por ancho de ventana.** Se probó un
`@media (max-width: 44rem)` que revertía a `overflow: visible` para no
forzar alturas imposibles en una ventana angosta, pero rompía justo lo que
se pidió: la cabecera de la tabla dejaba de quedar fija ("se baja" al
hacer scroll) porque ya no había un contenedor con scroll propio del que
`position: sticky` pudiera colgar. Se quitó: el panel vive en tablet
horizontal o portátil, nunca en un teléfono en vertical, así que el marco
fijo se sostiene a cualquier ancho razonable de esos dos sin necesitar un
escape.

## El engranaje (nuevo, compartido)

`panel.js` (ya importado por las ocho páginas) gana una función:

```js
export function iniciarEngranaje() {
  const boton = document.getElementById('engranaje');
  const dialogo = document.getElementById('ajustes');
  if (!boton || !dialogo) return;
  boton.addEventListener('click', () => dialogo.showModal());
  dialogo.querySelectorAll('[data-cerrar]').forEach((el) =>
    el.addEventListener('click', () => dialogo.close()));
}
```

Cada página que tiene engranaje llama `iniciarEngranaje()` en su script.
Un botón de cierre dentro del `<dialog>` (`data-cerrar`) más el cierre nativo
con Escape (gratis por ser `<dialog>`) bastan; no hace falta más JS.

## Pantalla por pantalla

**Estudiantes.** El `<section class="tarjeta">` de "Cargar la lista" (input
de archivo, previsualización, errores) se mueve dentro de un nuevo
`<dialog id="ajustes" class="ajustes">`, junto con el `<select
id="filtro-curso">` que ya existe. La tarjeta "Lista cargada" pierde el
`<label>` del filtro (se queda solo el botón **+ Nuevo estudiante** y la
tabla, que gana `.panel-lista`). `estudiantes.js` no cambia su lógica, solo
las referencias siguen apuntando a los mismos IDs, ahora dentro del diálogo.

**Bancos.** Las dos tarjetas "1. Sube las imágenes" y "2. Sube el paquete de
preguntas" se combinan en el `<dialog id="ajustes">` como un único flujo
"Importar paquete (.zip)". La tarjeta de bancos cargados y la de detalle
quedan visibles con `.panel-lista` en la tabla y en `#detalle-preguntas`.
`bancos.js` conserva toda su lógica de importación; solo cambian los
contenedores donde vive el HTML.

**Sesiones (Evaluaciones).** El formulario "Convocar" conserva Nombre,
Banco, Cursos convocados y el botón **Crear evaluación** visibles. Los
cuatro campos de la `.rejilla` (preguntas por estudiante, duración,
segundos mínimos, nivel de feedback) y los avisos de solapamiento/feedback
se mueven al `<dialog id="ajustes">`, con sus valores por defecto
precargados igual que hoy. `sesiones.js` sigue leyendo los mismos `id` al
enviar el formulario — el `<dialog>` no es un `<form>` propio, sus campos
siguen perteneciendo al `#formulario` mediante el atributo `form="..."` en
cada input, o el diálogo se anida dentro del mismo `<form>` (un `<dialog>`
puede ir dentro de un `<form>` sin romper el envío, siempre que no sea
`method="dialog"`). Se verifica con una prueba manual de envío completo.
La lista de evaluaciones y la papelera ganan `.panel-lista` en sus tablas.

**Monitoreo.** El párrafo `#parametros` y la línea de "Dirección para las
tablets" se mueven a un `<dialog id="ajustes">` de solo lectura ("Detalles
de la evaluación"). La cabecera queda con el nombre, los contadores y los
botones Proyectar/Cerrar. La tabla de estudiantes gana `.panel-lista`.

**Resultados.** Sin engranaje — ya es mínima. Solo se aplica el shell fijo
y se asegura que, si la tabla de accesos creciera, no rompa el marco (no
debería: son dos tarjetas fijas).

**Estadísticas.** Los selectores "Alcance" y "Curso" se mueven al
`<dialog id="ajustes">`; "Banco" queda visible porque decide qué se ve, no
es un filtro secundario. Las dos tablas ganan `.panel-lista` o comparten un
único contenedor con scroll si conviene más verlas ambas a la vez.

**Portal.** El formulario de vinculación (dirección + clave) se mueve al
`<dialog id="ajustes">`. Si no hay vínculo, la sección de "Evaluaciones
cerradas" muestra un aviso con un botón que también abre `#ajustes`
(reutiliza el mismo diálogo, sin duplicar el formulario). La tabla de
evaluaciones gana `.panel-lista`.

**Inicio.** No lleva engranaje. Se ajustan `.ahora`, `.pendientes` y
`.pasos` para que quepan en la altura restante bajo el shell fijo: cada
lista interna (sesiones en curso, avisos, accesos de un paso) puede crecer
con scroll propio si excede su alto disponible, usando `flex: 1 1 auto;
min-height: 0; overflow: auto` en el contenedor de la lista, no en la
columna completa.

## Pruebas

No hay pruebas de `node:test` para HTML/CSS puro en este proyecto (las
pantallas del docente no tienen tests de DOM como sí los tiene
`public/shared/pregunta.js`). La verificación es manual: recorrido de cada
pantalla en el navegador contra la instalación local, con capturas a 1280
y 800 px de alto. `npm test` debe seguir en 509 verdes sin tocar
`server/**`; `npm run lint` cubre la sintaxis de los `.js` nuevos/movidos.

Sin dependencias nuevas.
