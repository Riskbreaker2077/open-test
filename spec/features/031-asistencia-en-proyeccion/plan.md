# 031 · Asistencia en la pantalla de proyección — Plan

## Enfoque

El servidor ya sabe quién falta: `estadoDeSesion` (`server/services/monitoreo.js`, feature 008) cruza estudiantes convocados con intentos y clasifica cada uno en `sin_entrar`, `presentando` o `entregado`. La proyección reutiliza esa función y **proyecta a una forma mínima** (nombre, curso, entregado) antes de responder, para que el monitoreo pueda crecer sin que nada nuevo se filtre al proyector.

## Implementación

1. `server/routes/docente.js` — `GET /api/docente/proyeccion/:sesionId` llama a `estadoDeSesion` una vez y arma `asistencia: { faltan, conectados }` copiando campo a campo solo `nombre`, `curso` y, en conectados, `entregado`. Nombre, estado y segundos restantes salen del mismo resultado; los contadores `dentro`/`entregados` siguen saliendo de `contarIntentos`, sin cambios de significado.
2. `server/routes/docente.sesiones.test.js` — el test de proyección deja de exigir ausencia de nombres y pasa a exigir: la estudiante que entró aparece en conectados, la no convocada no aparece, y el texto no contiene `puntaje|aciertos|pregunta|respuesta|codigo|2024001`.
3. `public/proyeccion/index.html` — nueva sección `.asistencia` con dos bloques (Faltan / Conectados), cada uno con recuento y `<ul>`.
4. `public/proyeccion/proyeccion.js` — `pintarAsistencia` reconstruye las listas solo si cambió su contenido (comparación de una clave serializada) y luego ajusta el tamaño de letra para que quepan.
5. `public/proyeccion/proyeccion.css` — tercera columna en pantallas anchas; en 4:3 o más estrechas, la asistencia pasa a una fila propia bajo QR y reloj. Listas en columnas CSS (`columns`) que reparten los nombres.

## Decisiones

- **Ajuste de letra por JS, no scroll** — la 012 exige cero barras de desplazamiento y un curso puede tener 20 o 45 estudiantes. Una búsqueda binaria sobre `font-size` entre un mínimo y un máximo, comparando `scrollHeight` con `clientHeight`, cabe en pocas líneas y se ejecuta cuando cambian las listas o su caja. La caja se vigila con `ResizeObserver` y no con `resize` de la ventana: en 4:3 la altura disponible depende del QR, que carga después del primer ajuste, y la primera verificación mostró una fila cortada por eso.
- **Entregado marcado con "✓" además del color** — un proyector lavado no distingue tonos.
- **Curso solo si la evaluación convoca a varios** — con un único curso es ruido.
- **Sin código de estudiante** — el código es lo que se usa para entrar; proyectarlo permitiría entrar por otro.

## Riesgos

- **Exponer ante el grupo a quién falta** — decisión explícita del docente; queda escrita en `mission.md` y en esta spec.
- **Listas largas vuelven ilegible la letra a 1024×768** — mitigación: mínimo de letra y columnas; verificación con 40 nombres en ambas resoluciones.
