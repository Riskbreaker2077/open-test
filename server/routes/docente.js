import express, { Router } from 'express';
import { validarEstudiantes } from '../importers/estudiantes.js';
import { MAX_BYTES_PAQUETE, validarPaquete } from '../importers/paquete-zip.js';
import {
  borrarBanco,
  contarBancos,
  guardarBanco,
  listarBancos,
  obtenerBanco,
} from '../services/bancos.js';
import {
  abrirSesion,
  borrarSesion,
  cerrarSesion,
  comenzarSesion,
  crearSesion,
  listarSesiones,
  obtenerSesion,
  pausarSesion,
  POR_DEFECTO,
  reanudarSesion,
  tiempoRestante,
  actualizarSesion,
  actualizarNivelFeedback,
} from '../services/sesiones.js';
import { svgQr } from '../qr.js';
import { urlsDeIntranet } from '../red.js';
import { contarIntentos, forzarEntrega } from '../services/intentos.js';
import { estadoDeSesion } from '../services/monitoreo.js';
import {
  aDetalleCsv,
  aJson,
  armarExportacion,
  aResumenCsv,
} from '../exporters/resultados.js';
import { solapamientoEsperado } from '../services/personalizacion.js';
import {
  guardarImagen,
  listarImagenes,
  MAX_BYTES_IMAGEN,
  nombresDisponibles,
} from '../services/imagenes.js';
import { tieneBloqueImagen } from '../services/bloques.js';
import {
  contarEstudiantes,
  cursosDeEstudiantes,
  eliminarEstudiante,
  guardarEstudiantes,
  listarEstudiantes,
  resumirCambios,
} from '../services/estudiantes.js';

/** Filas de muestra que ve el docente antes de confirmar. */
const MUESTRA = 10;

