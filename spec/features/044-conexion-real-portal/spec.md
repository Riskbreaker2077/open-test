# 044 · Elegir la evaluación del portal de una lista

**Estado:** implementado ✅ (28/09/2026), verificado de punta a punta contra
el portal real corriendo en local (Next.js + MySQL).

## Qué pidió el usuario

Al conectar con el portal, en vez de escribir a mano el código de la
evaluación (043), que OpenTest muestre de una vez las evaluaciones
disponibles para elegir.

## Investigación previa (y una corrección propia)

Al revisar cómo hacerlo se encontró, en un primer momento, que la 043
llamaba a rutas (`GET /api/opentest/evaluaciones`,
`POST /api/opentest/envios`) que no existían en el checkout local del
proyecto hermano `portal-estudiantes`, y se concluyó — de forma
**equivocada** — que la 043 nunca había funcionado. Esa conclusión se basó
en una copia local desactualizada: no se hizo `git fetch` antes de
investigar. `origin/main` del portal ya tenía, en una rama recién
fusionada, la **feature 030 (Recepción directa desde OpenTest)**, la
contraparte exacta que la 043 asumía: esas mismas rutas, con un permiso
dedicado «Enviar resultados desde OpenTest» (`opentest:enviar`).

Se corrigió el rumbo a mitad de esta feature: se descartó por completo un
primer intento (cliente MCP propio, nueva dependencia
`@modelcontextprotocol/client`, migración v8 con `destino_portal`) que
resultó innecesario una vez sincronizado con `origin/main`. **La 043 estaba
bien diseñada desde el principio.** Ver `spec/bitacora.md` (entrada del
28/09/2026) para el relato completo, incluida la lección operativa.

## Qué hace, al final

1. **Vincular** (043, sin cambios): dirección del portal + clave `mcp_…`
   con el permiso «Enviar resultados desde OpenTest», que no se combina con
   ningún otro.
2. **Buscar evaluaciones disponibles** (nuevo): un botón llama a
   `GET /api/opentest/evaluaciones` **sin** `codigo` — la feature 030 del
   portal se amplió para que, en ese caso, devuelva todas las evaluaciones
   configuradas allí con proveedor OpenTest (mismo objeto `destino` que ya
   usaba la consulta por código: `codigo`, `modulo`, `asignatura`,
   `periodo`, `cursos`). El docente elige una por cada evaluación cerrada,
   en vez de escribir el código.
3. **Enviar ahora** (043, sin cambios): sigue siendo
   `GET .../evaluaciones?codigo=` para confirmar el destino y
   `POST .../envios?evaluacion=` con el ZIP como cuerpo.

No hizo falta ningún cliente MCP en OpenTest, ninguna dependencia nueva, ni
migración de esquema: `sesiones.codigo_portal` (043) sigue siendo el único
dato que OpenTest guarda del destino — la lista solo le ahorra al docente
escribirlo a mano.

## Cambio del lado del portal (`portal-estudiantes`, feature 030)

`GET /api/opentest/evaluaciones` sin `codigo` invoca
`listarEvaluacionesOpenTest` (`lib/opentest-envio.ts`), una consulta directa
por `proveedor: OPENTEST` con el mismo permiso `opentest:enviar` que ya
usaba el envío. Contrato, adaptador y ruta commiteados en la rama
`feature/044-listar-evaluaciones-disponibles` de `portal-estudiantes`
(basada en `origin/main`, no fusionada); tres pruebas de integración contra
la base local, incluida la nueva.

## Criterios de aceptación

- [x] Sin vincular, "Buscar evaluaciones disponibles" no llama a nada.
  _(envios-portal.test.js, docente.portal.test.js)_
- [x] "Buscar evaluaciones disponibles" solo se dispara al pulsar el botón;
  nunca automáticamente. _(revisión de `portal.js`: la llamada solo vive en
  el `click`)_
- [x] La lista muestra periodo, asignatura, módulo y código de cada
  evaluación con proveedor OpenTest del portal, y no las que están en
  ZipGrade. _(prueba de integración nueva en `opentest-envio.integracion.test.ts`,
  contra la base local; `envios-portal.test.js`, `docente.portal.test.js`)_
- [x] Elegir una evaluación de la lista dejar pendiente el envío es
  exactamente lo mismo que escribir el código a mano (043): mismo campo,
  mismo comportamiento. _(sin cambios de esquema)_
- [x] "Enviar ahora" sigue negándose con una evaluación en curso o en
  pausa. _(sin cambios; docente.portal.test.js)_
- [x] **Recorrido real de punta a punta**: `portal-estudiantes` corriendo
  en local (Next.js + MySQL), con un periodo/asignatura/módulo/evaluación y
  una credencial `opentest:enviar` reales — vincular, buscar evaluaciones
  disponibles (aparece la sembrada), elegir su código, enviar y confirmar
  la propuesta `IMPORTACION_OPENTEST` creada en `PropuestaAcademicaAgente`
  del portal. Hecho el 28/09/2026.
- [x] La clave nunca aparece en la interfaz después de guardarla. (043, sin
  cambios).

## Fuera de alcance

- Cualquier cambio al formato del ZIP o a la aprobación de la propuesta:
  eso es la 030 del portal, ya implementada y probada ahí.
- Un segundo permiso o una segunda credencial para "solo consultar": la
  misma `opentest:enviar` alcanza para listar y para enviar.
