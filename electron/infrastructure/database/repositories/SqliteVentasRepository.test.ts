import { jest, describe, it, expect, beforeEach, afterAll } from '@jest/globals';
import { open, Database as SqliteDb } from 'sqlite';
import sqlite3 from 'sqlite3';
import { SqliteVentasRepository } from './SqliteVentasRepository';
import { Database } from '../connection/Database';

// Helper to create an in-memory DB with the schema
async function createTestDb(): Promise<SqliteDb> {
  const db = await open({
    filename: ':memory:',
    driver: sqlite3.Database
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS ventas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fecha TEXT DEFAULT (datetime('now','localtime')),
      subtotal_usd REAL NOT NULL,
      descuento_otorgado_usd REAL NOT NULL DEFAULT 0,
      total_usd REAL NOT NULL,
      tasa_cambio REAL NOT NULL DEFAULT 1,
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
      monto_usd REAL NOT NULL DEFAULT 0,
      monto_ves REAL DEFAULT 0,
      fecha TEXT DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS abonos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      venta_id INTEGER NOT NULL REFERENCES ventas(id) ON DELETE CASCADE,
      metodo TEXT NOT NULL,
      monto_usd REAL NOT NULL DEFAULT 0,
      monto_ves REAL DEFAULT 0,
      fecha TEXT DEFAULT (datetime('now','localtime'))
    );
  `);

  return db;
}

describe('SqliteVentasRepository Integration', () => {
  let dbConn: SqliteDb;
  let repo: SqliteVentasRepository;
  let mockDbInstance: any;

  beforeEach(async () => {
    dbConn = await createTestDb();
    
    // We need to mock the Database wrapper to return our in-memory connection
    mockDbInstance = {
      getConnection: () => dbConn
    };
    
    repo = new SqliteVentasRepository(mockDbInstance as any);
  });

  afterAll(async () => {
    if (dbConn) await dbConn.close();
  });

  it('should insert a sale and retrieve it by id', async () => {
    const ventaData = {
      subtotal: 100,
      descuento_otorgado: 10,
      total: 90,
      estado: 'pagada',
      cliente_nombre: 'John Doe',
      saldo_pendiente: 0,
      notas: 'Test note'
    };

    const createResult = await repo.create(ventaData);
    expect(createResult.isSuccess).toBe(true);
    const ventaId = createResult.getValue()!;

    // Verify insertion in DB
    const rawRow = await dbConn.get('SELECT * FROM ventas WHERE id = ?', [ventaId]);
    expect(rawRow.total_usd).toBe(90);

    // Verify retrieval via repo
    const getResult = await repo.getById(ventaId);
    expect(getResult.isSuccess).toBe(true);
    const fetched = getResult.getValue()!;
    expect(fetched.total).toBe(90);
    expect(fetched.cliente_nombre).toBe('John Doe');
  });

  it('should add details and fetch them with the sale', async () => {
    const createResult = await repo.create({ subtotal: 50, total: 50, estado: 'pagada', descuento_otorgado: 0, saldo_pendiente: 0 } as any);
    const ventaId = createResult.getValue()!;

    await repo.addDetalle(ventaId, {
      tipo: 'producto',
      ref_id: 1,
      nombre: 'Prod A',
      cantidad: 2,
      precio_unitario: 25,
      subtotal: 50
    });

    const getResult = await repo.getById(ventaId);
    expect(getResult.getValue()?.detalles?.length).toBe(1);
    expect(getResult.getValue()?.detalles?.[0].nombre).toBe('Prod A');
  });
});
