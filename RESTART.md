# Restart

## Última actualización y rama activa

- 28/08/2026 — `main`.

## Feature/tarea en curso

- Ninguna en curso. La última completada es la 019 · Estadísticas por pregunta y por competencia ([roadmap](spec/constitution/roadmap.md)). **Todas las features del roadmap están implementadas.** Lo único que falta antes de dar el proyecto por cerrado es la sesión de validación física en red local — ver "Siguiente tarea" abajo, que ahora es explícita y no se puede saltar.

## Qué se hizo en esta sesión

### `main`

- Se comiteó y se hizo `push` de las features 018 (Excel) y 019 (estadísticas por pregunta/competencia). `main` está sincronizado con `origin/main` hasta `41ff5b1`.
- Preparación para la sesión de validación en red local, a pedido explícito del usuario ("dejes todo preparado para una prueba real en una red local"):
  - `GUIA-DOCENTE.md` estaba desactualizada: la sección de resultados no mencionaba la descarga en Excel (018) y no existía la de Estadísticas (019). Se agregaron ambas.
  - `.gitignore` no excluía `dist/` (salida de `npm run build:exe`) ni `.sea-build/` (temporal del empaquetado); si se construye el `.exe` dentro de este checkout ya no hay riesgo de comitearlo por accidente.
  - Se armó una checklist completa de qué debe tener listo el usuario para esa sesión, cruzando los criterios de aceptación sin marcar de **todas** las features (`grep` sobre `spec/features/*/spec.md`) en vez de improvisarla — queda íntegra más abajo.
  - **Gap detectado y sin resolver:** el criterio de la 011 sobre "procedimiento documentado de recuperación de contraseña que exige acceso físico" sigue sin un paso concreto en `GUIA-DOCENTE.md` (hoy solo dice que no se puede recuperar). Es una decisión de política de seguridad, no técnica — el usuario prefirió que se le preguntara antes de escribirlo, y no se ha decidido todavía.

## Estado

- Git: limpio, `main` sincronizado con `origin/main`.
- Tests: 329/329 en verde. Lint: 87 archivos sin errores.
- Build: **no verificado en esta sesión ni en ninguna anterior desde este entorno.** `scripts/build-exe.js` se niega a correr fuera de Windows (`process.platform !== 'win32'`); Claude no puede construir ni probar el `.exe` desde Linux. Es la primera cosa a probar en la máquina Windows real.
- Servidor: no probado en un navegador real (sin herramienta de automatización de navegador disponible en este entorno, ni en la sesión de la 018 ni en la de la 019). Todo lo verificado hasta ahora es por HTTP con servidores de prueba desechables, nunca contra `data/opentest.db`.

## Siguiente tarea — es esta, no hay otra feature que planear

**La sesión de validación en red local con equipo Windows real.** No es delegable a Claude: necesita hardware físico (portátil Windows, tablets, proyector, wifi). Antes de esa sesión, quien la organice debe tener listo:

**Equipo y red**
1. Portátil Windows 10/11 de 64 bits, con Node 22 instalado *solo para construir* (`npm install && npm run build:exe` — el `.exe` resultante no necesita Node para correr).
2. Copiar la carpeta `OpenTest-Windows` completa (no solo el `.exe`) al equipo final.
3. Tablets/dispositivos de estudiantes y el portátil en la **misma red wifi**, confirmando con el responsable de la red que esa wifi no tiene **aislamiento de clientes** activado.
4. Permitir OpenTest en el cortafuegos de Windows para redes privadas, y aceptar SmartScreen/antivirus (o pedir autorización de IT si el antivirus institucional lo bloquea).

**Contenido**
5. La base de datos parte **vacía** en la máquina Windows (`data/` no viaja, está en `.gitignore`): reimportar estudiantes y banco allí, no depender de `data/opentest.db` local.
6. Lista real de estudiantes, o `ejemplos/estudiantes-ejemplo.csv` para el ensayo.
7. Banco de preguntas real en el estándar preguntas-icfes, o `ejemplos/participacion-ciudadana-20-preguntas.zip` para el ensayo.
8. Contraseña del panel docente decidida y guardada en un lugar seguro — no se puede recuperar desde la interfaz.

**Antes del día real**
9. Correr la "Prueba de humo" de `GUIA-DOCENTE.md` (10 minutos, un estudiante) al menos una vez en el equipo destino, antes de la sesión con el grupo completo.
10. Proyector conectado y probado, con la pantalla de proyección (QR + dirección + reloj) legible desde el fondo del salón.

**Verificaciones físicas que solo esta sesión puede cerrar** (de los criterios sin marcar en `spec/features/*/spec.md`; ver `git grep -n "\- \[ \]" spec/features/*/spec.md` para la lista literal):
11. QR escaneado desde una tablet real abre el portal del estudiante (012, 013).
12. Usabilidad táctil real en tablet — botones ≥44px, sin scroll horizontal — en portal, examen y resultado (013, 006, 007).
13. Aviso en pantalla si se pierde la red al responder; el estudiante nunca debe creer que algo quedó guardado sin estarlo (006).
14. Tildes correctas al abrir los CSV en Excel de Windows (009).
15. `npm run build:exe` produce un ejecutable que arranca sin Node instalado, en Windows 10/11 de 64 bits, y abre el navegador en el panel del docente (010).
16. El `.xlsx` de la 018 abre en Excel/LibreOffice reales sin diálogo de reparación.
17. La pantalla de Estadísticas (019) funciona con clics reales en un navegador, no solo por HTTP como se probó hasta ahora.

## Bloqueos / decisiones pendientes

- Todo lo de "Siguiente tarea" depende del equipo físico — nada de esto avanza sin la máquina Windows, tablets y proyector.
- Decidir la política de recuperación de contraseña del panel docente (ver gap arriba) antes de documentarla en `GUIA-DOCENTE.md`.
- Backlog abierto, sin tocar esta sesión: monitoreo en vivo enriquecido, backup con un clic, y decidir si/cómo migrar bancos anteriores a la 016 (ver roadmap).
