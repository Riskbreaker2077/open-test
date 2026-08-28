> **Obsoleto desde la feature 016.** El paquete ZIP ahora envuelve
> `paquete.json` con el estándar externo `preguntas-icfes`, no `banco.json`
> con el JSON plano descrito aquí. Ver
> [`paquete-preguntas-icfes.md`](paquete-preguntas-icfes.md). Este archivo se
> conserva como referencia histórica de la feature 015.

# Contrato · Paquete de preguntas ZIP v1

## Estructura

```text
paquete.zip
├── banco.json
└── imagenes/
    ├── imagen-1.png
    └── imagen-2.webp
```

- `banco.json` es obligatorio y usa el mismo JSON aceptado por el importador de
  bancos: `{ "nombre_banco": "…", "preguntas": [...] }`.
- El campo `imagen` de cada pregunta contiene solo el nombre del archivo, sin la
  carpeta: `"imagen-1.png"`.
- `imagenes/` es opcional si ninguna pregunta usa imágenes.
- Extensiones admitidas: `.png`, `.jpg`, `.jpeg` y `.webp`.

## Reglas

- El ZIP completo pesa como máximo 25 MB, contiene como máximo 101 archivos y
  cada imagen descomprimida pesa como máximo 3 MB.
- Solo se admiten entradas sin cifrar, almacenadas o comprimidas con DEFLATE.
- Se rechazan rutas absolutas, `..`, enlaces, nombres duplicados y carpetas fuera
  de `imagenes/`.
- Cada imagen referenciada debe existir dentro del paquete o estar ya disponible
  en OpenTest. Las imágenes extra del paquete también se importan.
- Primero se valida el paquete entero y después se confirma. Un error en cualquier
  pregunta o imagen impide importar el banco.
- Los nombres se comparan exactamente, incluidas mayúsculas, tildes y espacios.

