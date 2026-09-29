# 047 · Rediseño del panel de inicio del docente

**Estado:** implementado ✅

## Qué hace

El panel de inicio (`/docente/`) era una cuadrícula de siete tarjetas iguales y una línea con el número de estudiantes. No decía qué estaba pasando ni en qué orden se usan las cosas. Ahora tiene tres partes:

1. **Ahora.** Una franja arriba con la evaluación en marcha: abierta y esperando, en curso o en pausa. Muestra su nombre, cursos, estado, cuántos han entrado y cuántos entregaron, y los botones **Monitorear** y **Proyectar**. Si hay varias, aparece una por fila. Si no hay ninguna, dice «No hay ninguna evaluación en marcha» y ofrece **Ir a Evaluaciones**.
2. **Pendientes.** Avisos que llevan directo a resolverlos, y que solo aparecen si aplican:
   - faltan estudiantes o bancos de preguntas;
   - hay evaluaciones cerradas con resultados sin enviar al portal;
   - hay evaluaciones en la papelera (046).
3. **Los accesos, ordenados como se trabaja.** Tres columnas numeradas:
   - **1 · Preparar**: Estudiantes, Bancos de preguntas, Evaluaciones.
   - **2 · Aplicar**: Monitorear.
   - **3 · Después**: Resultados, Enviar al portal, Estadísticas.

   Cada acceso muestra su dato clave: cuántos estudiantes, cuántos bancos, cuántas evaluaciones.

Apagar OpenTest y Cerrar sesión se quedan en la barra superior.

## Criterios de aceptación

- [x] `GET /api/docente/estado` devuelve `estudiantes`, `bancos`, `evaluaciones` (sin contar la papelera), `activas` (id, nombre, cursos, estado, dentro, entregados), `sinEnviar` y `enPapelera`. _(test)_
- [x] Con una evaluación en curso, «Ahora» la muestra con Monitorear (`/docente/monitoreo.html?sesion=ID`) y Proyectar (`/proyeccion/?sesion=ID`). _(recorrido en Chrome sin cabeza)_
- [x] Sin evaluaciones en marcha, «Ahora» lo dice y enlaza a Evaluaciones. _(recorrido en Chrome sin cabeza)_
- [x] Los avisos de pendientes aparecen solo cuando aplican. _(test del endpoint y recorrido)_
- [x] Los siete accesos siguen presentes, agrupados en tres pasos. _(recorrido)_
- [x] Se ve bien en escritorio, tablet y teléfono, sin desplazamiento horizontal. _(capturas a 1280, 800 y 390 px)_
- [x] La franja «Ahora» se refresca sola cada 10 s mientras el panel está abierto, sin consumo de red externa. _(revisión de código)_

## Fuera de alcance

- Rediseñar las demás páginas del docente.
- Estadísticas o notas en el panel: el panel orienta, no analiza.
