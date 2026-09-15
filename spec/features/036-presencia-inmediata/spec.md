# 036 · Presencia casi inmediata en el tablero de asistencia

**Estado:** implementado ✅ _(pendiente de verificación física con tablets y wifi real)_

## Qué hace

Acorta el tiempo que tarda un cuadro del tablero de asistencia (031) en ponerse **rojo** cuando un estudiante sale de la prueba:

| Cómo sale | Antes | Ahora |
|---|---|---|
| Cierra la pestaña, cambia de aplicación o bloquea la pantalla | hasta ~25 s | ~2 s |
| Pierde la red (wifi apagado, fuera de alcance) | hasta ~25 s | ~6–8 s |

## Por qué

El docente lo probó en el aula (15/09/2026): desconectó la red de una tablet y el cuadro tardó demasiado en cambiar. Las demoras se sumaban: sondeo de la tablet cada 5 s, umbral de 15 s y actualización de la proyección cada 5 s.

## Criterios de aceptación

- [x] La tablet, con la prueba a la vista, envía un latido (`POST /api/examen/latido`) cada 2 s. _(examen.js)_
- [x] Al ocultarse o cerrarse la página, la tablet avisa con `POST /api/examen/ausente` (vía `sendBeacon`) y el estudiante pasa a desconectado de inmediato. _(test de API)_
- [x] El umbral de silencio baja de 15 s a **6 s**. _(presencia.test.js)_
- [x] La proyección se sincroniza cada 2 s.
- [x] Una tablet que vuelve a latir vuelve a verde. _(test de API)_
- [ ] Verificación física: cambiar de aplicación y cortar el wifi con una tablet real y ver los tiempos en el proyector.

## Efectos conocidos

- **Rojos falsos breves**: un corte de wifi de 6 s o más pone el cuadro en rojo aunque el estudiante siga ahí; vuelve a verde solo al recuperar la red.
- **Recargar la página** marca rojo un instante y vuelve a verde en el siguiente latido.
- **Tráfico**: ~1 petición cada 2 s por tablet (≈ 23/s con 45 tablets). El latido no toca la base de datos.
- Perder la red **no puede ser instantáneo**: una tablet sin red no puede avisar; el servidor solo lo nota por el silencio.
