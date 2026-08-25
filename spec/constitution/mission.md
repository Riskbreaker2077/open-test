# Misión

## Qué construimos

**OpenTest** es una aplicación web de evaluación para el aula que corre en un servidor local: el docente la arranca en su portátil, las tablets de los estudiantes se conectan por la intranet del colegio y cada estudiante presenta una prueba **distinta de la de su compañero** —preguntas sorteadas al azar de un banco común y opciones de respuesta barajadas—. Resuelve un problema concreto y medible: que los estudiantes se copien mirando la pantalla de al lado.

La aplicación tiene **tres superficies separadas**, y esa separación es parte del diseño, no un detalle de implementación:

1. **Portal del estudiante** — vive en la raíz del servidor, en una dirección **estable que no cambia de una evaluación a otra**. El estudiante entra ahí, ve las evaluaciones abiertas para su curso, se identifica con su código y presenta.
2. **Pantalla de proyección** — lo que el docente pone en el proyector y ve toda la clase: el código QR para entrar, la dirección en letra grande, el nombre de la prueba, el reloj y cuántos han entrado y entregado. Nada de nombres, notas ni preguntas.
3. **Panel del docente** — protegido con contraseña. Importar estudiantes y bancos, configurar y abrir sesiones, monitorear con nombres y descargar resultados.

Por debajo de las tres, el **motor de personalización**: a partir de una semilla por estudiante decide qué preguntas le tocan y en qué orden van sus opciones, de forma determinista y auditable.

## Para quién

- **Estudiantes** — presentan desde una tablet. No tienen cuenta ni contraseña: escanean el QR proyectado o escriben la dirección, y entran con el código que ya usan en la institución. Nunca han visto la aplicación antes y no reciben capacitación.
- **Docentes** — preparan y aplican la evaluación. Son el usuario que decide si esto se usa o se abandona: si necesitan abrir una terminal para su trabajo diario, la aplicación ha fracasado.
- **Coordinación académica** — no usa la aplicación, pero consume el archivo de resultados en otra plataforma para hacer retroalimentación.

## Principios

- **Integridad por diseño** — dos estudiantes de la misma sesión no ven la misma prueba en el mismo orden. No se combate la copia vigilando: se combate haciendo que copiar no dé información útil.
- **Cada quien ve solo lo suyo** — el estudiante no alcanza el panel del docente ni sabe que existe; la pantalla proyectada no muestra nada que no pueda ver toda la clase. La separación de las tres superficies es una regla, no una convención.
- **El aula no tiene internet** — todo funciona sin conexión externa, sin excepciones y sin degradarse. Cualquier dependencia de red en tiempo de examen es un fallo, no una molestia.
- **Simple para el docente** — instalar, importar dos archivos, proyectar el QR. Cada opción de configuración que se añade tiene que ganarse su sitio.
- **Los datos son del docente** — todo vive en un archivo SQLite que puede copiar a una memoria USB, y sale en CSV y JSON abiertos. Sin lock-in.
- **Robusto ante el caos del aula** — una tablet que se apaga, se queda sin batería, pierde el wifi o se recarga por accidente retoma el examen exactamente donde iba, con las mismas preguntas y sin perder respuestas.

## Qué NO es

- **No es un LMS.** No gestiona cursos, materiales, tareas ni calendarios. Aplica exámenes de opción múltiple y punto.
- **No es un servicio en la nube.** No hay multi-institución, ni sincronización, ni servidor remoto.
- **No es una app nativa.** Se usa desde el navegador de la tablet; no se instala nada en las tablets.
- **No es multiusuario.** Hay una contraseña de docente para el equipo, no cuentas por profesor. Si el portátil lo comparten varios, comparten la contraseña.
- **No hace proctoring.** No vigila por cámara, no bloquea la tablet, no detecta ventanas. La integridad viene de la personalización de la prueba.
- **No corrige preguntas abiertas.** Solo opción múltiple de cuatro opciones con una única respuesta correcta.
