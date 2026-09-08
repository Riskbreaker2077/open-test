# 025 · Plan técnico

## Pila y límites respetados

Sin nuevas dependencias, sin cambios en el esquema, sin cambios en el
contrato del JSON (`formato_version: 2` se preserva). Cambios en un
servicio nuevo (`imagenesDeSesion`), en `server/exporters/resultados.js`
y `server/exporters/xlsx.js`, en la ruta de exportación, en dos
archivos del cliente y en los tests de exportadores.

## Servicio: `server/services/imagenes.js`

Agrego una función nueva, sin tocar las existentes:

```js
/**
 * Conjunto de nombres de archivo referenciados por los bloques
 * `tipo: 'imagen'` de las preguntas que efectivamente cayeron en los
 * intento_preguntas de la sesión. Cruza banco → intento_preguntas y
 * parsea `contexto` / `enunciado` / `opciones[].texto` con
 * `analizarBloques`.
 */
export function imagenesDeSesion(db, sesionId) {
  const nombres = new Set();
  const filas = db.prepare(`
    SELECT p.contexto, p.enunciado, o.texto
    FROM intento_preguntas ip
    JOIN preguntas p ON p.id = ip.pregunta_id
    LEFT JOIN opciones o ON o.pregunta_id = p.id
    WHERE ip.intento_id IN (SELECT id FROM intentos WHERE sesion_id = ?)
  `).all(sesionId);
  for (const fila of filas) {
    for (const campo of ['contexto', 'enunciado', 'texto']) {
      if (!fila[campo]) continue;
      for (const bloque of analizarBloques(fila[campo])) {
        if (bloque.tipo === 'imagen' && bloque.archivo) {
          nombres.add(bloque.archivo);
        }
      }
    }
  }
  return nombres;
}
```

Necesito agregar `analizarBloques` al import actual de
`server/services/imagenes.js`. Está en `server/services/bloques.js`.

Decisiones:

- **Filtrar por `intento_preguntas`**, no por todo el banco: si la
  sesión sorteó 20 de 40 preguntas, las otras 20 no tienen imágenes
  que aporten. Esto mantiene el ZIP con sólo lo necesario.
- **`LEFT JOIN opciones`**: una imagen puede estar en el contexto o
  enunciado (sin opciones) o dentro de una opción; el join garantiza
  que ningún `texto` con imagen quede fuera.
- **`Set`** para evitar duplicados. Una imagen referenciada por dos
  preguntas aparece una sola vez.

### Tests

- Una sesión con una pregunta del banco que tiene `{tipo: 'imagen',
  archivo: 'celula.png'}` en el enunciado: `imagenesDeSesion` devuelve
  `{ 'celula.png' }`.
- Sesión sin imágenes referenciadas: devuelve `Set` vacío.
- Dos preguntas referenciando el mismo archivo: el `Set` lo cuenta una
  vez.
- Imagen en `opciones[].texto` (no en contexto/enunciado): la
  detecta.

## Exportador: `server/exporters/resultados.js`

### Lo que se va

- `aDetalleCsv`, `aResumenCsv`, `CABECERAS_DETALLE`, `CABECERAS_RESUMEN`.
- La constante `NUMERICAS_DETALLE` y `NUMERICAS_RESUMEN` se quedan
  como referencia de qué columnas eran numéricas, pero las reemplazo
  por las nuevas que correspondan a las hojas nuevas.

### Lo nuevo

**`aExcelRico(exportacion)`** — arma tres hojas:

