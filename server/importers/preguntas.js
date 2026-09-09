import { pareceMalCodificado } from './csv.js';
import { MAX_BYTES, MAX_ERRORES } from './estudiantes.js';
import { validarPaquete as validarContraEstandar } from './estandar-preguntas-icfes.js';

export const EXTENSIONES_IMAGEN = ['.png', '.jpg', '.jpeg', '.webp'];

function recortar(errores) {
  if (errores.length <= MAX_ERRORES) return errores;
  return [
    ...errores.slice(0, MAX_ERRORES),
    `…y ${errores.length - MAX_ERRORES} error(es) más. Corrige estos primero.`,
  ];
}

const MARCADOR_NUMERO = /\{\{numero:([^}]+)\}\}/g;

function buscarMarcadorNumero(texto) {
  if (typeof texto !== 'string') return null;
  MARCADOR_NUMERO.lastIndex = 0;
  const m = MARCADOR_NUMERO.exec(texto);
  return m ? m[0] : null;
}

/** Devuelve true si el texto de algún bloque del array contiene el marcador. */
function bloqueDeTextoTieneMarcador(bloques) {
  return (bloques ?? []).some(
    (b) => b?.tipo === 'texto' && buscarMarcadorNumero(b.texto) !== null,
  );
}

/**
 * Aplica la regla local de OpenTest (que el estándar deja al consumidor):
 * toda pregunta o grupo cuyo contenido traiga el marcador `{{numero:<id>}}`
 * queda fuera del banco. La sustitución del marcador es una feature aparte;
 * mientras tanto, mostrarlo en la tablet sería enseñar contenido roto.
 *
 * Devuelve `{ preguntas, grupos, exclusiones }`:
 *  - `preguntas` y `grupos` son los originales sin los afectados;
 *  - `exclusiones` enumera cada pregunta/grupo excluido con el motivo.
 */
function aplicarExclusionPorMarcadorNumero(paquete) {
  const grupos = Array.isArray(paquete.grupos) ? paquete.grupos : [];
  const idsGrupo = new Set(grupos.map((g) => g?.id).filter(Boolean));

  const gruposConMarcador = new Set();
  const exclusiones = [];

  for (const grupo of grupos) {
    const marcadorContexto = bloqueDeTextoTieneMarcador(grupo?.contexto);
    const marcadorBanco = (grupo?.banco ?? []).some((entrada) =>
      bloqueDeTextoTieneMarcador(entrada?.contenido),
    );
    if (marcadorContexto || marcadorBanco) {
      gruposConMarcador.add(grupo.id);
      exclusiones.push({
        tipo: 'grupo',
        id: grupo.id,
        motivo: marcadorContexto && marcadorBanco
          ? 'su contexto y su banco traen el marcador "{{numero:...}}"'
          : marcadorContexto
            ? 'su contexto trae el marcador "{{numero:...}}"'
            : 'su banco trae el marcador "{{numero:...}}"',
      });
    }
  }

  const preguntas = [];
  for (const pregunta of paquete.preguntas) {
    if (pregunta?.grupo_id && gruposConMarcador.has(pregunta.grupo_id)) {
      // Ya excluida por la exclusión del grupo, no se enumera dos veces.
      continue;
    }
    const marcador = bloqueDeTextoTieneMarcador(pregunta?.contexto)
      || bloqueDeTextoTieneMarcador(pregunta?.enunciado)
      || (pregunta?.opciones ?? []).some((o) => bloqueDeTextoTieneMarcador(o?.contenido));
    if (marcador) {
      exclusiones.push({
        tipo: 'pregunta',
        id: pregunta?.id ?? null,
        motivo: 'su contenido trae el marcador "{{numero:...}}"',
      });
      continue;
    }
    preguntas.push(pregunta);
  }

  const gruposFiltrados = grupos.filter((g) => !gruposConMarcador.has(g.id));
  return { preguntas, grupos: gruposFiltrados, exclusiones };
}

