// Resalta en el índice lateral la sección que se está leyendo. Sin esto la
// página funciona igual (son anclas normales); es solo una ayuda visual.
const enlacesIndice = document.querySelectorAll('.toc a[href^="#"]');
const secciones = document.querySelectorAll('.contenido-guia > section[id]');

if (enlacesIndice.length > 0 && secciones.length > 0 && 'IntersectionObserver' in window) {
  const porId = new Map(
    [...enlacesIndice].map((enlace) => [enlace.getAttribute('href').slice(1), enlace]),
  );

  const observador = new IntersectionObserver(
    (entradas) => {
      for (const entrada of entradas) {
        const enlace = porId.get(entrada.target.id);
        if (!enlace) continue;
        enlace.classList.toggle('activo', entrada.isIntersecting);
      }
    },
    { rootMargin: '-20% 0px -70% 0px' },
  );

  for (const seccion of secciones) observador.observe(seccion);
}
