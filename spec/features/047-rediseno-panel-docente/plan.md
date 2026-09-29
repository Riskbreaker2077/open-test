# 047 · Rediseño del panel de inicio del docente — Plan

_Cómo se implementa lo descrito en `spec.md`. Debe respetar la `constitution/`._

**API.** `GET /api/docente/estado` (`server/routes/docente.js`) se amplía y conserva los campos que ya existían. Reutiliza:

- `contarEstudiantes` y `contarBancos`;
- `listarSesiones`, que ya excluye la papelera, para `evaluaciones` y `activas` (estados `abierta`, `en_curso` y `pausada`, que son `ESTADOS_VISIBLES`, con `contarIntentos` para dentro y entregados);
- `listarEnvios`, para `sinEnviar`: las cerradas con intentos cuyo estado es `pendiente` o `sin_codigo`;
- `listarPapelera().length`, para `enPapelera`.

No agrega escrituras ni red.

**Página.**

- `public/docente/index.html`: barra igual. Debajo, un encabezado (sobretítulo y h1), `#ahora` (sección oscura), `#pendientes` (lista de avisos) y `.pasos` (tres columnas `.paso`, cada una con sus enlaces `.acceso-fila`).
- `public/docente/panel.js` conserva `api`, salir y apagar. La pintura del panel pasa a `public/docente/inicio.js`, que solo se carga en `index.html`, para no mezclarla con las utilidades que importan las demás páginas. `inicio.js` hace un sondeo cada 10 s, que se pausa con la página oculta (`visibilitychange`).

**CSS.** Va en `public/shared/base.css`, bajo `/* Panel de inicio (047) */`, con los tokens existentes: azul-950 para «Ahora», dorado para los números de paso y los mismos `.boton` que el resto. Rejilla de tres columnas que baja a una columna por debajo de 44 rem.

**Tests.** El test de ruta de `/estado` va en `server/routes/docente.sesiones.test.js`, con una evaluación activa, una cerrada sin enviar y una en la papelera.

Sin dependencias nuevas ni migración.