/**
 * Valida el paquete entero sin tocar la base. Todo o nada: nunca se importa
 * media evaluación.
 *
 * El archivo es un único JSON que sigue el estándar `preguntas-icfes`
 * (ver `spec/contracts/paquete-preguntas-icfes.md`): metadata pedagógica por
 * pregunta, contenido en bloques (texto/imagen/tabla) y justificación
 * individual por cada una de las 4 opciones. A partir de la 026 también
 * soporta grupos (`contexto_compartido`, `banco_opciones`,
 * `texto_con_blancos`) y campos informativos de v1.1.0/v1.2.0+.
 *
 * `imagenesDisponibles` es el conjunto de nombres de imagen ya disponibles
 * (subidas sueltas + las que traiga el propio ZIP); si se omite, no se
 * comprueba que las imágenes referenciadas existan (útil para probar la
 * validación de contenido en aislamiento).
 */
export function validarBanco(texto, { imagenesDisponibles, nPreguntasSesion = 20 } = {}) {
  if (typeof texto !== 'string' || texto.trim() === '') {
    return { nombre: null, preguntas: [], grupos: [], exclusiones: [], errores: ['El archivo está vacío.'], avisos: [] };
  }
  if (Buffer.byteLength(texto, 'utf8') > MAX_BYTES) {
    return {
      nombre: null,
      preguntas: [],
      grupos: [],
      exclusiones: [],
      errores: [`El archivo supera los ${Math.round(MAX_BYTES / 1024 / 1024)} MB.`],
      avisos: [],
    };
  }
  if (pareceMalCodificado(texto)) {
    return {
      nombre: null,
      preguntas: [],
      grupos: [],
      exclusiones: [],
      errores: [
        'El archivo no está guardado en UTF-8 y las tildes se verían mal. ' +
          'Vuelve a guardarlo desde un editor de texto como UTF-8.',
      ],
      avisos: [],
    };
  }

  let paquete;
  try {
    paquete = JSON.parse(texto);
  } catch (err) {
    return {
      nombre: null,
      preguntas: [],
      grupos: [],
      exclusiones: [],
      errores: [`El archivo JSON no es válido: ${err.message}`],
      avisos: [],
    };
  }

  const { valido, errores } = validarContraEstandar(paquete, { imagenesDisponibles });
  if (!valido) {
    return {
      nombre: typeof paquete?.nombre === 'string' ? paquete.nombre : null,
      preguntas: [],
      grupos: [],
      exclusiones: [],
      errores: recortar(errores.map((e) => e.mensaje)),
    };
  }

  const { preguntas, grupos, exclusiones } = aplicarExclusionPorMarcadorNumero(paquete);

  const avisos = [];
  if (exclusiones.length > 0) {
    const gruposExcluidos = exclusiones.filter((e) => e.tipo === 'grupo').length;
    const preguntasExcluidas = exclusiones.length - gruposExcluidos;
    const partes = [];
    if (gruposExcluidos > 0) partes.push(`${gruposExcluidos} grupo(s)`);
    if (preguntasExcluidas > 0) partes.push(`${preguntasExcluidas} pregunta(s)`);
    avisos.push(
      `El banco importado no incluye ${partes.join(' y ')} porque su contenido trae el ` +
        'marcador "{{numero:...}}", que OpenTest aún no sabe sustituir. Vuelve a ' +
        'exportar el paquete sin ese marcador para incluirlos.',
    );
  }

  // Mismo aviso que antes: si el banco es más corto que la sesión, el
  // docente debe saberlo. El conteo incluye los miembros de grupo, que
  // ocupan un orden propio en la prueba.
  if (preguntas.length < nPreguntasSesion) {
    avisos.push(
      `El banco tiene ${preguntas.length} pregunta(s). Una sesión de ` +
        `${nPreguntasSesion} preguntas necesita al menos ${nPreguntasSesion}.`,
    );
  }

  return { nombre: paquete.nombre, preguntas, grupos, exclusiones, errores: [], avisos };
}
