import { jest, describe, it, expect, beforeEach, afterAll } from '@jest/globals';
import { open, Database as SqliteDb } from 'sqlite';
import sqlite3 from 'sqlite3';
import { SqliteProductosRepository } from './SqliteProductosRepository';

async function createTestDb(): Promise<SqliteDb> {
  const db = await open({
    filename: ':memory:',
    driver: sqlite3.Database
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS categorias (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS productos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      codigo TEXT UNIQUE,
      nombre TEXT NOT NULL,
      marca TEXT,
      precio_compra_usd REAL NOT NULL DEFAULT 0,
      precio_venta_usd REAL NOT NULL DEFAULT 0,
      precio_compra_ves REAL NOT NULL DEFAULT 0,
      precio_venta_ves REAL NOT NULL DEFAULT 0,
      moneda_precio TEXT NOT NULL DEFAULT 'ves',
      stock_actual INTEGER DEFAULT 0,
      stock_minimo INTEGER DEFAULT 0,
      categoria_id INTEGER REFERENCES categorias(id) ON DELETE SET NULL,
      descripcion TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );
  `);

  return db;
}

describe('SqliteProductosRepository Integration', () => {
  let dbConn: SqliteDb;
  let repo: SqliteProductosRepository;

  beforeEach(async () => {
    dbConn = await createTestDb();
    repo = new SqliteProductosRepository({ getConnection: () => dbConn } as any);
  });

  afterAll(async () => {
    if (dbConn) await dbConn.close();
  });

  it('should create and retrieve a product', async () => {
    const data = {
      codigo: 'P001',
      nombre: 'Cuaderno',
      marca: 'Norma',
      precio_compra: 10,
      precio_venta: 15,
      stock_actual: 50,
      stock_minimo: 10,
      categoria_id: null,
      descripcion: 'Cuaderno cuadriculado'
    };

    const createResult = await repo.create(data);
    expect(createResult.isSuccess).toBe(true);
    const { id } = createResult.getValue()!;

    const getResult = await repo.getById(id);
    expect(getResult.isSuccess).toBe(true);
    const prod = getResult.getValue()!;
    expect(prod.nombre).toBe('Cuaderno');
    expect(prod.codigo).toBe('P001');
    expect(prod.stock_actual).toBe(50);
  });

  it('should list products with filters', async () => {
    await repo.create({ codigo: 'P01', nombre: 'Lapiz', marca: 'Mongol', precio_compra: 1, precio_venta: 2, stock_actual: 5, stock_minimo: 10, categoria_id: null, descripcion: '' });
    await repo.create({ codigo: 'P02', nombre: 'Borrador', marca: 'Nata', precio_compra: 0.5, precio_venta: 1, stock_actual: 20, stock_minimo: 5, categoria_id: null, descripcion: '' });

    // Filter by under stock
    const listResult = await repo.list({ bajo_stock: true });
    expect(listResult.isSuccess).toBe(true);
    const lowStock = listResult.getValue()!;
    expect(lowStock.length).toBe(1);
    expect(lowStock[0].nombre).toBe('Lapiz');

    // Filter by search
    const searchResult = await repo.list({ search: 'borr' });
    expect(searchResult.getValue()![0].nombre).toBe('Borrador');
  });

  it('should paginate products', async () => {
    for (let i = 1; i <= 15; i++) {
      await repo.create({ codigo: `C${i}`, nombre: `Prod ${i}`, marca: '', precio_compra: 1, precio_venta: 2, stock_actual: 10, stock_minimo: 5, categoria_id: null, descripcion: '' });
    }

    const pageResult = await repo.paginate({ page: 1, perPage: 10 });
    expect(pageResult.isSuccess).toBe(true);
    const pageData = pageResult.getValue()!;
    expect(pageData.productos.length).toBe(10);
    expect(pageData.total).toBe(15);
    expect(pageData.pages).toBe(2);
  });

  it('should check if code exists', async () => {
    await repo.create({ codigo: 'UNIQUE-123', nombre: 'Test', marca: '', precio_compra: 1, precio_venta: 2, stock_actual: 1, stock_minimo: 1, categoria_id: null, descripcion: '' });

    const existsTrue = await repo.codeExists('UNIQUE-123');
    expect(existsTrue.getValue()).toBe(true);

    const existsFalse = await repo.codeExists('NOT-EXISTS');
    expect(existsFalse.getValue()).toBe(false);
  });

  it('should update a product', async () => {
    const createRes = await repo.create({ codigo: 'P1', nombre: 'Old Name', marca: '', precio_compra: 1, precio_venta: 2, stock_actual: 1, stock_minimo: 1, categoria_id: null, descripcion: '' });
    const id = createRes.getValue()!.id;

    const updateRes = await repo.update(id, { codigo: 'P1', nombre: 'New Name', marca: 'New Marca', precio_compra: 2, precio_venta: 4, stock_actual: 5, stock_minimo: 2, categoria_id: null, descripcion: '' });
    expect(updateRes.isSuccess).toBe(true);

    const prod = (await repo.getById(id)).getValue()!;
    expect(prod.nombre).toBe('New Name');
    expect(prod.precio_venta).toBe(4);
  });

  it('should delete a product', async () => {
    const createRes = await repo.create({ codigo: 'P1', nombre: 'Del Me', marca: '', precio_compra: 1, precio_venta: 2, stock_actual: 1, stock_minimo: 1, categoria_id: null, descripcion: '' });
    const id = createRes.getValue()!.id;

    const deleteRes = await repo.delete(id);
    expect(deleteRes.isSuccess).toBe(true);

    const getRes = await repo.getById(id);
    expect(getRes.isSuccess).toBe(false);
  });
});