```js
const CABECERAS_RESUMEN = [
  'formato_version', 'sesion', 'codigo', 'nombres', 'apellidos', 'curso',
  'total_preguntas', 'respondidas', 'saltadas', 'aciertos', 'puntaje',
  'porcentaje', 'inicio', 'entrega', 'motivo_entrega',
];
const CABECERAS_DETALLE = [
  'formato_version', 'sesion', 'curso', 'codigo', 'nombres', 'apellidos',
  'n_pregunta', 'pregunta_id', 'competencia', 'componente',
  'afirmacion', 'evidencia', 'estandar_asociado', 'que_evalua',
  'opcion_a_id', 'opcion_a_texto', 'opcion_a_es_correcta',
  'opcion_b_id', 'opcion_b_texto', 'opcion_b_es_correcta',
  'opcion_c_id', 'opcion_c_texto', 'opcion_c_es_correcta',
  'opcion_d_id', 'opcion_d_texto', 'opcion_d_es_correcta',
  'opcion_elegida_id', 'acierto', 'saltada', 'segundos',
];
const CABECERAS_BANCO = [
  'pregunta_id', 'competencia', 'componente', 'afirmacion',
  'evidencia', 'estandar_asociado', 'que_evalua',
  'opcion_a_texto', 'opcion_b_texto', 'opcion_c_texto', 'opcion_d_texto',
  'veces_presentada', 'veces_acertada', 'veces_saltada',
];
```

Para construir las filas de **Detalle** necesito, por cada
`(intento, pregunta)`, el orden en que se le presentaron las opciones
(ya viene en `pregunta.opciones_mostradas`), el id de la opción
elegida y los textos tal cual se le mostraron. Para **Banco** necesito
las preguntas del banco (no las del intento) y agregar estadísticas
de presentación por sesión.

Tres builders nuevos:

- `filasDetalleRico(exportacion)`: aplana `intento.preguntas` y, por
  cada pregunta, emite una fila con los ids/textos de las 4 opciones
  en orden + elegida + segundos + metadata pedagógica.
- `filasResumen(exportacion)` (renombrado del actual, mismo cuerpo).
- `filasBanco(db, exportacion)`: una sola query
  `SELECT * FROM preguntas WHERE banco_id = ?`, agrupo con las
  opciones, y cruzo con las `intento_preguntas` para contar
  `veces_presentada / veces_acertada / veces_saltada`.

Las tres hojas se arman con `crearLibroXlsx(hojas)` igual que hoy.
Los sets `NUMERICAS_*` se redefinen para que cada columna numérica
(mismas reglas que ahora: `acierto`, `saltada`, `segundos`, etc.)
salga como celda numérica.

**`aReproduccionZip(db, exportacion)`** — el ZIP:

```js
const json = aJson(exportacion);
const entradas = [{ nombre: 'resultados.json', contenido: json }];

const referenciadas = imagenesDeSesion(db, exportacion.sesion.id);
const empaquetadas = new Set();
for (const nombre of referenciadas) {
  const ruta = join(carpetaDeImagenes(), nombre);
  if (existsSync(ruta)) {
    entradas.push({ nombre: `imagenes/${nombre}`, contenido: readFileSync(ruta) });
    empaquetadas.add(nombre);
  }
}
const faltantes = [...referenciadas].filter((n) => !empaquetadas.has(n));
if (faltantes.length > 0) {
  entradas.push({
    nombre: 'imagenes_faltantes.txt',
    contenido: faltantes.join('\n') + '\n',
  });
}
return crearZip(entradas);
```

Nota: `exportacion` no trae `sesion.id` (sólo trae el `nombre`, `banco`,
etc., como ya vimos en el explore). Necesito que `armarExportacion`
exponga también `sesion.id` para que `aReproduccionZip` pueda llamar a
`imagenesDeSesion(db, sesion_id)`. Cambio mínimo: añadir `id:
sesion.id` al objeto `sesion` del árbol.

### Tests

**`server/exporters/resultados.test.js`** — reescribo el primer test
(`cabeceras literales, BOM y formato_version...`) porque ya no hay CSV;
lo reemplazo por:

- "el JSON tiene `formato_version: 2` y conserva los bloques
  completos" (verifica que `aJson` no cambió su forma).
- "el Excel rico tiene tres hojas en orden y con sus cabeceras
  esperadas".
- "el Excel rico incluye las cuatro opciones por pregunta con sus
  ids y textos en el orden mostrado".
- "el Excel rico incluye la hoja Banco con la metadata pedagógica
  completa y los conteos por pregunta".

**`server/exporters/zip-escritor.test.js`** — no cambia. El escritor
ya cubre lo que el ZIP de la 025 necesita.

