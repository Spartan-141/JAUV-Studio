'use strict';
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');
const { app } = require('electron');
const fs = require('fs');

let db;

function getDb() {
  if (!db) throw new Error('Database not initialized');
  return db;
}

async function initDb() {
  try {
    const userDataPath = app.getPath('userData');
    const dbPath = path.join(userDataPath, 'jauv_pos.db');
    console.log('[DB] Attempting to initialize database at:', dbPath);

    db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });
    console.log('[DB] Database file opened successfully');

    await db.exec('PRAGMA journal_mode = WAL;');
    await db.exec('PRAGMA foreign_keys = ON;');

    // ─── Schema ──────────────────────────────────────────────────────────────
    console.log('[DB] Executing schema creation...');
    await db.exec(`
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
        precio_compra_ves REAL NOT NULL DEFAULT 0,
        precio_venta_ves  REAL NOT NULL DEFAULT 0,
        moneda_precio     TEXT DEFAULT 'usd',
        stock_actual      INTEGER NOT NULL DEFAULT 0,
        stock_minimo      INTEGER NOT NULL DEFAULT 0,
        categoria_id      INTEGER REFERENCES categorias(id) ON DELETE SET NULL,
        descripcion       TEXT DEFAULT '',
        created_at        TEXT DEFAULT (datetime('now','localtime'))
      );

      CREATE TABLE IF NOT EXISTS insumos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL UNIQUE,
        tipo TEXT DEFAULT '',
        stock_hojas INTEGER NOT NULL DEFAULT 0,
        stock_minimo INTEGER NOT NULL DEFAULT 0,
        costo_por_hoja_usd REAL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS servicios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL UNIQUE,
        precio_usd REAL NOT NULL,
        precio_ves REAL NOT NULL DEFAULT 0,
        moneda_precio TEXT DEFAULT 'usd',
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

      CREATE TABLE IF NOT EXISTS cierres_dia (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        fecha TEXT NOT NULL UNIQUE,
        tasa_cierre REAL NOT NULL,
        total_ventas INTEGER DEFAULT 0,
        ingresos_usd REAL DEFAULT 0,
        ingresos_ves REAL DEFAULT 0,
        descuentos_usd REAL DEFAULT 0,
        pendiente_cobrar_usd REAL DEFAULT 0,
        pagos_json TEXT DEFAULT '[]',
        abonos_json TEXT DEFAULT '[]',
        ventas_json TEXT DEFAULT '[]',
        cerrado_en TEXT DEFAULT (datetime('now','localtime'))
      );
    `);

    // ─── Seed defaults ────────────────────────────────────────────────────────
    console.log('[DB] Seeding default values...');
    await db.exec('BEGIN TRANSACTION;');

    const insertConfig = 'INSERT OR IGNORE INTO configuracion VALUES (?, ?)';
    await db.run(insertConfig, ['tasa_del_dia', '40.00']);
    await db.run(insertConfig, ['nombre_tienda', 'JAUV Studio']);
    await db.run(insertConfig, ['telefono_tienda', '']);
    await db.run(insertConfig, ['direccion_tienda', 'Venezuela']);
    await db.run(insertConfig, ['ticket_pie', 'Gracias por su compra!']);
    await db.run(insertConfig, ['impresora_ancho', '80']);

    const insertCat = 'INSERT OR IGNORE INTO categorias (nombre) VALUES (?)';
    for (const c of ['Cuadernos', 'Lapiceros', 'Carpetas', 'Papel', 'Tintas', 'Otros']) {
      await db.run(insertCat, [c]);
    }

    const insertInsumo = 'INSERT OR IGNORE INTO insumos (nombre, tipo, stock_hojas, stock_minimo, costo_por_hoja_usd) VALUES (?, ?, ?, ?, ?)';
    await db.run(insertInsumo, ['Papel Carta', 'carta', 500, 50, 0.003]);
    await db.run(insertInsumo, ['Papel Oficio', 'oficio', 200, 30, 0.004]);

    // Fetch dynamic IDs for seeding services
    const insumoCarta = await db.get('SELECT id FROM insumos WHERE nombre = ?', ['Papel Carta']);
    const insumoOficio = await db.get('SELECT id FROM insumos WHERE nombre = ?', ['Papel Oficio']);

    if (insumoCarta && insumoOficio) {
      const insertServicio = 'INSERT OR IGNORE INTO servicios (nombre, precio_usd, insumo_id) VALUES (?, ?, ?)';
      await db.run(insertServicio, ['Copia B/N Carta', 0.05, insumoCarta.id]);
      await db.run(insertServicio, ['Copia Color Carta', 0.15, insumoCarta.id]);
      await db.run(insertServicio, ['Impresión B/N Carta', 0.05, insumoCarta.id]);
      await db.run(insertServicio, ['Impresión Color Carta', 0.20, insumoCarta.id]);
      await db.run(insertServicio, ['Copia B/N Oficio', 0.07, insumoOficio.id]);
      await db.run(insertServicio, ['Copia Color Oficio', 0.18, insumoOficio.id]);
      await db.run(insertServicio, ['Impresión B/N Oficio', 0.07, insumoOficio.id]);
      await db.run(insertServicio, ['Impresión Color Oficio', 0.25, insumoOficio.id]);
    }

    await db.exec('COMMIT;');

    // ─── Migrations ───────────────────────────────────────────────────────────
    // Add ganancia_neta_usd to cierres_dia if it doesn't exist yet
    try {
      await db.run('ALTER TABLE cierres_dia ADD COLUMN ganancia_neta_usd REAL DEFAULT 0');
      console.log('[DB] Migration: added ganancia_neta_usd to cierres_dia');
    } catch (_) { /* column already exists */ }

    // Add dual-pricing columns to productos if they don't exist
    try {
      await db.run('ALTER TABLE productos ADD COLUMN precio_compra_ves REAL NOT NULL DEFAULT 0');
      await db.run('ALTER TABLE productos ADD COLUMN precio_venta_ves REAL NOT NULL DEFAULT 0');
      await db.run("ALTER TABLE productos ADD COLUMN moneda_precio TEXT DEFAULT 'usd'");
      console.log('[DB] Migration: added dual-pricing columns to productos');
    } catch (_) { /* columns already exist */ }

    // Add dual-pricing columns to servicios if they don't exist
    try {
      await db.run('ALTER TABLE servicios ADD COLUMN precio_ves REAL NOT NULL DEFAULT 0');
      await db.run("ALTER TABLE servicios ADD COLUMN moneda_precio TEXT DEFAULT 'usd'");
      console.log('[DB] Migration: added dual-pricing columns to servicios');
    } catch (_) { /* columns already exist */ }

    // Deduplicate servicios — keep only the highest-id row per name
    try {
      const result = await db.run(`
        DELETE FROM servicios
        WHERE id NOT IN (
          SELECT MAX(id) FROM servicios GROUP BY nombre
        )
      `);
      if (result.changes > 0) {
        console.log(`[DB] Migration: removed ${result.changes} duplicate service row(s)`);
      }
    } catch (e) {
      console.warn('[DB] Migration: deduplication failed', e.message);
    }

    // Deduplicate insumos — keep only the highest-id row per name
    try {
      const result = await db.run(`
        DELETE FROM insumos
        WHERE id NOT IN (
          SELECT MAX(id) FROM insumos GROUP BY nombre
        )
      `);
      if (result.changes > 0) {
        console.log(`[DB] Migration: removed ${result.changes} duplicate insumo row(s)`);
      }
    } catch (e) {
      console.warn('[DB] Migration: insumos deduplication failed', e.message);
    }

    console.log('[DB] Database initialized successfully.');
    return db;
  } catch (error) {
    if (db) {
      try { await db.exec('ROLLBACK;'); } catch (e) { }
    }
    console.error('[DB] CRITICAL ERROR during initDb:', error);
    throw error;
  }
}

module.exports = { getDb, initDb };
