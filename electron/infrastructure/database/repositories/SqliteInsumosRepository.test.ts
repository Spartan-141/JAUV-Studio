import { jest, describe, it, expect, beforeEach, afterAll } from '@jest/globals';
import { open, Database as SqliteDb } from 'sqlite';
import sqlite3 from 'sqlite3';
import { SqliteInsumosRepository } from './SqliteInsumosRepository';

async function createTestDb(): Promise<SqliteDb> {
  const db = await open({
    filename: ':memory:',
    driver: sqlite3.Database
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS insumos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      tipo TEXT NOT NULL,
      stock_hojas INTEGER DEFAULT 0,
      stock_minimo INTEGER DEFAULT 0,
      costo_por_hoja_usd REAL NOT NULL DEFAULT 0
    );
  `);

  return db;
}

describe('SqliteInsumosRepository Integration', () => {
  let dbConn: SqliteDb;
  let repo: SqliteInsumosRepository;

  beforeEach(async () => {
    dbConn = await createTestDb();
    repo = new SqliteInsumosRepository({ getConnection: () => dbConn } as any);
  });

  afterAll(async () => {
    if (dbConn) await dbConn.close();
  });

  it('should create and get all insumos', async () => {
    const res = await repo.create({
      nombre: 'Papel Carta',
      tipo: 'hoja',
      stock_hojas: 500,
      stock_minimo: 100,
      costo_por_hoja: 0.1
    });

    expect(res.isSuccess).toBe(true);

    const listRes = await repo.getAll();
    expect(listRes.isSuccess).toBe(true);
    const list = listRes.getValue()!;
    expect(list.length).toBe(1);
    expect(list[0].nombre).toBe('Papel Carta');
  });

  it('should update an insumo', async () => {
    const createRes = await repo.create({ nombre: 'Old', tipo: 'otro', stock_hojas: 10, stock_minimo: 5, costo_por_hoja: 1 });
    const id = createRes.getValue()!.id;

    const updateRes = await repo.update(id, { nombre: 'New Name', tipo: 'otro', stock_hojas: 15, stock_minimo: 5, costo_por_hoja: 1 });
    expect(updateRes.isSuccess).toBe(true);

    const list = (await repo.getAll()).getValue()!;
    expect(list[0].nombre).toBe('New Name');
    expect(list[0].stock_hojas).toBe(15);
  });

  it('should delete an insumo', async () => {
    const createRes = await repo.create({ nombre: 'To delete', tipo: 'otro', stock_hojas: 10, stock_minimo: 5, costo_por_hoja: 1 });
    const id = createRes.getValue()!.id;

    await repo.delete(id);

    const list = (await repo.getAll()).getValue()!;
    expect(list.length).toBe(0);
  });

  it('should adjust stock', async () => {
    const createRes = await repo.create({ nombre: 'Papel', tipo: 'hoja', stock_hojas: 100, stock_minimo: 5, costo_por_hoja: 1 });
    const id = createRes.getValue()!.id;

    const addRes = await repo.ajustarStock(id, 50, 'sumar');
    expect(addRes.isSuccess).toBe(true);
    expect(addRes.getValue()!.stock_hojas).toBe(150);

    const subRes = await repo.ajustarStock(id, 20, 'restar');
    expect(subRes.isSuccess).toBe(true);
    expect(subRes.getValue()!.stock_hojas).toBe(130);
  });

  it('should not allow negative stock when adjusting', async () => {
    const createRes = await repo.create({ nombre: 'Papel', tipo: 'hoja', stock_hojas: 10, stock_minimo: 5, costo_por_hoja: 1 });
    const id = createRes.getValue()!.id;

    const subRes = await repo.ajustarStock(id, 50, 'restar');
    expect(subRes.isSuccess).toBe(true);
    expect(subRes.getValue()!.stock_hojas).toBe(0); // Math.max(0)
  });

  it('should execute ajustarStockRaw', async () => {
    const createRes = await repo.create({ nombre: 'Papel', tipo: 'hoja', stock_hojas: 100, stock_minimo: 5, costo_por_hoja: 1 });
    const id = createRes.getValue()!.id;

    await repo.ajustarStockRaw(id, 30, 'restar');
    
    const list = (await repo.getAll()).getValue()!;
    expect(list[0].stock_hojas).toBe(70);
  });
});
