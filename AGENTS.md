# AGENTS.md — cómo se trabaja en OpenTest

**OpenTest** es una aplicación de evaluación para el aula: corre en un servidor local, las tablets se conectan por intranet y cada estudiante recibe una prueba distinta (preguntas sorteadas de un banco y opciones barajadas), de modo que copiarle al de al lado no sirve.

---

## Dónde estamos (última actualización: 09/09/2026)

**Las veintisiete features están implementadas y 426 tests están en verde.** El flujo completo existe desde la importación hasta la descarga de resultados; la 014 aplica la línea gráfica institucional, la 015 permite cargar preguntas e imágenes en un solo ZIP, la 016 hace que ese banco siga el estándar externo y abierto **preguntas-icfes** (github.com/riskbreaker2077/preguntas-icfes): metadata pedagógica por pregunta, contenido en bloques (texto/imagen/tabla) y justificación por cada opción; la 017 hace que el sorteo de cada prueba reparta las preguntas entre las competencias del banco en proporción a su tamaño, en vez de puramente al azar; la 018 agrega una cuarta descarga al panel de resultados, un `.xlsx` de dos hojas (Resumen/Detalle) con cabecera en negrita/congelada y columnas ajustadas, generado con un escritor de ZIP y de SpreadsheetML propios (sin dependencias nuevas); la 019 agrega una pantalla de estadísticas por pregunta y por competencia (`/docente/estadisticas.html`), con alcance por una sesión cerrada concreta o acumulado por banco entre todas sus sesiones cerradas; la 020 agrega creación y edición manual de estudiantes desde la pantalla del docente (modal `<dialog>` con la misma validación del importador, sin pasar por CSV/JSON); la 021 quita el botón "Terminar la prueba" del examen del estudiante y endurece el servidor para rechazar entregas con preguntas pendientes (los motivos del sistema —`tiempo`, `forzada_docente`— siguen cerrando aunque haya pendientes); la 022 permite al docente borrar una evaluación cerrada **después** de haber descargado sus resultados al menos una vez, vía una nueva columna `sesiones.descargado_en` (migración v4) que se escribe desde el handler de exportación y se exige en `borrarSesion`; y la 023 hace que `urlsDeIntranet` agregue candidatas por `os.hostname()` (`http://<equipo>:3000` y `http://<equipo>.local:3000`), para que el QR use el nombre del portátil y deje de quedar mintiendo cuando el equipo cambia de subred; y... (line truncated to 2000 chars)

**La 026 está implementada (08/09/2026).** Adopta los tres tipos de grupo del estándar preguntas-icfes v1.2.0 (`contexto_compartido`, `banco_opciones` para matching, `texto_con_blancos` para cloze), persiste los campos informativos de v1.1.0 (`grado`, `prueba`, `procedencia`, `verificado`, `fuentes` por pregunta; `procedencia_justificacion` y `justificacion_verificada` por opción) y los nuevos de v1.2.0+ (`nivel_mcer`, `valor` por pregunta). El validador vendorizado va en v1.4.0; el esquema gana la tabla `grupos` y 16 columnas (migración v5); la importación excluye con aviso lo que traiga `{{numero:<id>}}`; matching y cloze se rinden en una sola pantalla y la calificación suma `valor`; la exportación sube a `formato_version: 3` (`export-resultados-v3.md`). Ejemplo en `ejemplos/banco-grupos-ingles.zip`. Pendiente solo la verificación física.

**La 027 está implementada (09/09/2026).** Restablece la contraseña del panel del docente desde la consola del propio equipo: `OpenTest.exe --recuperar-contrasena` (o `npm start -- --recuperar-contrasena` en desarrollo) abre un diálogo en español que pide la contraseña nueva dos veces con escritura oculta (asterisco por carácter en TTY real; lectura sin eco en tuberías), reutiliza el hashing `scrypt`+sal nueva de la 011 sin duplicar lógica, y **no toca ningún dato** ni la interfaz web (la 011 exigió que la recuperación no viviera en la interfaz). Maneja base inexistente (no la crea), base bloqueada (`SQLITE_BUSY` → "cierra OpenTest") y cancelación (`Ctrl+C`/EOF) sin escribir nada. El nuevo módulo es `server/recuperacion.js`, enganchado en `server/index.js` antes de abrir la base; el SEA lo recibe gratis. Documentado en `GUIA-DOCENTE.md → Olvidé la contraseña`. Queda la verificación física (máscara en terminal Windows real).

**Las verificaciones físicas se harán juntas al final en el equipo destino.** Quedan pendientes QR y legibilidad en proyector, corte real de red, usabilidad táctil/orientación, línea gráfica en dispositivos reales, legibilidad de la pantalla de resultado, la apertura real del `.xlsx` de la 018 en Excel/LibreOffice sin diálogo de reparación, y ahora también un clic-a-clic real en la pantalla de estadísticas de la 019 (verificada por HTTP con un servidor desechable, no en un navegador real). Las nuevas features 021 (botón del examen) y 022 (botón "Borrar" del panel de evaluaciones) también requieren verificación visual en el equipo destino.

| Hecho ✅ | En curso 🔧 | Siguiente 🔜 |
|---|---|---|
| 001 · 011 · 002 · 003 · 004 · 005 · 013 · 012 · 006 · 007 · 008 · 009 · 010 · 014 · 015 · 016 · 017 · 018 · 019 · 020 · 021 · 022 · 023 · 024 · 025 · 026 · **027** | — | **Validación final en equipo destino** |

### Para retomar, en este orden

1. Lee `RESTART.md`: contiene el estado operativo de la última sesión.
2. Lee `spec/constitution/roadmap.md`: dice qué está hecho y qué toca ahora.
3. Revisa las casillas manuales pendientes en 012, 013, 006, 007, 009 y 010; para lo visual, lee también la 014.
4. `npm install && npm test` — deben pasar los 426.
5. `npm start` y entra a `http://localhost:3000/` para ver el portal del estudiante, y a `/docente/` para el panel.

## Protocolo de restart entre sesiones

**Al terminar una sesión de trabajo, sobrescribe `RESTART.md` con el estado actual y agrega una entrada a `spec/bitacora.md`. Al empezar una sesión nueva, lee `RESTART.md` primero.**

`RESTART.md` es un resumen operativo corto, no un historial. La bitácora es acumulativa y recibe el contexto narrativo que no cabe en una línea del restart.

### Contexto que no está en el código

- **Las verificaciones físicas de 012, 006 y 007 están aplazadas a una única sesión final con el equipo destino.** No deben bloquear el avance de las features restantes.
- **`ejemplos/estudiantes-ejemplo.csv` y `ejemplos/banco-ejemplo.json`** ya traen datos listos para pruebas manuales (10 estudiantes en 10A/10B, 50 preguntas válidas en el formato del estándar preguntas-icfes). Úsalos en vez de inventar datos nuevos.
- **El banco de preguntas sigue el estándar externo `preguntas-icfes`** (`spec/contracts/paquete-preguntas-icfes.md`). El validador de contenido está vendorizado en `server/importers/estandar-preguntas-icfes.js`: si el estándar sube de versión, ese archivo se reemplaza entero por la nueva copia, no se edita a mano.
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
