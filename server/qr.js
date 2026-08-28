const VERSIONES = [
  { version: 1, datos: 19, correccion: 7, alineacion: [] },
  { version: 2, datos: 34, correccion: 10, alineacion: [6, 18] },
  { version: 3, datos: 55, correccion: 15, alineacion: [6, 22] },
  { version: 4, datos: 80, correccion: 20, alineacion: [6, 26] },
];

const bitsDe = (valor, cantidad) =>
  Array.from({ length: cantidad }, (_, i) => (valor >>> (cantidad - i - 1)) & 1);

function multiplicarGalois(x, y) {
  let resultado = 0;
  for (let i = 0; i < 8; i += 1) {
    if (y & 1) resultado ^= x;
    const alto = x & 0x80;
    x = (x << 1) & 0xff;
    if (alto) x ^= 0x1d;
    y >>>= 1;
  }
  return resultado;
}

function divisorReedSolomon(grado) {
  const resultado = Array(grado).fill(0);
  resultado[grado - 1] = 1;
  let raiz = 1;
  for (let i = 0; i < grado; i += 1) {
    for (let j = 0; j < resultado.length; j += 1) {
      resultado[j] = multiplicarGalois(resultado[j], raiz);
      if (j + 1 < resultado.length) resultado[j] ^= resultado[j + 1];
    }
    raiz = multiplicarGalois(raiz, 2);
  }
  return resultado;
}

function correccionReedSolomon(datos, grado) {
  const divisor = divisorReedSolomon(grado);
  const resto = Array(grado).fill(0);
  for (const dato of datos) {
    const factor = dato ^ resto.shift();
    resto.push(0);
    for (let i = 0; i < resto.length; i += 1) {
      resto[i] ^= multiplicarGalois(divisor[i], factor);
    }
  }
  return resto;
}

function elegirVersion(bytes) {
  for (const candidata of VERSIONES) {
    if (4 + 8 + bytes.length * 8 <= candidata.datos * 8) return candidata;
  }
  throw new Error('La dirección es demasiado larga para el código QR local.');
}

function datosCodificados(bytes, version) {
  const bits = [...bitsDe(0b0100, 4), ...bitsDe(bytes.length, 8)];
  for (const byte of bytes) bits.push(...bitsDe(byte, 8));

  const capacidad = version.datos * 8;
  bits.push(...Array(Math.min(4, capacidad - bits.length)).fill(0));
  while (bits.length % 8 !== 0) bits.push(0);

  const datos = [];
  for (let i = 0; i < bits.length; i += 8) {
    datos.push(Number.parseInt(bits.slice(i, i + 8).join(''), 2));
  }
  for (let relleno = 0; datos.length < version.datos; relleno += 1) {
    datos.push(relleno % 2 === 0 ? 0xec : 0x11);
  }
  return [...datos, ...correccionReedSolomon(datos, version.correccion)];
}

function ponerBuscador(matriz, fila, columna) {
  const tamano = matriz.length;
  for (let y = -1; y <= 7; y += 1) {
    for (let x = -1; x <= 7; x += 1) {
      const r = fila + y;
      const c = columna + x;
      if (r < 0 || c < 0 || r >= tamano || c >= tamano) continue;
      matriz[r][c] = y >= 0 && y <= 6 && x >= 0 && x <= 6 &&
        (y === 0 || y === 6 || x === 0 || x === 6 || (y >= 2 && y <= 4 && x >= 2 && x <= 4));
    }
  }
}

function ponerAlineacion(matriz, fila, columna) {
  if (matriz[fila][columna] !== null) return;
  for (let y = -2; y <= 2; y += 1) {
    for (let x = -2; x <= 2; x += 1) {
      matriz[fila + y][columna + x] = Math.max(Math.abs(x), Math.abs(y)) !== 1;
    }
  }
}

function posicionesFormato(tamano) {
  const primera = [
    ...Array.from({ length: 6 }, (_, i) => [i, 8]),
    [7, 8], [8, 8], [8, 7],
    ...Array.from({ length: 6 }, (_, i) => [8, 5 - i]),
  ];
  const segunda = [
    ...Array.from({ length: 8 }, (_, i) => [8, tamano - 1 - i]),
    ...Array.from({ length: 7 }, (_, i) => [tamano - 7 + i, 8]),
  ];
  return { primera, segunda };
}

