# AGENTS.md — cómo se trabaja en OpenTest

**OpenTest** es una aplicación de evaluación para el aula: corre en un servidor local, las tablets se conectan por intranet y cada estudiante recibe una prueba distinta (preguntas sorteadas de un banco y opciones barajadas), de modo que copiarle al de al lado no sirve.

---

## Dónde estamos (última actualización: 25/08/2026)

**Seis features implementadas, 234 tests en verde, y la 013 (portal del estudiante) construida y en gran parte verificada.** El docente ya puede: crear su contraseña, cargar estudiantes, cargar bancos de preguntas, convocar y abrir evaluaciones. El estudiante ya tiene una pantalla real en la raíz `/`: escribe su código, entra directo si solo hay una evaluación de su curso (o elige si hay varias), y espera con su nombre en pantalla hasta que la sesión pase a `en_curso` — momento en el que la pantalla avanza sola, sin recargar.

**La 013 todavía no está en "Hecho".** Le faltan 6 de sus 15 criterios de aceptación, todos por depender de features que no existen: la 012 (el botón "Comenzar" real y el QR), y la 006/007 (qué ve el estudiante *después* de esas transiciones — ahora mismo ve un mensaje honesto tipo "esta pantalla la construye la feature 006", una decisión tomada a propósito, ver `spec/features/013-portal-estudiante/plan.md`). El detalle exacto de qué se verificó y qué falta está en `tasks.md` y `spec.md` de esa feature.

| Hecho ✅ | En curso 🔧 | Siguiente 🔜 |
|---|---|---|
| 001 servidor · 011 contraseña · 002 estudiantes · 003 bancos · 004 sesiones · 005 motor | **013 portal del estudiante** — falta verificación en tablet/QR real | 012 proyección, 006 examen, 007 resultado, 008 panel, 009 export, 010 empaquetado |

### Para retomar, en este orden

1. Lee `spec/constitution/roadmap.md`: dice qué está hecho y qué toca ahora.
2. Lee `spec/features/013-portal-estudiante/tasks.md`: qué queda de esa feature y por qué.
3. `npm install && npm test` — deben pasar los 234.
4. `npm start` y entra a `http://localhost:3000/` para ver el portal del estudiante, y a `/docente/` para el panel.

### Contexto que no está en el código

- **El reloj global (`comenzada_en`, `pausada_en`, `segundos_pausados`) existe en el esquema pero nadie lo usa todavía.** Lo estrenan las features 012 y 006. Las transiciones `en_curso` y `pausada` aún no están implementadas en `services/sesiones.js` — no hay ningún botón "Comenzar" en ningún panel. Para probar el salto automático del portal hay que forzar el estado directamente en `data/opentest.db`.
- **`ejemplos/estudiantes-ejemplo.csv` y `ejemplos/banco-ejemplo.csv`** ya traen datos listos para pruebas manuales (10 estudiantes en 10A/10B, 50 preguntas válidas). Úsalos en vez de inventar datos nuevos.
- **Si desarrollas en WSL2**, el servidor queda en una red NAT que el wifi no ve y ninguna tablet lo alcanza. Hace falta `networkingMode=mirrored` en `.wslconfig` o un `netsh portproxy` desde Windows. No afecta al producto: el docente ejecutará el binario en Windows.
- **El esquema evoluciona con `server/migraciones.js`**, no editando `schema.sql` a secas. Un `.db` que ya existe no recibe columnas nuevas por su cuenta.

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

## Cuando termines una feature

Deja el repositorio listo para la siguiente sesión:

1. Marca `[x]` en `tasks.md` y en los criterios de `spec.md` **que hayas verificado de verdad**. Lo que no puedas comprobar, déjalo sin marcar y anota por qué.
2. Cambia el estado en la cabecera de su `spec.md` a *implementado ✅*.
3. Muévela a "Hecho" en `spec/constitution/roadmap.md` y pon la siguiente en "Siguiente".
4. Actualiza la sección **Dónde estamos** de este archivo.
5. Commit y push.

## Cómo se marca el progreso

- Marca `[x]` en el `tasks.md` de la feature conforme avanzas, no al final.
- Marca `[x]` en los criterios de aceptación de `spec.md` solo cuando los hayas verificado de verdad.
- Al terminar la feature, muévela a "Hecho ✅" en `spec/constitution/roadmap.md`.
