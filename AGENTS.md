# AGENTS.md — cómo se trabaja en OpenTest

**OpenTest** es una aplicación de evaluación para el aula: corre en un servidor local, las tablets se conectan por intranet y cada estudiante recibe una prueba distinta (preguntas sorteadas de un banco y opciones barajadas), de modo que copiarle al de al lado no sirve.

**Estado actual:** solo documentación. No existe código todavía. La primera feature a implementar es `spec/features/001-servidor-local/`.

---

## Regla nº 1 — Spec Driven Development

**No se escribe código sin especificación.** Antes de tocar un archivo de `server/` o `public/`, la feature correspondiente debe tener sus tres documentos escritos y leídos:

1. Crear `spec/features/NNN-nombre/` con el siguiente número libre.
2. Escribir `spec.md` — qué hace y criterios de aceptación medibles.
3. Escribir `plan.md` — enfoque técnico, respetando `spec/constitution/tech-stack.md`.
4. Desglosar en `tasks.md`.
5. Implementar y validar (`npm test`, `npm run lint`).
6. Mover la feature a "Hecho" en `spec/constitution/roadmap.md`.

Si a mitad de la implementación descubres que la spec estaba equivocada, **se corrige la spec primero** y luego el código. Nunca al revés, y nunca solo el código.

## Jerarquía de autoridad

```
constitution/  >  contracts/  >  features/  >  código
```

- `spec/constitution/` manda sobre todo. Si una feature choca con `mission.md` o `tech-stack.md`, se replantea la feature, no la constitución.
- `spec/contracts/` define los formatos de archivo que entran y salen. Son contratos con el mundo exterior: cambiarlos rompe a los docentes y a la plataforma de retroalimentación. No se tocan sin subir su versión.
- `spec/features/` describe funcionalidad concreta dentro de esos límites.

## Orden de lectura obligatorio

Antes de trabajar en cualquier cosa, en este orden:

1. `spec/constitution/mission.md` — qué es y qué no es el producto.
2. `spec/constitution/tech-stack.md` — stack, modelo de datos, convenciones, límites duros.
3. `spec/constitution/roadmap.md` — qué está hecho y qué toca ahora.
4. La feature en curso: su `spec.md`, `plan.md` y `tasks.md`.
5. Los `spec/contracts/` que esa feature mencione.

## Dónde vive cada cosa

| Ruta | Qué contiene |
|---|---|
| `server/` | Backend Express: `app.js`, `db.js`, `routes/`, `services/`, `importers/`, `exporters/` |
| `public/` | Frontend servido tal cual: `docente/`, `estudiante/`, `shared/` |
| `data/` | `opentest.db` (SQLite) y `uploads/imagenes/`. Datos del docente: **nunca se versiona** |
| `spec/` | Toda la documentación SDD |
| `spec_template/` | Plantilla original de referencia. **No se modifica** |

## Comandos

| Comando | Para qué |
|---|---|
| `npm start` | Arranca el servidor y muestra la URL que se dicta a las tablets |
| `npm run dev` | Igual, con recarga automática |
| `npm test` | Suite con el runner nativo `node:test` |
| `npm run lint` | Estilo |
| `npm run build:exe` | Genera el ejecutable único para el docente |

## Límites duros (los que más se violan)

- **Cero red en runtime.** Ni fuentes de Google, ni CDNs, ni analítica, ni comprobación de actualizaciones. El aula no tiene internet y el examen no puede depender de que la tenga.
- **Cero paso de build en el frontend.** HTML, CSS y JS vanilla con ES modules nativos. Nada de bundlers, transpiladores ni frameworks.
- **Sin dependencias nuevas** salvo que el `plan.md` de la feature las justifique explícitamente.
- **La API del estudiante nunca revela cuál es la respuesta correcta** antes de que entregue. Ni en un campo extra, ni en el orden, ni en un comentario del HTML.
- **Toda la interfaz en español**, redactada para alguien que no es informático.
- No borrar `data/opentest.db` desde código, bajo ninguna circunstancia.

## Cómo se marca el progreso

- Marca `[x]` en el `tasks.md` de la feature conforme avanzas, no al final.
- Marca `[x]` en los criterios de aceptación de `spec.md` solo cuando los hayas verificado de verdad.
- Al terminar la feature, muévela a "Hecho ✅" en `spec/constitution/roadmap.md`.
