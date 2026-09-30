# 049 · Papelera universal y renombrar evaluaciones — Spec

**Estado:** implementado ✅

## Por qué

Al usar el rediseño del panel (048) el usuario pidió dos ajustes puntuales
al comportamiento de Evaluaciones, encontrados mientras revisaba la
pantalla en vivo:

1. Borrar una evaluación en borrador, o una cerrada sin intentos, la
   eliminaba **de inmediato** (046 solo mandaba a la papelera las que
   tenían intentos). Un clic sin querer en "Borrar" no se podía deshacer.
2. No existía manera de corregir el nombre de una evaluación ya creada:
   había que borrarla y crearla de nuevo.

## Qué hace

- `borrarSesion` (`server/services/sesiones.js`) manda **siempre** a la
  papelera, sin importar cuántos intentos tenga. Solo sigue bloqueada
  mientras está `abierta`, `en_curso` o `pausada` (hay que cerrarla
  primero). El resto del ciclo de la papelera (30 días, restaurar,
  eliminar ya, barrido automático) no cambia.
- Nueva función `renombrarSesion(db, id, nombre)` y ruta
  `PATCH /api/docente/sesiones/:id/nombre`: cambia el nombre en
  cualquier estado (borrador, abierta, en curso, pausada o cerrada). No es
  un parámetro de la prueba como duración o número de preguntas —no afecta
  la comparabilidad entre estudiantes— así que no tiene la restricción de
  "se congela al abrir" que sí tiene `actualizarSesion`.

## Criterios de aceptación

- [x] Borrar una evaluación en borrador la manda a la papelera y se puede
  restaurar. _(test)_
- [x] Borrar una evaluación cerrada sin intentos la manda a la papelera
  igual que una con intentos. _(test)_
- [x] Una evaluación abierta, en curso o pausada sigue sin poder borrarse
  (409). _(test, sin cambios de comportamiento)_
- [x] `PATCH /sesiones/:id/nombre` cambia el nombre en cualquier estado y
  rechaza un nombre vacío. _(test)_
- [x] `npm test` en verde, `npm run lint` en verde.

## Fuera de alcance

- Cambiar quién puede borrar o restaurar (sigue siendo cualquier sesión de
  docente autenticada, sin roles).
- Renombrar bancos o estudiantes: solo evaluaciones, que es lo que se pidió.
