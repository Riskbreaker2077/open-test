# Roadmap

_Orden y estado de las features. Cada entrada apunta a su carpeta en `../features/`._

## Hecho ✅

1. **001 · [Servidor local](../features/001-servidor-local/spec.md)** — arranca el servidor, crea la base de datos y muestra al docente la URL que dictan las tablets.
2. **011 · [Autenticación del docente](../features/011-autenticacion-docente/spec.md)** — contraseña al primer arranque; todo `/api/docente/*`, `/docente/` y `/proyeccion/` cerrados a las tablets.
3. **002 · [Importar estudiantes](../features/002-importar-estudiantes/spec.md)** — carga de la lista desde CSV o JSON, con previsualización y todo-o-nada.
4. **003 · [Banco de preguntas](../features/003-banco-de-preguntas/spec.md)** — carga de paquetes de preguntas con imágenes, invariantes validadas y vista previa.
5. **004 · [Sesiones y login](../features/004-sesiones-y-login/spec.md)** — convocar evaluaciones, abrirlas y cerrarlas; el estudiante entra con su código.
6. **005 · [Motor de personalización](../features/005-motor-personalizacion/spec.md)** — sorteo determinista de preguntas y barajado de opciones, materializado una sola vez por intento.
7. **013 · [Portal del estudiante](../features/013-portal-estudiante/spec.md)** — dirección estable en la raíz, identificación por código, selección de evaluación y espera hasta el inicio; conserva las verificaciones de integración que dependen de 012, 006 y 007.
8. **012 · [Pantalla de proyección](../features/012-pantalla-proyeccion/spec.md)** — QR, dirección, reloj global y controles del aula; conserva dos verificaciones físicas para la sesión final.
9. **006 · [Presentación del examen](../features/006-presentacion-examen/spec.md)** — una pregunta a la vez, guardado inmediato, reloj, pausa, tiempo mínimo y reanudación; conserva dos pruebas manuales para el equipo destino.
10. **007 · [Calificación y retroalimentación](../features/007-calificacion-feedback/spec.md)** — calificación persistente al entregar y resultado filtrado según el nivel configurado; conserva una prueba manual para el equipo destino.
11. **008 · [Panel del docente](../features/008-panel-docente/spec.md)** — monitoreo automático de convocados, avance, resultados, entrega forzada y cierre calificado.
12. **009 · [Exportación de resultados](../features/009-exportacion-resultados/spec.md)** — descargas CSV/JSON v1 por sesión y curso; conserva la apertura manual en Excel/Windows para la sesión final.
13. **010 · [Empaquetado y guía docente](../features/010-empaquetado-y-guia/spec.md)** — rutas SEA, empaquetador Windows, apertura automática, ejemplos y guía; el binario y la prueba de humo se validan en el equipo destino.
14. **014 · [Línea gráfica institucional](../features/014-linea-grafica-institucional/spec.md)** — sistema visual de `portal-estudiantes` adaptado a portal, panel, examen, resultado y proyección de OpenTest, completamente local y adaptable.
15. **015 · [Paquete de preguntas ZIP](../features/015-paquete-preguntas-zip/spec.md)** — carga unificada y segura de `banco.json` e imágenes, con paquete manual de participación ciudadana listo para usar.
16. **016 · [Estándar preguntas-icfes](../features/016-estandar-preguntas-icfes/spec.md)** — el banco de preguntas adopta el estándar externo `preguntas-icfes`: metadata pedagógica por pregunta, contenido en bloques (texto/imagen/tabla) y justificación por cada opción; importación unificada en un único ZIP con `paquete.json`; exportación de resultados sube a `formato_version: 2`.
17. **017 · [Sorteo balanceado por competencia](../features/017-sorteo-balanceado-competencia/spec.md)** — el motor de personalización reparte las preguntas de cada prueba entre las competencias del banco en proporción a su tamaño, en vez de sortear uniformemente sobre todo el banco; un banco sin metadata de competencia se comporta como antes.
18. **018 · [Exportación a Excel con diseño](../features/018-exportacion-excel/spec.md)** — cuarta descarga en el panel de resultados: un `.xlsx` con dos hojas (Resumen, Detalle), cabecera en negrita/congelada y columnas con ancho ajustado; escritor de ZIP y de SpreadsheetML propios, sin dependencias nuevas.

