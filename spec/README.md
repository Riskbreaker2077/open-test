# spec/ — Spec Driven Development de OpenTest

> Aquí vive la especificación completa de OpenTest. Primero se escribe la spec, luego el plan, luego las tareas, y **solo entonces** se toca el código.
>
> Esta carpeta se generó a partir de `../spec_template/`, que se conserva intacto como referencia.

## Estructura

```
spec/
├── constitution/            ← reglas estables del proyecto (cambian poco)
│   ├── mission.md           ← qué construimos y para quién
│   ├── tech-stack.md        ← tecnologías, modelo de datos, convenciones y límites
│   └── roadmap.md           ← orden de las features + trazabilidad de requisitos
├── contracts/               ← formatos de archivo que entran y salen del sistema
│   ├── import-estudiantes.md
│   ├── import-banco-preguntas.md
│   └── export-resultados-v1.md
└── features/                ← una carpeta por feature
    └── NNN-nombre-feature/
        ├── spec.md          ← qué hace + criterios de aceptación
        ├── plan.md          ← cómo se implementa
        └── tasks.md         ← checklist de tareas
```

### Por qué existe `contracts/` (añadido a la plantilla)

La plantilla original no lo contempla. Se añadió porque OpenTest tiene tres formatos de archivo —el CSV/JSON de estudiantes, el de preguntas y el de resultados— que atraviesan varias features y son un compromiso con el exterior: el docente prepara sus archivos según ellos y otra plataforma consume el export. Documentarlos dentro de cada `spec.md` los habría desincronizado a la primera. Viven en un solo sitio y las features los referencian.

## Flujo para una feature nueva

1. Crear `features/NNN-nombre-feature/` con el siguiente número libre (`001`, `002`, …).
2. Escribir `spec.md`: qué hace, por qué y criterios de aceptación medibles.
3. Escribir `plan.md`: enfoque técnico y decisiones, respetando `constitution/tech-stack.md`.
4. Desglosar en `tasks.md` y marcar el progreso conforme avanza.
5. Implementar y validar (`npm test`, `npm run lint`).
6. Actualizar `constitution/roadmap.md` (mover la feature a "Hecho").

> La constitución manda: si una feature choca con `mission.md` o `tech-stack.md`, se replantea la feature, no la constitución.

Ver también `../AGENTS.md` para el contrato de trabajo completo.
