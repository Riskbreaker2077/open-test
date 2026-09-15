# 032 · Quitar "Pausar y salir" — Plan

## Enfoque

Borrar la 024 de punta a punta, no esconderla. Un botón oculto con la ruta viva sigue siendo el mismo agujero.

## Implementación

1. `public/estudiante/examen.html` — quitar `#pausar-salir`.
2. `public/estudiante/examen.js` — quitar `pausarSalir` de `elementos`, su `disabled`, `pausarYSalir()` y su listener.
3. `server/routes/examen.js` — quitar `POST /pausar` y el import de `pausarIntentoComoEstudiante`.
4. `server/services/examen.js` — quitar `pausarIntentoComoEstudiante`.
5. Tests — quitar los de la ruta y del servicio; agregar uno que confirme que `POST /api/examen/pausar` responde 404 y la sesión sigue `en_curso`.
6. Specs — marcar la 024 como revertida por la 032 en su spec y en el roadmap; quitar la mención de "Pausar y salir" en la 031.

## Decisiones

- **Se borra la función de servicio, no solo la ruta** — código sin uso invita a reconectarlo.
- **Sin sustituto para el estudiante** — cerrar la tablet ya es seguro: el examen se retoma donde iba (006) y la proyección lo marca en rojo (031).
