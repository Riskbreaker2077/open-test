# 027 · Plan técnico

## Pila y límites respetados

Sin dependencias nuevas, sin migración (la contraseña ya vive en la tabla
`config`, clave/valor), sin build en el frontend y sin tocar la interfaz.
Todo el trabajo es backend + consola: un módulo nuevo de recuperación, un
cambio pequeño en `server/index.js`, un apartado reescrito de la guía y
tests.

## Detección del modo

`server/index.js` es el punto de entrada único, tanto para `npm start`
como para el SEA (`scripts/sea-entry.cjs` acaba importando
`server/index.js`). La detección va ahí, **antes** de abrir la base ni
calcular puertos:

```js
import { esModoRecuperacion, recuperarContrasena } from './recuperacion.js';

if (esModoRecuperacion(process.argv)) {
  await recuperarContrasena();
  process.exit(0); // el flujo ya cerró la base; exitCode lo maneja el flujo
}
```

`esModoRecuperacion(argv)` es una función pura exportada para
testearla: filtra los elementos de `argv` que empiezan por guión
(comparación en minúsculas) y busca `--recuperar-contrasena` o su
variante con guión simple (`-recuperar-contrasena`, porque Windows a
veces normaliza así los parámetros en accesos directos). Filtrar por
guión en vez de hacer `argv.slice(2)` es necesario porque en el SEA el
ejecutable es `argv[0]` y el parámetro llega en `argv[1]`, mientras que
en `npm start` hay dos elementos antes (`node`, `server/index.js`).

## Módulo: `server/recuperacion.js`

Vive en la raíz de `server/` (no en `services/`) porque es un flujo de
consola que habla con `process.stdin`/`stdout`, no una operación de
dominio reutilizable desde rutas. Exporta:

```js
export function esModoRecuperacion(argv) { ... }
export function restablecerContrasena(db, nueva, confirmacion) { ... }
export async function recuperarContrasena({
  entrada = process.stdin, salida = process.stdout, rutaBd = RUTA_BD_POR_DEFECTO,
} = {}) { ... }
```

### `restablecerContrasena(db, nueva, confirmacion)`

La única escritura del flujo, separada del diálogo para testearla en
aislamiento:

1. Si `!hayContrasena(db)` → lanza error con mensaje
   *"Este equipo todavía no tiene contraseña. Abre OpenTest
   normalmente para crearla."*
2. Si `nueva !== confirmacion` → *"Las dos contraseñas no coinciden."*
3. Si falla la longitud → deja que `establecerContrasena`
   (`server/services/auth.js`) lance su mensaje de siempre
   (mínimo 6 caracteres), sin duplicar la regla.
4. En éxito: `establecerContrasena(db, nueva)` — que ya genera **sal
   nueva** y escribe `docente_salt` + `docente_hash` en una transacción.
   Es literalmente la misma función del primer arranque: cero lógica de
   hashing duplicada.

### `recuperarContrasena(options)`

El flujo interactivo, con `entrada`/`salida`/`rutaBd` inyectables para
poder probarlo sin consola real ni la base del docente (y con `abrir`
inyectable para simular una base ocupada sin esperar el timeout de
better-sqlite3):

1. **Base inexistente**: si `!existsSync(rutaBd)`, imprime el mensaje de
   "todavía no hay contraseña" y termina con código 0. Comprobación
   *antes* de `abrirBd` para no crear un `opentest.db` vacío por
   accidente.
2. **Base bloqueada**: `abrirBd` va dentro de try/catch; si el error
   trae `code === 'SQLITE_BUSY'` (OpenTest abierto en otra ventana),
   imprime *"Cierra OpenTest (la ventana del servidor) y vuelve a
   intentarlo."* y termina con `process.exitCode = 1`. Sin este manejo
   el docente vería un stack trace.
3. **Ya configurada** (existe base, `hayContrasena` es falso): mismo
   mensaje de "todavía no tiene contraseña", código 0.
