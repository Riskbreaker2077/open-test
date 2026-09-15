import net from 'node:net';
import { spawn } from 'node:child_process';

function puertoLibre(puerto, host = '0.0.0.0') {
  return new Promise((resolve) => {
    const prueba = net.createServer();
    prueba.once('error', () => resolve(false));
    prueba.once('listening', () => prueba.close(() => resolve(true)));
    prueba.listen(puerto, host);
  });
}

/**
 * Si en ese puerto ya responde un OpenTest. Sin ventana de consola, abrirlo
 * dos veces no debe levantar un segundo servidor (034).
 */
export async function yaEstaAbierto(puerto, host = '127.0.0.1') {
  try {
    const respuesta = await fetch(`http://${host}:${puerto}/api/salud`, { signal: AbortSignal.timeout(1500) });
    if (!respuesta.ok) return false;
    const cuerpo = await respuesta.json();
    return cuerpo?.ok === true && typeof cuerpo.version === 'string';
  } catch {
    return false;
  }
}

export async function siguientePuertoLibre(inicial, maximo = inicial + 20) {
  for (let puerto = inicial; puerto <= maximo; puerto += 1) {
    if (await puertoLibre(puerto)) return puerto;
  }
  throw new Error(`No hay un puerto libre entre ${inicial} y ${maximo}.`);
}

export function abrirNavegador(url, plataforma = process.platform) {
  const comando = plataforma === 'win32' ? ['cmd', ['/c', 'start', '', url]]
    : plataforma === 'darwin' ? ['open', [url]] : ['xdg-open', [url]];
  const proceso = spawn(comando[0], comando[1], { detached: true, stdio: 'ignore' });
  proceso.on('error', () => {});
  proceso.unref();
}
