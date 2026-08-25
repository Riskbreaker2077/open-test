import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { cookies, protegerApi, protegerPaginas } from './middleware/protegido.js';
import { rutasAuth } from './routes/auth.js';
import { rutasDocente } from './routes/docente.js';
import { carpetaDeImagenes } from './services/imagenes.js';

const aqui = dirname(fileURLToPath(import.meta.url));
const RAIZ_PUBLICA = join(aqui, '..', 'public');

const { version } = JSON.parse(readFileSync(join(aqui, '..', 'package.json'), 'utf8'));

/**
 * Construye la aplicación. No escucha: eso lo hace index.js, así los tests
 * pueden levantarla sin ocupar un puerto fijo.
 */
export function crearApp(db) {
  const app = express();
  app.locals.db = db;

  app.use(express.json({ limit: '5mb' }));
  app.use(cookies);

  app.get('/api/salud', (req, res) => {
    res.json({ ok: true, version });
  });

  // Entrada al panel: pública por necesidad, es la puerta.
  app.use('/api/auth', rutasAuth(db));

  // La protección se aplica sobre el prefijo, no ruta por ruta: cualquier
  // endpoint que se añada aquí nace protegido, sin depender de que alguien
  // se acuerde de ponerle el middleware.
  app.use('/api/docente', protegerApi, rutasDocente(db));

  // Lo mismo para las páginas del docente y la proyección. La pantalla de
  // proyección la ve toda la clase, pero solo la abre quien tiene la contraseña.
  app.use(['/docente', '/proyeccion'], protegerPaginas);

  // Las imágenes de las preguntas son públicas a propósito: el estudiante
  // tiene que verlas durante el examen.
  app.use('/imagenes', express.static(carpetaDeImagenes(), { fallthrough: true }));

  app.use(express.static(RAIZ_PUBLICA));

  app.use((req, res) => {
    responder(req, res, 404, 'No encontramos esta página.');
  });

  // eslint-disable-next-line no-unused-vars -- Express identifica el manejador de errores por su aridad.
  app.use((err, req, res, next) => {
    console.error(err);
    responder(req, res, 500, 'Ocurrió un error en el servidor. Vuelve a intentarlo.');
  });

  return app;
}

function responder(req, res, estado, mensaje) {
  if (req.accepts('html') && !req.path.startsWith('/api/')) {
    res.status(estado).type('html').send(paginaDeError(estado, mensaje));
  } else {
    res.status(estado).json({ ok: false, mensaje });
  }
}

function paginaDeError(estado, mensaje) {
  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>OpenTest — ${estado}</title>
  <link rel="stylesheet" href="/shared/base.css">
</head>
<body>
  <main class="tarjeta tarjeta--centrada">
    <h1>${estado}</h1>
    <p>${mensaje}</p>
    <a class="boton" href="/">Volver al inicio</a>
  </main>
</body>
</html>`;
}
