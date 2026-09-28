# 043 · Enviar resultados al portal — Plan (borrador)

Se detalla al aprobarse la spec. Enfoque previsto:

1. **Constitución primero**: enmienda de `mission.md` y `tech-stack.md` con la
   excepción acotada de la spec.
2. **Migración v7**: `sesiones.codigo_portal TEXT NULL`; tabla
   `envios_portal (sesion_id, estado 'pendiente'|'enviado', huella, enviado_en,
   ultimo_error)`; la configuración del portal (dirección y token) en la tabla
   de ajustes existente.
3. **`server/services/envios-portal.js`**: cola (marcar pendiente al cerrar,
   al anular y al revertir) y envío con el `fetch` nativo de Node 22, sin
   dependencias nuevas. Reusa `aReproduccionZip` tal cual.
4. **Rutas** `POST /api/docente/portal/vincular`, `GET /api/docente/portal/envios`,
   `POST /api/docente/portal/enviar`. Todas detrás de la sesión del docente.
5. **Interfaz**: Configuración → Portal; campo de código en el formulario de
   evaluaciones; bloque de envíos pendientes en Resultados.
6. **Pruebas**: servidor falso del portal en `127.0.0.1`; `fetch` interceptado
   durante un examen completo para demostrar que no hay red.

Contrato con el portal: su feature 030 (`POST /api/opentest/envios`).
