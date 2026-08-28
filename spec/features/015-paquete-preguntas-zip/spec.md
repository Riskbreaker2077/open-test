# 015 · Paquete de preguntas ZIP

**Estado:** implementado ✅

## Propósito

Permitir que el docente cargue preguntas, imágenes y retroalimentación en un
único archivo ZIP, sin preparar ni subir los recursos por separado.

## Contrato

El formato está definido en
[`import-paquete-preguntas-v1.md`](../../contracts/import-paquete-preguntas-v1.md).

## Criterios de aceptación

- [x] El panel acepta un ZIP con `banco.json` e `imagenes/`.
- [x] La validación muestra nombre, totales y las tres primeras preguntas antes
  de confirmar, igual que la carga tradicional.
- [x] Confirmar guarda el banco y sus imágenes; después puede abrirse en la vista
  previa y usarse en una evaluación.
- [x] Una imagen referenciada pero ausente rechaza el paquete entero.
- [x] Se rechazan ZIPs con rutas inseguras, entradas duplicadas, cifrado, formatos
  no admitidos o límites excedidos.
- [x] Se conservan la carga separada de imágenes y la importación CSV/JSON actual.
- [x] No se añade ninguna dependencia ni petición de red en runtime.
- [x] Existe un paquete manual de 20 preguntas sobre mecanismos de participación
  ciudadana, con imágenes y retroalimentación.
- [x] Tests, lint y `git diff --check` pasan.
