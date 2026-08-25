# 001 · Servidor local — Plan

## Enfoque

Un Express 5 mínimo con `better-sqlite3`, sin capas intermedias. El esquema completo se define en un único `server/schema.sql` que se aplica al arrancar con `CREATE TABLE IF NOT EXISTS`: crear todas las tablas de una vez —aunque las features posteriores sean las que las llenen— evita una cadena de migraciones frágil en un proyecto que se distribuye como ejecutable a docentes.

La separación `app.js` (construye la app, no escucha) / `index.js` (abre BD, escucha, imprime) es deliberada: permite que los tests levanten la app sin ocupar un puerto.

## Implementación

1. `package.json` — `"type": "module"`, Node ≥ 22, scripts `start`, `dev`, `test`, `lint`. Dependencias: `express` y `better-sqlite3`. Nada más.
2. `server/schema.sql` — las ocho tablas de `tech-stack.md` (`estudiantes`, `bancos`, `preguntas`, `opciones`, `sesiones`, `intentos`, `intento_preguntas`, `respuestas`) con sus claves foráneas, índices y restricciones `UNIQUE`.
3. `server/db.js` — `abrirBd(ruta)`: crea `data/` si falta, abre la conexión, activa `PRAGMA foreign_keys = ON` y `journal_mode = WAL`, y ejecuta `schema.sql`. Exporta también `cerrarBd()` para los tests.
4. `server/red.js` — `urlsDeIntranet(puerto)`: recorre `os.networkInterfaces()`, descarta loopback e IPv6, y devuelve las URL candidatas ordenadas dejando primero los rangos privados habituales (`192.168.*`, `10.*`, `172.16–31.*`).
5. `server/app.js` — `crearApp(db)`: monta `express.static('public')`, la ruta `GET /api/salud` y un manejador de errores que responde JSON en español.
6. `server/index.js` — abre la BD, crea la app, escucha en `0.0.0.0:3000` (`PORT` lo sobreescribe) e imprime el bloque de arranque con las URL. Captura `EADDRINUSE` con un mensaje útil.
7. `public/index.html` + `public/shared/base.css` — bienvenida con los dos accesos y los tokens visuales de `tech-stack.md` (18 px base, alto contraste, objetivos de 44 px).
8. `.gitignore` — `node_modules/`, `data/`.
9. Tests: `server/db.test.js` (las tablas existen, las invariantes `UNIQUE` se aplican, reabrir no borra datos) y `server/app.test.js` (`/api/salud`, 404 en español).

## Decisiones

- **Esquema completo desde el día uno, no migraciones incrementales** — el usuario final copia un archivo `.db` entre máquinas y no va a ejecutar migraciones. Se descarta un sistema de versionado de esquema por desproporcionado a este ciclo de vida.
- **`better-sqlite3` síncrono** — el patrón de carga es un aula, no un servicio: decenas de peticiones cortas, no miles concurrentes. La API síncrona elimina toda una clase de errores de concurrencia en el código de dominio a cambio de nada que se note aquí.
- **Mostrar todas las IP candidatas en vez de adivinar una** — un portátil con wifi, ethernet y un adaptador virtual es lo normal. Adivinar mal deja al docente sin salida; listar le da una alternativa que probar.
- **WAL activado** — permite que el docente consulte el panel mientras 30 tablets escriben respuestas, sin bloqueos de lectura.

## Riesgos

- **El portátil está en una red con aislamiento de clientes (AP isolation)** — las tablets ven el router pero no al portátil. No es resoluble por software; se documenta como requisito de red en la guía docente (feature 010) y se añade a la pantalla de arranque una nota de "si las tablets no cargan la página, revisa esto".
- **Cortafuegos de Windows bloqueando el puerto en el primer arranque** — la causa nº 1 de "no me funciona". Se menciona explícitamente en el mensaje de arranque y en la guía docente.
- **Elegir la IP equivocada entre varias** — mitigado listando todas y marcando la más probable.
