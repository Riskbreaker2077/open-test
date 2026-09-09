import { mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import Database from 'better-sqlite3';
import { aplicarMigraciones, fijarVersion, ULTIMA_VERSION } from './migraciones.js';
import { RUTAS } from './rutas.js';

const aqui = join(RUTAS.raiz, 'server');
export const RAIZ_DATOS = RUTAS.datos;
export const RUTA_IMAGENES = join(RAIZ_DATOS, 'uploads', 'imagenes');
export const RUTA_BD_POR_DEFECTO = join(RAIZ_DATOS, 'opentest.db');

/**
 * Abre la base de datos y aplica el esquema completo.
 * Crear las tablas que faltan es idempotente, así que arrancar sobre una base
 * existente no toca ningún dato.
 */
export function abrirBd(ruta = RUTA_BD_POR_DEFECTO) {
  const enMemoria = ruta === ':memory:';
  if (!enMemoria) mkdirSync(dirname(ruta), { recursive: true });

  const db = new Database(ruta);
  db.pragma('foreign_keys = ON');
  // WAL deja al docente consultar el panel mientras 30 tablets escriben.
  if (!enMemoria) db.pragma('journal_mode = WAL');

  const esNueva = db.prepare("SELECT count(*) AS t FROM sqlite_master WHERE type = 'table'").get().t === 0;
  db.exec(readFileSync(join(aqui, 'schema.sql'), 'utf8'));

  if (esNueva) {
    // Nace con el esquema al día: no hay nada que migrar.
    fijarVersion(db, ULTIMA_VERSION);
  } else {
    aplicarMigraciones(db);
  }

  // Índice que depende de una columna añadida por la migración v5: para una
  // base nueva la columna ya está, y para una antigua la migración v5 ya la
  // añadió. Vive fuera de schema.sql porque al aplicar schema.sql sobre una
  // base antigua el CREATE TABLE preguntas es un no-op y la columna no existe.
  db.exec('CREATE INDEX IF NOT EXISTS idx_preguntas_grupo ON preguntas (grupo_id)');

  return db;
}

export function cerrarBd(db) {
  if (db && db.open) db.close();
}