> **Revisión de arquitectura (24/08/2026).** El producto pasa a tener tres superficies separadas —portal del estudiante, pantalla de proyección y panel del docente con contraseña—, pueden coexistir varias sesiones abiertas y el temporizador pasa a ser un reloj global de sesión. Eso añade las features 011, 012 y 013, y revisa las specs de 001, 004, 006, 008 y 010. El orden de abajo es el de ejecución; los números son identidad, no secuencia.

## Siguiente 🔜

Sesión final de validación en Windows/equipo destino, usando el set de participación ciudadana ya preparado.

## Pendientes 📋


## Backlog / ideas 💡

- **Preguntas adicionales por rapidez** — el requisito original planteaba penalizar al que responde demasiado rápido añadiéndole preguntas extra. Se optó por el tiempo mínimo por pregunta como mecanismo activo; el campo `sesiones.preguntas_extra_por_rapidez` ya está previsto en el modelo con valor por defecto `0`. Activarlo requiere resolver antes qué pasa con el temporizador global y con la comparabilidad del puntaje entre estudiantes con distinto número de preguntas.
- **Monitoreo en vivo enriquecido** — ritmo por estudiante, alertas de inactividad, distribución de avance.
- **Estadísticas por pregunta y por competencia** — qué preguntas o competencias falla más el grupo, para revisar el banco.
- **Copia de seguridad con un clic** — exportar `opentest.db` a una memoria USB desde el panel.
- **Migrar bancos anteriores a la 016** — herramienta o guía para que el docente reimporte con la metadata pedagógica y la justificación por opción que un banco viejo no tiene (no es automatizable: hay que redactarlas).

---

## Trazabilidad de requisitos

_Cada requisito del encargo inicial y dónde queda cubierto._

| Requisito original | Feature |
|---|---|
| Servidor local + tablets por intranet, conexión sencilla | 001, 010 |
| Corre en un navegador, sin internet en la evaluación | 001, 006, y límites duros de `tech-stack.md` |
| El docente carga la lista de estudiantes (código + nombres + apellidos + curso), una sola vez | 002 |
| El docente carga las evaluaciones en JSON o CSV | 003 |
| Cada pregunta: contexto + imagen opcional + enunciado + 4 opciones | 003 |
| Paquetes de 40–50 preguntas | 003, 004 |
| El estudiante se loguea con su código | 004 |
| Se eligen 20 preguntas al azar del paquete | 005 |
| Se mezclan las opciones de respuesta | 005 |
| Las preguntas se cargan una a una | 006 |
| El estudiante puede responder o saltar | 006 |
| Temporizador | 006 |
| Penalización por responder demasiado rápido | 006 (tiempo mínimo por pregunta); preguntas extra en backlog |
| El estudiante puede terminar la prueba en cualquier momento | 006 |
| El resultado se le entrega al estudiante al final, con retroalimentación | 007 |
| El docente descarga puntaje, preguntas presentadas y respuestas de cada estudiante | 009 |
| El export sigue un formato determinado para integrarse con otra plataforma | 009 + `../contracts/export-resultados-v1.md` |
| Descarga por grupo/curso | 009 |
| Simple de usar y configurar para docentes | 010, y el principio "Simple para el docente" de `mission.md` |
| Todo en local, sin integraciones externas | Límites duros de `tech-stack.md` |
| Los estudiantes no pueden entrar ni ver la sesión del docente | 011, 013 |
| Dirección estable para estudiantes, igual en todas las evaluaciones | 013 |
| Los estudiantes ven las evaluaciones disponibles | 013 |
| Inicio de sesión mínimo para el docente | 011 |
| QR para que las tablets entren escaneando | 012 |
| Pantalla proyectada con el QR y el tiempo de la prueba | 012 |
| Dos interfaces: la proyectada al aula y la de cada estudiante | 012, 013 |
