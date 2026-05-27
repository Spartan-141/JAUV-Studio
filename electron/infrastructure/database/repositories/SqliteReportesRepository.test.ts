import { jest, describe, it, expect, beforeEach, afterAll } from '@jest/globals';
import { open, Database as SqliteDb } from 'sqlite';
import sqlite3 from 'sqlite3';
import { SqliteReportesRepository } from './SqliteReportesRepository';

async function createTestDb(): Promise<SqliteDb> {
  const db = await open({
    filename: ':memory:',
    driver: sqlite3.Database
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS productos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      codigo TEXT,
      nombre TEXT NOT NULL,
      marca TEXT,
      precio_compra_ves REAL DEFAULT 0,
      precio_venta_ves REAL DEFAULT 0,
      stock_actual INTEGER DEFAULT 0,
      stock_minimo INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS ventas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fecha TEXT DEFAULT (datetime('now','localtime')),
      subtotal_usd REAL NOT NULL,
      descuento_otorgado_usd REAL NOT NULL DEFAULT 0,
      total_usd REAL NOT NULL,
      estado TEXT NOT NULL,
      cliente_nombre TEXT DEFAULT '',
      saldo_pendiente_usd REAL NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS detalle_venta (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      venta_id INTEGER REFERENCES ventas(id),
      tipo TEXT NOT NULL,
      ref_id INTEGER NOT NULL,
      nombre TEXT NOT NULL,
      cantidad INTEGER NOT NULL,
      precio_unitario_usd REAL NOT NULL,
      subtotal_usd REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS pagos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      venta_id INTEGER REFERENCES ventas(id),
      metodo TEXT NOT NULL,
      monto_ves REAL DEFAULT 0,
      fecha TEXT DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS abonos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      venta_id INTEGER REFERENCES ventas(id),
      metodo TEXT NOT NULL,
      monto_ves REAL DEFAULT 0,
      fecha TEXT DEFAULT (datetime('now','localtime'))
    );
  `);

  return db;
}

describe('SqliteReportesRepository Integration', () => {
  let dbConn: SqliteDb;
  let repo: SqliteReportesRepository;

  beforeEach(async () => {
    dbConn = await createTestDb();
    repo = new SqliteReportesRepository({ getConnection: () => dbConn } as any);
  });

  afterAll(async () => {
    if (dbConn) await dbConn.close();
  });

  it('should get inventario stats and bajo_stock', async () => {
    await dbConn.run('INSERT INTO productos (nombre, precio_compra_ves, precio_venta_ves, stock_actual, stock_minimo) VALUES ("P1", 10, 15, 2, 5)');
    await dbConn.run('INSERT INTO productos (nombre, precio_compra_ves, precio_venta_ves, stock_actual, stock_minimo) VALUES ("P2", 20, 30, 10, 5)');

    const res = await repo.getInventario();
    expect(res.isSuccess).toBe(true);

    const data = res.getValue()!;
    expect(data.stats.total_productos).toBe(2);
    expect(data.stats.total_articulos).toBe(12); // 2 + 10
    expect(data.stats.inversion).toBe(220); // (10*2) + (20*10) = 20 + 200
    expect(data.stats.ganancia_potencial).toBe(110); // ((15-10)*2) + ((30-20)*10) = 10 + 100
    
    expect(data.bajo_stock.length).toBe(1);
    expect(data.bajo_stock[0].nombre).toBe('P1');
  });

  it('should get reporte del dia', async () => {
    const today = new Date().toISOString().split('T')[0];
    const datetime = today + ' 12:00:00';

    await dbConn.run(`
      INSERT INTO ventas (fecha, subtotal_usd, descuento_otorgado_usd, total_usd, estado, saldo_pendiente_usd) 
      VALUES (?, 100, 10, 90, "pagada", 0)
    `, [datetime]);
    const v1Id = (await dbConn.get('SELECT last_insert_rowid() as id')).id;

    await dbConn.run(`
      INSERT INTO ventas (fecha, subtotal_usd, descuento_otorgado_usd, total_usd, estado, saldo_pendiente_usd) 
      VALUES (?, 50, 0, 50, "credito", 20)
    `, [datetime]);

    await dbConn.run('INSERT INTO pagos (venta_id, metodo, monto_ves) VALUES (?, "efectivo", 90)', [v1Id]);

    const res = await repo.getHoy(today);
    expect(res.isSuccess).toBe(true);
    
    const data = res.getValue()!;
    expect(data.total_ventas).toBe(2);
    expect(data.ingresos).toBe(140); // 90 + 50
    expect(data.descuentos).toBe(10);
    expect(data.pendiente_cobrar).toBe(20);
    expect(data.pagos.length).toBe(1);
    expect(data.pagos[0].total_ves).toBe(90);
    expect(data.ventas.length).toBe(2);
  });

  it('should get dashboard metrics', async () => {
    const today = new Date().toISOString().split('T')[0];
    const datetime = today + ' 12:00:00';

    await dbConn.run(`
      INSERT INTO ventas (fecha, subtotal_usd, descuento_otorgado_usd, total_usd, estado, saldo_pendiente_usd, cliente_nombre) 
      VALUES (?, 100, 0, 100, "credito", 50, "Juan Perez")
    `, [datetime]);

    const vId = (await dbConn.get('SELECT last_insert_rowid() as id')).id;

    await dbConn.run(`
      INSERT INTO detalle_venta (venta_id, tipo, ref_id, nombre, cantidad, precio_unitario_usd, subtotal_usd)
      VALUES (?, "producto", 1, "Lapiz", 5, 20, 100)
    `, [vId]);

    const res = await repo.getDashboardMetrics();
    expect(res.isSuccess).toBe(true);
    
    const data = res.getValue()!;
    
    // Check Top Deudores
    expect(data.top_deudores.length).toBe(1);
    expect(data.top_deudores[0].nombre).toBe('Juan Perez');
    expect(data.top_deudores[0].deuda).toBe(50);

    // Check Top Productos
    expect(data.top_productos.length).toBe(1);
    expect(data.top_productos[0].nombre).toBe('Lapiz');
    expect(data.top_productos[0].total_vendido).toBe(5);

    // Check Trend
    expect(data.trend.length).toBeGreaterThanOrEqual(7);
    const todayTrend = data.trend.find((t: any) => t.fecha === today);
    expect(todayTrend).toBeDefined();
    expect(todayTrend.total).toBe(100);
  });
});
