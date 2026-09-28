/**
 * Envío de resultados al portal de estudiantes (043; la 044 agrega el
 * listado de evaluaciones disponibles).
 *
 * Es la única salida de red de OpenTest y la constitución la acota: solo
 * cuando el docente pulsa «Buscar evaluaciones disponibles» o «Enviar
 * ahora», nunca con un examen en curso o en pausa y nunca en segundo plano.
 * Nada de este módulo se ejecuta solo: lo llaman las rutas del panel.
 *
 * El portal expone la contraparte de esto en su feature 030: una credencial
 * con el permiso «Enviar resultados desde OpenTest» (`opentest:enviar`,
 * que no combina con ningún otro y no sirve en su servidor MCP), y dos
 * rutas REST simples: `GET /api/opentest/evaluaciones` (con `codigo` para
 * confirmar un destino, sin él para listar todos los configurados con
 * proveedor OpenTest) y `POST /api/opentest/envios?evaluacion={codigo}`
 * con el ZIP como cuerpo.
 */
import { createHash } from 'node:crypto';
import { armarExportacion, aReproduccionZip } from '../exporters/resultados.js';
import { obtenerSesion } from './sesiones.js';

const error = (mensaje, estado = 400) => Object.assign(new Error(mensaje), { estado });

const CLAVE_URL = 'portal_url';
const CLAVE_CLAVE = 'portal_clave';
/** Formato de las credenciales del portal (`mcp_<id>.<secreto>`). */
const PATRON_CLAVE = /^mcp_[A-Za-z0-9_-]{16}\.[A-Za-z0-9_-]{43}$/u;
// Los códigos del portal llevan espacios y barras («STJ / EVA / 10 / …»).
const PATRON_CODIGO = /^[^\p{Cc}]{1,100}$/u;
const TIEMPO_MAXIMO_MS = 30_000;

function leerConfig(db, clave) {
  return db.prepare('SELECT valor FROM config WHERE clave = ?').get(clave)?.valor ?? null;
}

function escribirConfig(db, clave, valor) {
  db.prepare(
    'INSERT INTO config (clave, valor) VALUES (?, ?) ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor',
  ).run(clave, valor);
}

/**
 * Deja la dirección en su forma base (`https://portal.ejemplo.edu`). Solo
 * `https`, salvo `localhost` para pruebas: la clave viaja en cada envío.
 */
export function normalizarUrlPortal(texto) {
  let url;
  try {
    url = new URL(String(texto ?? '').trim());
  } catch {
    throw error('Escribe la dirección completa del portal, por ejemplo https://portal.colegio.edu.co');
  }
  const local = ['localhost', '127.0.0.1'].includes(url.hostname);
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && local)) {
    throw error('La dirección del portal debe empezar por https://');
  }
  return url.origin;
}

export function estadoVinculo(db) {
  const url = leerConfig(db, CLAVE_URL);
  const clave = leerConfig(db, CLAVE_CLAVE);
  // La clave nunca sale de aquí: solo sus últimos cuatro caracteres.
  return { vinculado: Boolean(url && clave), url, finClave: clave ? clave.slice(-4) : null };
}

export function vincularPortal(db, { url, clave }) {
  const base = normalizarUrlPortal(url);
  const limpia = String(clave ?? '').trim();
  if (!PATRON_CLAVE.test(limpia)) {
    throw error('La clave no tiene el formato de una credencial del portal. Cópiala completa, empieza por mcp_.');
  }
  db.transaction(() => {
    escribirConfig(db, CLAVE_URL, base);
    escribirConfig(db, CLAVE_CLAVE, limpia);
  })();
  return estadoVinculo(db);
}

export function desvincularPortal(db) {
  db.prepare('DELETE FROM config WHERE clave IN (?, ?)').run(CLAVE_URL, CLAVE_CLAVE);
  return estadoVinculo(db);
}

export function fijarCodigoPortal(db, sesionId, codigo) {
  obtenerSesion(db, sesionId);
  const limpio = String(codigo ?? '').trim();
  if (limpio && !PATRON_CODIGO.test(limpio)) {
    throw error('El código del portal tiene como máximo 100 caracteres, en una sola línea.');
  }
  db.prepare('UPDATE sesiones SET codigo_portal = ? WHERE id = ?').run(limpio || null, sesionId);
  return obtenerSesion(db, sesionId);
}

