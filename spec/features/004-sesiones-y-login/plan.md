# 004 · Sesiones y login — Plan

## Enfoque

La sesión es una fila con una máquina de estados de tres posiciones (`borrador` → `abierta` → `cerrada`) y transiciones unidireccionales. Toda la protección del examen cuelga de ahí: la inmutabilidad de los parámetros, quién puede entrar y qué se puede exportar.

El login no crea credenciales: genera un token aleatorio asociado al intento y lo devuelve para que la tablet lo guarde en `localStorage`. **La reanudación se resuelve por `(sesion_id, codigo)`, no por el token**: si la tablet perdió su `localStorage` —se apagó, se limpió, es otra tablet—, volver a escribir el código recupera el mismo intento y emite un token nuevo. El token es una comodidad para no reescribir el código en cada petición, no el ancla de la identidad.

## Implementación

1. `server/services/sesiones.js` — `crearSesion`, `abrirSesion` (valida tamaño del banco y que no haya otra abierta), `cerrarSesion`, `sesionAbierta(db)`, `actualizarSesion` (rechaza si no está en `borrador`).
2. `server/services/intentos.js` — `iniciarOReanudarIntento(db, sesion, estudiante)`: si existe intento para `(sesion_id, codigo)` lo devuelve con un token nuevo; si no, crea uno con `semilla` y `token` de `crypto.randomBytes`. Devuelve además si ya está entregado.
3. Índice `UNIQUE(sesion_id, codigo_estudiante)` en `intentos` — la garantía de "un intento por estudiante y sesión" vive en el esquema, no solo en el código. Se retira en cambio el índice único de sesión abierta: ahora pueden coexistir varias.
4. `server/routes/examen.js` — `POST /api/examen/entrar` (código → estado del intento + token), `GET /api/examen/estado` (con token, para que la tablet sepa dónde está).
5. Middleware `conIntento` en `routes/examen.js` — resuelve el token a un intento vivo, o responde 401 en español. Todas las rutas del estudiante posteriores cuelgan de él.
6. `server/routes/docente.js` — CRUD de sesiones y las transiciones de estado.
7. `public/docente/sesiones.html` + `sesiones.js` — formulario de creación con los defaults, listado, botones abrir/cerrar y aviso destacado de qué URL dictar.
8. `public/estudiante/entrar.html` + `entrar.js` — un único campo grande de código, teclado numérico sugerido (`inputmode`), botón de 44 px y mensajes de error en el mismo lugar de la pantalla.
9. Tests: máquina de estados (transiciones válidas e inválidas), apertura bloqueada por banco corto y por sesión ya abierta, inmutabilidad de parámetros, login con código inexistente / curso no convocado / sin sesión abierta / ya entregado, y reanudación devolviendo el mismo `intento_id`.

## Decisiones

- **Sin contraseña para el estudiante** — el código institucional es el identificador que ya usan y que el docente puede verificar en persona. Añadir contraseñas generaría más incidencias en el aula (olvidos, bloqueos) que las suplantaciones que evitaría, con el docente delante vigilando. Se documenta como decisión consciente de seguridad.
- **Reanudación por código, no por token** — una tablet que se apaga o un estudiante que cambia de tablet son escenarios normales en un aula. Anclar la identidad al token los convertiría en pérdida del examen.
- **`UNIQUE` en la base, no solo en el servicio** — dos toques rápidos en "Entrar" crean dos peticiones concurrentes; la restricción del esquema es la única garantía real de que no nacen dos intentos.
- **Varias sesiones abiertas a la vez** — el colegio necesita aplicar dos exámenes distintos en paralelo. El estudiante elige entre las convocadas para su curso, y cuando solo hay una entra directo (feature 013). Se revisó la decisión inicial de permitir una sola: simplificaba la interfaz a costa de un caso de uso real.
- **Parámetros congelados al abrir** — cambiar la duración o el número de preguntas con el examen en marcha produciría pruebas incomparables entre estudiantes.
- **El panel va tras contraseña** (feature 011) — la suposición inicial de "portátil de confianza" no se sostiene cuando las tablets alcanzan el servidor por la intranet: sin contraseña, cualquier estudiante que escriba `/docente/` vería el banco con las respuestas marcadas.

## Riesgos

- **Un estudiante entra con el código de otro** — el sistema no puede distinguirlo. Mitigación: el panel del docente (feature 008) muestra nombre y apellidos de quien está presentando en cada momento, lo que hace el fraude visible en la práctica.
- **Estudiante que no aparece en la lista el día del examen** — se queda fuera. Mitigación: la pantalla de error dirige al docente, que puede añadirlo con una importación rápida (feature 002) sin cerrar la sesión.
- **Cursos escritos distinto** en el archivo de estudiantes y en la sesión (`10A` vs `10 A`) — nadie entra. Mitigación: los cursos de la sesión se eligen de una lista desplegable poblada con los cursos realmente existentes en la base, nunca escritos a mano.
