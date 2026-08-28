# Contrato · Paquete de preguntas (estándar preguntas-icfes v1)

Formato del único archivo con el que el docente carga un banco de preguntas
(típicamente 20–50) del que después se sortean las que le tocan a cada
estudiante. **Sustituye** a `import-banco-preguntas.md` (CSV/JSON plano) e
`import-paquete-preguntas-v1.md` (ZIP con `banco.json`), que quedan marcados
como obsoletos y solo se conservan como referencia histórica.

Consumido por la feature
[016 · Estándar preguntas-icfes](../features/016-estandar-preguntas-icfes/spec.md).

## Por qué cambia

OpenTest adopta el estándar externo y abierto **preguntas-icfes v1.0.0**
(https://github.com/riskbreaker2077/preguntas-icfes), pensado para preguntas
tipo ICFES y compartido con otras plataformas (por ejemplo, portal-estudiantes).
La definición completa de campos e invariantes vive en ese repo
(`docs/especificacion.md`); este documento explica cómo OpenTest en particular
lo empaqueta y lo valida.

## Estructura del ZIP

```text
paquete.zip
├── paquete.json
└── imagenes/
    ├── imagen-1.png
    └── imagen-2.webp
```

- `paquete.json` es obligatorio y sigue exactamente el envelope del estándar:
  `{ "estandar": "preguntas-icfes", "version_estandar": "1.0.0", "nombre": "…", "preguntas": [...] }`.
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
  cualquier pregunta o imagen impide importar el banco entero.

## Invariantes de contenido (del estándar, validadas por OpenTest)

1. Exactamente 4 opciones por pregunta, exactamente 1 correcta.
2. Cada una de las 4 opciones trae su propia `justificacion`, no vacía,
   incluidas las incorrectas.
3. `competencia`, `componente`, `afirmacion`, `evidencia`,
   `estandar_asociado` y `que_evalua` son obligatorios y no vacíos.
4. `contexto`, `enunciado` y el `contenido` de cada opción son arrays de
   bloques (`texto`, `imagen` o `tabla`), combinables entre sí.
5. Un banco con menos preguntas que las que sorteará una sesión de 20 se
   importa igual, pero se avisa.
6. `id` de pregunta único dentro del paquete.

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

## Errores que el docente debe ver

Los produce el validador del estándar (vendorizado en
`server/importers/estandar-preguntas-icfes.js`), en español y accionables,
por ejemplo:

- `Pregunta p-07: falta "competencia" o está vacío.`
- `Pregunta p-07, opción B: falta "justificacion" (obligatoria incluso si es incorrecta).`
- `Pregunta p-07: tiene 2 opciones marcadas como correctas; debe tener exactamente 1.`
- `La imagen "grafico.png" está referenciada pero no existe en imagenes/ dentro del paquete.`
- `El banco tiene 14 preguntas. Una sesión de 20 preguntas necesita al menos 20.`
