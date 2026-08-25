# 013 · Portal del estudiante — Plan

## Enfoque

Sustituye `public/index.html` de la feature 001. La raíz pasa a ser una única página con tres estados —identificarse, elegir evaluación, esperar— que se resuelven contra el servidor sin cambiar de URL, para que recargar o volver por el QR siempre funcione.

La consulta de sesiones disponibles se hace **con el código ya escrito**, porque el filtro es por curso y el curso lo determina el estudiante. Esto tiene una consecuencia deliberada: el listado no revela nada a quien no tenga un código válido.

La pantalla de espera consulta el estado cada 2 segundos; cuando el docente pulsa Comenzar (feature 012), la tablet pasa sola al examen. Sin eso, el docente tendría que pedirle a treinta estudiantes que recarguen a la vez.

## Implementación

1. `server/routes/examen.js`:
   - `POST /api/examen/sesiones` — recibe el código, devuelve el nombre del estudiante y las sesiones `abierta` o `en_curso` cuyos cursos lo incluyan. Con código inválido, un 404 con el mensaje del contrato. **No devuelve nada que permita enumerar sesiones sin código.**
   - `POST /api/examen/entrar` — pasa a recibir `{ codigo, sesionId }`; valida que esa sesión esté disponible para ese curso y crea o reanuda el intento (feature 004).
   - `GET /api/examen/estado` — añade el estado de la sesión y el tiempo restante, para que la espera sepa cuándo saltar al examen.
2. `server/services/sesiones.js` — `sesionesDisponiblesPara(db, estudiante)`: filtra por estado y por pertenencia del curso a la lista de `cursos`.
3. `public/index.html` + `public/portal.js` + `public/portal.css` — los tres estados en una sola página; campo de código grande con `inputmode` y `autocomplete="off"`; sondeo de 2 s solo en el estado de espera.
4. Eliminar `public/docente/index.html` como página puente pública y `public/estudiante/index.html`; el panel vive tras la autenticación (feature 011) y el estudiante ya no necesita una página aparte.
5. Tests: listado filtrado por curso y por estado; código inexistente; sin sesiones disponibles; una sola sesión entra directo; entrada a una sesión de otro curso rechazada; el HTML servido en la raíz no menciona `docente` ni `proyeccion`.

## Decisiones

- **La raíz es del estudiante** — la alternativa (`/estudiante/`) alarga la dirección que treinta personas van a teclear y no aporta nada: el docente llega a su panel por el acceso directo que abre el ejecutable (feature 010) o escribiendo `/docente/`.
- **El listado exige el código** — así el portal no es un catálogo de qué exámenes hay hoy en el colegio para cualquiera que abra la dirección.
- **Entrada automática cuando solo hay una opción** — es el caso normal. Obligar a elegir entre un solo elemento es una pantalla que no informa de nada.
- **La espera salta sola al examen** — treinta recargas coordinadas a viva voz es exactamente el tipo de fricción que la misión prohíbe.
- **Se elimina la portada de "Soy docente / Soy estudiante"** — enseñaba al estudiante dónde estaba la puerta del docente. La feature 001 queda parcialmente sustituida y así se anota en su spec.
- **Sondeo de 2 s solo mientras se espera** — es el único momento en que la latencia se nota; durante el examen no hace falta.

## Riesgos

- **Un estudiante escribe el código de otro para ver qué exámenes tiene** — información de bajo valor, pero real. Mitigación: el listado muestra solo el nombre de la prueba, y el monitoreo con nombres (feature 008) revela el uso indebido del código.
- **Dos sesiones abiertas para el mismo curso confunden al estudiante** — mitigación: se muestran con su nombre completo y el docente ve en el panel cuántas tiene abiertas; es una situación que él controla.
- **El QR lleva a la raíz y el estudiante ya tenía un examen a medias** — mitigación: la reanudación por código (feature 004) lo devuelve a su intento; llegar por el QR no crea nada nuevo.
