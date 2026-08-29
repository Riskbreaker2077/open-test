# Guía docente de OpenTest

OpenTest funciona dentro del colegio: el portátil del docente hace de servidor y las tablets se conectan por la misma red wifi. Durante la evaluación no necesita internet.

## 1. Preparar OpenTest

1. Copie la carpeta `OpenTest-Windows` completa al portátil. No separe `OpenTest.exe` de las carpetas que lo acompañan.
2. Haga doble clic en `OpenTest.exe`.
3. La primera vez, Windows puede mostrar SmartScreen. Pulse **Más información** y luego **Ejecutar de todas formas**.
4. El navegador se abrirá en el panel. Cree una contraseña que pueda recordar y guárdela en un lugar seguro.
5. Si Windows pregunta por el cortafuegos, permita el acceso en **redes privadas**.

La carpeta `data` queda junto al ejecutable. Allí están la base de datos y las imágenes. Para hacer una copia de seguridad, cierre OpenTest y copie la carpeta `data` completa a una memoria USB.

## 2. Preparar los archivos

En la carpeta `ejemplos` hay archivos que puede abrir, copiar y adaptar:

- `estudiantes-ejemplo.csv`
- `banco-ejemplo.json`
- `participacion-ciudadana-20-preguntas.zip` — banco completo con cinco imágenes.

Plantilla mínima de estudiantes:

```csv
codigo,nombres,apellidos,curso
10001,Ana,Martínez,10A
10002,Luis,Rodríguez,10A
```

La primera fila contiene los nombres obligatorios de las columnas. No los cambie.
Guarde el archivo como **CSV UTF-8**.

Las preguntas se cargan siempre en un ZIP con `paquete.json` en la raíz y las
imágenes dentro de `imagenes/`. En **Bancos de preguntas**, use **Sube
preguntas e imágenes en un ZIP**, revise la vista previa y confirme. Cada
pregunta de `paquete.json` necesita, además del enunciado y las cuatro
opciones:

- **Competencia, componente, afirmación, evidencia y estándar asociado** — de
  dónde sale la pregunta en su tabla de especificaciones.
- **Qué evalúa** — una frase que explica qué mide esa pregunta en concreto.
- Una **justificación por cada una de las cuatro opciones**, no solo de la
  correcta: por qué esa opción es correcta o, si no lo es, cuál es el error
  específico de esa opción.
- El contexto, el enunciado y cada opción pueden combinar texto, una imagen
  (solo el nombre del archivo, por ejemplo `cabildo-abierto.png`) o una tabla.

Plantilla mínima:

```json
{
  "estandar": "preguntas-icfes",
  "version_estandar": "1.0.0",
  "nombre": "Ciencias · Periodo 2",
  "preguntas": [
    {
      "id": "p-01",
      "competencia": "…", "componente": "…", "afirmacion": "…",
      "evidencia": "…", "estandar_asociado": "…", "que_evalua": "…",
      "contexto": [],
      "enunciado": [{ "tipo": "texto", "texto": "¿Cuánto es 2 + 2?" }],
      "opciones": [
        { "id": "A", "contenido": [{ "tipo": "texto", "texto": "3" }], "es_correcta": false, "justificacion": "Incorrecta: falta una unidad." },
        { "id": "B", "contenido": [{ "tipo": "texto", "texto": "4" }], "es_correcta": true, "justificacion": "Correcta: 2 + 2 = 4." },
        { "id": "C", "contenido": [{ "tipo": "texto", "texto": "5" }], "es_correcta": false, "justificacion": "Incorrecta: sobra una unidad." },
        { "id": "D", "contenido": [{ "tipo": "texto", "texto": "6" }], "es_correcta": false, "justificacion": "Incorrecta: es el doble de la respuesta." }
      ]
    }
  ]
}
```

Este formato sigue el estándar abierto `preguntas-icfes`
(github.com/riskbreaker2077/preguntas-icfes), pensado para preguntas tipo
ICFES y compartido con otras plataformas.

## 3. Preparar una evaluación

1. Entre a **Estudiantes**, seleccione el archivo y revise la vista previa antes de confirmar.
2. Entre a **Bancos de preguntas**, cargue el banco y revise las preguntas de muestra.
3. Entre a **Evaluaciones** y pulse **Crear evaluación** después de elegir banco, cursos, cantidad de preguntas, duración y retroalimentación.
4. Mientras esté en borrador puede corregir la configuración. Pulse **Abrir** solo cuando esté lista.

## 4. Iniciar y proyectar

