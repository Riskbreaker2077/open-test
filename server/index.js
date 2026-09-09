import { hostname } from 'node:os';
import { crearApp } from './app.js';
import { abrirBd, cerrarBd, RUTA_BD_POR_DEFECTO } from './db.js';
import { esModoRecuperacion, recuperarContrasena } from './recuperacion.js';
import { hostnameEsAmigable, urlsDeIntranet } from './red.js';
import { abrirNavegador, siguientePuertoLibre } from './arranque.js';

// Modo de recuperación: restablece la contraseña del panel desde la consola
// del propio equipo y no arranca el servidor. Exige acceso físico, que es
// exactamente el límite que la feature 011 fijó para la recuperación.
if (esModoRecuperacion(process.argv)) {
  try {
    process.exit(await recuperarContrasena());
  } catch (err) {
    console.error(`\n  No se pudo restablecer la contraseña: ${err.message}\n`);
    process.exit(1);
  }
}

const solicitado = Number(process.env.PORT) || 3000;
const puerto = await siguientePuertoLibre(solicitado);

const db = abrirBd();
const app = crearApp(db);

const servidor = app.listen(puerto, '0.0.0.0', () => {
  if (puerto !== solicitado) {
    console.log(`\n  El puerto ${solicitado} estaba ocupado; OpenTest usará el ${puerto}.`);
  }
  imprimirArranque(puerto);
  try {
    abrirNavegador(`http://localhost:${puerto}/docente/`);
  } catch (err) {
    console.log(`  No se pudo abrir el navegador automáticamente: ${err.message}`);
  }
});

servidor.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n  No se pudo arrancar: el puerto ${puerto} ya está en uso.`);
    console.error('  Puede que OpenTest ya esté abierto en otra ventana.');
    console.error(`  Para usar otro puerto:  PORT=3001 npm start\n`);
  } else {
    console.error(`\n  No se pudo arrancar el servidor: ${err.message}\n`);
  }
  cerrarBd(db);
  process.exit(1);
});

function imprimirArranque(puerto) {
  const urls = urlsDeIntranet(puerto);

  console.log('\n  OpenTest está funcionando.\n');

  if (urls.length === 0) {
    console.log('  Este equipo no está conectado a ninguna red, así que las tablets');
    console.log('  todavía no pueden entrar. Conéctalo al wifi del colegio.');
    console.log(`  Mientras tanto, puedes abrirlo aquí:  http://localhost:${puerto}\n`);
  } else {
    console.log('  Dicta esta dirección a las tablets:\n');
    for (const { url, interfaz, probable } of urls) {
      console.log(`      ${probable ? '→' : ' '} ${url}   (${interfaz})`);
    }
    if (urls.length > 1) {
      console.log('\n  Si la primera no funciona, prueba con las otras.');
    }
  }

  const nombre = hostname();
  if (hostnameEsAmigable(nombre)) {
    console.log(`\n  Tu equipo se llama \`${nombre}\`. Las tablets también pueden`);
    console.log(`  entrar por http://${nombre}.local:${puerto} si la red tiene mDNS.`);
  } else if (nombre && !/^\d+\.\d+\.\d+\.\d+$/.test(nombre)) {
    console.log(`\n  Tu equipo se llama \`${nombre}\`, un nombre poco legible.`);
    console.log('  Si prefieres algo más corto, cámbialo en el sistema y reinicia OpenTest');
    console.log('  (Windows: Configuración → Sistema → Acerca de; Linux: /etc/hostname).');
  }

  console.log(`\n  Panel del docente:  http://localhost:${puerto}`);
  console.log(`  Base de datos:      ${RUTA_BD_POR_DEFECTO}`);
  console.log('\n  Si las tablets no cargan la página, revisa que estén en el mismo');
  console.log('  wifi y que el cortafuegos de Windows no bloquee el puerto.');
  console.log('\n  Para detener OpenTest, cierra esta ventana o pulsa Ctrl+C.\n');
}

let apagando = false;
function apagar() {
  if (apagando) return;
  apagando = true;
  servidor.close(() => {
    cerrarBd(db);
    process.exit(0);
  });
}

process.on('SIGINT', apagar);
process.on('SIGTERM', apagar);
process.on('SIGHUP', apagar);
