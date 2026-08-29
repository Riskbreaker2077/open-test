import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync, spawnSync } from 'node:child_process';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
if (process.platform !== 'win32') {
  console.error('El ejecutable soportado se construye desde Windows 10/11 de 64 bits.');
  process.exit(1);
}

const temporal = join(raiz, '.sea-build');
const destino = join(raiz, 'dist', 'OpenTest-Windows');
rmSync(temporal, { recursive: true, force: true });
rmSync(destino, { recursive: true, force: true });
mkdirSync(temporal, { recursive: true });
mkdirSync(destino, { recursive: true });

const blob = join(temporal, 'opentest.blob');
const configuracion = join(temporal, 'sea-config.json');
writeFileSync(configuracion, JSON.stringify({
  main: join(raiz, 'scripts', 'sea-entry.cjs'),
  output: blob,
  disableExperimentalSEAWarning: true,
  useSnapshot: false,
  useCodeCache: false,
}, null, 2));

execFileSync(process.execPath, ['--experimental-sea-config', configuracion], { stdio: 'inherit' });
const ejecutable = join(destino, 'OpenTest.exe');
cpSync(process.execPath, ejecutable);
// La firma original de node.exe deja de ser válida al inyectar el blob.
spawnSync('signtool', ['remove', '/s', ejecutable], { stdio: 'ignore' });
const postject = join(raiz, 'node_modules', 'postject', 'dist', 'cli.js');
if (!existsSync(postject)) throw new Error('Falta postject. Ejecuta npm install antes de compilar.');
execFileSync(process.execPath, [
  postject,
  ejecutable,
  'NODE_SEA_BLOB',
  blob,
  '--sentinel-fuse',
  'NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2',
], { stdio: 'inherit' });

for (const ruta of ['server', 'public', 'node_modules', 'package.json', 'GUIA-DOCENTE.md', 'ejemplos']) {
  cpSync(join(raiz, ruta), join(destino, ruta), { recursive: true });
}
mkdirSync(join(destino, 'data'), { recursive: true });
rmSync(temporal, { recursive: true, force: true });
console.log(`OpenTest para Windows quedó en: ${destino}`);
