import { jest, describe, it, expect, beforeEach, afterAll } from '@jest/globals';
import { open, Database as SqliteDb } from 'sqlite';
import sqlite3 from 'sqlite3';
import { SqliteCuentasRepository } from './SqliteCuentasRepository';

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
      estado TEXT NOT NULL,
      cliente_nombre TEXT DEFAULT '',
      saldo_pendiente_usd REAL NOT NULL DEFAULT 0,
      notas TEXT DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS detalle_venta (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      venta_id INTEGER REFERENCES ventas(id),
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
      venta_id INTEGER REFERENCES ventas(id),
      metodo TEXT NOT NULL,
      monto_usd REAL DEFAULT 0,
      monto_ves REAL DEFAULT 0,
      fecha TEXT DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS abonos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      venta_id INTEGER REFERENCES ventas(id),
      metodo TEXT NOT NULL,
      monto_usd REAL DEFAULT 0,
      monto_ves REAL DEFAULT 0,
      fecha TEXT DEFAULT (datetime('now','localtime'))
    );
  `);

  return db;
}

describe('SqliteCuentasRepository Integration', () => {
  let dbConn: SqliteDb;
  let repo: SqliteCuentasRepository;

  beforeEach(async () => {
    dbConn = await createTestDb();
    repo = new SqliteCuentasRepository({ getConnection: () => dbConn } as any);
  });

  afterAll(async () => {
    if (dbConn) await dbConn.close();
  });

  it('should list only credit sales', async () => {
    await dbConn.run('INSERT INTO ventas (subtotal_usd, total_usd, estado, saldo_pendiente_usd) VALUES (10, 10, "pagada", 0)');
    await dbConn.run('INSERT INTO ventas (subtotal_usd, total_usd, estado, saldo_pendiente_usd) VALUES (20, 20, "credito", 10)');

    const res = await repo.listCreditos();
    expect(res.isSuccess).toBe(true);
    const creditos = res.getValue()!;
    expect(creditos.length).toBe(1);
    expect(creditos[0].estado).toBe('credito');
    expect(creditos[0].total).toBe(20);
  });

  it('should get credit detail including items and payments', async () => {
    const info = await dbConn.run('INSERT INTO ventas (subtotal_usd, total_usd, estado, saldo_pendiente_usd) VALUES (20, 20, "credito", 10)');
    const vId = info.lastID!;

    await dbConn.run('INSERT INTO detalle_venta (venta_id, tipo, ref_id, nombre, cantidad, precio_unitario_usd, subtotal_usd) VALUES (?, "producto", 1, "Lapiz", 2, 10, 20)', [vId]);
    await dbConn.run('INSERT INTO abonos (venta_id, metodo, monto_ves) VALUES (?, "efectivo", 10)', [vId]);

    const res = await repo.getCredito(vId);
    expect(res.isSuccess).toBe(true);
    const venta = res.getValue()!;
    expect(venta).not.toBeNull();
    expect(venta.detalles?.length).toBe(1);
    expect(venta.abonos?.length).toBe(1);
  });

  it('should add an abono and update saldo_pendiente', async () => {
    const info = await dbConn.run('INSERT INTO ventas (subtotal_usd, total_usd, estado, saldo_pendiente_usd) VALUES (20, 20, "credito", 20)');
    const vId = info.lastID!;

    const res = await repo.abonar(vId, { metodo: 'zelle', monto: 15 });
    expect(res.isSuccess).toBe(true);
    
    const value = res.getValue()!;
    expect(value.saldo_pendiente).toBe(5);
    expect(value.estado).toBe('credito');

    const check = await dbConn.get('SELECT saldo_pendiente_usd FROM ventas WHERE id = ?', [vId]);
    expect(check.saldo_pendiente_usd).toBe(5);
  });

  it('should close credit if abono covers saldo', async () => {
    const info = await dbConn.run('INSERT INTO ventas (subtotal_usd, total_usd, estado, saldo_pendiente_usd) VALUES (20, 20, "credito", 20)');
    const vId = info.lastID!;

    const res = await repo.abonar(vId, { metodo: 'zelle', monto: 20 });
    expect(res.getValue()!.estado).toBe('pagada');
    expect(res.getValue()!.saldo_pendiente).toBe(0);
  });

  it('should adjust deuda', async () => {
    const info = await dbConn.run('INSERT INTO ventas (subtotal_usd, total_usd, estado, saldo_pendiente_usd) VALUES (20, 20, "credito", 20)');
    const vId = info.lastID!;

    const res = await repo.ajustarDeuda(vId, 15);
    expect(res.isSuccess).toBe(true);
    expect(res.getValue()!.saldo_pendiente).toBe(15);
    expect(res.getValue()!.estado).toBe('credito');

    const venta = await dbConn.get('SELECT total_usd FROM ventas WHERE id = ?', [vId]);
    expect(venta.total_usd).toBe(15); // It adjusts the total as well
  });

  it('should sync price of an item and update venta subtotal and total', async () => {
    const vInfo = await dbConn.run('INSERT INTO ventas (subtotal_usd, total_usd, estado, saldo_pendiente_usd) VALUES (20, 20, "credito", 20)');
    const vId = vInfo.lastID!;

    const dInfo = await dbConn.run('INSERT INTO detalle_venta (venta_id, tipo, ref_id, nombre, cantidad, precio_unitario_usd, subtotal_usd) VALUES (?, "producto", 1, "Lapiz", 2, 10, 20)', [vId]);
    const dId = dInfo.lastID!;

    const res = await repo.sincronizarPrecioArticulo(vId, dId, 12);
    expect(res.isSuccess).toBe(true);
    
    const val = res.getValue()!;
    expect(val.saldo_pendiente).toBe(24); // old total 20 + 4 delta
    expect(val.total).toBe(24);

    const checkDetalle = await dbConn.get('SELECT subtotal_usd FROM detalle_venta WHERE id = ?', [dId]);
    expect(checkDetalle.subtotal_usd).toBe(24); // 2 * 12
  });
});
