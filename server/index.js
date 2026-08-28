import { crearApp } from './app.js';
import { abrirBd, cerrarBd, RUTA_BD_POR_DEFECTO } from './db.js';
import { urlsDeIntranet } from './red.js';
import { abrirNavegador, siguientePuertoLibre } from './arranque.js';

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
