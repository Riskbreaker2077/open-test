import { analizarBloques, textoPlano } from './bloques.js';
import { cursosDe } from './sesiones.js';

const error = (mensaje, estado = 400) => Object.assign(new Error(mensaje), { estado });

const LARGO_MAXIMO_ENUNCIADO = 120;

function enunciadoCorto(bloques) {
  const texto = textoPlano(bloques).trim();
  if (texto === '') return '[Pregunta sin texto: imagen o tabla]';
  return texto.length > LARGO_MAXIMO_ENUNCIADO ? `${texto.slice(0, LARGO_MAXIMO_ENUNCIADO)}…` : texto;
}

const redondear = (valor) => Number(valor.toFixed(1));

export function sesionesCerradasDeBanco(db, bancoId) {
  return db.prepare(`
    SELECT id, nombre, cursos FROM sesiones WHERE banco_id = ? AND estado = 'cerrada' ORDER BY id DESC
  `).all(bancoId).map((sesion) => ({ id: sesion.id, nombre: sesion.nombre, cursos: cursosDe(sesion) }));
}

export function estadisticasDeBanco(db, bancoId, { sesionId, curso } = {}) {
  const cerradas = sesionesCerradasDeBanco(db, bancoId);
  let sesionesEnAlcance;
  if (sesionId == null) {
    sesionesEnAlcance = cerradas.map((sesion) => sesion.id);
  } else {
    if (!cerradas.some((sesion) => sesion.id === sesionId)) {
      throw error('Esa sesión no es una evaluación cerrada de este banco.');
    }
    sesionesEnAlcance = [sesionId];
  }

  if (sesionesEnAlcance.length === 0) return { preguntas: [], competencias: [] };

  const marcadores = sesionesEnAlcance.map(() => '?').join(',');
  const filas = db.prepare(`
    SELECT ip.pregunta_id,
           count(*) AS veces_mostrada,
           sum(CASE WHEN r.opcion_id IS NULL THEN 1 ELSE 0 END) AS saltadas,
           sum(CASE WHEN r.opcion_id = o.id THEN 1 ELSE 0 END) AS aciertos,
           avg(CASE WHEN r.opcion_id IS NOT NULL THEN r.segundos_en_pantalla END) AS segundos_promedio
    FROM intento_preguntas ip
    JOIN intentos i ON i.id = ip.intento_id
    JOIN estudiantes e ON e.codigo = i.codigo_estudiante
    LEFT JOIN respuestas r ON r.intento_pregunta_id = ip.id
    LEFT JOIN opciones o ON o.pregunta_id = ip.pregunta_id AND o.es_correcta = 1
    WHERE ip.pregunta_id IN (SELECT id FROM preguntas WHERE banco_id = ?)
      AND i.sesion_id IN (${marcadores})
      AND (? = '' OR e.curso = ?)
    GROUP BY ip.pregunta_id
  `).all(bancoId, ...sesionesEnAlcance, curso ?? '', curso ?? '');

  if (filas.length === 0) return { preguntas: [], competencias: [] };

  const infoPregunta = db.prepare('SELECT id, enunciado, competencia FROM preguntas WHERE id = ?');

  const preguntas = filas.map((fila) => {
    const info = infoPregunta.get(fila.pregunta_id);
    const fallos = fila.veces_mostrada - fila.saltadas - fila.aciertos;
    return {
      preguntaId: fila.pregunta_id,
      enunciado: enunciadoCorto(analizarBloques(info.enunciado)),
      competencia: info.competencia,
      vecesMostrada: fila.veces_mostrada,
      aciertos: fila.aciertos,
      saltadas: fila.saltadas,
      fallos,
      porcentajeAcierto: redondear((fila.aciertos / fila.veces_mostrada) * 100),
      porcentajeSaltada: redondear((fila.saltadas / fila.veces_mostrada) * 100),
      segundosPromedio: fila.segundos_promedio == null ? null : redondear(fila.segundos_promedio),
    };
  }).sort((a, b) => a.porcentajeAcierto - b.porcentajeAcierto || a.preguntaId - b.preguntaId);

  const porCompetencia = new Map();
  for (const pregunta of preguntas) {
    const acumulado = porCompetencia.get(pregunta.competencia) ?? {
      competencia: pregunta.competencia, preguntas: 0, vecesMostrada: 0, aciertos: 0,
    };
    acumulado.preguntas += 1;
    acumulado.vecesMostrada += pregunta.vecesMostrada;
    acumulado.aciertos += pregunta.aciertos;
    porCompetencia.set(pregunta.competencia, acumulado);
  }

  const competencias = [...porCompetencia.values()]
    .map((item) => ({ ...item, porcentajeAcierto: redondear((item.aciertos / item.vecesMostrada) * 100) }))
    .sort((a, b) => a.porcentajeAcierto - b.porcentajeAcierto || a.competencia.localeCompare(b.competencia));

  return { preguntas, competencias };
}
