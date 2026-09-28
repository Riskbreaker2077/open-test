# Restart

## Última actualización y rama activa

- 28/09/2026 — rama `claude/open-test-cancel-exam-59vutp`. `main` tiene la 1.4.2 (042); la 043 está solo en la rama, sin versión nueva.
- **El tag `v1.4.2` no existe todavía**: el proxy de git de la nube rechaza tags. Crearlo desde el equipo del usuario: `git tag v1.4.2 c3120d1 && git push origin v1.4.2`.

## Feature/tarea en curso

- Ninguna. 043 implementada y probada de punta a punta contra el portal en local.

## Qué se hizo en esta sesión

1. 042: anular con triple clic y cuadro flotante (publicada en `main` como 1.4.2, falta el tag).
2. 043: envío de resultados al portal (página **Enviar al portal**, migración v7, enmienda constitucional aprobada por el usuario). Contraparte: feature 030 del portal.

## Estado

- `npm test`: 496 en verde; `red.test.js` falla en la nube por las interfaces de Docker (igual sin estos cambios). `npm run lint` limpio.

## Siguiente tarea

1. Decidir con el usuario la publicación de la 043 (1.5.0) y el despliegue de la 030 del portal; son una pareja: OpenTest 1.5.0 necesita el portal con la 030.
2. Probar en el equipo del docente contra el portal en producción.
3. En el aula: 039–042 pendientes de verificación física.

## Bloqueos / decisiones pendientes

- "¡El/La mejor!" se dejó tal cual lo escribió el usuario; el sistema no conoce el género del estudiante.
