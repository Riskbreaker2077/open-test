# 027 · Recuperación de la contraseña del docente

**Estado:** implementado ✅

## Qué hace

Si el docente olvida la contraseña del panel, puede restablecerla desde
**una consola en el propio equipo**, arrancando OpenTest con un parámetro
de recuperación:

- En el ejecutable de Windows: `OpenTest.exe --recuperar-contrasena`
  (o un acceso directo que lleve ese parámetro).
- En desarrollo: `npm start -- --recuperar-contrasena`.

En ese modo la aplicación **no arranca el servidor ni abre el navegador**:
abre un diálogo de consola en español que pide la contraseña nueva dos
veces (con la escritura oculta), la valida con las mismas reglas de
siempre (mínimo 6 caracteres) y la guarda cifrada con `scrypt` y sal
nueva. Al terminar, el docente arranca OpenTest con normalidad y entra
con la contraseña nueva.

El restablecimiento **exige acceso físico al equipo**: quien pueda abrir
una consola en el portátil del docente puede ejecutar el comando. Eso es
una decisión deliberada, heredada de la 011: quien tiene el equipo tiene
también el archivo `opentest.db`, así que la consola no amplia la
superficie de riesgo. Lo que la 027 elimina es la situación actual —
"restaure una copia de seguridad o solicite ayuda técnica"—, que deja al
docente sin salida.

## Por qué

La 011 protegió el panel con contraseña, pero dejó la recuperación como
criterio pendiente: *"procedimiento documentado de recuperación que
exige acceso físico al equipo (no un enlace en la interfaz)"*. Hoy la
guía (`GUIA-DOCENTE.md → Olvidé la contraseña`) dice que la contraseña
no se puede recuperar. Un docente que la olvida pierde el acceso a sus
propios datos, con evaluaciones cerradas dentro y sin forma de bajarlas:
esa es exactamente la clase de abandono que `mission.md` prohibe.

Se descartaron de entrada las alternativas web:

- **Correo / preguntas de seguridad**: no hay red en el aula (límite
  duro) y no se quieren datos personales del docente (fuera de alcance
  de la 011).
- **Un enlace "¿olvidaste tu contraseña?" en la pantalla de entrada**:
  una tablet de estudiante podría tocarlo. La recuperación no es un
  camino de la interfaz, es un procedimiento del equipo.

## Criterios de aceptación

### Modo de consola

- [x] Arrancar con `--recuperar-contrasena` abre el flujo de recuperación
      y **no** levanta el servidor HTTP ni abre el navegador (verificado
      end-to-end con `node server/index.js --recuperar-contrasena`; la
      detección del parámetro funciona igual en `npm start` y en el SEA).
- [x] El flujo habla en español, sin términos técnicos: pide
      "contraseña nueva" y "Repítela para confirmar", con la escritura
      **oculta**: asterisco por carácter en TTY real (`leerOcultaRaw`),
      lectura sin eco en tuberías. La máscara en terminal real queda
      para la verificación física (el entorno de tests no tiene TTY).
- [x] Si las dos entradas no coinciden, lo dice y vuelve a pedir la
      primera, sin limitación de intentos (verificado con streams
      falsos: `nuevaClave1/otraCosa2` reitera y `nuevaClave1/nuevaClave1`
      guarda).
- [x] Rechaza contraseñas de menos de 6 caracteres con el mismo mensaje
      que usa el resto de la aplicación (test del servicio y del flujo,
      que reitera tras el rechazo).
- [x] Al guardar con éxito imprime una confirmación y una instrucción
      clara: cerrar esta ventana y abrir OpenTest con normalidad. Sale
      con código 0.
- [x] El restablecimiento **solo** escribe `docente_hash` y
      `docente_salt` en `config` (reutiliza `establecerContrasena` de
      la 011, que escribe exactamente eso en una transacción). No toca
      estudiantes, bancos, sesiones, intentos ni respuestas. La sal es
      nueva (test que compara sal vieja vs. nueva).
- [x] Si el equipo **aún no tiene contraseña** configurada, no pide
      nada: explica que todavía no hay contraseña y que basta con abrir
      OpenTest normalmente para crearla la primera vez. Sale con código
      0. Si la base de datos ni siquiera existe, no la crea (test que
      verifica `existsSync` falso después del flujo).
- [x] Si la base de datos está **bloqueada** (OpenTest está abierto en
      otra ventana), lo dice en claro: *"Cierra OpenTest (la ventana del
      servidor) y vuelve a intentarlo"*. Sale con código distinto de 0,
      sin escribir nada. Cubierto con la función `abrir` inyectable
      (camino de apertura); la escritura bloqueada comparte el mismo
      manejador `SQLITE_BUSY`, sin test de integración propio (el
      bloqueo real de better-sqlite3 espera 5 segundos por conexión y
      alargaría la suite).
- [x] `Ctrl+C` en medio del flujo cancela sin escribir nada en la base:
      en TTY real la lectura cruda rechaza con `Cancelado`; en entradas
      sin TTY, el fin de stream produce el mismo camino (test: contraseña
      a medias y `end` deja el hash intacto y sale con código 1).
      La tecla `Ctrl+C` física queda para la verificación física.

### Lo que NO hace

- No cambia nada de la interfaz web: ni un enlace, ni un aviso, ni un
  texto nuevo en la pantalla de entrada del docente (la 011 lo pidió
  explícitamente: la recuperación no vive en la interfaz). Verificado:
  la feature no toca ningún archivo de `public/`.
- No permite leer ni ver la contraseña actual: la operación es de
  **restablecimiento**, no de recuperación. La vieja se pierde.
- No invalida nada por su cuenta: las sesiones del docente viven en
  memoria (`server/sesion.js`), así que reiniciar el servidor después
  de restablecer ya cierra cualquier sesión abierta. No hace falta
  lógica extra.
- No añade dependencias ni cambia el esquema (la contraseña ya vive en
  `config`, tabla clave/valor: no hace falta migración).

## Fuera de alcance

- Registro de intentos de recuperación, auditoría o notificaciones.
- Múltiples contraseñas o cuentas: sigue habiendo una por equipo
  (`mission.md`, "no es multiusuario").
- Un modo gráfico de recuperación: la consola es el procedimiento de
  emergencia, documentado paso a paso en la guía para alguien que no es
  informático.
