# Contrato · Paquete de preguntas (estándar preguntas-icfes)

Formato del único archivo con el que el docente carga un banco de preguntas
(típicamente 20–50) del que después se sortean las que le tocan a cada
estudiante. **Sustituye** a `import-banco-preguntas.md` (CSV/JSON plano) e
`import-paquete-preguntas-v1.md` (ZIP con `banco.json`), que quedan marcados
como obsoletos y solo se conservan como referencia histórica.

Consumido por la feature
[016 · Estándar preguntas-icfes](../features/016-estandar-preguntas-icfes/spec.md)
y ampliado por la
[026 · Grupos de preguntas y campos informativos](../features/026-grupos-de-preguntas/spec.md).

OpenTest acepta paquetes con `version_estandar` desde `1.0.0` hasta `1.4.0`.
Las preguntas con campos propios de v1.1.0 (procedencia, fuentes, etc.) o
v1.2.0+ (grupos, `nivel_mcer`, `valor`, `version_estandar` por pregunta) se
importan y se guardan; un banco con sólo los campos de v1.0.0 sigue
importando exactamente igual que antes.

## Por qué cambia

OpenTest adopta el estándar externo y abierto **preguntas-icfes**
(https://github.com/riskbreaker2077/preguntas-icfes), pensado para preguntas
tipo ICFES y compartido con otras plataformas (por ejemplo, portal-estudiantes).
La definición completa de campos e invariantes vive en ese repo
(`docs/especificacion.md`); este documento explica cómo OpenTest en particular
lo empaqueta y lo valida. El validador de referencia está vendorizado en
`server/importers/estandar-preguntas-icfes.js` y se reemplaza entero cuando
el estándar sube de versión.

## Estructura del ZIP

```text
paquete.zip
├── paquete.json
└── imagenes/
    ├── imagen-1.png
    └── imagen-2.webp
```

- `paquete.json` es obligatorio y sigue exactamente el envelope del estándar:
  `{ "estandar": "preguntas-icfes", "version_estandar": "<X.Y.Z>", "nombre": "…", "preguntas": [...], "grupos": [...] }`.
  `grupos` es opcional (ausente en paquetes v1.0.0).
- Cada bloque `{ "tipo": "imagen", "archivo": "…" }` (en `contexto`, `enunciado`
  o el `contenido` de una opción) referencia solo el nombre del archivo, sin
  carpeta.
- `imagenes/` es opcional si ningún bloque de tipo `imagen` se usa.
- Extensiones admitidas: `.png`, `.jpg`, `.jpeg` y `.webp`.

## Reglas de empaquetado (heredadas de la 015, sin cambios)

- El ZIP completo pesa como máximo 25 MB, contiene como máximo 101 archivos y
  cada imagen descomprimida pesa como máximo 3 MB.
- Solo se admiten entradas sin cifrar, almacenadas o comprimidas con DEFLATE.
- Se rechazan rutas absolutas, `..`, enlaces, nombres duplicados y carpetas
  fuera de `imagenes/`.
- Cada imagen referenciada debe existir dentro del paquete o estar ya
  disponible en OpenTest (subida suelta previa). Las imágenes extra del
  paquete también se importan.
- Primero se valida el paquete entero y después se confirma. Un error en
  cualquier pregunta o grupo impide importar el banco entero.

## Tipos de pregunta admitidos (v1.2.0+, ampliado en la 026)

Todas las preguntas siguen teniendo los seis campos de metadata pedagógica
(`competencia`, `componente`, `afirmacion`, `evidencia`, `estandar_asociado`,
`que_evalua`), propios o heredados del grupo al que pertenezcan. Además:

### Preguntas *standalone* (las mismas de v1.0.0)

- Sin `grupo_id`. Son las preguntas clásicas: `enunciado`, 4 opciones (al
  menos 2 desde v1.2.0; los paquetes con 4 siguen siendo válidos), una
  correcta con su `justificacion`. Se almacenan y se rinden igual que antes.

### Grupo `contexto_compartido` (lectura + N preguntas)

- `paquete.grupos[i].tipo = "contexto_compartido"`,
  `paquete.grupos[i].contexto` es la lectura o tabla compartida, y las
  preguntas miembro llevan `grupo_id` apuntando al grupo, con su propio
  `enunciado` y sus propias opciones (sin `tipo_item`).
- En la tablet el contexto se pinta una sola vez encima de la pregunta
  miembro; cada miembro ocupa un `orden` propio en la prueba materializada
  y la navegación sigue siendo una pregunta por pantalla.

### Grupo `banco_opciones` (emparejamiento / matching)

- `paquete.grupos[i].tipo = "banco_opciones"`, `paquete.grupos[i].banco` es
  la lista de entradas (`{id, contenido, es_ejemplo?}`) que el estudiante ve
  y consume; `es_ejemplo: true` marca la entrada resuelta que **no** puede
  ser respuesta de una pregunta real.
- Las preguntas miembro llevan `grupo_id`, `tipo_item:
  "miembro_banco_opciones"`, no tienen `opciones` propias, sino
  `respuesta_pool_id` (el `id` del banco que es la respuesta correcta) y su
  propia `justificacion`.
- En la tablet el banco y las descripciones se pintan en una sola pantalla;
  al avanzar se guardan todas las respuestas del grupo a la vez.

### Grupo `texto_con_blancos` (cloze)

- `paquete.grupos[i].tipo = "texto_con_blancos"`, `paquete.grupos[i].contexto`
  es el pasaje compartido con los espacios marcados (la convención
  tipográfica de marcado queda en manos del empaquetador).
- Las preguntas miembro llevan `grupo_id`, `tipo_item:
  "miembro_texto_con_blancos"`, no tienen `enunciado` propio (lo es el
  pasaje del grupo), tienen `numero_blanco` (ordinal del espacio dentro del
  grupo, único por grupo) y sus propias opciones con la misma forma de
  siempre.
- En la tablet el pasaje se pinta arriba con los huecos numerados, y debajo
  las opciones por hueco; al avanzar se guardan todas las respuestas a la vez.

## Campos opcionales adicionales (v1.1.0+, adoptados en la 026)

Estos campos se guardan al importar pero el panel del docente aún no los
muestra (queda como feature futura mostrarlos o filtrar por ellos). La
exportación de resultados sí los incluye (ver
[`export-resultados-v3.md`](export-resultados-v3.md)).

### Por pregunta

- `grado` — `"3"` a `"11"`.
- `prueba` — `"saber11"`, `"evaluar_para_avanzar"` (catálogo cerrado del
  estándar; nuevas entradas sólo cuando el estándar las publique).
- `procedencia` — `{ contenido, clasificacion, respuesta_correcta }` con
  valor en `"oficial"`, `"extraido_oficial"` o `"ia_generada"`. Ausencia =
  origen no declarado (no es un error de validación).
- `verificado` — mismo esquema de tres llaves, con booleanos. Ortogonal a
  `procedencia`.
- `fuentes` — `{ contenido, clasificacion, respuesta_correcta }` con el
  nombre del PDF (sin ruta) del que se extrajo cada bloque. Validado
  contra `fuentes/` dentro del ZIP si esa carpeta está presente.
- `nivel_mcer` — `"Pre A1"`, `"A1"`, `"A2"`, `"B1"`, `"B2"`, `"C1"`, `"C2"`.
  Catálogo cerrado.
- `valor` — número mayor que 0. Ausente = 1. Es el peso de la pregunta en
  la calificación (un emparejamiento de 5 miembros vale 5 puntos sin más
  configuración).
- `version_estandar` — opcional, SemVer. Si está presente, no puede ser
  menor que la versión mínima que exigen los campos que esa pregunta usa
  (mismo cómputo que `calcularVersionMinima` del validador).

### Por opción

- `procedencia_justificacion` — enum de tres valores (igual que
  `procedencia.contenido`).
- `justificacion_verificada` — booleano nullable. `null` = no declarado.

## Numeración dinámica (`{{numero:<id>}}`, v1.4.0)

El estándar permite que un bloque de texto incluya el marcador
`{{numero:<id-de-pregunta>}}` para indicar "aquí va el número que ocupe la
pregunta `<id>` en el examen de este estudiante". OpenTest **no implementa la
sustitución** del marcador (queda como feature aparte). Lo que sí hace es
**excluir** cualquier pregunta o grupo cuyo contenido lo traiga: el
validador ya comprueba que el `id` referenciado exista, y OpenTest añade la
regla local de descartarlo antes de confirmar la importación, con un aviso
por exclusión visible para el docente. Sin esa exclusión, la tablet
mostraría el marcador literal al estudiante.

## Invariantes de contenido (del estándar, validadas por OpenTest)

1. Las preguntas con `opciones` (estándar o `miembro_texto_con_blancos`)
   tienen al menos 2 opciones, exactamente 1 marcada `es_correcta: true`.
   Las `miembro_banco_opciones` no tienen `opciones` propias: su
   `respuesta_pool_id` debe existir en el `banco` del grupo y no puede ser
   la entrada `es_ejemplo`.
2. Cada opción trae su `justificacion` no vacía, incluida si es incorrecta.
   Las `miembro_banco_opciones` traen una `justificacion` a nivel de
   pregunta en vez de por opción.
3. Los 6 campos de metadata pedagógica están presentes y no vacíos, ya sea
   en la pregunta o heredados de `grupo.metadata_pedagogica`.
4. `contexto`, `enunciado` y el `contenido` de cada opción son arrays de
   bloques (`texto`, `imagen` o `tabla`), combinables entre sí.
5. Un banco con menos preguntas que las que sorteará una sesión de 20 se
   importa igual, pero se avisa.
6. `id` de pregunta único dentro del paquete; `id` de grupo único.
7. `grupo_id` de una pregunta existe en `paquete.grupos`, y su `tipo_item`
   coincide con el `tipo` del grupo.
8. `numero_blanco` único dentro de cada grupo `texto_con_blancos`.
9. `nivel_mcer` pertenece al catálogo cerrado MCER si está presente.
10. `valor` es un número mayor que 0 si está presente.
11. `version_estandar` de la pregunta, si está presente, no es menor que la
    versión mínima que exigen los campos que esa pregunta usa.
12. Todo marcador `{{numero:<id>}}` referencia un `id` que existe en
    `paquete.preguntas`. (OpenTest añade: si existe, la pregunta o el
    grupo afectado se excluye del banco, no se sustituye.)

## Qué NO se admite desde la 016

- **CSV.** El único formato de entrada es el ZIP con `paquete.json`. Un banco
  con muy pocas preguntas (o sin imágenes) sigue empaquetándose igual, con
  `imagenes/` vacía u omitida.
- Un `banco.json` sin envolver en ZIP, o con el nombre antiguo `banco.json`
  en vez de `paquete.json`.

## Bancos cargados antes de esta feature

Un banco que ya estaba en `data/opentest.db` **no se migra retroactivamente**:
sus preguntas siguen viéndose (el panel envuelve su texto plano en un bloque
de texto), pero sus 6 campos de metadata pedagógica quedan vacíos y sus
opciones sin `justificacion`, porque esa información no existe en el archivo
original y no se puede inventar. Para tener el banco completo según el
estándar, el docente debe reexportar/redactar el paquete y reimportarlo — se
crea como un banco nuevo, igual que cualquier otra reimportación.

## Avisos que el docente debe ver (adiciones de la 026)

- `Pregunta p-07 excluida: su contenido trae el marcador "{{numero:...}}", que
  OpenTest no sustituye todavía. Vuelve a exportar el paquete sin ese
  marcador para incluirla.`
- `Grupo g-02 excluido: su banco o contexto trae el marcador "{{numero:...}}".`
- `El banco importado no incluye 3 pregunta(s) o grupo(s) excluidos por el
  motivo anterior.`

Estos avisos son accionables: enumeran qué pregunta/grupo se quedó fuera y
por qué, y el banco se importa con el resto sin pedirle nada más.

## Errores que el docente debe ver

Los produce el validador del estándar (vendorizado en
`server/importers/estandar-preguntas-icfes.js`), en español y accionables,
por ejemplo:

- `Pregunta p-07: falta "competencia" o está vacío.`
- `Pregunta p-07, opción B: falta "justificacion" (obligatoria incluso si es incorrecta).`
- `Pregunta p-07: tiene 2 opciones marcadas como correctas; debe tener exactamente 1.`
- `La imagen "grafico.png" está referenciada pero no existe en imagenes/ dentro del paquete.`
- `Grupo g-02: tipo "otro" no reconocido. Debe ser "contexto_compartido", "banco_opciones" o "texto_con_blancos".`
- `Pregunta p-12: "grupo_id" referencia "g-99", que no existe en paquete.grupos.`
- `El banco tiene 14 preguntas. Una sesión de 20 preguntas necesita al menos 20.`