export function rutasDocente(db) {
  const router = Router();

  const direccionPortal = (req) => {
    const candidatas = urlsDeIntranet(req.socket.localPort);
    return candidatas.find((item) => item.probable)?.url ?? `${req.protocol}://${req.get('host')}`;
  };

  router.get('/estado', (req, res) => {
    res.json({ ok: true, estudiantes: contarEstudiantes(db), bancos: contarBancos(db) });
  });

  // Paso 1: validar. No toca la base; devuelve qué pasaría y qué está mal.
  router.post('/estudiantes/validar', (req, res) => {
    const { registros, errores } = validarEstudiantes(req.body?.contenido ?? '');

    if (errores.length > 0) {
      return res.json({ ok: false, errores });
    }

    res.json({
      ok: true,
      resumen: resumirCambios(db, registros),
      muestra: registros.slice(0, MUESTRA),
    });
  });

  // Paso 2: confirmar. Se vuelve a validar por si el archivo cambió entremedias.
  router.post('/estudiantes/confirmar', (req, res) => {
    const { registros, errores } = validarEstudiantes(req.body?.contenido ?? '');

    if (errores.length > 0) {
      return res.status(400).json({ ok: false, errores });
    }

    res.json({ ok: true, resumen: guardarEstudiantes(db, registros) });
  });

  router.get('/estudiantes', (req, res) => {
    res.json({
      ok: true,
      estudiantes: listarEstudiantes(db, { curso: req.query.curso }),
      cursos: cursosDeEstudiantes(db),
    });
  });

  router.delete('/estudiantes/:codigo', (req, res) => {
    try {
      res.json({ ok: true, estudiante: eliminarEstudiante(db, req.params.codigo) });
    } catch (err) {
      res.status(err.estado ?? 400).json({ ok: false, mensaje: err.message });
    }
  });

  // --- Imágenes de las preguntas ---------------------------------------
  // El cuerpo llega como bytes crudos y el nombre por query: evita un parser
  // de multipart a mano o una dependencia solo para subir un archivo.
  router.post(
    '/imagenes',
    express.raw({ type: () => true, limit: MAX_BYTES_IMAGEN }),
    (req, res) => {
      try {
        res.json({ ok: true, imagen: guardarImagen(req.query.nombre, req.body) });
      } catch (err) {
        res.status(err.estado ?? 400).json({ ok: false, mensaje: err.message });
      }
    },
  );

  router.get('/imagenes', (req, res) => {
    res.json({ ok: true, imagenes: listarImagenes() });
  });

  // --- Bancos de preguntas ----------------------------------------------
  // Carga unificada: un único ZIP con paquete.json (estándar preguntas-icfes)
  // e imagenes/. No hay una vía alterna en texto plano.
  const cuerpoZip = express.raw({ type: () => true, limit: MAX_BYTES_PAQUETE });
  const resumenPaquete = (resultado, nombreSolicitado) => ({
    ok: true,
    nombre: nombreSolicitado || resultado.nombre || 'Banco sin nombre',
    avisos: resultado.avisos,
    resumen: {
      total: resultado.preguntas.length,
      conContexto: resultado.preguntas.filter((p) => p.contexto.length > 0).length,
      conImagen: resultado.preguntas.filter((p) => tieneBloqueImagen(p)).length,
      imagenesIncluidas: resultado.imagenes.length,
    },
    muestra: resultado.preguntas.slice(0, 3),
  });

  router.post('/bancos/paquete/validar', cuerpoZip, (req, res) => {
    const resultado = validarPaquete(req.body, { imagenesDisponibles: nombresDisponibles() });
    if (resultado.errores.length > 0) return res.json({ ok: false, errores: resultado.errores });
    res.json(resumenPaquete(resultado, req.query.nombre?.trim()));
  });

  router.post('/bancos/paquete/confirmar', cuerpoZip, (req, res) => {
    const resultado = validarPaquete(req.body, { imagenesDisponibles: nombresDisponibles() });
    if (resultado.errores.length > 0) return res.status(400).json({ ok: false, errores: resultado.errores });

    for (const imagen of resultado.imagenes) guardarImagen(imagen.nombre, imagen.contenido);
    const titulo = req.query.nombre?.trim() || resultado.nombre || 'Banco sin nombre';
    res.json({
      ok: true,
      resumen: guardarBanco(db, titulo, resultado.preguntas),
      imagenes: resultado.imagenes.map((imagen) => imagen.nombre),
    });
  });

  router.get('/bancos', (req, res) => {
    res.json({ ok: true, bancos: listarBancos(db) });
  });

  router.get('/bancos/:id', (req, res) => {
    try {
      res.json({ ok: true, banco: obtenerBanco(db, Number(req.params.id)) });
    } catch (err) {
      res.status(err.estado ?? 400).json({ ok: false, mensaje: err.message });
    }
  });

  router.delete('/bancos/:id', (req, res) => {
    try {
      res.json({ ok: true, banco: borrarBanco(db, Number(req.params.id)) });
    } catch (err) {
      res.status(err.estado ?? 400).json({ ok: false, mensaje: err.message });
    }
  });

  // --- Sesiones de examen ------------------------------------------------
  const responder = (res, accion) => {
    try {
      res.json({ ok: true, ...accion() });
    } catch (err) {
      res.status(err.estado ?? 400).json({ ok: false, mensaje: err.message });
    }
  };

  router.get('/sesiones', (req, res) => {
    res.json({
      ok: true,
      sesiones: listarSesiones(db).map((sesion) => ({
        ...sesion,
        ...contarIntentos(db, sesion.id),
        // Para que el docente vea el efecto del tamaño de su banco antes de
        // abrir, en vez de descubrirlo el día del examen.
        solapamiento: Number(
          solapamientoEsperado(sesion.preguntas_banco, sesion.n_preguntas).toFixed(1),
        ),
      })),
      porDefecto: POR_DEFECTO,
    });
  });

  router.post('/sesiones', (req, res) => {
    responder(res, () => ({ sesion: crearSesion(db, req.body ?? {}) }));
  });

  router.get('/sesiones/:id', (req, res) => {
    responder(res, () => ({ sesion: obtenerSesion(db, Number(req.params.id)) }));
  });

  router.put('/sesiones/:id', (req, res) => {
    responder(res, () => ({ sesion: actualizarSesion(db, Number(req.params.id), req.body ?? {}) }));
  });

  router.post('/sesiones/:id/abrir', (req, res) => {
    responder(res, () => ({ sesion: abrirSesion(db, Number(req.params.id)) }));
  });

  router.post('/sesiones/:id/comenzar', (req, res) => {
    responder(res, () => ({ sesion: comenzarSesion(db, Number(req.params.id)) }));
  });

  router.post('/sesiones/:id/pausar', (req, res) => {
    responder(res, () => ({ sesion: pausarSesion(db, Number(req.params.id)) }));
  });

  router.post('/sesiones/:id/reanudar', (req, res) => {
    responder(res, () => ({ sesion: reanudarSesion(db, Number(req.params.id)) }));
  });

  router.post('/sesiones/:id/cerrar', (req, res) => {
    responder(res, () => ({ sesion: cerrarSesion(db, Number(req.params.id)) }));
  });

  router.get('/sesiones/:id/monitoreo', (req, res) => {
    responder(res, () => ({
      monitoreo: {
        ...estadoDeSesion(db, Number(req.params.id)),
        direccion: direccionPortal(req),
      },
    }));
  });

  router.post('/intentos/:id/forzar-entrega', (req, res) => {
    responder(res, () => ({ entrega: forzarEntrega(db, Number(req.params.id)) }));
  });

  router.patch('/sesiones/:id/feedback', (req, res) => {
    responder(res, () => ({
      sesion: actualizarNivelFeedback(db, Number(req.params.id), req.body?.nivel_feedback),
    }));
  });

  router.get('/sesiones/:id/export/:tipo', (req, res) => {
    try {
      const tipo = req.params.tipo;
      if (!['detalle', 'resumen', 'json'].includes(tipo)) {
        return res.status(404).json({ ok: false, mensaje: 'Ese formato de exportación no existe.' });
      }
      const exportacion = armarExportacion(db, Number(req.params.id), req.query.curso);
      const seguro = (texto) => String(texto).normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9_-]+/g, '_').replace(/^_+|_+$/g, '').toLowerCase() || 'todos';
      const fecha = new Date().toISOString().slice(0, 10);
      const extension = tipo === 'json' ? 'json' : 'csv';
      const nombre = `opentest_${seguro(exportacion.sesion.nombre)}_${seguro(req.query.curso ?? 'todos')}_${tipo}_${fecha}.${extension}`;
      const contenido = tipo === 'detalle' ? aDetalleCsv(exportacion)
        : tipo === 'resumen' ? aResumenCsv(exportacion) : aJson(exportacion);
      res.set('Content-Disposition', `attachment; filename="${nombre}"`);
      res.type(tipo === 'json' ? 'application/json' : 'text/csv').send(contenido);
    } catch (err) {
      res.status(err.estado ?? 400).json({ ok: false, mensaje: err.message });
    }
  });

  router.get('/proyeccion/:sesionId', (req, res) => {
    responder(res, () => {
      let sesion = obtenerSesion(db, Number(req.params.sesionId));
      const segundosRestantes = tiempoRestante(db, sesion);
      sesion = obtenerSesion(db, sesion.id);
      const { dentro, entregados } = contarIntentos(db, sesion.id);
      return {
        proyeccion: {
          sesionId: sesion.id,
          nombre: sesion.nombre,
          estado: sesion.estado,
          direccion: direccionPortal(req),
          segundosRestantes,
          dentro,
          entregados: entregados ?? 0,
        },
      };
    });
  });

  router.get('/qr.svg', (req, res) => {
    try {
      const texto = String(req.query.texto ?? '').trim();
      if (texto === '') return res.status(400).json({ ok: false, mensaje: 'Falta la dirección del portal.' });
      res.type('image/svg+xml').send(svgQr(texto));
    } catch (err) {
      res.status(400).json({ ok: false, mensaje: err.message });
    }
  });

  router.delete('/sesiones/:id', (req, res) => {
    responder(res, () => ({ sesion: borrarSesion(db, Number(req.params.id)) }));
  });

  return router;
}
