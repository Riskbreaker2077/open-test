# 024 · Plan técnico

## Pila y límites respetados

Sin nuevas dependencias, sin cambios en el esquema, sin build, sin
cambios en el estado de la máquina. Cambios en una ruta del backend,
una función del servicio de examen y dos archivos del cliente, más
tests.

## Backend

### Servicio: `server/services/examen.js`

Agrego una función nueva que envuelve la pausa desde el lado del
estudiante. La razón de vivir en el servicio (y no inline en la ruta)
es testabilidad: queremos poder verificar idempotencia y limpieza de
cookie en aislamiento, sin levantar el servidor HTTP.

```js
export function pausarIntentoComoEstudiante(db, intento, ahora = new Date()) {
  const sesion = sesionDelIntento(db, intento);
  if (sesion.estado === 'en_curso') {
    pausarSesion(db, sesion.id, ahora);
  } else if (sesion.estado !== 'pausada') {
    throw error(
      `No se puede pausar una evaluación en estado "${sesion.estado}".`,
      409,
    );
  }
  return obtenerSesion(db, sesion.id);
}
```

Decisiones:

- **Sólo pausa si está en `en_curso`**: si ya está `pausada`, es no-op.
  Esto es idempotencia real — dos estudiantes que pulsen el botón a la
  vez no se pisan.
- **Rechaza con 409 cualquier otro estado**: el servidor valida porque
  el cliente no debería estar en la pantalla de examen si la sesión no
  está en `en_curso` o `pausada`, pero si pasa (race condition con el
  docente cerrando), el mensaje es accionable.
- **Importa `pausarSesion` desde `sesiones.js`** y `obtenerSesion`
  desde el mismo módulo. `sesionDelIntento` ya existe en este archivo
  (`server/services/examen.js:13`).

### Rutas: `server/routes/examen.js`

Agrego una ruta nueva, justo después de `/entregar` (línea 97) y antes
de `/resultado`:

```js
router.post('/pausar', conIntento(db), (req, res) => {
  try {
    pausarIntentoComoEstudiante(db, req.intento);
  } catch (err) {
    // Aun si falla, limpiamos la cookie: si el estudiante tocó el botón,
    // ya no queremos que esta tablet quede con sesión viva.
    res.clearCookie(NOMBRE_COOKIE_ESTUDIANTE, { path: '/' });
    return res.status(err.estado ?? 400).json({ ok: false, mensaje: err.message });
  }
  res.clearCookie(NOMBRE_COOKIE_ESTUDIANTE, { path: '/' });
  res.json({ ok: true });
});
```

El bloque try/catch garantiza la limpieza de cookie en cualquier camino
de error — incluyendo los que no son míos (que la BD lance algo). Esto
es defensa explícita contra el escenario "el estudiante pulsó Pausar
y la tablet quedó zombie mandando respuestas a un intento que ya no
le corresponde".

### Tests

**`server/services/examen.test.js`** — agrego dos tests:

- `pausar desde el lado del estudiante pone la sesión en pausada`:
  entrar a un intento en `en_curso`, llamar
  `pausarIntentoComoEstudiante`, verificar que `sesion.estado ===
  'pausada'` y que `intento.entregado_en` sigue siendo `null`.
- `pausar desde el estudiante es idempotente si la sesión ya está
  pausada`: pausar dos veces seguidas, verificar que la segunda no
  lanza y la sesión queda igual.

**`server/routes/examen.presentacion.test.js`** — agrego tres tests
integrales:

- `POST /api/examen/pausar` en una sesión en curso: devuelve 200, la
  sesión queda `pausada`, la cookie `opentest_estudiante` ya no viene
  en la respuesta.
- `POST /api/examen/pausar` dos veces seguidas: la segunda también
  devuelve 200 (idempotencia visible desde HTTP).
- `POST /api/examen/pausar` sin cookie: devuelve 401, igual que el
  resto de `/api/examen/*`.

## Frontend

### HTML: `public/estudiante/examen.html`

Reutilizo el lugar donde antes estaba "Terminar la prueba" (línea 27).
Pongo el nuevo botón con el mismo estilo visual y un id descriptivo
del comportamiento.

```html
<p class="cuenta-minima" id="cuenta-minima"></p>
<button class="terminar" id="pausar-salir" type="button">Pausar y salir</button>
```

Mantengo la clase CSS `terminar` porque el estilo visual es el mismo
(texto de excepción, color de error, subrayado). El `id` cambia a
`pausar-salir` para reflejar el comportamiento.

### CSS: `public/estudiante/examen.css`

**No cambia.** La regla `.terminar` que añadí/restauré en la 021 (ya
existía antes de la 021, la cual sólo la borró y esta feature la
recupera con otro id) sigue valiendo.

### JS: `public/estudiante/examen.js`

Tres piezas:

1. Una referencia nueva en el diccionario `elementos`:
   `pausarSalir: document.getElementById('pausar-salir')`.
2. Una línea en `actualizarBloqueo`:
   `elementos.pausarSalir.disabled = ocupada;` (mismo patrón que el
   resto).
3. El handler:

```js
async function pausarYSalir() {
  if (!window.confirm(
    'Vas a pausar la evaluación para todos. ¿Continuar?',
  )) return;

  ocupada = true;
  actualizarBloqueo();
  try {
    await pedir('/api/examen/pausar', { method: 'POST' }, true);
    window.location.replace('/');
  } catch (err) {
    mostrarError(`No se pudo pausar. ${err.message}`);
    ocupada = false;
    actualizarBloqueo();
  }
}

elementos.pausarSalir.addEventListener('click', pausarYSalir);
```

La redirección a `/` es deliberada: lleva al estudiante al portal
donde puede volver a identificarse con su código cuando la docente
reanude la sesión. El path `/` es la dirección estable que la 013 ya
estableció como la entrada del estudiante.

## Cambios fuera de `server/` y `public/`

- `spec/constitution/roadmap.md`: muevo la 024 a "Hecho ✅".
- `AGENTS.md`, sección "Dónde estamos": actualizo la línea de estado.
- `RESTART.md` y `spec/bitacora.md`: al cerrar la sesión.

## Lo que no cambia

- El estado de la máquina de sesiones (`borrador` → `abierta` →
  `en_curso` → `pausada` → `cerrada`) y los handlers del docente
  (`/api/docente/sesiones/:id/pausar` y `/reanudar`): la 024 reusa
  `pausarSesion` sin tocar la ruta del docente.
- El examen en sí: navegación, guardado, reloj, mínimos por pregunta,
  calificación: nada cambia.
- La pantalla de "La prueba está en pausa" que ya pinta el cliente
  cuando el estado es `pausada` (`public/estudiante/examen.js:227-229`):
  ya funciona y sigue valiendo para cuando el docente pausa desde el
  panel y para cuando un estudiante pausa desde su botón.
- El endpoint `/api/examen/salir`: sigue siendo el logout puro
  (limpia cookie sin tocar la sesión). El nuevo `/pausar` es
  semánticamente distinto: pausa y sale.
