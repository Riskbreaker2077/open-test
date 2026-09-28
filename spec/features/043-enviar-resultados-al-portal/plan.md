# 043 · Enviar resultados al portal — Plan

## Enfoque

1. **Constitución** — enmiendas de `mission.md` y `tech-stack.md` (hechas).
2. **Migración v7** — `sesiones.codigo_portal TEXT` y la tabla
   `envios_portal (sesion_id PK, huella, enviado_en, ultimo_intento_en,
   ultimo_error, destino)`. Dirección y clave del portal en `config`
   (`portal_url`, `portal_clave`).
3. **`server/services/envios-portal.js`**
   - `huellaDeResultados(db, sesion)`: SHA-256 de código del portal + cada
     intento (id, entrega, motivo, aciertos, puntaje, anulado) + cantidad de
     respuestas. Cambia exactamente cuando cambia lo que se exportaría.
   - `listarEnvios(db)`: evaluaciones cerradas con su código, estado
     (`sin_codigo`, `sin_intentos`, `pendiente`, `enviado`) y último error.
   - `vincular`, `desvincular`, `estadoVinculo` (nunca devuelve la clave).
   - `enviarPendientes(db, { fetch, ahora })`: se niega si hay una evaluación
     `en_curso` o `pausada`; por cada pendiente consulta
     `GET /api/opentest/evaluaciones?codigo={codigo}`, sube
     `POST /api/opentest/envios?evaluacion={codigo}` con el ZIP de
     `aReproduccionZip` y registra el resultado. `fetch` es el nativo de
     Node 22 (sin dependencias), inyectable para las pruebas, con tiempo
     máximo de 30 s por petición.
4. **Rutas** (`/api/docente/portal*`, detrás de la sesión del docente):
   `GET /portal`, `PUT /portal/vinculo`, `DELETE /portal/vinculo`,
   `PATCH /sesiones/:id/codigo-portal`, `POST /portal/enviar`.
5. **Interfaz** — `public/docente/portal.html` + `portal.js` y un acceso
   nuevo en el panel.
6. **Pruebas** — servicio con un portal falso (`fetch` inyectado) y con un
   servidor HTTP falso en `127.0.0.1`; `fetch` global interceptado durante
   un examen completo para demostrar que nada sale a la red.

Contrato con el portal: su feature 030.
