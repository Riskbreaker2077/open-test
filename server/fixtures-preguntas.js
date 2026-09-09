// Fábrica de preguntas válidas contra el estándar preguntas-icfes, para no
// repetir los 6 campos de metadata y las 4 opciones en cada test que solo
// necesita "una pregunta cualquiera que pase la validación".
let contador = 0;

export function preguntaDeEjemplo(overrides = {}) {
  contador += 1;
  const base = {
    id: `fixture-${contador}`,
    competencia: 'Competencia de prueba',
    componente: 'Componente de prueba',
    afirmacion: 'Afirmación de prueba',
    evidencia: 'Evidencia de prueba',
    estandar_asociado: 'Estándar de prueba',
    que_evalua: 'Qué evalúa de prueba',
    contexto: [],
    enunciado: [{ tipo: 'texto', texto: `¿Pregunta de prueba ${contador}?` }],
    opciones: [
      { id: 'A', contenido: [{ tipo: 'texto', texto: 'Opción A' }], es_correcta: false, justificacion: 'Incorrecta: A no es.' },
      { id: 'B', contenido: [{ tipo: 'texto', texto: 'Opción B' }], es_correcta: false, justificacion: 'Incorrecta: B no es.' },
      { id: 'C', contenido: [{ tipo: 'texto', texto: 'Opción C' }], es_correcta: true, justificacion: 'Correcta: C es la respuesta.' },
      { id: 'D', contenido: [{ tipo: 'texto', texto: 'Opción D' }], es_correcta: false, justificacion: 'Incorrecta: D no es.' },
    ],
  };
  return { ...base, ...overrides };
}

/** N preguntas de ejemplo, cada una con su propio id y enunciado. */
export function preguntasDeEjemplo(n, overrides = () => ({})) {
  return Array.from({ length: n }, (_, i) => preguntaDeEjemplo({
    enunciado: [{ tipo: 'texto', texto: `¿Pregunta ${i + 1}?` }],
    ...overrides(i),
  }));
}

// ---- Grupos de preguntas (feature 026, estándar preguntas-icfes v1.2.0+) --

const METADATA_PEDAGOGICA_BASE = () => ({
  competencia: 'Competencia del grupo',
  componente: 'Componente del grupo',
  afirmacion: 'Afirmación del grupo',
  evidencia: 'Evidencia del grupo',
  estandar_asociado: 'Estándar del grupo',
  que_evalua: 'Qué evalúa el grupo',
});

/**
 * Grupo de contexto compartido: las preguntas miembro traen su propio
 * enunciado y sus opciones; el grupo solo aporta el contexto (p. ej. una
 * lectura común). Cada miembro ocupa un `orden` propio en la prueba.
 */
export function grupoContextoCompartido(overrides = {}) {
  const id = overrides.id ?? `g-cc-${++contador}`;
  return {
    id,
    tipo: 'contexto_compartido',
    contexto: [{ tipo: 'texto', texto: 'Lectura común para las preguntas siguientes.' }],
    metadata_pedagogica: METADATA_PEDAGOGICA_BASE(),
    ...overrides,
  };
}

/** Pregunta miembro de un grupo `contexto_compartido` (forma estándar). */
export function preguntaMiembroContextoCompartido(grupoId, overrides = {}) {
  return preguntaDeEjemplo({
    grupo_id: grupoId,
    ...overrides,
  });
}

/**
 * Grupo de emparejamiento (banco_opciones): las preguntas miembro no tienen
 * opciones propias; cada una declara `respuesta_pool_id` apuntando a una
 * entrada del banco del grupo.
 */
export function grupoBancoOpciones(overrides = {}) {
  const id = overrides.id ?? `g-bo-${++contador}`;
  const bancoBase = overrides.banco ?? [
    { id: 'p1', contenido: [{ tipo: 'texto', texto: 'phloem' }] },
    { id: 'p2', contenido: [{ tipo: 'texto', texto: 'xylem' }] },
    { id: 'p3', contenido: [{ tipo: 'texto', texto: 'stoma' }] },
    { id: 'p4', contenido: [{ tipo: 'texto', texto: 'root' }] },
  ];
  return {
    id,
    tipo: 'banco_opciones',
    contexto: [{ tipo: 'texto', texto: 'Relaciona cada descripción con la palabra correcta.' }],
    banco: bancoBase,
    metadata_pedagogica: METADATA_PEDAGOGICA_BASE(),
    ...overrides,
  };
}

/** Pregunta miembro de un grupo `banco_opciones`. */
export function preguntaMiembroBancoOpciones(grupoId, banco, overrides = {}) {
  return {
    id: `fixture-${++contador}`,
    grupo_id: grupoId,
    tipo_item: 'miembro_banco_opciones',
    contexto: [],
    enunciado: [{ tipo: 'texto', texto: 'Descripción de la pregunta.' }],
    respuesta_pool_id: banco[0]?.id ?? 'p1',
    justificacion: 'Justificación de la respuesta.',
    ...overrides,
  };
}

/**
 * Grupo cloze (texto_con_blancos): las preguntas miembro no tienen
 * enunciado propio (lo es el pasaje del grupo) y declaran `numero_blanco`
 * con sus opciones.
 */
export function grupoTextoConBlancos(overrides = {}) {
  const id = overrides.id ?? `g-tb-${++contador}`;
  return {
    id,
    tipo: 'texto_con_blancos',
    contexto: [
      { tipo: 'texto', texto: 'Plants transport water through (1)_______ and sugars through (2)_______.' },
    ],
    metadata_pedagogica: METADATA_PEDAGOGICA_BASE(),
    ...overrides,
  };
}

/** Pregunta miembro de un grupo `texto_con_blancos`. */
export function preguntaMiembroTextoConBlancos(grupoId, numeroBlanco, overrides = {}) {
  return {
    id: `fixture-${++contador}`,
    grupo_id: grupoId,
    tipo_item: 'miembro_texto_con_blancos',
    contexto: [],
    numero_blanco: numeroBlanco,
    opciones: [
      { id: 'A', contenido: [{ tipo: 'texto', texto: 'xylem' }], es_correcta: false, justificacion: 'Xylem transports water, not sugars.' },
      { id: 'B', contenido: [{ tipo: 'texto', texto: 'phloem' }], es_correcta: true, justificacion: 'Phloem transports sugars.' },
      { id: 'C', contenido: [{ tipo: 'texto', texto: 'root' }], es_correcta: false, justificacion: 'Root absorbs water but does not transport sugars.' },
    ],
    ...overrides,
  };
}
