---
name: banco-preguntas-icfes
description: Empaqueta un conjunto de preguntas en un ZIP válido para importarlo a OpenTest como banco. Usa cuando el usuario pida "armar un banco", "empaquetar preguntas", "crear un ZIP de preguntas", "generar paquete para OpenTest", o mencione explícitamente el estándar externo preguntas-icfes. Produce un archivo .zip con `paquete.json` y la carpeta `imagenes/`, listo para arrastrar al panel del docente.
---

# Banco de preguntas en formato preguntas-icfes

Esta skill produce un banco de preguntas listo para que OpenTest lo importe por la pantalla **Bancos → Cargar paquete**. El único formato que acepta OpenTest desde la feature 016 es el del estándar externo `preguntas-icfes` v1.0.0.

## Antes de empezar

1. Lee `spec/contracts/paquete-preguntas-icfes.md`. Es el contrato con el mundo exterior: cambiarlo rompe a los docentes. No inventes campos.
2. Si necesitas los detalles del estándar, abre `server/importers/estandar-preguntas-icfes.js` (validador vendorizado) o el repo upstream `github.com/riskbreaker2077/preguntas-icfes`.
3. Si te dan un banco en el formato viejo (CSV/JSON plano de la 003–015, o un ZIP con `banco.json` de la 015), **no lo conviertas a mano**: pide una reimportación desde el archivo original o un reexport desde la fuente. Esta skill solo empaqueta bancos que ya están en `preguntas-icfes`.

## Estructura que debe producir

```
<nombre>.zip
├── paquete.json
└── imagenes/                ← solo si hay bloques de tipo "imagen"
    ├── foo.png
    └── bar.webp
```

## Envelope de `paquete.json`

```json
{
  "estandar": "preguntas-icfes",
  "version_estandar": "1.0.0",
  "nombre": "<nombre legible del banco>",
  "preguntas": [ /* ver estructura de pregunta abajo */ ]
}
```

Esos cuatro campos de envelope son obligatorios. `paquete.json` debe ser el único archivo JSON en la raíz y debe llamarse así, no `banco.json` (eso era de la 015 y ya no se acepta).

## Estructura de cada pregunta

Cada elemento de `preguntas` debe tener **exactamente** estos campos:

| Campo | Tipo | Reglas |
|---|---|---|
| `id` | string | Único dentro del paquete |
| `competencia`, `componente`, `afirmacion`, `evidencia`, `estandar_asociado`, `que_evalua` | string | Los seis obligatorios y no vacíos |
| `contexto` | array de bloques | `[]` si no hay. Opcional |
| `enunciado` | array de bloques | Obligatorio. Array vacío NO vale |
| `opciones` | array de 4 objetos | Exactamente 4, una sola con `es_correcta: true` |

### Bloques

Tres tipos; todos se serializan igual:

```json
{ "tipo": "texto",  "texto": "..." }
{ "tipo": "imagen", "archivo": "foo.png" }
{ "tipo": "tabla",  "tabla": { "encabezados": [...], "filas": [...] } }
```

Un bloque de imagen referencia solo el nombre del archivo dentro de `imagenes/`, **sin** ruta ni `./`. Si está en `contexto` o `enunciado`, vale; si está en el `contenido` de una opción, también.

### Opciones

Cada opción:

```json
{
  "id": "A",                              // "A" | "B" | "C" | "D"
  "contenido": [ /* array de bloques */ ],
  "es_correcta": false,                    // exactamente una en true
  "justificacion": "Por qué esta opción..." // no vacía, incluso si es incorrecta
}
```

**Invariantes que el validador va a comprobar y que harán fallar la importación entera si no se cumplen:**

1. Exactamente 4 opciones.
2. Exactamente 1 con `es_correcta: true`.
3. Las 4 opciones traen `justificacion` no vacía (la incorrecta también).
4. Los 6 campos de metadata pedagógica están y no están vacíos.
5. `enunciado` no es array vacío.
6. `id` único dentro del banco.

Si tienes menos preguntas que las que sorteará una sesión de 20, está bien, pero avisa: el docente verá un mensaje al importar.

## Cómo armar el ZIP

Usa `zip` de línea de comando. Sin dependencias nuevas, sin compresión rara.

