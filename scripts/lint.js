// Revisión de estilo mínima y sin dependencias: comprueba que todo el
// JavaScript del proyecto parsea. No sustituye a un linter completo, pero
// atrapa lo que rompe el arranque y no añade nada al package.json.
import { execFileSync } from 'node:child_process';
import { readdir } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const carpetas = ['server', 'public', 'scripts'];

let revisados = 0;
const fallos = [];

for (const carpeta of carpetas) {
  const entradas = await readdir(join(raiz, carpeta), {
    recursive: true,
    withFileTypes: true,
  });

  for (const entrada of entradas) {
    if (!entrada.isFile() || !entrada.name.endsWith('.js')) continue;

    const ruta = join(entrada.parentPath ?? entrada.path, entrada.name);
    try {
      execFileSync(process.execPath, ['--check', ruta], { stdio: 'pipe' });
      revisados += 1;
    } catch (err) {
      fallos.push(`${relative(raiz, ruta)}\n${err.stderr?.toString().trim()}`);
    }
  }
}

if (fallos.length > 0) {
  console.error(`\n${fallos.join('\n\n')}\n`);
  console.error(`${fallos.length} archivo(s) con errores de sintaxis.`);
  process.exit(1);
}

console.log(`${revisados} archivos revisados, sin errores de sintaxis.`);
