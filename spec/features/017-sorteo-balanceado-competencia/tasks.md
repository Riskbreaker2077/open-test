# 017 · Sorteo balanceado por competencia — Tareas

- [x] Implementar `cuotasPorCompetencia(tamanosPorGrupo, total)` en `personalizacion.js` (método del resto mayor, sin exceder el tamaño de cada grupo).
- [x] Test de `cuotasPorCompetencia`: reparto proporcional exacto sin resto.
- [x] Test de `cuotasPorCompetencia`: reparto con resto y empate alfabético.
- [x] Test de `cuotasPorCompetencia`: ningún grupo recibe más cupos de los que tiene.
- [x] Agrupar `preguntas` por `competencia` dentro de `generarPrueba` y sustituir el muestreo único por muestreo por grupo + barajado del conjunto combinado.
- [x] `idsDePreguntasYOpciones` en `bancos.js` selecciona también `competencia`.
- [x] Test: banco de competencias iguales da cobertura exactamente proporcional en cada intento, sobre varias semillas.
- [x] Test: banco sin `competencia` (fixture `banco()` existente) se comporta igual que antes.
- [x] Confirmar que toda la suite existente de la 005 sigue en verde sin modificar sus asserts.
- [x] `npm test` y `npm run lint` completos en verde.
- [x] Actualizar el `spec.md` de la 005 (la línea de "sorteo estratificado" pasa de backlog a implementado aquí).
- [x] Mover la feature a "Hecho" en `../../constitution/roadmap.md` y quitarla del backlog.
- [x] Validar contra los criterios de aceptación de `spec.md`.
