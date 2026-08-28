# 014 · Línea gráfica institucional

**Estado:** implementado ✅

## Propósito

Aplicar a las tres superficies de OpenTest el sistema visual aprobado en
`portal-estudiantes/spec/diseno/linea-grafica.md`, manteniendo la identidad y los
flujos propios de OpenTest.

## Alcance

- Paleta institucional azul, rojo, dorado, verde, papel y tinta.
- Tipografía editorial con alternativas locales del sistema; ninguna fuente remota.
- Marca institucional y firma editorial en accesos y panel docente.
- Tarjetas, botones, campos, tablas, avisos y estados con un lenguaje compartido.
- Adaptación diferenciada para portal/examen, panel docente y proyección.
- Diseño adaptable desde 320 px y objetivos táctiles de al menos 44 px.
- Regresos visibles y reconocibles desde las páginas internas y la proyección cerrada.

## Fuera de alcance

- Cambiar flujos, permisos, textos funcionales, rutas o contratos de API.
- Añadir dependencias, frameworks, fuentes o recursos que requieran internet.
- Replicar la navegación del portal de referencia cuando OpenTest no tiene la
  misma arquitectura de información.

## Criterios de aceptación

- [x] Todas las páginas usan los tokens institucionales documentados.
- [x] La marca institucional se sirve localmente y conserva sus proporciones.
- [x] Portal, acceso docente, panel, examen, resultado y proyección comparten una
  identidad reconocible sin perder la jerarquía específica de cada superficie.
- [x] Botones, campos, selecciones, avisos, tarjetas y tablas conservan foco visible
  y contraste suficiente.
- [x] Los controles táctiles mantienen un mínimo de 44 × 44 px.
- [x] No hay peticiones de red salientes ni paso de build en el frontend.
- [x] La interfaz no presenta desbordamiento horizontal a 320 px.
- [x] `npm test`, `npm run lint` y `git diff --check` pasan.
- [x] “Volver al panel” se presenta como botón explícito en las páginas internas.
- [x] Una proyección cerrada ofrece una acción visible para volver a Evaluaciones.
