import { api } from './panel.js';

const formulario = document.getElementById('formulario');
const banco = document.getElementById('banco');
const cursos = document.getElementById('cursos');
const sinCursos = document.getElementById('sin-cursos');
const nivelFeedback = document.getElementById('nivel_feedback');
const avisoFeedback = document.getElementById('aviso-feedback');
const error = document.getElementById('error');
const solapamiento = document.getElementById('solapamiento');
const listado = document.getElementById('listado');
const vacio = document.getElementById('vacio');

const CAMPOS = ['nombre', 'n_preguntas', 'duracion_minutos', 'segundos_minimos_pregunta'];

const ETIQUETAS = {
  borrador: 'Borrador',
  abierta: 'Abierta — esperando',
  en_curso: 'En curso',
  pausada: 'En pausa',
  cerrada: 'Cerrada',
};

function mostrarError(mensaje) {
  error.textContent = mensaje;
  error.hidden = false;
}

nivelFeedback.addEventListener('change', () => {
  avisoFeedback.hidden = nivelFeedback.value !== 'completo';
});

let preguntasPorBanco = new Map();

/**
 * El docente tiene que ver el efecto del tamaño de su banco antes de abrir,
 * no descubrirlo el día del examen: con 25 preguntas y 20 sorteadas, dos
 * compañeros comparten 16 y la protección se desploma.
 */
function actualizarSolapamiento() {
  const total = preguntasPorBanco.get(Number(banco.value));
  const n = Number(document.getElementById('n_preguntas').value);

  if (!total || !n) {
    solapamiento.textContent = '';
    return;
  }

  if (total < n) {
    solapamiento.textContent =
      `Este banco tiene ${total} preguntas y no alcanza para sortear ${n}. No podrás abrirla.`;
    return;
  }

  const comunes = (n * n) / total;
  solapamiento.textContent =
    `Con ${total} preguntas en el banco y ${n} por estudiante, dos compañeros ` +
    `compartirán unas ${comunes.toFixed(1)} preguntas de ${n}` +
    (comunes > n / 2 ? ' — un banco más grande protegería bastante más.' : '.');
}

banco.addEventListener('change', actualizarSolapamiento);
document.getElementById('n_preguntas').addEventListener('input', actualizarSolapamiento);

// Los cursos salen de los estudiantes que existen de verdad: escribirlos a
// mano acabaría en «10 A» contra «10A» y en un aula entera que no puede entrar.
async function cargarOpciones() {
  const [{ bancos }, { cursos: disponibles }] = await Promise.all([
    api('/api/docente/bancos'),
    api('/api/docente/estudiantes'),
  ]);

  preguntasPorBanco = new Map(bancos.map((b) => [b.id, b.preguntas]));
  banco.replaceChildren(
    ...bancos.map((b) => new Option(`${b.nombre} (${b.preguntas} preguntas)`, b.id)),
  );
  actualizarSolapamiento();
  if (bancos.length === 0) banco.append(new Option('Carga un banco primero', ''));

  sinCursos.hidden = disponibles.length > 0;
  cursos.replaceChildren(
    ...disponibles.map(({ curso, total }) => {
      const etiqueta = document.createElement('label');
      etiqueta.className = 'casilla';

      const casilla = document.createElement('input');
      casilla.type = 'checkbox';
      casilla.value = curso;
      casilla.name = 'curso';

      const texto = document.createElement('span');
      texto.textContent = `${curso} (${total})`;

      etiqueta.append(casilla, texto);
      return etiqueta;
    }),
  );
}

formulario.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  error.hidden = true;

  const datos = { banco_id: banco.value, nivel_feedback: nivelFeedback.value };
  for (const campo of CAMPOS) datos[campo] = document.getElementById(campo).value;
  datos.cursos = [...cursos.querySelectorAll('input:checked')].map((c) => c.value);

  const respuesta = await api('/api/docente/sesiones', {
    method: 'POST',
    body: JSON.stringify(datos),
  });

  if (!respuesta.ok) {
    mostrarError(respuesta.mensaje);
    return;
  }
  formulario.reset();
  avisoFeedback.hidden = true;
  actualizarSolapamiento();
  await recargar();
});