```bash
# Estructura mínima (sin imágenes):
zip -j paquete.zip paquete.json

# Con imágenes en imagenes/:
zip -r paquete.zip paquete.json imagenes/

# Verificar antes de entregar:
unzip -l paquete.zip
```

Parámetros que sí importan y que el validador revisa:

- **Tamaño total:** ≤ 25 MB.
- **Cantidad de archivos:** ≤ 101.
- **Cada imagen descomprimida:** ≤ 3 MB.
- **Compresión:** solo `STORED` o `DEFLATE`. Nada de `BZIP2`, `LZMA` ni cifrado.
- **Rutas:** rechaza rutas absolutas, `..`, symlinks, hardlinks, nombres duplicados, carpetas fuera de `imagenes/`.
- **Imágenes referenciadas:** cada bloque `{ "tipo": "imagen", "archivo": "x.png" }` debe tener su archivo en `imagenes/` dentro del ZIP.
- **Imágenes extra:** las que estén en `imagenes/` pero nadie las引用 tampoco pasan — no molestan, simplemente se importan sin usar.

`zip` por defecto usa DEFLATE y rechaza symlinks al crearlos desde archivos normales. El flag `-j` (junk paths) hunde las carpetas en el primer nivel; **no lo uses si tienes `imagenes/`**, o perderás la estructura. Solo `-j` cuando no haya imágenes.

## Plantilla mínima de `paquete.json`

Si necesitas partir de cero, este es un banco de una sola pregunta que pasa el validador:

```json
{
  "estandar": "preguntas-icfes",
  "version_estandar": "1.0.0",
  "nombre": "Banco de ejemplo",
  "preguntas": [
    {
      "id": "p-01",
      "competencia": "Competencia X",
      "componente": "Componente X",
      "afirmacion": "Afirmación X",
      "evidencia": "Evidencia X",
      "estandar_asociado": "Estándar X",
      "que_evalua": "Qué evalúa X",
      "contexto": [],
      "enunciado": [
        { "tipo": "texto", "texto": "¿Cuál es la respuesta correcta?" }
      ],
      "opciones": [
        {
          "id": "A",
          "contenido": [{ "tipo": "texto", "texto": "Opción A" }],
          "es_correcta": true,
          "justificacion": "Correcta: porque sí."
        },
        {
          "id": "B",
          "contenido": [{ "tipo": "texto", "texto": "Opción B" }],
          "es_correcta": false,
          "justificacion": "Incorrecta: porque no."
        },
        {
          "id": "C",
          "contenido": [{ "tipo": "texto", "texto": "Opción C" }],
          "es_correcta": false,
          "justificacion": "Incorrecta: porque tampoco."
        },
        {
          "id": "D",
          "contenido": [{ "tipo": "texto", "texto": "Opción D" }],
          "es_correcta": false,
          "justificacion": "Incorrecta: porque menos."
        }
      ]
    }
  ]
}
```

## Lista de verificación antes de entregar

- [ ] `unzip -l paquete.zip` muestra `paquete.json` en la raíz y, si hay imágenes, una carpeta `imagenes/` al mismo nivel (no dentro de otra carpeta).
- [ ] `paquete.json` parsea como JSON válido y trae los 4 campos de envelope.
- [ ] Cada pregunta tiene los 6 campos de metadata no vacíos.
- [ ] Cada pregunta tiene exactamente 4 opciones, una sola marcada como correcta, las cuatro con `justificacion` no vacía.
- [ ] Todo bloque `{ "tipo": "imagen", "archivo": "x.ext" }` tiene su archivo en `imagenes/` dentro del ZIP.
- [ ] Tamaño total ≤ 25 MB, ≤ 101 archivos, cada imagen ≤ 3 MB.
- [ ] El docente va a **arrastrar el `.zip`** a la pantalla de Bancos del panel, no va a descomprimirlo.

## Lo que NO hace esta skill

- Convertir bancos viejos (CSV/JSON plano) al formato nuevo. Está en el backlog del roadmap.
- Validar interactivamente contra el servidor (no estamos corriendo OpenTest). Si quieres esa garantía, importa el ZIP en una instancia local con `npm start` y revisa lo que diga la pantalla.
- Subir el ZIP a ningún lado: OpenTest es local y sin red.
