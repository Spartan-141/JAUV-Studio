'use strict';
const Database = require('better-sqlite3');
const path = require('path');
const { app } = require('electron');
const fs = require('fs');

let db;

function getDb() {
  if (!db) throw new Error('Database not initialized');
  return db;
}

function initDb() {
  const userDataPath = app.getPath('userData');
  const dbPath = path.join(userDataPath, 'jauv_pos.db');

  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  // ─── Schema ──────────────────────────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS configuracion (
      clave TEXT PRIMARY KEY,
      valor TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS categorias (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS productos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      codigo TEXT UNIQUE,
      nombre TEXT NOT NULL,
      marca TEXT DEFAULT '',
      precio_compra_usd REAL NOT NULL DEFAULT 0,
      precio_venta_usd  REAL NOT NULL DEFAULT 0,
      stock_actual      INTEGER NOT NULL DEFAULT 0,
      stock_minimo      INTEGER NOT NULL DEFAULT 0,
      categoria_id      INTEGER REFERENCES categorias(id) ON DELETE SET NULL,
      descripcion       TEXT DEFAULT '',
      created_at        TEXT DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS insumos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      tipo TEXT DEFAULT '',
      stock_hojas INTEGER NOT NULL DEFAULT 0,
      stock_minimo INTEGER NOT NULL DEFAULT 0,
      costo_por_hoja_usd REAL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS servicios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      precio_usd REAL NOT NULL,
      insumo_id INTEGER REFERENCES insumos(id) ON DELETE SET NULL,
      activo INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS ventas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fecha TEXT DEFAULT (datetime('now','localtime')),
      subtotal_usd REAL NOT NULL,
      descuento_otorgado_usd REAL NOT NULL DEFAULT 0,
      total_usd REAL NOT NULL,
      tasa_cambio REAL NOT NULL,
      estado TEXT NOT NULL DEFAULT 'pagada',
      cliente_nombre TEXT DEFAULT '',
      saldo_pendiente_usd REAL NOT NULL DEFAULT 0,
      notas TEXT DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS detalle_venta (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      venta_id INTEGER NOT NULL REFERENCES ventas(id) ON DELETE CASCADE,
      tipo TEXT NOT NULL,
      ref_id INTEGER NOT NULL,
      nombre TEXT NOT NULL,
      cantidad INTEGER NOT NULL,
      cantidad_hojas_gastadas INTEGER DEFAULT 0,
      precio_unitario_usd REAL NOT NULL,
      subtotal_usd REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS pagos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      venta_id INTEGER NOT NULL REFERENCES ventas(id) ON DELETE CASCADE,
      metodo TEXT NOT NULL,
      monto_usd REAL NOT NULL,
      monto_ves REAL DEFAULT 0,
      fecha TEXT DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS abonos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      venta_id INTEGER NOT NULL REFERENCES ventas(id) ON DELETE CASCADE,
      metodo TEXT NOT NULL,
      monto_usd REAL NOT NULL,
      monto_ves REAL DEFAULT 0,
      fecha TEXT DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS mermas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      producto_id INTEGER REFERENCES productos(id) ON DELETE SET NULL,
      insumo_id INTEGER REFERENCES insumos(id) ON DELETE SET NULL,
      cantidad INTEGER NOT NULL,
      motivo TEXT NOT NULL,
      notas TEXT DEFAULT '',
      fecha TEXT DEFAULT (datetime('now','localtime'))
    );
  `);

  // ─── Seed defaults ────────────────────────────────────────────────────────
  const seedConfig = db.prepare('INSERT OR IGNORE INTO configuracion VALUES (?, ?)');
  seedConfig.run('tasa_del_dia', '40.00');
  seedConfig.run('nombre_tienda', 'JAUV Studio');
  seedConfig.run('telefono_tienda', '');
  seedConfig.run('direccion_tienda', 'Venezuela');
  seedConfig.run('ticket_pie', 'Gracias por su compra!');
  seedConfig.run('impresora_ancho', '80');

  const seedCat = db.prepare('INSERT OR IGNORE INTO categorias (nombre) VALUES (?)');
  ['Cuadernos', 'Lapiceros', 'Carpetas', 'Papel', 'Tintas', 'Otros'].forEach(c => seedCat.run(c));

  const seedInsumo = db.prepare('INSERT OR IGNORE INTO insumos (nombre, tipo, stock_hojas, stock_minimo, costo_por_hoja_usd) VALUES (?, ?, ?, ?, ?)');
  seedInsumo.run('Papel Carta', 'carta', 500, 50, 0.003);
  seedInsumo.run('Papel Oficio', 'oficio', 200, 30, 0.004);

  const seedServicio = db.prepare('INSERT OR IGNORE INTO servicios (nombre, precio_usd, insumo_id) VALUES (?, ?, ?)');
  seedServicio.run('Copia B/N Carta', 0.05, 1);
  seedServicio.run('Copia Color Carta', 0.15, 1);
  seedServicio.run('Impresión B/N Carta', 0.05, 1);
  seedServicio.run('Impresión Color Carta', 0.20, 1);
  seedServicio.run('Copia B/N Oficio', 0.07, 2);
  seedServicio.run('Copia Color Oficio', 0.18, 2);
  seedServicio.run('Impresión B/N Oficio', 0.07, 2);
  seedServicio.run('Impresión Color Oficio', 0.25, 2);

  console.log('[DB] Database initialized at:', dbPath);
  return db;
}

module.exports = { getDb, initDb };
