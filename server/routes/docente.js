import express, { Router } from 'express';
import { validarEstudiantes } from '../importers/estudiantes.js';
import { validarBanco } from '../importers/preguntas.js';
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
  crearSesion,
  listarSesiones,
  obtenerSesion,
  POR_DEFECTO,
  actualizarSesion,
} from '../services/sesiones.js';
import { contarIntentos } from '../services/intentos.js';
import {
  guardarImagen,
  listarImagenes,
  MAX_BYTES_IMAGEN,
  nombresDisponibles,
} from '../services/imagenes.js';
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
  router.post('/bancos/validar', (req, res) => {
    const { nombre, preguntas, errores, avisos } = validarBanco(req.body?.contenido ?? '', {
      imagenesDisponibles: nombresDisponibles(),
    });

    if (errores.length > 0) return res.json({ ok: false, errores });

    res.json({
      ok: true,
      nombre: req.body?.nombre || nombre || 'Banco sin nombre',
      avisos,
      resumen: {
        total: preguntas.length,
        conContexto: preguntas.filter((p) => p.contexto !== '').length,
        conImagen: preguntas.filter((p) => p.imagen !== '').length,
      },
      muestra: preguntas.slice(0, 3),
    });
  });

  router.post('/bancos/confirmar', (req, res) => {
    const { nombre, preguntas, errores } = validarBanco(req.body?.contenido ?? '', {
      imagenesDisponibles: nombresDisponibles(),
    });

    if (errores.length > 0) return res.status(400).json({ ok: false, errores });

    const titulo = req.body?.nombre?.trim() || nombre || 'Banco sin nombre';
    res.json({ ok: true, resumen: guardarBanco(db, titulo, preguntas) });
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

  router.post('/sesiones/:id/cerrar', (req, res) => {
    responder(res, () => ({ sesion: cerrarSesion(db, Number(req.params.id)) }));
  });

  router.delete('/sesiones/:id', (req, res) => {
    responder(res, () => ({ sesion: borrarSesion(db, Number(req.params.id)) }));
  });

  return router;
}