4. **Bucle de petición** con lectura cruda (raw mode) sobre la entrada:
   `leerOcultaRaw(salida, entrada, pregunta)` muestra la pregunta, lee de a
   un carácter con `entrada.setRawMode(true)`, imprime un `*` por tecla
   (y nada por la terminal al terminar), maneja `enter` (terminar),
   `backspace` (borrar) y `ctrl+c` (salir con código 1 **sin** tocar la
   base — el reject del promise propagado por `await` en `index.js`
   basta). Pide la primera; si es menor a 6 caracteres avisa y vuelve a
   pedir; pide la confirmación; si difiere, avisa y vuelve a la
   primera. El bucle es del flujo, no de `restablecerContrasena`: así
   el restablecimiento se prueba como función pura y la reiteración como
   consola. Con entradas **sin** TTY (tuberías, tests) el flujo usa un
   lector de líneas con búfer compartido (`crearLector`) que no pierde
   el resto de un trozo grande ni el evento `end`; ese `end` sin línea
   completa produce el mismo `Cancelado` que `Ctrl+C`.
5. **Escritura**: `restablecerContrasena(db, nueva, confirmacion)`.
   Como `db` ya está abierta en exclusiva dentro de este proceso, no hay
   carrera con la UI (que no existe en este modo).
6. **Cierre y salida**: imprime la confirmación con la instrucción de
   *"cierra esta ventana y abre OpenTest con normalidad"*, hace
   `cerrarBd(db)` y deja `process.exitCode = 0`.

La máscara con `*` (y no silencio total) es una decisión de usabilidad
documentada en la spec: el docente ve que la máquina está recibiendo lo
que escribe, que era su queja con los campos que "no escriben nada".

## Cambio en `server/index.js`

Las tres líneas de detección del modo descritas arriba, justo después de
los imports y antes de `siguientePuertoLibre`. El resto del arranque no
se toca: sin el parámetro, el comportamiento es byte a byte el mismo.

## Guía: `GUIA-DOCENTE.md`

Se reemplaza la sección **"Olvidé la contraseña"** (hoy: "no se puede
recuperar… solicite ayuda técnica") por el procedimiento paso a paso:

1. Cierra OpenTest si está abierto (ventana del servidor).
2. Abre la carpeta del programa, mantén `Mayús` y haz clic derecho →
   *"Abrir ventana de PowerShell aquí"* (o crea un acceso directo a
   `OpenTest.exe` y agrégale ` --recuperar-contrasena` al campo
   *Destino*; la guía muestra las dos, con capturas pendientes para la
   validación física).
3. Escribe la contraseña nueva dos veces y cierra la ventana.
4. Abre OpenTest con normalidad.

Con una nota al pie: *quien tenga acceso físico al portátil puede
restablecer la contraseña; guárdalo con el mismo cuidado con el que
cuidas el archivo de resultados*.

## Tests

**`server/recuperacion.test.js`** (nuevo):

- `esModoRecuperacion` con el parámetro exacto, con guión simple, y con
  argv vacío o con otros parámetros → falso.
- `restablecerContrasena`: sobre una base con contraseña cambia el hash
  y `verificar(db, nueva)` pasa; la sal nueva difiere de la vieja;
  rechaza confirmación distinta; rechaza corta; lanza el error de
  "todavía no tiene contraseña" sobre una base nueva.
- `recuperarContrasena` con streams falsos (`PassThrough`) y base en
  memoria: flujo feliz (`abc123\n` dos veces) escribe y devuelve 0;
  contraseñas que no coinciden reiteran la pregunta; `ctrl+c` no escribe
  nada.

**`server/index.test.js`** (si el archivo no existe, se crea solo con
esto): con `esModoRecuperacion` espiado como falso, la app arranca
normal — se cubre implícitamente con la suite entera; el test explícito
es de la función pura, no de levantar un servidor.

## Cambios fuera de `server/`

- `GUIA-DOCENTE.md`: sección "Olvidé la contraseña" reescrita.
- `spec/constitution/roadmap.md`: la 027 a "Hecho ✅" al cerrar.
- `AGENTS.md` (sección "Dónde estamos"), `RESTART.md` y
  `spec/bitacora.md`: al cerrar la sesión.
- `spec/features/011-autenticacion-docente/spec.md`: el criterio
  pendiente de recuperación se marca y apunta a esta feature.

## Lo que no cambia

- `server/routes/auth.js`: entradas, salidas, cambio de contraseña
  autenticado y la espera creciente por IP quedan intactos.
- `server/services/auth.js`: `establecerContrasena` se reutiliza tal
  cual; quizá solo exporta algo si hace falta, sin cambiar su conducta.
- El esquema y las migraciones: la 5 sigue siendo la última.
- El empaquetado (`scripts/build-exe.js`, `scripts/sea-entry.cjs`): el
  SEA ya importa `server/index.js`, así que el parámetro llega gratis al
  ejecutable.
