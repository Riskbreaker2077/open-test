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
