# 044 · Elegir la evaluación del portal de una lista — Plan

## Enfoque final (tras descartar un primer intento equivocado)

1. **Portal (`portal-estudiantes`, feature 030, en su propia rama):**
   `lib/opentest-envio.ts` gana `listarEvaluacionesOpenTest(prisma, bearer)`:
   mismo `autenticarEnvio` (permiso `opentest:enviar`), consulta
   `prisma.evaluacionModulo.findMany({ where: { proveedor: 'OPENTEST',
   modulo: { archivado: false } } })`, mapea al mismo tipo `DestinoOpenTest`
   que ya usaba la consulta por código. `app/api/opentest/evaluaciones/route.ts`:
   sin `codigo` en la query, llama a esa función y responde
   `{ evaluaciones: [...] }`; con `codigo`, sigue igual que antes.
2. **OpenTest — `server/services/envios-portal.js`:** agrega
   `evaluacionesDisponibles(db, { fetchFn })`: exige estar vinculado, hace
   `GET {url}/api/opentest/evaluaciones` (sin query) con
   `Authorization: Bearer <clave>`, devuelve `cuerpo.evaluaciones`. El resto
   del archivo (`fijarCodigoPortal`, `huellaDeResultados`, `listarEnvios`,
   `enviarPendientes`) es el de la 043, sin cambios.
3. **Rutas (`server/routes/docente.js`):** `GET /portal/evaluaciones-disponibles`
   llama a `evaluacionesDisponibles`; `PATCH /sesiones/:id/codigo-portal`
   es la misma ruta de la 043.
4. **Interfaz (`public/docente/portal.html` + `portal.js`):** botón
   **Buscar evaluaciones disponibles** que llena un `<select>` por fila
   (etiqueta `periodo · asignatura · módulo (código)`); elegir una opción
   dispara el mismo `PATCH .../codigo-portal` de la 043 con el `codigo`
   elegido. Sin el `<input>` de texto libre.
5. **Pruebas:** `envios-portal.test.js` y `docente.portal.test.js` con un
   portal falso por HTTP plano (igual que la 043), más los casos nuevos de
   listar. Del lado del portal, una prueba de integración nueva contra la
   base local.
6. **Sin dependencias nuevas, sin migración de esquema.** `codigo_portal`
   (043) sigue siendo el único dato que guarda OpenTest del destino.

## Lo que se descartó a mitad de camino

Un primer diseño asumió que la 043 nunca había hablado con el portal real
(conclusión errónea por no hacer `git fetch` antes de investigar) y
construyó, sin necesidad: un cliente MCP propio en OpenTest
(`server/services/portal-mcp.js`), la dependencia `@modelcontextprotocol/client`,
una migración v8 (`sesiones.destino_portal`) y una herramienta MCP nueva
del lado del portal (`listar_evaluaciones_opentest`, bajo `academico:proponer`).
Todo eso se revirtió al descubrir la feature 030 real en `origin/main`. Ver
`spec/bitacora.md` (28/09/2026) para el detalle completo y la lección: una
prueba manual contra "el portal real" solo vale si de verdad es la rama
actual, no un checkout local desactualizado.

Contrato con el portal: su feature 030 (`GET/POST /api/opentest/*`), ya
implementada y probada allí; esta feature solo le agrega el listado.
