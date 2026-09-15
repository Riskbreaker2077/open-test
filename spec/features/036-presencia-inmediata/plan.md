# 036 · Presencia casi inmediata — Plan

## Implementación

1. `server/presencia.js` — `UMBRAL_MS` de 15 s a 6 s (tres latidos perdidos).
2. `server/routes/examen.js` — `POST /latido` (tras `conIntento`, que ya marca la presencia; responde sin consultar nada más) y `POST /ausente` (resuelve el intento por la cookie, `marcarSalida`, 204).
3. `public/estudiante/examen.js` — `setInterval(latir, 2000)` solo con la página visible; `pagehide` y `visibilitychange → hidden` envían `sendBeacon('/api/examen/ausente')`; al volver a estar visible, late y resincroniza.
4. `public/proyeccion/proyeccion.js` — sincronización de 5 s a 2 s.

## Decisiones

- **Latido separado del sondeo de estado** — `/api/examen/estado` calcula tiempo y avance; hacerlo cada 2 s por tablet sería trabajo inútil para la base. El latido solo resuelve la cookie.
- **Latir solo con la página visible** — los navegadores siguen ejecutando temporizadores en pestañas ocultas; sin esta guarda, una tablet en otra aplicación volvería a verde sola.
- **`sendBeacon` para la ausencia** — es la única petición que el navegador garantiza enviar mientras cierra o esconde la página.
- **6 s y no menos** — por debajo, cualquier parpadeo normal del wifi del aula pintaría rojos falsos.