1. En **Evaluaciones**, abra **Proyectar**. Esa pantalla contiene el código QR, la dirección estable del portal y el reloj del aula.
2. Proyecte esa pestaña. Las tablets pueden escanear el QR o escribir exactamente la dirección mostrada.
3. Cada estudiante escribe su código y espera viendo su nombre.
4. Cuando todos estén listos, pulse **Comenzar** en la proyección. También puede pausar y reanudar desde allí.

## 5. Durante la evaluación

Abra **Monitorear evaluación** en otra pestaña. La tabla se actualiza sola y muestra quién no ha entrado, quién presenta, su avance y quién entregó.

Si una tablet se bloqueó o un estudiante se retiró, use **Forzar entrega** junto a su nombre y confirme. Para terminar el examen de todo el grupo, pulse **Cerrar evaluación**; el aviso indica cuántos siguen presentando antes de confirmar.

## 6. Descargar resultados

Después de cerrar, entre a **Descargar resultados**. Puede elegir todos los cursos o uno solo:

- **Detalle CSV:** una fila por pregunta; úselo para retroalimentación.
- **Resumen CSV:** una fila por estudiante; úselo para pasar notas.
- **JSON:** conserva toda la prueba y el orden exacto de las opciones para auditoría.
- **Excel (.xlsx):** un solo archivo con las dos tablas anteriores (resumen y detalle) ya maquetado, cabecera fija y columnas ajustadas — ábralo directamente, sin dar formato a mano.

Excel puede convertir códigos como `00123` en `123`. Al importar el CSV, marque la columna `codigo` como **Texto**.

## 7. Ver qué falló más el grupo

En **Estadísticas**, elija el banco de preguntas y luego una evaluación cerrada concreta o **todas las sesiones cerradas** que hayan usado ese banco, para acumular varios grupos o periodos. Dos tablas, de lo más fallado a lo menos fallado: por pregunta y por competencia. Sirve para decidir qué repasar en clase o qué pregunta del banco conviene revisar.

## Problemas frecuentes

### Las tablets no abren la dirección

- Confirme que portátil y tablets están en la misma red wifi.
- Permita OpenTest en el cortafuegos de Windows para redes privadas.
- Algunas redes activan **aislamiento de clientes**, una opción del router que impide que dos equipos se vean. Pida al responsable de la red que la desactive para esa wifi.
- Si desarrolla desde WSL2, su red interna puede ser invisible al wifi. Configure `networkingMode=mirrored` en `.wslconfig` o un `netsh portproxy`. Esto no afecta al ejecutable normal de Windows.

### El puerto habitual está ocupado

OpenTest prueba automáticamente el siguiente puerto y muestra la dirección correcta. Use siempre la que aparece en pantalla ese día.

### Las tildes aparecen dañadas

Vuelva a guardar el archivo de importación como **CSV UTF-8**. Los archivos exportados por OpenTest ya incluyen la marca que necesita Excel en Windows.

### Se perdieron ceros al inicio del código

Excel lo trató como número. Configure la columna como **Texto** antes de guardar o importar.

### Olvidé la contraseña

La contraseña no se puede leer ni recuperar. No borre la carpeta `data`: contiene todos los resultados. Restaure una copia de seguridad anterior cuya contraseña recuerde o solicite ayuda técnica para conservar los datos.

### SmartScreen o el antivirus bloquean OpenTest

En SmartScreen pulse **Más información → Ejecutar de todas formas**. Si el antivirus institucional lo bloquea, pida al responsable del equipo que autorice `OpenTest.exe`; no desactive permanentemente la protección.

## Prueba de humo antes del día del examen

Reserve diez minutos y use los dos archivos de `ejemplos`:

1. Con OpenTest cerrado, encienda el portátil y abra `OpenTest.exe`.
2. Importe los estudiantes y el banco de ejemplo.
3. Cree una evaluación de 20 preguntas para 10A y ábrala.
4. Desde una tablet en la misma wifi, escanee el QR, escriba `2024001` y compruebe el nombre.
5. Pulse **Comenzar**, responda una pregunta y confirme en **Monitorear** que el estudiante aparece presentando.
6. Fuerce la entrega o cierre la sesión y descargue el resumen CSV.

Objetivo: completar del paso 1 al primer estudiante respondiendo en menos de 10 minutos. Repita esta prueba antes de cada entrega del equipo y después de cualquier cambio importante.

## Cerrar OpenTest

Cierre la ventana de OpenTest. El servidor deja de aceptar conexiones y cierra la base de datos limpiamente. Espere a que la ventana desaparezca antes de copiar la carpeta `data`.
