// Utilidades comunes del panel: cerrar sesión y llamadas a la API.

export async function api(ruta, opciones = {}) {
  const res = await fetch(ruta, {
    headers: { 'content-type': 'application/json' },
    ...opciones,
  });

  if (res.status === 401) {
    window.location.replace('/docente/entrar.html');
    throw new Error('sesión caducada');
  }
  return res.json();
}

const salir = document.getElementById('salir');
if (salir) {
  salir.addEventListener('click', async () => {
    await fetch('/api/auth/salir', { method: 'POST' });
    window.location.replace('/docente/entrar.html');
  });
}

const resumen = document.getElementById('resumen');
if (resumen) {
  api('/api/docente/estado').then(({ estudiantes }) => {
    resumen.textContent =
      estudiantes === 0
        ? 'Todavía no has cargado ningún estudiante. Empieza por ahí.'
        : `Tienes ${estudiantes} estudiante(s) cargados.`;
  });
}
