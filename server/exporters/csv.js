export const BOM = '\uFEFF';

function escapar(valor) {
  const texto = valor === null || valor === undefined ? '' : String(valor);
  return /[",\r\n]/.test(texto) ? `"${texto.replaceAll('"', '""')}"` : texto;
}

export function aCsv(cabeceras, filas) {
  const lineas = [cabeceras, ...filas.map((fila) => cabeceras.map((campo) => fila[campo]))];
  return BOM + lineas.map((fila) => fila.map(escapar).join(',')).join('\r\n') + '\r\n';
}
