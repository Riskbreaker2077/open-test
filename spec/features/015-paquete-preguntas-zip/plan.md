# Plan · 015 Paquete de preguntas ZIP

## Enfoque

Se implementará un lector ZIP mínimo con `node:zlib`, suficiente para el contrato
v1 y sin dependencias nuevas. El lector usa el directorio central, valida cada
entrada antes de descomprimir y nunca escribe rutas del ZIP directamente.

Dos endpoints reciben el mismo ZIP como bytes crudos:

1. `POST /api/docente/bancos/paquete/validar` devuelve resumen y muestra sin escribir.
2. `POST /api/docente/bancos/paquete/confirmar` vuelve a validar, guarda las imágenes
   saneadas y crea el banco con el servicio transaccional existente.

El frontend conserva el `File` seleccionado y lo reenvía al confirmar. La carga
CSV/JSON separada continúa disponible como alternativa.

## Seguridad y límites

- Máximo 25 MB comprimidos, 101 archivos y 3 MB por imagen descomprimida.
- Métodos ZIP 0 y 8, sin cifrado ni ZIP64.
- Nombres UTF-8, rutas relativas estrictas y sin duplicados.
- Validación de todas las preguntas contra el conjunto de imágenes del paquete y
  las ya instaladas.

## Pruebas

- Lector ZIP almacenado y DEFLATE.
- Rutas inseguras, duplicados, cifrado, ausencia de manifiesto e imagen faltante.
- Validación y confirmación HTTP, incluida disponibilidad posterior de la imagen.
- Prueba manual con el paquete de mecanismos de participación ciudadana.

