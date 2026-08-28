import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isSea } from 'node:sea';

export function rutasPara({ sea = isSea(), ejecutable = process.execPath, modulo = import.meta.url } = {}) {
  const raiz = sea ? dirname(ejecutable) : join(dirname(fileURLToPath(modulo)), '..');
  return {
    raiz,
    datos: join(raiz, 'data'),
    estaticos: join(raiz, 'public'),
    paquete: join(raiz, 'package.json'),
  };
}

export const RUTAS = rutasPara();
export const raizDeDatos = () => RUTAS.datos;
export const raizDeEstaticos = () => RUTAS.estaticos;
