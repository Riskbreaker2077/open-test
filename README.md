# OpenTest

Evaluación en el aula con **pruebas personalizadas**, sobre un servidor local y sin internet.

El docente arranca OpenTest en su portátil, las tablets se conectan por la intranet del colegio y **cada estudiante recibe una prueba distinta**: preguntas sorteadas al azar de un banco común y opciones de respuesta barajadas. Mirar la pantalla del compañero no sirve de nada.

> **Estado: en construcción.** Ya funcionan el servidor, la contraseña del panel, la carga de estudiantes y la de bancos de preguntas. El examen en sí todavía no. Ver el [roadmap](spec/constitution/roadmap.md).

## Por qué existe

Los estudiantes se copian en los exámenes. La respuesta habitual es vigilar más. Esta es otra: hacer que copiar no dé información útil, porque la pregunta 7 de un estudiante no es la pregunta 7 de su compañero, y sus opciones no están en el mismo orden.

## Cómo funciona

Tres superficies separadas, y la separación se aplica en el servidor:

| Superficie | Dónde | Quién entra |
|---|---|---|
| **Portal del estudiante** | `/` — dirección estable, la del QR | Cualquiera; el código identifica, no autentica |
| **Pantalla de proyección** | `/proyeccion/` | Solo el docente, con contraseña |
| **Panel del docente** | `/docente/` | Solo el docente, con contraseña |

El docente proyecta el QR, los estudiantes lo escanean y entran con su código. Al pulsar **Comenzar** arranca un reloj común para toda el aula. Al terminar, cada estudiante ve su resultado y el docente descarga los datos en CSV y JSON.

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
npm test    # suite completa
npm run lint
```

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
- **Los datos son del docente.** Todo vive en un archivo SQLite que puede copiar a una USB, y sale en CSV y JSON abiertos.

## Licencia

MIT