/** Traduce un fallo del portal o de la red a algo que el docente entienda. */
function mensajeDeFallo(respuesta, cuerpo) {
  if (!respuesta) return 'Sin conexión con el portal. Revisa que el portátil tenga internet.';
  if (respuesta.status === 401) return 'El portal no reconoce la clave: pudo ser revocada. Vincula OpenTest con una clave nueva.';
  if (respuesta.status === 403) return 'La clave no tiene el permiso «Enviar resultados desde OpenTest».';
  if (respuesta.status === 404) return 'El código no corresponde a una evaluación OpenTest del portal.';
  if (respuesta.status === 429) return 'El portal pidió esperar un momento. Intenta de nuevo en un minuto.';
  return cuerpo?.mensaje ?? `El portal respondió con un error (${respuesta.status}).`;
}

async function pedir(fetchFn, url, opciones) {
  try {
    const respuesta = await fetchFn(url, { ...opciones, signal: AbortSignal.timeout(TIEMPO_MAXIMO_MS) });
    const cuerpo = await respuesta.json().catch(() => null);
    return { respuesta, cuerpo };
  } catch {
    return { respuesta: null, cuerpo: null };
  }
}

/**
 * Trae del portal la lista de evaluaciones configuradas allí con proveedor
 * OpenTest, para que el docente elija en vez de escribir un código a mano
 * (044). Solo se llama al pulsar el botón del panel.
 */
export async function evaluacionesDisponibles(db, { fetchFn = globalThis.fetch } = {}) {
  const vinculo = estadoVinculo(db);
  if (!vinculo.vinculado) throw error('Primero vincula OpenTest con el portal.', 409);
  const clave = leerConfig(db, CLAVE_CLAVE);
  const { respuesta, cuerpo } = await pedir(fetchFn, `${vinculo.url}/api/opentest/evaluaciones`, {
    headers: { authorization: `Bearer ${clave}` },
  });
  if (!respuesta?.ok) throw error(mensajeDeFallo(respuesta, cuerpo));
  return cuerpo.evaluaciones ?? [];
}

/**
 * Resume lo que se enviaría: el código de destino y el estado de cada intento.
 * Una anulación, una reversión o un código distinto cambian la huella, y con
 * ella la evaluación vuelve a quedar pendiente sin avisar a nadie.
 */
export function huellaDeResultados(db, sesion) {
  const intentos = db.prepare(`
    SELECT i.id, i.entregado_en, i.motivo_entrega, i.aciertos, i.puntaje, i.anulado_en,
           (SELECT count(*) FROM respuestas r
              JOIN intento_preguntas ip ON ip.id = r.intento_pregunta_id
             WHERE ip.intento_id = i.id) AS respuestas
    FROM intentos i WHERE i.sesion_id = ? ORDER BY i.id
  `).all(sesion.id);
  return createHash('sha256')
    .update(JSON.stringify({ codigo: sesion.codigo_portal, intentos }))
    .digest('hex');
}

export function listarEnvios(db) {
  const sesiones = db.prepare(`
    SELECT s.id, s.nombre, s.cursos, s.codigo_portal,
           (SELECT count(*) FROM intentos i WHERE i.sesion_id = s.id) AS intentos,
           e.huella, e.enviado_en, e.ultimo_intento_en, e.ultimo_error, e.destino
    FROM sesiones s LEFT JOIN envios_portal e ON e.sesion_id = s.id
    WHERE s.estado = 'cerrada'
    ORDER BY s.id DESC
  `).all();
  return sesiones.map((fila) => {
    let estado = 'pendiente';
    if (!fila.codigo_portal) estado = 'sin_codigo';
    else if (fila.intentos === 0) estado = 'sin_intentos';
    else if (fila.enviado_en && fila.huella === huellaDeResultados(db, fila)) estado = 'enviado';
    return {
      id: fila.id,
      nombre: fila.nombre,
      cursos: fila.cursos,
      codigoPortal: fila.codigo_portal,
      intentos: fila.intentos,
      estado,
      enviadoEn: fila.enviado_en,
      ultimoIntentoEn: fila.ultimo_intento_en,
      ultimoError: estado === 'enviado' ? null : fila.ultimo_error,
      destino: fila.destino ? JSON.parse(fila.destino) : null,
    };
  });
}

