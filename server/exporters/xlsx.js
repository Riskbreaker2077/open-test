import { crearZip } from './zip-escritor.js';

const escaparXml = (texto) => String(texto)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;');

const columnaExcel = (indice) => {
  let n = indice + 1;
  let letras = '';
  while (n > 0) {
    const resto = (n - 1) % 26;
    letras = String.fromCharCode(65 + resto) + letras;
    n = Math.floor((n - 1) / 26);
  }
  return letras;
};

function anchosColumnas(cabeceras, filas) {
  return cabeceras.map((cabecera, indice) => {
    const largos = filas.map((fila) => String(fila[indice] ?? '').length);
    const maximo = Math.max(cabecera.length, ...largos, 0);
    return Math.min(60, Math.max(10, maximo + 2));
  });
}

function celdaXml(referencia, valor, estilo) {
  const atributoEstilo = estilo ? ` s="${estilo}"` : '';
  if (typeof valor === 'number' && Number.isFinite(valor)) {
    return `<c r="${referencia}"${atributoEstilo}><v>${valor}</v></c>`;
  }
  return `<c r="${referencia}"${atributoEstilo} t="inlineStr"><is><t xml:space="preserve">${escaparXml(valor)}</t></is></c>`;
}

function filaXml(numeroFila, valores, estilo) {
  const celdas = valores.map((valor, indice) => celdaXml(`${columnaExcel(indice)}${numeroFila}`, valor, estilo)).join('');
  return `<row r="${numeroFila}">${celdas}</row>`;
}

function hojaXml({ cabeceras, filas }) {
  const anchos = anchosColumnas(cabeceras, filas);
  const cols = anchos.map((ancho, indice) =>
    `<col min="${indice + 1}" max="${indice + 1}" width="${ancho}" customWidth="1"/>`).join('');
  const filaCabecera = filaXml(1, cabeceras, 1);
  const filasDatos = filas.map((fila, indice) => filaXml(indice + 2, fila)).join('');
  const ultimaColumna = columnaExcel(cabeceras.length - 1);
  const ultimaFila = filas.length + 1;
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<dimension ref="A1:${ultimaColumna}${ultimaFila}"/>
<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>
<cols>${cols}</cols>
<sheetData>${filaCabecera}${filasDatos}</sheetData>
</worksheet>`;
}

const CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
{HOJAS}
</Types>`;

const RELS_RAIZ = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;

const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<fonts count="2">
<font><sz val="11"/><name val="Calibri"/></font>
<font><b/><sz val="11"/><name val="Calibri"/><color rgb="FFFFFFFF"/></font>
</fonts>
<fills count="3">
<fill><patternFill patternType="none"/></fill>
<fill><patternFill patternType="gray125"/></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FF2F5B44"/><bgColor indexed="64"/></patternFill></fill>
</fills>
<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="2">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/>
</cellXfs>
</styleSheet>`;

function workbookXml(hojas) {
  const entradas = hojas.map((hoja, indice) =>
    `<sheet name="${escaparXml(hoja.nombre)}" sheetId="${indice + 1}" r:id="rId${indice + 1}"/>`).join('');
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets>${entradas}</sheets>
</workbook>`;
}

function workbookRels(hojas) {
  const relacionesHojas = hojas.map((_hoja, indice) =>
    `<Relationship Id="rId${indice + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${indice + 1}.xml"/>`).join('');
  const idEstilos = hojas.length + 1;
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
${relacionesHojas}
<Relationship Id="rId${idEstilos}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;
}

export function crearLibroXlsx(hojas) {
  const overridesHojas = hojas.map((_hoja, indice) =>
    `<Override PartName="/xl/worksheets/sheet${indice + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('\n');

  const entradas = [
    { nombre: '[Content_Types].xml', contenido: CONTENT_TYPES.replace('{HOJAS}', overridesHojas) },
    { nombre: '_rels/.rels', contenido: RELS_RAIZ },
    { nombre: 'xl/workbook.xml', contenido: workbookXml(hojas) },
    { nombre: 'xl/_rels/workbook.xml.rels', contenido: workbookRels(hojas) },
    { nombre: 'xl/styles.xml', contenido: STYLES },
    ...hojas.map((hoja, indice) => ({
      nombre: `xl/worksheets/sheet${indice + 1}.xml`,
      contenido: hojaXml(hoja),
    })),
  ];

  return crearZip(entradas);
}
