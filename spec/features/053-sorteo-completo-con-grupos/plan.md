# 053 · Sorteo completo con grupos — Plan

## `server/services/personalizacion.js` (módulo puro)

- `rellenar(preguntas, seleccionadas, nPreguntas, prng)`: agrupa las preguntas
  libres en piezas (suelta, grupo); barajadas, agrega las que caben enteras;
  si falta, agrega miembros de piezas `divisibles` hasta completar.
- Una pregunta es divisible si trae `grupo_divisible: true`. Sin el campo
  (bancos de prueba, bancos anteriores) el grupo se trata como indivisible, que
  es lo que ya hacía el sorteo.
- `generarPrueba` reemplaza el bucle final por `rellenar` y lanza 409 si no
  llega a `nPreguntas`.
- `completarPrueba({ preguntas, yaElegidas, nPreguntas, semilla })`: devuelve
  las filas que faltan, con `orden` desde `yaElegidas.length + 1`. Usa la
  semilla `semilla + ':completar'`, así que es determinista.

## `server/services/bancos.js`

- `idsDePreguntasYOpciones` añade `grupo_divisible` (tipo `contexto_compartido`).

## `server/services/intentos.js`

- `materializarPrueba`: si el intento ya tiene filas pero menos que
  `n_preguntas` y no está entregado, inserta las que faltan con
  `completarPrueba`. Las filas existentes no se tocan.
- `iniciarOReanudarIntento` llama a `materializarPrueba` también al reanudar.

## `server/services/examen.js`

- `obtenerPregunta`: si la fila no existe, llama a `materializarPrueba` y la
  vuelve a buscar. Es lo que destraba una tablet que ya estaba en la pregunta
  que faltaba, sin que el estudiante tenga que salir.

## `server/services/sesiones.js`

- `abrirSesion` corre un sorteo de prueba y devuelve su error si no se puede
  formar la prueba.

Sin dependencias nuevas, sin migración, sin cambios en el cliente.
