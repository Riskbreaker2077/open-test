# Restart

## Última actualización y rama activa

- 28/08/2026 — `main`, 1 commit adelante de `origin/main` (no pusheado todavía).

## Feature/tarea en curso

- Ninguna en curso. Acaba de completarse la **020 · Gestión manual de estudiantes** ([spec](spec/features/020-gestion-manual-estudiantes/spec.md)). Las 20 features del roadmap están implementadas y los 345 tests en verde. Lo único que falta antes de dar el proyecto por cerrado es la sesión de validación física en red local — ver "Siguiente tarea" abajo.

## Qué se hizo en esta sesión

### `main` (sin commitear todavía)

- **020 · Gestión manual de estudiantes** ([spec](spec/features/020-gestion-manual-estudiantes/), [plan](spec/features/020-gestion-manual-estudiantes/plan.md), [tasks](spec/features/020-gestion-manual-estudiantes/tasks.md)):
  - Servicio `crearEstudiante` y `actualizarEstudiante` en `server/services/estudiantes.js`, con validación extraída a `validarEstudianteIndividual` en `server/importers/estudiantes.js` para que el modal y la importación compartan los mismos mensajes en español.
  - Rutas nuevas: `POST /api/docente/estudiantes` y `PUT /api/docente/estudiantes/:codigo` (ambas bajo `/api/docente/*`, protegidas por la sesión del docente). Errores tipados: `400` con `errores[]` cuando la validación falla, `409` cuando el código ya existe, `404` cuando se edita un código inexistente. El `codigo` del body se ignora al editar.
  - Pantalla `public/docente/estudiantes.html`: botón **"+ Nuevo estudiante"** arriba del listado, y un `<dialog>` modal al pie con los cuatro campos del contrato. Cada fila gana un botón **Editar** (al lado de **Eliminar**); en modo edición el `codigo` queda en solo lectura.
  - Estilos mínimos locales en `estudiantes.html` (sin tocar `public/shared/base.css`): el modal y la fila con dos acciones.
  - 16 tests nuevos: 9 en `server/services/estudiantes.test.js` y 7 en `server/routes/docente.estudiantes.test.js`.
  - `npm test`: 345/345 en verde. `npm run lint`: 87 archivos sin errores.
- Documentación: la 020 se movió a "Hecho ✅" en `spec/constitution/roadmap.md`, AGENTS.md y este archivo se actualizaron.

## Estado

- Git: cambios sin commitear todavía en `main` (1 commit adelante de `origin/main`, pero no es de la 020 — es el fix de `postject` para Node 24 de la sesión anterior). **No se pidió commit ni push en esta sesión.**
- Tests: 345/345 en verde. Lint: 87 archivos sin errores.
- Build: **no verificado en esta sesión ni en ninguna anterior desde este entorno.** `scripts/build-exe.js` se niega a correr fuera de Windows.
- Servidor: no probado en un navegador real. La 020 añade UI nueva (modal `<dialog>`) que conviene ver al menos una vez en un navegador antes de la sesión de validación.

## Siguiente tarea — es esta, no hay otra feature que planear

**La sesión de validación en red local con equipo Windows real.** No es delegable: necesita hardware físico (portátil Windows, tablets, proyector, wifi). Antes de esa sesión, quien la organice debe tener listo:

**Equipo y red**
1. Portátil Windows 10/11 de 64 bits, con Node 22 instalado *solo para construir* (`npm install && npm run build:exe` — el `.exe` resultante no necesita Node para correr).
2. Copiar la carpeta `OpenTest-Windows` completa (no solo el `.exe`) al equipo final.
3. Tablets/dispositivos de estudiantes y el portátil en la **misma red wifi**, confirmando con el responsable de la red que esa wifi no tiene **aislamiento de clientes** activado.
4. Permitir OpenTest en el cortafuegos de Windows para redes privadas, y aceptar SmartScreen/antivirus.

**Contenido**
5. La base de datos parte **vacía** en la máquina Windows: reimportar estudiantes y banco allí.
6. Lista real de estudiantes, o `ejemplos/estudiantes-ejemplo.csv` para el ensayo.
7. Banco de preguntas real en el estándar preguntas-icfes, o `ejemplos/participacion-ciudadana-20-preguntas.zip` para el ensayo.
8. Contraseña del panel docente decidida y guardada en un lugar seguro — no se puede recuperar desde la interfaz.

**Antes del día real**
9. Correr la "Prueba de humo" de `GUIA-DOCENTE.md` al menos una vez en el equipo destino.
10. Proyector conectado y probado, con la pantalla de proyección legible desde el fondo del salón.

**Verificaciones físicas que solo esta sesión puede cerrar**
11. QR escaneado desde una tablet real abre el portal del estudiante (012, 013).
12. Usabilidad táctil real en tablet — botones ≥44px, sin scroll horizontal — en portal, examen y resultado (013, 006, 007).
13. Aviso en pantalla si se pierde la red al responder (006).
14. Tildes correctas al abrir los CSV en Excel de Windows (009).
15. `npm run build:exe` produce un ejecutable que arranca sin Node, abre el navegador, y la pantalla del docente se ve bien (010, 014).
16. El `.xlsx` de la 018 abre en Excel/LibreOffice reales sin diálogo de reparación.
17. La pantalla de Estadísticas (019) funciona con clics reales en un navegador.
18. **Modal de creación/edición de estudiantes (020)** se ve y se opera bien en un navegador real; verificar que `Esc` cierra, que el foco vuelve al botón que lo abrió, y que el `codigo` en readonly se distingue visualmente.

## Bloqueos / decisiones pendientes

- Todo lo de "Siguiente tarea" depende del equipo físico — nada de esto avanza sin la máquina Windows, tablets y proyector.
- Decidir la política de recuperación de contraseña del panel docente (gap conocido) antes de documentarla en `GUIA-DOCENTE.md`.
- Backlog abierto, sin tocar esta sesión: monitoreo en vivo enriquecido, backup con un clic, y decidir si/cómo migrar bancos anteriores a la 016.
- Pendiente de esta sesión: commitear los cambios de la 020 y pushear a `origin/main`. No se hizo porque no se pidió.
