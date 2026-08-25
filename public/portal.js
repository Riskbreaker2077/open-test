// Portal del estudiante: identificarse, elegir evaluación y esperar a que
// empiece, todo en la misma dirección y sin recargar. Ver spec/features/013.

const pasoCodigo = document.getElementById('paso-codigo');
const formularioCodigo = document.getElementById('formulario-codigo');
const campoCodigo = document.getElementById('codigo');
const avisoCodigo = document.getElementById('aviso-codigo');
const enviarCodigo = document.getElementById('enviar-codigo');

const pasoElegir = document.getElementById('paso-elegir');
const saludoElegir = document.getElementById('saludo-elegir');
const listaSesiones = document.getElementById('lista-sesiones');
const avisoElegir = document.getElementById('aviso-elegir');

const pasoMensaje = document.getElementById('paso-mensaje');
const tituloMensaje = document.getElementById('titulo-mensaje');
const textoMensaje = document.getElementById('texto-mensaje');
const apunteMensaje = document.getElementById('apunte-mensaje');

const ERROR_CONEXION = 'No se pudo conectar con el servidor. Vuelve a intentarlo.';

let sondeo = null;

function mostrarPaso(paso) {
  for (const seccion of [pasoCodigo, pasoElegir, pasoMensaje]) seccion.hidden = seccion !== paso;
}

function mostrarAviso(el, mensaje) {
  el.textContent = mensaje;
  el.hidden = false;
}

function limpiarAviso(el) {
  el.hidden = true;
  el.textContent = '';
}

function mostrarMensaje(titulo, texto, apunte) {
  tituloMensaje.textContent = titulo;
  textoMensaje.textContent = texto;
  apunteMensaje.hidden = !apunte;
  if (apunte) apunteMensaje.textContent = apunte;
  mostrarPaso(pasoMensaje);
}

function detenerSondeo() {
  if (sondeo) clearInterval(sondeo);
  sondeo = null;
}

function iniciarSondeo() {
  detenerSondeo();
  sondeo = setInterval(async () => {
    const estado = await consultarEstado();
    if (estado) renderEstado(estado);
  }, 2000);
}

async function consultarEstado() {
  try {
    const res = await fetch('/api/examen/estado');
    if (!res.ok) return null;
    return (await res.json()).estado;
  } catch {
    return null;
  }
}

/**
 * Lo que ve el estudiante mientras su examen (feature 006) y su resultado
 * (feature 007) todavía no existen: la transición ocurre sola, en cuanto el
 * servidor la reporta, pero el contenido de esas pantallas es de otra feature.
 */
function renderEstado(estado) {
  if (estado.entregado) {
    detenerSondeo();
    mostrarMensaje(
      'Ya entregaste esta prueba',
      `${estado.estudiante}, tu resultado se mostrará aquí.`,
      'Esta pantalla la construye la feature 007 · Calificación y retroalimentación.',
    );
    return;
  }

  switch (estado.sesion.estado) {
    case 'abierta':
      mostrarMensaje(
        'Espera a que tu docente inicie la prueba',
        `Ya estás dentro, ${estado.estudiante}.`,
        'Esta pantalla avanza sola en cuanto tu docente pulse Comenzar.',
      );
      iniciarSondeo();
      break;
    case 'pausada':
      mostrarMensaje(
        'La prueba está en pausa',
        `Espera indicaciones de tu docente, ${estado.estudiante}.`,
      );
      iniciarSondeo();
      break;
    case 'en_curso':
      detenerSondeo();
      mostrarMensaje(
        'Tu examen ha comenzado',
        `${estado.estudiante}, tu prueba está lista.`,
        'Esta pantalla la construye la feature 006 · Presentación del examen.',
      );
      break;
    case 'cerrada':
      detenerSondeo();
      mostrarMensaje('Esta evaluación fue cerrada', `${estado.estudiante}, ya no puedes entrar.`);
      break;
    default:
      detenerSondeo();
      mostrarMensaje('No pudimos mostrar tu prueba', 'Vuelve a escribir tu código para continuar.');
  }
}

async function entrar(codigo, sesionId, avisoEl) {
  try {
    const res = await fetch('/api/examen/entrar', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ codigo, sesionId }),
    });
    const cuerpo = await res.json();

    if (!cuerpo.ok) {
      mostrarAviso(avisoEl, cuerpo.mensaje);
      return;
    }
    renderEstado(cuerpo.estado);
  } catch {
    mostrarAviso(avisoEl, ERROR_CONEXION);
  }
}

function mostrarEleccion(estudiante, sesiones) {
  saludoElegir.textContent = `Hola, ${estudiante.nombres}`;
  limpiarAviso(avisoElegir);

  listaSesiones.replaceChildren(
    ...sesiones.map((sesion) => {
      const boton = document.createElement('button');
      boton.type = 'button';
      boton.className = 'acceso';

      const nombre = document.createElement('strong');
      nombre.textContent = sesion.nombre;
      const banco = document.createElement('span');
      banco.textContent = sesion.banco;
      boton.append(nombre, banco);

      boton.addEventListener('click', async () => {
        boton.disabled = true;
        try {
          await entrar(estudiante.codigo, sesion.id, avisoElegir);
        } finally {
          boton.disabled = false;
        }
      });

      return boton;
    }),
  );

  mostrarPaso(pasoElegir);
}

async function resolverSesiones(estudiante, sesiones) {
  if (sesiones.length === 0) {
    mostrarMensaje(
      'Ahora mismo no hay ninguna prueba abierta para tu curso',
      `Hola, ${estudiante.nombres}. Vuelve a intentarlo cuando tu docente convoque una evaluación.`,
    );
    return;
  }

  if (sesiones.length === 1) {
    await entrar(estudiante.codigo, sesiones[0].id, avisoCodigo);
    return;
  }

  mostrarEleccion(estudiante, sesiones);
}

formularioCodigo.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  limpiarAviso(avisoCodigo);
  enviarCodigo.disabled = true;

  try {
    const res = await fetch('/api/examen/sesiones', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ codigo: campoCodigo.value }),
    });
    const cuerpo = await res.json();

    if (!cuerpo.ok) {
      mostrarAviso(avisoCodigo, cuerpo.mensaje);
      campoCodigo.select();
      return;
    }
    await resolverSesiones(cuerpo.estudiante, cuerpo.sesiones);
  } catch {
    mostrarAviso(avisoCodigo, ERROR_CONEXION);
  } finally {
    enviarCodigo.disabled = false;
  }
});

async function iniciar() {
  const estado = await consultarEstado();
  if (estado) {
    renderEstado(estado);
    return;
  }
  mostrarPaso(pasoCodigo);
  campoCodigo.focus();
}

iniciar();