function registrar(db, sesionId, campos) {
  db.prepare(`
    INSERT INTO envios_portal (sesion_id, huella, enviado_en, ultimo_intento_en, ultimo_error, destino)
    VALUES (@sesion_id, @huella, @enviado_en, @ultimo_intento_en, @ultimo_error, @destino)
    ON CONFLICT(sesion_id) DO UPDATE SET
      huella = coalesce(excluded.huella, huella),
      enviado_en = coalesce(excluded.enviado_en, enviado_en),
      ultimo_intento_en = excluded.ultimo_intento_en,
      ultimo_error = excluded.ultimo_error,
      destino = coalesce(excluded.destino, destino)
  `).run({ huella: null, enviado_en: null, ultimo_error: null, destino: null, ...campos, sesion_id: sesionId });
}

/**
 * Envía todas las evaluaciones pendientes. Solo se llama cuando el docente
 * pulsa «Enviar ahora»; `fetchFn` es inyectable para las pruebas.
 */
export async function enviarPendientes(db, { fetchFn = globalThis.fetch, ahora = () => new Date() } = {}) {
  const enCurso = db.prepare("SELECT count(*) AS n FROM sesiones WHERE estado IN ('en_curso', 'pausada')").get().n;
  if (enCurso > 0) {
    // La constitución: ninguna conexión mientras haya un examen en marcha.
    throw error('Hay una evaluación en curso o en pausa. Envía los resultados cuando termine.', 409);
  }
  const vinculo = estadoVinculo(db);
  if (!vinculo.vinculado) throw error('Primero vincula OpenTest con el portal.', 409);
  const clave = leerConfig(db, CLAVE_CLAVE);
  const autorizacion = { authorization: `Bearer ${clave}` };
  const pendientes = listarEnvios(db).filter((fila) => fila.estado === 'pendiente');
  const resultados = [];

  for (const fila of pendientes) {
    const sesion = obtenerSesion(db, fila.id);
    const huella = huellaDeResultados(db, sesion);
    const intento = ahora().toISOString();
    const codigo = encodeURIComponent(sesion.codigo_portal);

    const consulta = await pedir(fetchFn, `${vinculo.url}/api/opentest/evaluaciones?codigo=${codigo}`, {
      headers: autorizacion,
    });
    if (!consulta.respuesta?.ok) {
      const mensaje = mensajeDeFallo(consulta.respuesta, consulta.cuerpo);
      registrar(db, sesion.id, { ultimo_intento_en: intento, ultimo_error: mensaje });
      resultados.push({ id: sesion.id, nombre: sesion.nombre, ok: false, mensaje });
      if (!consulta.respuesta) break; // Sin red no tiene sentido seguir con las demás.
      continue;
    }
    const destino = consulta.cuerpo?.destino ?? null;

    // Es el mismo ZIP que se descarga a mano: formato 3, sin cambios.
    const zip = aReproduccionZip(db, armarExportacion(db, sesion.id));
    const envio = await pedir(fetchFn, `${vinculo.url}/api/opentest/envios?evaluacion=${codigo}`, {
      method: 'POST',
      headers: { ...autorizacion, 'content-type': 'application/zip' },
      body: zip,
    });
    if (!envio.respuesta?.ok) {
      const mensaje = mensajeDeFallo(envio.respuesta, envio.cuerpo);
      registrar(db, sesion.id, {
        ultimo_intento_en: intento, ultimo_error: mensaje, destino: JSON.stringify(destino),
      });
      resultados.push({ id: sesion.id, nombre: sesion.nombre, ok: false, mensaje });
      if (!envio.respuesta) break;
      continue;
    }
    registrar(db, sesion.id, {
      huella, enviado_en: intento, ultimo_intento_en: intento, destino: JSON.stringify(destino),
    });
    resultados.push({
      id: sesion.id, nombre: sesion.nombre, ok: true, estado: envio.cuerpo?.estado ?? null, destino,
    });
  }
  return { enviados: resultados.filter((r) => r.ok).length, resultados };
}
