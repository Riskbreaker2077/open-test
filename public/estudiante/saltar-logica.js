/**
 * Qué se guarda al pulsar "Saltar" en una pantalla de una sola pregunta (050).
 * Saltar no debe borrar una respuesta ya dada: conserva la selección actual y
 * solo registra "saltada" (null) cuando no hay ninguna.
 */
export function opcionAlSaltar(opcionElegida) {
  return opcionElegida ?? null;
}
