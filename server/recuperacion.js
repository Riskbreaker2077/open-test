import { existsSync } from 'node:fs';
import { RUTA_BD_POR_DEFECTO, abrirBd, cerrarBd } from './db.js';
import { LONGITUD_MINIMA, establecerContrasena, hayContrasena } from './services/auth.js';

export const PARAMETRO_RECUPERACION = '--recuperar-contrasena';

// En `npm start` argv es [node, index.js, --flag]; en el ejecutable SEA es
// [OpenTest.exe, --flag]. Filtrar por guión inicial funciona en los dos casos
// sin importar cuántos elementos precedan al parámetro.
export function esModoRecuperacion(argv) {
  const parametros = argv.filter((a) => a.startsWith('-')).map((a) => a.toLowerCase());
  return parametros.includes(PARAMETRO_RECUPERACION) ||
    parametros.includes(PARAMETRO_RECUPERACION.slice(1));
}

export class Cancelado extends Error {
  constructor() {
    super('Recuperación cancelada.');
    this.name = 'Cancelado';
  }
}

/**
 * La única escritura del flujo, separada del diálogo para poder probarla
 * sin consola. Reutiliza `establecerContrasena` tal cual: misma regla de
 * longitud, sal nueva y transacción que el primer arranque.
 */
export function restablecerContrasena(db, nueva, confirmacion) {
  if (!hayContrasena(db)) {
    throw new Error('Este equipo todavía no tiene contraseña. Abre OpenTest normalmente para crearla.');
  }
  if (nueva !== confirmacion) {
    throw new Error('Las dos contraseñas no coinciden.');
  }
  establecerContrasena(db, nueva);
}

function mensajeSinContrasena(salida) {
  salida.write('Este equipo todavía no tiene contraseña.\n');
  salida.write('Abre OpenTest con normalidad y la pantalla te pedirá crearla.\n');
}

/**
 * Lector de líneas para entradas sin TTY (tuberías, tests). Acumula lo que
 * llegue aunque nadie esté esperando una línea todavía, para no perder el
 * resto de un trozo grande ni el evento `end`.
 */
function crearLector(entrada) {
  let pendiente = '';
  let termino = false;
  const esperas = [];

  const intentar = () => {
    while (esperas.length > 0) {
      const salto = pendiente.indexOf('\n');
      if (salto !== -1) {
        const linea = pendiente.slice(0, salto).replace(/\r$/, '');
        pendiente = pendiente.slice(salto + 1);
        esperas.shift().resolver(linea);
      } else if (termino) {
        esperas.shift().rechazar(new Cancelado());
      } else {
        break;
      }
    }
  };

  entrada.on('data', (trozo) => {
    pendiente += trozo.toString('utf8');
    intentar();
  });
  entrada.on('end', () => {
    termino = true;
    intentar();
  });
  entrada.on('error', (err) => {
    while (esperas.length > 0) esperas.shift().rechazar(err);
  });

  return {
    leer(pregunta, salida) {
      return new Promise((resolver, rechazar) => {
        salida.write(pregunta);
        esperas.push({ resolver, rechazar });
        intentar();
      });
    },
  };
}

/**
 * Lee una contraseña en un TTY real con modo crudo, mostrando un asterisco
 * por carácter para no dejar rastro en la consola.
 */
function leerOcultaRaw(salida, entrada, pregunta) {
  return new Promise((resolver, rechazar) => {
    salida.write(pregunta);
    entrada.setRawMode(true);
    entrada.resume();
    let valor = '';

    const alDatos = (trozo) => {
      for (const caracter of trozo.toString('utf8')) {
        if (caracter === '\r' || caracter === '\n') {
          terminar();
          resolver(valor);
          return;
        }
        if (caracter === '\u0003') {
          terminar();
          rechazar(new Cancelado());
          return;
        }
        if (caracter === '\u007f' || caracter === '\b') {
          if (valor.length > 0) {
            valor = valor.slice(0, -1);
            salida.write('\b \b');
          }
          continue;
        }
        if (caracter >= ' ') {
          valor += caracter;
          salida.write('*');
        }
      }
    };

    function terminar() {
      entrada.off('data', alDatos);
      if (typeof entrada.setRawMode === 'function') entrada.setRawMode(false);
      salida.write('\n');
    }

    entrada.on('data', alDatos);
  });
}

/**
 * Flujo de consola. Devuelve el código de salida: 0 si terminó (guardó o
 * no había nada que hacer), 1 si se canceló o la base está ocupada.
 * Los errores inesperados se propagan.
 */
export async function recuperarContrasena({
  entrada = process.stdin,
  salida = process.stdout,
  rutaBd = RUTA_BD_POR_DEFECTO,
  abrir = abrirBd,
} = {}) {
  if (!existsSync(rutaBd)) {
    mensajeSinContrasena(salida);
    return 0;
  }

  let db;
  try {
    db = abrir(rutaBd);
  } catch (err) {
    if (err.code === 'SQLITE_BUSY') return baseOcupada(salida);
    throw err;
  }

  try {
    if (!hayContrasena(db)) {
      cerrarBd(db);
      db = null;
      mensajeSinContrasena(salida);
      return 0;
    }

    const lector = entrada.isTTY ? null : crearLector(entrada);
    const pedir = (pregunta) =>
      lector ? lector.leer(pregunta, salida) : leerOcultaRaw(salida, entrada, pregunta);

    let nueva = null;
    while (nueva === null) {
      salida.write('Restablecimiento de la contraseña del panel del docente.\n');
      salida.write('La contraseña anterior se pierde; no se puede recuperar.\n\n');

      const primera = await pedir('Escribe la contraseña nueva: ');
      if (primera.length < LONGITUD_MINIMA) {
        salida.write(`Debe tener al menos ${LONGITUD_MINIMA} caracteres. Intenta de nuevo.\n\n`);
        continue;
      }

      const confirmacion = await pedir('Repítela para confirmar: ');
      try {
        restablecerContrasena(db, primera, confirmacion);
        nueva = primera;
      } catch (err) {
        salida.write(`${err.message} Intenta de nuevo.\n\n`);
      }
    }

    salida.write('\nContraseña restablecida. Cierra esta ventana y abre OpenTest con normalidad.\n');
    return 0;
  } catch (err) {
    if (err instanceof Cancelado) {
      salida.write('\nCancelado. No se cambió ninguna contraseña.\n');
      return 1;
    }
    if (err.code === 'SQLITE_BUSY') return baseOcupada(salida);
    throw err;
  } finally {
    cerrarBd(db);
  }
}

function baseOcupada(salida) {
  salida.write('\nLa base de datos está ocupada, seguramente porque OpenTest está abierto.\n');
  salida.write('Cierra OpenTest (la ventana del servidor) y vuelve a intentarlo.\n');
  return 1;
}