**Tests del ZIP reproducible (nuevo archivo `resultados-zip.test.js`):**

- "el ZIP contiene `resultados.json` parseable y `imagenes/` con
  cada archivo referenciado".
- "si una imagen referenciada falta en disco, el ZIP incluye
  `imagenes_faltantes.txt` con el nombre pero no aborta".
- "no incluye imágenes de disco que nadie referencia".

## Ruta: `server/routes/docente.js`

```js
const tipos = new Set(['excel', 'zip']);
router.get('/sesiones/:id/export/:tipo', (req, res) => {
  try {
    const tipo = req.params.tipo;
    if (!tipos.has(tipo)) {
      return res.status(404).json({ ok: false, mensaje: 'Ese formato de exportación no existe.' });
    }
    const sesionId = Number(req.params.id);
    const exportacion = armarExportacion(db, sesionId, req.query.curso);
    if (!db.prepare('SELECT descargado_en FROM sesiones WHERE id = ?').get(sesionId)?.descargado_en) {
      db.prepare('UPDATE sesiones SET descargado_en = ? WHERE id = ?')
        .run(new Date().toISOString(), sesionId);
    }
    const seguro = (texto) => ...;
    const fecha = new Date().toISOString().slice(0, 10);
    const nombreBase = `opentest_${seguro(exportacion.sesion.nombre)}_${seguro(req.query.curso ?? 'todos')}`;
    if (tipo === 'excel') {
      const nombre = `${nombreBase}_resultados_${fecha}.xlsx`;
      res.set('Content-Disposition', `attachment; filename="${nombre}"`);
      res.type('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet').send(aExcelRico(exportacion));
      return;
    }
    const nombre = `${nombreBase}_reproduccion_${fecha}.zip`;
    res.set('Content-Disposition', `attachment; filename="${nombre}"`);
    res.type('application/zip').send(aReproduccionZip(db, exportacion));
  } catch (err) {
    res.status(err.estado ?? 400).json({ ok: false, mensaje: err.message });
  }
});
```

## Cliente

### HTML — `public/docente/resultados.html`

```html
<div class="accesos">
  <a class="acceso" id="excel"><strong>Excel (.xlsx)</strong>…</a>
  <a class="acceso" id="zip"><strong>Reproducción (.zip)</strong>…</a>
</div>
```

Reemplaza los cuatro `<a>` actuales. Las descripciones de cada uno se
ajustan para reflejar el uso ("para ver en planilla" vs "para
reproducir en otra plataforma").

### JS — `public/docente/resultados.js`

```js
for (const tipo of ['excel', 'zip']) {
  const enlace = document.getElementById(tipo);
  enlace.href = `/api/docente/sesiones/${sesion.value}/export/${tipo}${filtro}`;
}
```

Reemplaza el loop que iteraba los cuatro.

## Contrato

`spec/contracts/export-resultados-v2.md` se actualiza:

- Marca como obsoletos los endpoints `detalle.csv` y `resumen.csv`.
- Documenta el nuevo `resultados.xlsx` con tres hojas y el
  `reproduccion.zip` con la lista de archivos esperada.
- Declara que `formato_version: 2` sigue vigente.

## Cambios fuera de `server/` y `public/`

- `spec/constitution/roadmap.md`: muevo la 025 a "Hecho ✅".
- `AGENTS.md`, sección "Dónde estamos": actualizo la línea de estado.
- `RESTART.md` y `spec/bitacora.md`: al cerrar la sesión.

## Lo que no cambia

- `armarExportacion(...)`: la firma y el árbol que produce se
  preservan — sólo se le agrega `id` al objeto `sesion` que ya
  devuelve.
- `crearLibroXlsx(...)`: el escritor XLSX existente se reusa tal
  cual; lo que cambia es el contenido de las hojas.
- `crearZip(...)`: el escritor ZIP existente se reusa tal cual.
- La marca `descargado_en`: la lógica de la 022 sigue valiendo y se
  ejecuta en ambas descargas.
- La pantalla de estadísticas (019), el monitoreo y el panel: nada
  cambia.