function accion(texto, alPulsar) {
  const boton = document.createElement('button');
  boton.className = 'boton boton--secundario boton--pequeno';
  boton.textContent = texto;
  boton.addEventListener('click', alPulsar);
  return boton;
}

async function transicion(ruta, confirmacion) {
  if (confirmacion && !window.confirm(confirmacion)) return;

  const respuesta = await api(ruta, { method: 'POST' });
  if (!respuesta.ok) {
    window.alert(respuesta.mensaje);
    return;
  }
  await recargar();
}

function acciones(sesion) {
  const grupo = document.createElement('div');

  if (sesion.estado === 'borrador') {
    grupo.append(
      accion('Abrir', () => transicion(`/api/docente/sesiones/${sesion.id}/abrir`)),
      accion('Borrar', async () => {
        if (!window.confirm(`¿Borrar "${sesion.nombre}"?`)) return;
        const respuesta = await api(`/api/docente/sesiones/${sesion.id}`, { method: 'DELETE' });
        if (!respuesta.ok) window.alert(respuesta.mensaje);
        await recargar();
      }),
    );
  } else if (sesion.estado !== 'cerrada') {
    grupo.append(
      accion('Monitorear', () => {
        window.location.href = `/docente/monitoreo.html?sesion=${sesion.id}`;
      }),
      accion('Proyectar', () => {
        window.location.href = `/proyeccion/?sesion=${sesion.id}`;
      }),
      accion('Cerrar', () =>
        transicion(
          `/api/docente/sesiones/${sesion.id}/cerrar`,
          `${sesion.dentro - sesion.entregados} estudiante(s) siguen presentando. ` +
            '¿Cerrar la evaluación de todas formas?',
        ),
      ),
    );
  } else {
    const resultados = document.createElement('a');
    resultados.className = 'boton boton--secundario boton--pequeno';
    resultados.href = `/docente/resultados.html?sesion=${sesion.id}`;
    resultados.textContent = 'Descargar resultados';
    const selector = document.createElement('select');
    selector.setAttribute('aria-label', `Retroalimentación de ${sesion.nombre}`);
    for (const [valor, texto] of [
      ['solo_puntaje', 'Solo puntaje'],
      ['aciertos', 'Puntaje y aciertos'],
      ['completo', 'Completa'],
    ]) {
      selector.append(new Option(texto, valor, valor === sesion.nivel_feedback, valor === sesion.nivel_feedback));
    }
    selector.addEventListener('change', async () => {
      if (selector.value === 'completo' && !window.confirm(
        'La retroalimentación completa revela las respuestas correctas. ¿Continuar?',
      )) {
        selector.value = sesion.nivel_feedback;
        return;
      }
      const respuesta = await api(`/api/docente/sesiones/${sesion.id}/feedback`, {
        method: 'PATCH',
        body: JSON.stringify({ nivel_feedback: selector.value }),
      });
      if (!respuesta.ok) window.alert(respuesta.mensaje);
      await recargar();
    });
    grupo.append(resultados, selector);
  }

  return grupo;
}

async function recargar() {
  const { sesiones } = await api('/api/docente/sesiones');
  vacio.hidden = sesiones.length > 0;

  const thead = document.createElement('thead');
  thead.innerHTML =
    '<tr><th>Evaluación</th><th>Banco</th><th>Cursos</th><th>Preguntas</th>' +
    '<th>Comparten</th><th>Estado</th><th>Dentro</th><th>Entregados</th><th>Acciones / feedback</th></tr>';

  const tbody = document.createElement('tbody');
  for (const sesion of sesiones) {
    const tr = document.createElement('tr');
    for (const valor of [
      sesion.nombre,
      sesion.banco,
      sesion.cursos.replaceAll(',', ', '),
      `${sesion.n_preguntas} de ${sesion.preguntas_banco}`,
      `~${sesion.solapamiento}`,
      ETIQUETAS[sesion.estado] ?? sesion.estado,
      sesion.dentro,
      sesion.entregados ?? 0,
    ]) {
      const td = document.createElement('td');
      td.textContent = valor;
      tr.append(td);
    }
    const td = document.createElement('td');
    td.append(acciones(sesion));
    tr.append(td);
    tbody.append(tr);
  }

  listado.replaceChildren(thead, tbody);
}

await cargarOpciones();
await recargar();
