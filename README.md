# OpenTest

[![Licencia MIT](https://img.shields.io/badge/licencia-MIT-b5762d)](LICENSE)
[![Node ≥ 22](https://img.shields.io/badge/node-%E2%89%A522-34703d)](package.json)
[![Sin dependencias de frontend](https://img.shields.io/badge/frontend-vanilla%20JS-1b455f)](spec/constitution/tech-stack.md)

Evaluación en el aula con **pruebas personalizadas**, sobre un servidor local y sin internet.

El docente arranca OpenTest en su portátil, las tablets se conectan por la intranet del colegio y **cada estudiante recibe una prueba distinta**: preguntas sorteadas al azar de un banco común y opciones de respuesta barajadas. Mirar la pantalla del compañero no sirve de nada.

**[Ver la página del proyecto →](https://riskbreaker2077.github.io/open-test/)** · **[Guía para docentes](GUIA-DOCENTE.md)** · **[Roadmap](spec/constitution/roadmap.md)**

> **Estado: completo y validado en un aula real.** Todo el flujo está construido y probado de punta a punta: importación de estudiantes y preguntas (por ZIP o escritas a mano), motor de personalización, examen, calificación, panel de monitoreo, estadísticas y exportación de resultados. Sigue activo — la última incorporación fue un formulario para escribir preguntas una a una, sin depender de un archivo generado por IA. Ver el [roadmap](spec/constitution/roadmap.md).

## Por qué existe

Los estudiantes se copian en los exámenes. La respuesta habitual es vigilar más. Esta es otra: hacer que copiar no dé información útil, porque la pregunta 7 de un estudiante no es la pregunta 7 de su compañero, y sus opciones no están en el mismo orden.

## Cómo funciona

Tres superficies separadas, y la separación se aplica en el servidor:

| Superficie | Dónde | Quién entra |
|---|---|---|
| **Portal del estudiante** | `/` — dirección estable, la del QR | Cualquiera; el código identifica, no autentica |
| **Pantalla de proyección** | `/proyeccion/` | Solo el docente, con contraseña |
| **Panel del docente** | `/docente/` | Solo el docente, con contraseña |

El docente proyecta el QR, los estudiantes lo escanean y entran con su código. Al pulsar **Comenzar** arranca un reloj común para toda el aula. Al terminar, cada estudiante ve su resultado con el nivel de detalle que el docente eligió, y el docente descarga los datos en Excel y en un ZIP reproducible.

## Qué trae

- **Banco de preguntas** por el estándar abierto [`preguntas-icfes`](https://github.com/Riskbreaker2077/preguntas-icfes) (metadata pedagógica, bloques de texto/imagen/tabla, justificación por opción) **o escrito a mano**, pregunta por pregunta, desde el panel — sin depender de un ZIP generado con ayuda de una IA.
- **Grupos de preguntas**: lectura compartida, emparejamiento y completar espacios, resueltos en una sola pantalla.
- **Sorteo balanceado por competencia** y opciones barajadas, materializados una sola vez por intento.
- **Panel del docente**: estudiantes (importados o manuales), monitoreo en vivo, estadísticas por pregunta y por competencia, cierre calificado.
- **Exportación completa**: `.xlsx` con resumen/detalle/banco y un ZIP reproducible con las imágenes empaquetadas.
- **Línea gráfica adaptable** a la identidad de cada colegio, en las cinco pantallas.
- **Recuperación de contraseña sin red**, desde la consola del propio equipo.
- **Distribución para Windows**: ejecutable único portable o instalador con asistente — ver [`GUIA-DOCENTE.md`](GUIA-DOCENTE.md).

## Requisitos

- Node 22 o superior.
- Un portátil y una red wifi. **Nada más**: sin internet, sin cuentas, sin servicios externos.

## Uso

```bash
npm install
npm start
```

Al arrancar, la consola muestra la dirección que se dicta a las tablets. La primera vez, el panel pide crear una contraseña.

Hay archivos de ejemplo importables tal cual en [`ejemplos/`](ejemplos/), para probar el flujo entero antes del día del examen.

```bash
npm test    # suite completa (446 tests)
npm run lint
```

Para el día del examen en Windows, sin instalar Node en el equipo del colegio:

```bash
npm run build:exe         # carpeta portable con OpenTest.exe
npm run build:installer   # instalador con asistente, sin permisos de administrador
```

Ambos se documentan en [`GUIA-DOCENTE.md`](GUIA-DOCENTE.md).

## Desarrollo

El proyecto se construye con **Spec Driven Development**: no se escribe código sin especificación. Antes de tocar nada, lee [`AGENTS.md`](AGENTS.md) y la [constitución](spec/constitution/).

```
spec/
├── constitution/   reglas estables: misión, stack, roadmap
├── contracts/      formatos de archivo que entran y salen
└── features/       una carpeta por feature: spec, plan y tareas
```

## Decisiones que explican el resto

- **Sin dependencias más allá de Express y SQLite.** Ni framework de frontend, ni paso de compilación, ni CDNs. El aula no tiene internet y el docente no es informático.
- **Cero red en tiempo de ejecución.** Ninguna petición sale de la máquina. Un test lo verifica.
- **La prueba de cada estudiante se materializa en la base al empezar** y nunca se regenera: es lo que permite reanudar tras una caída y auditar meses después qué vio exactamente quien reclama su nota.
- **El sorteo es determinista**, a partir de una semilla por estudiante. Medido sobre 200 estudiantes con un banco de 50 y 20 preguntas por prueba: 200 pruebas únicas, 8 preguntas compartidas de media entre dos compañeros, y la respuesta correcta repartida al 25 % entre las cuatro posiciones.
- **Los datos son del docente.** Todo vive en un archivo SQLite que puede copiar a una USB, y sale en Excel, ZIP y JSON abiertos.

## Licencia

MIT
