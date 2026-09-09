# Restart

## Última actualización y rama activa

- 09/09/2026 — `main`, **limpio y pusheado**: la 026 commiteada en `edec510` (un solo commit; 020 y el fix de `postject` ya estaban commiteados en sesiones anteriores — `a64331d` y `8a061d7` — la nota anterior era incorrecta).

## Feature/tarea en curso

- **026 · Grupos de preguntas y campos informativos — IMPLEMENTADA.** Código, tests, contratos, ejemplo y guía listos. 412 tests en verde, lint limpio (90 archivos), `git diff --check` limpio. Spec marcada *implementado ✅* y movida a "Hecho" en el roadmap. Lo único pendiente de la 026 es la **verificación física** (tablet/proyector/Excel real), aplazada a la sesión de validación en equipo destino junto con lo de 012/013/021/022/025.

## Qué se hizo en esta sesión

### 026 implementada de punta a punta

- **Contratos**: `paquete-preguntas-icfes.md` ampliado con "Tipos de pregunta admitidos" (tres grupos) + campos informativos + aviso de `{{numero:<id>}}`; `export-resultados-v2.md` marcado obsoleto; creado `export-resultados-v3.md` (`formato_version: 3`).
- **Validador**: `server/importers/estandar-preguntas-icfes.js` reemplazado entero por la copia upstream v1.4.0 (mensajes ya en español). El v1.4.0 admite 2+ opciones, grupos, metadata heredada, `nivel_mcer`, `valor`, `version_estandar` por pregunta y validación de referencia de `{{numero:ID}}`.
- **Esquema**: migración v5 en `server/migraciones.js` (tabla `grupos` + 12 columnas en `preguntas` + 2 en `opciones` + `respuesta_banco_id` en `intento_preguntas`). `schema.sql` al día; **ojo**: `idx_preguntas_grupo` se crea en `db.js`/migración, no en `schema.sql`, porque en una base antigua la columna no existe cuando se aplica el esquema.
- **Importador**: `preguntas.js` devuelve `{nombre, preguntas, grupos, exclusiones, errores, avisos}` y excluye (con aviso accionable) toda pregunta/grupo cuyo texto traiga `{{numero:...}}`.
- **Bancos**: `guardarBanco(db, nombre, preguntas, grupos)` inserta grupos en la misma transacción y hereda `metadata_pedagogica` del grupo; `obtenerBanco` devuelve `preguntas` (sueltas) y `grupos` con sus miembros anidados.
- **Personalización**: los grupos son unidades indivisibles (peso = nº de miembros); cuotas por competencia por peso; nunca supera `nPreguntas` ni parte un grupo (hay fix + test de regresión del overshoot del fallback).
- **Intentos**: matching materializa `orden_opciones` con los ids de las entradas del banco; `pruebaDelIntento` expone `grupo_id`/`tipo_item`.
- **Examen (servidor)**: `obtenerPregunta` resuelve el grupo (contexto; banco sin `es_ejemplo` + hermanos para matching/cloze; `respuesta_pool_id` NUNCA sale). `guardarRespuesta` acepta `respuestaBancoId` validado contra el banco y permite responder cualquier miembro del grupo en pantalla. En reanudación con miembros pendientes, el mínimo vuelve a correr.
- **Calificación**: suma `valor` (default 1); matching se califica por `respuesta_banco_id` vs `respuesta_pool_id`; `armarResultado`/resultado del estudiante resuelven matching.
- **Render**: `pregunta.js` gana `letrasDeOpciones(n)`, `renderizarGrupo` (3 tipos, con `correctas` para el panel) y `renderizarMiembroMatching`. `examen.js` del estudiante distingue pantalla de grupo (matching/cloze todo en una pantalla, se guarda al avanzar; contexto_compartido una pregunta por pantalla con el contexto arriba). `examen.html` gana el contenedor `#grupo`. CSS mínimo en `base.css`.
- **Panel docente**: `verBanco` muestra grupos como `<details>` plegables con la correcta marcada; la vista previa de importación solo muestra preguntas con opciones propias (los miembros se ven con "Ver" tras importar).
- **Exportación v3**: JSON con `banco.grupos`, campos informativos por pregunta/opción, `respuesta_banco_id`; hojas Detalle y Banco del `.xlsx` con las columnas nuevas; `imagenesDeSesion` incluye imágenes de contexto/banco de grupo.
- **Ejemplos y guía**: `ejemplos/banco-grupos-ingles.zip` (10 preguntas: lectura compartida + matching + cloze + 1 standalone, validado contra el importador real); `GUIA-DOCENTE.md` con sección "Tipos de pregunta admitidos", aviso `{{numero:...}}`, ejemplo nuevo y descargas corregidas a Excel+ZIP.

### Tests

- 412/412 en verde (eran 380). Dos asserts se actualizaron por diseño de la feature: la regla de opciones 4→2+ en el importador y `formato_version` 2→3 en exportación. Suite vieja sin grupos intacta (prueba de que la ampliación es aditiva).
- Lint: 90 archivos sin errores. `git diff --check` OK.

## Estado

- Git: **limpio y pusheado** hasta `edec510` (412 tests en verde, lint limpio al commitear).
- Servidor: no probado en un navegador real (igual que al iniciar la sesión; el render de grupos en tablet va a la validación física).

## Siguiente tarea

1. Verificación física en equipo destino (lista completa en `roadmap.md → Siguiente`), con `ejemplos/banco-grupos-ingles.zip` para el recorrido visual de los tres grupos.
2. Política de recuperación de contraseña del panel docente (pendiente de sesiones atrás) antes de documentarla en `GUIA-DOCENTE.md`.

## Bloqueos / decisiones pendientes

- Sin bloqueos técnicos de la 026.
- Recuperación de contraseña del panel: sigue pendiente.
- Nota: la 021 exige `pregunta_actual` del primer miembro del grupo; el servidor ya acepta responder cualquier miembro del grupo en pantalla (verificado por test).
