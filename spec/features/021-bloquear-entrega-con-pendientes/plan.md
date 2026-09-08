# 021 · Plan técnico

## Pila y límites respetados

Sin nuevas dependencias, sin migración del esquema, sin build. Cambios en
tres archivos de cliente y dos de servidor, más tests.

## Backend

### Servicio: `server/services/examen.js`

En `entregarIntento(db, intento, motivo, ahora)` añado una guarda al
final del cuerpo existente, **antes** de delegar en
`entregarIntentoCalificado`:

```js
const respondidas = estadoDelExamen(db, vigente.intento, ahora).respondidas;
const pendientes = vigente.sesion.n_preguntas - respondidas;
if (pendientes > 0 && ['manual', 'ultima_pregunta'].includes(motivo)) {
  throw error(
    `Aún te quedan ${pendientes} pregunta(s) sin responder.`,
    409,
  );
}
```

Decisiones de diseño:

- **Sólo se evalúa para `manual` y `ultima_pregunta`**, no para
  `tiempo` ni `forzada_docente`. El reloj vencido y la entrega forzada
  por el docente deben poder cerrar el intento aunque el estudiante no
  haya llegado a todas: si una tablet se quedó sin batería en la
  pregunta 5, la prueba debe poder cerrarse a las 2 horas.
- Recalculo `respondidas` aquí, no lo recibo como parámetro, para no
  acoplar el servicio a la forma del estado del examen ni obligar a la
  ruta a hacer una consulta extra.
- El número que se muestra en el mensaje (`pendientes`) sale del mismo
  cómputo que va a usar el calificador: si el cliente lo muestra en un
  futuro,no habrá deriva entre lo que ve el estudiante y lo que cobra el
  servidor.
- El mensaje es en español y dice "pregunta(s)" para no condicionar la
  gramática al número: "1 pregunta", "2 preguntas", "20 preguntas".

`estadoDelExamen` ya existe y es lo que usa la ruta para `GET
/api/examen/estado`. Lo importo en este archivo (ya está importado).

### Rutas: `server/routes/examen.js`

La ruta `POST /api/examen/entregar` no cambia: sigue aceptando los dos
motivos válidos y delegando en el servicio. La nueva regla es
responsabilidad del servicio, así que si algún otro llamador futuro
invoca `entregarIntento` también queda protegido por la misma guarda.

### Tests

**`server/services/examen.test.js`** — actualizo el caso "entrega
manual y desde la última pregunta son idempotentes" porque ahora
**negaría** la entrega con pendientes. Lo reescribo en dos tests
separados:

- `entrega manual con pendientes se rechaza y no marca el intento`
  — entrega con `motivo: 'manual'` cuando `sinResponder > 0` lanza
  con código 409 y el intento sigue con `entregado_en IS NULL`.
- `entrega desde la última pregunta con pendientes se rechaza` —
  análogo con `motivo: 'ultima_pregunta'`.
- (Mantenido) `entrega manual con todas respondidas cierra el intento`
  — sigue siendo idempotente y graba `motivo_entrega = 'manual'`.
- (Mantenido) `entrega desde la última pregunta con todas respondidas`
  — graba `motivo_entrega = 'ultima_pregunta'`.
- **Nuevo:** `entrega por vencimiento del reloj cierra aunque haya
  pendientes` — verifica que el camino `tiempo` (que pasa por
  `verificarTiempo` y `cerrarSesion`, no por `entregarIntento`)
  sigue funcionando y que las saltadas cuentan 0.
- **Nuevo:** `entrega forzada por el docente cierra aunque haya
  pendientes` — idem desde `forzarEntrega`.

**`server/routes/examen.presentacion.test.js`** — agrego un caso
integral: el estudiante entra, abre la pregunta 1, salta, intenta
entregar con `motivo: 'manual'` y recibe 409 con el mensaje en español.

## Frontend

### HTML: `public/estudiante/examen.html`

Borra la línea 27:

```html
<button class="terminar" id="terminar" type="button">Terminar la prueba</button>
```

No añado nada: los tres botones de navegación son suficientes.

### CSS: `public/estudiante/examen.css`

Borra el bloque `.terminar` (líneas 73-84). No queda nada que lo
reemplace.

### JS: `public/estudiante/examen.js`

Cambios puntuales:

1. Quita `terminar` del diccionario `elementos` (línea 17).
2. Quita la línea `elementos.terminar.disabled = ocupada;` dentro de
   `actualizarBloqueo` (línea 110).
3. Quita el listener del botón `terminar` (línea 242).
4. Reescribe `confirmarEntrega(motivo)` para que **siempre** muestre el
   error inline si el servidor rechaza, sin redirigir. Hoy el cliente
   redirige a `resultado.html` cuando la entrega tiene éxito: ese
   camino se mantiene. El nuevo camino de fallo pinta el mensaje del
   servidor en `#error` y vuelve a pintar el estado de la pregunta.
5. La rama de "última pregunta" de `avanzar()` ya no usa
   `window.confirm` para preguntar "¿entregar de todas formas?": la
   pregunta ya está respondida o saltada por la acción anterior (`Guardar y
   terminar` guarda la opción elegida; `Saltar y terminar` guarda
   `null`). Sólo llama a `confirmarEntrega('ultima_pregunta')` y deja
   que el servidor sea quien decida si acepta o rechaza.

Decisión de UX: el cliente **no** deshabilita "Saltar y terminar"
aunque sepa que hay pendientes. La razón es que el estudiante puede
tener razón al creer que ya respondió todas y equivocarse con la
cuenta; mostrarle el error del servidor ("aún te quedan 3 sin
responder") es más informativo que impedirle el clic y dejarlo
preguntándose por qué.

## Cambios fuera de `server/` y `public/`

- `spec/constitution/roadmap.md`: muevo la 021 a "Hecho ✅" y actualizo
  la línea 65 de la matriz de trazabilidad ("El estudiante puede
  terminar la prueba en cualquier momento") para reflejar la nueva
  semántica.
- `AGENTS.md`, sección "Dónde estamos": actualizo la línea de estado.
- `RESTART.md`: al cerrar la sesión, resumo lo hecho.

## Lo que no cambia

- El esquema SQLite: ninguna migración nueva.
- La calificación de las saltadas: siguen contando 0 sobre el total de la
  prueba. Si el docente quiere premiar al que llega al final, lo verá
  en el puntaje: contestar mal cuenta igual que saltarse, pero contestar
  mal no se puede evitar y saltarse sí.
- La pantalla de resultado: no necesita saber si el cierre fue
  "completo" o "con saltadas"; ya muestra la nota y las preguntas, que es lo
  que el estudiante quiere ver.
- La exportación de resultados: las columnas `respondidas`,
  `saltadas`, `aciertos`, `puntaje` siguen siendo la señal que consume
  la plataforma de retroalimentación.
- La pantalla de proyección, el panel del docente y todo lo que no es
  la pantalla del examen en sí: no se ven afectados.