# Plan · 014 Línea gráfica institucional

## Fuente visual

Se toma como referencia `../portal-estudiantes/spec/diseno/linea-grafica.md` y
sus capturas implementadas. Se trasladan sus tokens, jerarquía editorial,
superficies cálidas, bordes y estados; se conserva la arquitectura más sencilla
de OpenTest.

## Implementación

1. Copiar el logo institucional aprobado como activo local, sin modificarlo.
2. Rehacer `public/shared/base.css` como sistema compartido y accesible.
3. Añadir clases semánticas y bloques de marca/contexto a los HTML existentes.
4. Adaptar los CSS de portal, examen, resultado, monitoreo y proyección.
5. Verificar sintaxis, tests, desbordamiento y pantallas clave en escritorio/móvil.

## Restricciones

- HTML, CSS y JavaScript vanilla; sin dependencias ni compilación.
- Tipografías locales: Georgia para títulos y `system-ui`/Segoe UI para interfaz.
- La proyección prioriza legibilidad a distancia sobre densidad visual.
- Ningún cambio en APIs, datos ni reglas de negocio.

