import { readdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { crearApp } from './app.js';
import { abrirBd, cerrarBd } from './db.js';

let db;
let servidor;
let base;

before(async () => {
  db = abrirBd(':memory:');
  servidor = crearApp(db).listen(0);
  await new Promise((listo) => servidor.once('listening', listo));
  base = `http://127.0.0.1:${servidor.address().port}`;
});

after(async () => {
  await new Promise((listo) => servidor.close(listo));
  cerrarBd(db);
});

test('GET /api/salud responde ok con la versión', async () => {
  const res = await fetch(`${base}/api/salud`);
  assert.equal(res.status, 200);

  const cuerpo = await res.json();
  assert.equal(cuerpo.ok, true);
  assert.match(cuerpo.version, /^\d+\.\d+\.\d+$/);
});

test('GET / entrega el portal del estudiante', async () => {
  const res = await fetch(base);
  assert.equal(res.status, 200);

  const html = await res.text();
  assert.match(html, /lang="es"/);
  assert.match(html, /presentar/i);
  // La raíz es del estudiante: puede nombrar a su docente, pero nunca
  // enlazar al panel ni delatar su ruta.
  assert.doesNotMatch(html, /\/docente|\/proyeccion/);
});

test('una página inexistente devuelve 404 en español', async () => {
  const res = await fetch(`${base}/no-existe`);
  assert.equal(res.status, 404);

  const html = await res.text();
  assert.match(html, /No encontramos esta página/);
});

test('una ruta de API inexistente devuelve 404 en JSON', async () => {
  const res = await fetch(`${base}/api/no-existe`);
  assert.equal(res.status, 404);
  assert.match(res.headers.get('content-type'), /application\/json/);

  const cuerpo = await res.json();
  assert.equal(cuerpo.ok, false);
  assert.match(cuerpo.mensaje, /No encontramos/);
});

test('sirve los estáticos compartidos', async () => {
  const res = await fetch(`${base}/shared/base.css`);
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type'), /text\/css/);
});

test('el panel del docente no es alcanzable sin contraseña', async () => {
  const res = await fetch(`${base}/docente/`, { redirect: 'manual' });
  assert.equal(res.status, 302);
  assert.equal(res.headers.get('location'), '/docente/entrar.html');
});

test('ningún archivo servido apunta a un origen externo', async () => {
  // Límite duro de la constitución: cero red en runtime. Ni fuentes, ni CDNs.
  const raiz = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');
  const archivos = await readdir(raiz, { recursive: true, withFileTypes: true });

  for (const entrada of archivos) {
    if (!entrada.isFile()) continue;
    if (!/\.(html|css|js)$/.test(entrada.name)) continue;

    const ruta = join(entrada.parentPath ?? entrada.path, entrada.name);
    const contenido = await readFile(ruta, 'utf8');
    const externos = contenido.match(/(?:src|href)\s*=\s*["'](?:https?:)?\/\/[^"']+/gi) ?? [];

    assert.deepEqual(externos, [], `${entrada.name} apunta fuera: ${externos.join(', ')}`);
  }
});
