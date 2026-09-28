# Restart

## Última actualización y rama activa

- 28/09/2026 — `main` tiene la 1.5.0 (043, envío de resultados al portal). Tags `v1.4.2` y `v1.5.0` publicados con su instalador en Releases.
- La 1.5.0 necesita el portal con su feature 030 (desplegada el 28/09/2026).

## Feature/tarea en curso

- Ninguna. Falta la prueba real de la 043 contra el portal en producción desde el equipo del docente.

## Qué se hizo en esta sesión

1. Tag `v1.4.2` (042: anular con triple clic) subido desde el equipo del usuario; el workflow publicó el instalador.
2. 043 validada en el equipo del usuario (`npm test` 497 en verde, incluido `red.test.js`; `npm run lint` limpio), versión 1.5.0, fusión a `main` y tag `v1.5.0`.

## Siguiente tarea

1. Prueba real: credencial con solo «Enviar resultados desde OpenTest» en el portal, instalar 1.5.0 en el PC del aula, «Enviar ahora» y aprobar la propuesta en Agentes → Propuestas; luego una anulación con triple clic que llegue como anulada.
2. En el aula: 039–042 pendientes de verificación física.

## Bloqueos / decisiones pendientes

- "¡El/La mejor!" se dejó tal cual lo escribió el usuario; el sistema no conoce el género del estudiante.
