import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
if (process.platform !== 'win32') {
  console.error('El instalador se construye desde Windows 10/11 de 64 bits, igual que build:exe.');
  process.exit(1);
}

const build = join(raiz, 'dist', 'OpenTest-Windows');
if (!existsSync(build)) {
  console.error('Falta dist/OpenTest-Windows. Ejecuta antes: npm run build:exe');
  process.exit(1);
}

const script = join(raiz, 'scripts', 'installer', 'opentest.iss');
try {
  execFileSync('ISCC', [script], { stdio: 'inherit' });
} catch (err) {
  if (err.code === 'ENOENT') {
    console.error(
      'No se encontró ISCC (Inno Setup Compiler) en el PATH. ' +
        'Instala Inno Setup 6 desde https://jrsoftware.org/isinfo.php y vuelve a intentar.',
    );
    process.exit(1);
  }
  throw err;
}
console.log('Instalador de OpenTest listo en: dist/instalador/');
