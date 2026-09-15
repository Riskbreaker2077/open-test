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

// OpenTest corre sin ventana de consola (034): este botón es su interruptor.
const apagar = document.getElementById('apagar');
if (apagar) {
  apagar.addEventListener('click', async () => {
    if (!window.confirm('¿Apagar OpenTest? Las tablets no podrán entrar hasta que lo vuelvas a abrir.')) return;
    apagar.disabled = true;
    try {
      await fetch('/api/docente/apagar', { method: 'POST' });
    } catch {
      // Si el servidor ya se fue, igual está apagado.
    }
    const aviso = document.createElement('main');
    aviso.className = 'tarjeta tarjeta--centrada';
    aviso.innerHTML = '<h1>OpenTest está apagado</h1>'
      + '<p>Ya puedes cerrar esta pestaña. Para volver a usarlo, abre OpenTest desde el escritorio o el menú Inicio.</p>';
    document.body.replaceChildren(aviso);
  });
}