function construirBase(version) {
  const tamano = 17 + version.version * 4;
  const matriz = Array.from({ length: tamano }, () => Array(tamano).fill(null));
  ponerBuscador(matriz, 0, 0);
  ponerBuscador(matriz, 0, tamano - 7);
  ponerBuscador(matriz, tamano - 7, 0);

  for (let i = 8; i < tamano - 8; i += 1) {
    matriz[6][i] = i % 2 === 0;
    matriz[i][6] = i % 2 === 0;
  }
  for (const fila of version.alineacion) {
    for (const columna of version.alineacion) ponerAlineacion(matriz, fila, columna);
  }

  const { primera, segunda } = posicionesFormato(tamano);
  for (const [fila, columna] of [...primera, ...segunda]) matriz[fila][columna] = false;
  matriz[tamano - 8][8] = true;
  return matriz;
}

function bitsFormato(mascara = 0) {
  const datos = (1 << 3) | mascara; // Nivel L = 01.
  let resto = datos << 10;
  for (let i = 14; i >= 10; i -= 1) {
    if ((resto >>> i) & 1) resto ^= 0x537 << (i - 10);
  }
  return ((datos << 10) | resto) ^ 0x5412;
}

function recorrerDatos(matriz, visitar) {
  const tamano = matriz.length;
  let indice = 0;
  for (let derecha = tamano - 1; derecha >= 1; derecha -= 2) {
    if (derecha === 6) derecha = 5;
    const haciaArriba = ((derecha + 1) & 2) === 0;
    for (let vertical = 0; vertical < tamano; vertical += 1) {
      const fila = haciaArriba ? tamano - 1 - vertical : vertical;
      for (let desplazamiento = 0; desplazamiento < 2; desplazamiento += 1) {
        const columna = derecha - desplazamiento;
        if (matriz[fila][columna] !== null) continue;
        visitar(fila, columna, indice);
        indice += 1;
      }
    }
  }
}

export function matrizQr(texto) {
  const bytes = [...new TextEncoder().encode(String(texto))];
  const version = elegirVersion(bytes);
  const codigo = datosCodificados(bytes, version);
  const flujo = codigo.flatMap((byte) => bitsDe(byte, 8));
  const matriz = construirBase(version);

  recorrerDatos(matriz, (fila, columna, indice) => {
    const bit = flujo[indice] ?? 0;
    matriz[fila][columna] = Boolean(bit ^ ((fila + columna) % 2 === 0 ? 1 : 0));
  });

  const formato = bitsFormato(0);
  const { primera, segunda } = posicionesFormato(matriz.length);
  primera.forEach(([fila, columna], i) => { matriz[fila][columna] = Boolean((formato >>> i) & 1); });
  segunda.forEach(([fila, columna], i) => { matriz[fila][columna] = Boolean((formato >>> i) & 1); });
  matriz[matriz.length - 8][8] = true;
  return matriz;
}

export function svgQr(texto, { escala = 8, margen = 4 } = {}) {
  const matriz = matrizQr(texto);
  const lado = matriz.length + margen * 2;
  const modulos = [];
  for (let fila = 0; fila < matriz.length; fila += 1) {
    for (let columna = 0; columna < matriz.length; columna += 1) {
      if (matriz[fila][columna]) modulos.push(`M${columna + margen},${fila + margen}h1v1h-1z`);
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${lado} ${lado}" ` +
    `width="${lado * escala}" height="${lado * escala}" shape-rendering="crispEdges">` +
    `<rect width="100%" height="100%" fill="#fff"/><path d="${modulos.join('')}" fill="#000"/></svg>`;
}

/** Decodificador mínimo del modo byte usado para verificar el generador. */
export function decodificarMatrizQr(matriz) {
  const numero = (matriz.length - 17) / 4;
  const version = VERSIONES.find((item) => item.version === numero);
  if (!version) throw new Error('Versión QR no soportada.');
  const base = construirBase(version);
  const bits = [];
  recorrerDatos(base, (fila, columna) => {
    bits.push(Number(matriz[fila][columna]) ^ ((fila + columna) % 2 === 0 ? 1 : 0));
  });
  const leer = (inicio, cantidad) => Number.parseInt(bits.slice(inicio, inicio + cantidad).join(''), 2);
  if (leer(0, 4) !== 0b0100) throw new Error('El QR no usa modo byte.');
  const cantidad = leer(4, 8);
  const bytes = Array.from({ length: cantidad }, (_, i) => leer(12 + i * 8, 8));
  return new TextDecoder().decode(Uint8Array.from(bytes));
}
