# Restart

## Última actualización y rama activa

- 28/09/2026 — `main` tiene la 1.5.0 (043). La 044 (elegir evaluación del
  portal de una lista) está implementada y verificada de punta a punta
  contra el portal real, pero **no se ha publicado versión ni tagueado**:
  falta que el usuario lo confirme.

## Feature/tarea en curso

- Ninguna. La 044 quedó completa. Pendiente: decidir versión (¿1.5.1?),
  taguear, y decidir si fusionar la rama del cambio en `portal-estudiantes`.

## Qué se hizo en esta sesión

1. **Error propio, detectado y corregido a mitad de camino.** Al investigar
   cómo mostrarle al docente las evaluaciones disponibles del portal (en
   vez de que escriba un código a mano), se revisó `portal-estudiantes` en
   un checkout local **sin hacer `git fetch` primero**, y se concluyó — de
   forma equivocada — que la 043 nunca había podido funcionar de verdad
   contra el portal (rutas REST inexistentes, permiso inexistente). Esa
   conclusión llegó a escribirse en `spec.md` de la 043 y la 044,
   `roadmap.md`, `AGENTS.md` y la bitácora. **No era cierto**:
   `origin/main` de `portal-estudiantes` ya tenía, en una rama recién
   fusionada, la **feature 030 (Recepción directa desde OpenTest)** —
   exactamente la contraparte que la 043 asumía, con las mismas rutas y el
   mismo permiso «Enviar resultados desde OpenTest». El usuario lo señaló
   directamente ("estás trabajando con una versión vieja, actualízate").
2. Se descartó por completo el trabajo hecho sobre esa premisa equivocada:
   un cliente MCP propio en OpenTest (`server/services/portal-mcp.js`), la
   dependencia `@modelcontextprotocol/client`, la migración v8
   (`sesiones.destino_portal`) y una herramienta MCP nueva del lado del
   portal (`listar_evaluaciones_opentest`, bajo `academico:proponer`).
3. Se rehizo la 044 sobre `origin/main` real: la feature 030 del portal
   gana `GET /api/opentest/evaluaciones` **sin** `codigo`, que lista las
   evaluaciones con proveedor OpenTest (mismo permiso `opentest:enviar`,
   sin segunda credencial). OpenTest gana `evaluacionesDisponibles` en
   `envios-portal.js`: una llamada `fetch` más, del mismo tipo que ya hacía
   la 043. Sin dependencias nuevas, sin migración de esquema:
   `sesiones.codigo_portal` (043) sigue siendo el único dato guardado.
4. **Se corrigieron todas las notas falsas** dejadas por el error del
   punto 1: `spec.md` de la 043 y de la 044, `roadmap.md`, `AGENTS.md`. La
   bitácora conserva la entrada original (043, con la afirmación
   equivocada de origen) y agrega una nueva (28/09/2026) contando el error
   y la corrección — no se edita el pasado, se corrige hacia adelante.
5. **Recorrido de punta a punta real, dos veces:** con `portal-estudiantes`
   corriendo en local (Next.js + MySQL, contenedor `portal-mysql` ya
   existente en este equipo) y OpenTest corriendo en local. Se sembraron a
   mano un periodo/asignatura/módulo/evaluación (proveedor OPENTEST) y una
   credencial `opentest:enviar` reales. Primero con una pregunta manual
   (028) — falló porque el portal exige `competencia`/`componente`
   no vacíos, campos que la carga manual no pide; segundo con un banco real
   importado desde `ejemplos/paquete-ciencias-sociales-40.zip` — **éxito
   completo**: vincular, listar (aparece la evaluación sembrada), elegir su
   código, enviar y la propuesta `IMPORTACION_OPENTEST` quedó creada de
   verdad en `PropuestaAcademicaAgente` de la base del portal.
6. De paso se corrigieron dos problemas del entorno de desarrollo del
   portal (no del código): faltaba `allowPublicKeyRetrieval=true` en la
   URL de MySQL de `code/.env` y faltaba `MCP_DATA_ENCRYPTION_KEY`. Sin
   eso, ninguna herramienta MCP del portal podía ejecutarse, ni las
   nuevas ni las que ya existían — se habría topado con esto tarde o
   temprano de todas formas.
7. Se corrió `npx prisma generate` y `npm run db:deploy` en el portal (el
   cliente Prisma y las migraciones estaban desactualizadas en este
   checkout tras cambiar de rama).
8. Todos los datos de prueba («Prueba 044…») y las credenciales
   desechables se borraron de la base del portal al terminar. Los dos
   servidores de desarrollo (OpenTest y el portal) quedaron apagados y
   `data/opentest.db` de este repo se borró (era de prueba, vacío al
   arrancar de nuevo).

## Siguiente tarea

1. El usuario decide: ¿publicar 1.5.1 ahora? Si sí: `npm version 1.5.1`,
   commit, `git tag v1.5.1 && git push origin v1.5.1` (el workflow compila
   y publica el instalador).
2. En `portal-estudiantes`: la rama `feature/044-listar-evaluaciones-disponibles`
   (sobre `origin/main`) tiene el cambio de la 030, con sus pruebas en
   verde. Falta que el usuario decida si la fusiona.
3. En el aula: 039–042 pendientes de verificación física (sin relación con
   esto).

## Bloqueos / decisiones pendientes

- Ninguno nuevo. "¡El/La mejor!" se dejó tal cual lo escribió el usuario;
  el sistema no conoce el género del estudiante.
