const { dirname, join } = require('node:path');
const { pathToFileURL } = require('node:url');

import(pathToFileURL(join(dirname(process.execPath), 'server', 'index.js')).href).catch((err) => {
  console.error('OpenTest no pudo arrancar:', err);
  process.exitCode = 1;
});
