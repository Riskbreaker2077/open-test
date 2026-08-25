const tarjeta = document.getElementById('tarjeta');
const titulo = document.getElementById('titulo');
const explicacion = document.getElementById('explicacion');
const formulario = document.getElementById('formulario');
const contrasena = document.getElementById('contrasena');
const confirmar = document.getElementById('confirmar');
const campoConfirmar = document.getElementById('campo-confirmar');
const etiquetaClave = document.getElementById('etiqueta-clave');
const aviso = document.getElementById('aviso');
const enviar = document.getElementById('enviar');

let primeraVez = false;

function mostrarAviso(mensaje) {
  aviso.textContent = mensaje;
  aviso.hidden = false;
}

function limpiarAviso() {
  aviso.hidden = true;
  aviso.textContent = '';
}

async function iniciar() {
  const res = await fetch('/api/auth/estado');
  const estado = await res.json();

  if (estado.autenticado) {
    window.location.replace('/docente/');
    return;
  }

  primeraVez = !estado.configurado;

  if (primeraVez) {
    titulo.textContent = 'Crea tu contraseña';
    explicacion.textContent =
      'Es la primera vez que abres OpenTest en este equipo. Elige una contraseña ' +
      'para tu panel: sin ella, cualquier estudiante podría ver las evaluaciones ' +
      'y las respuestas correctas.';
    etiquetaClave.textContent = 'Contraseña nueva (mínimo 6 caracteres)';
    contrasena.autocomplete = 'new-password';
    campoConfirmar.hidden = false;
    enviar.textContent = 'Guardar y entrar';
  } else {
    titulo.textContent = 'Entrar al panel';
    explicacion.textContent = 'Escribe la contraseña de este equipo.';
  }

  tarjeta.hidden = false;
  contrasena.focus();
}

formulario.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  limpiarAviso();

  if (primeraVez && contrasena.value !== confirmar.value) {
    mostrarAviso('Las dos contraseñas no coinciden.');
    return;
  }

  enviar.disabled = true;
  try {
    const res = await fetch(primeraVez ? '/api/auth/establecer' : '/api/auth/entrar', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ contrasena: contrasena.value }),
    });
    const cuerpo = await res.json();

    if (!cuerpo.ok) {
      mostrarAviso(cuerpo.mensaje);
      contrasena.select();
      return;
    }
    window.location.replace('/docente/');
  } catch {
    mostrarAviso('No se pudo conectar con el servidor. Vuelve a intentarlo.');
  } finally {
    enviar.disabled = false;
  }
});

iniciar();
