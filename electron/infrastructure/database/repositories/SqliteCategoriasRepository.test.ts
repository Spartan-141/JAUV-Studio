import { jest, describe, it, expect, beforeEach, afterAll } from '@jest/globals';
import { open, Database as SqliteDb } from 'sqlite';
import sqlite3 from 'sqlite3';
import { SqliteCategoriasRepository } from './SqliteCategoriasRepository';

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
      nombre TEXT NOT NULL,
      marca TEXT,
      codigo TEXT,
      stock_actual INTEGER DEFAULT 0,
      categoria_id INTEGER REFERENCES categorias(id) ON DELETE SET NULL
    );
  `);

  return db;
}

describe('SqliteCategoriasRepository Integration', () => {
  let dbConn: SqliteDb;
  let repo: SqliteCategoriasRepository;
  let mockDbInstance: any;

  beforeEach(async () => {
    dbConn = await createTestDb();
    
    mockDbInstance = {
      getConnection: () => dbConn
    };
    
    repo = new SqliteCategoriasRepository(mockDbInstance as any);
  });

  afterAll(async () => {
    if (dbConn) await dbConn.close();
  });

  it('should create a category', async () => {
    const result = await repo.create('Papeleria');
    expect(result.isSuccess).toBe(true);
    const cat = result.getValue()!;
    expect(cat.nombre).toBe('Papeleria');
    expect(cat.id).toBeGreaterThan(0);
  });

  it('should get all categories with total_productos count', async () => {
    await repo.create('Papeleria');
    await dbConn.run('INSERT INTO productos (nombre, categoria_id) VALUES (?, ?)', ['Lapiz', 1]);
    await dbConn.run('INSERT INTO productos (nombre, categoria_id) VALUES (?, ?)', ['Borrador', 1]);

    const result = await repo.getAll();
    expect(result.isSuccess).toBe(true);
    const categorias = result.getValue()!;
    expect(categorias.length).toBe(1);
    expect(categorias[0].nombre).toBe('Papeleria');
    expect(categorias[0].total_productos).toBe(2);
  });

  it('should update a category', async () => {
    const createResult = await repo.create('Papeleria');
    const id = createResult.getValue()!.id;

    const updateResult = await repo.update(id, 'Oficina');
    expect(updateResult.isSuccess).toBe(true);

    const getResult = await repo.getAll();
    const categorias = getResult.getValue()!;
    expect(categorias[0].nombre).toBe('Oficina');
  });

  it('should delete a category and set product category_id to NULL', async () => {
    const createResult = await repo.create('Papeleria');
    const id = createResult.getValue()!.id;

    await dbConn.run('INSERT INTO productos (nombre, categoria_id) VALUES (?, ?)', ['Lapiz', id]);

    const deleteResult = await repo.delete(id);
    expect(deleteResult.isSuccess).toBe(true);

    const getResult = await repo.getAll();
    expect(getResult.getValue()!.length).toBe(0);

    const products = await dbConn.all('SELECT * FROM productos');
    expect(products[0].categoria_id).toBeNull();
  });

  it('should bulk assign categories to products', async () => {
    const cat1Result = await repo.create('Papeleria');
    const cat2Result = await repo.create('Oficina');
    const cat1Id = cat1Result.getValue()!.id;
    const cat2Id = cat2Result.getValue()!.id;

    const info1 = await dbConn.run('INSERT INTO productos (nombre, categoria_id) VALUES (?, ?)', ['Lapiz', cat1Id]);
    const info2 = await dbConn.run('INSERT INTO productos (nombre, categoria_id) VALUES (?, ?)', ['Grapa', cat1Id]);
    const p1 = info1.lastID!;
    const p2 = info2.lastID!;

    const assignResult = await repo.bulkAssignProductos(cat2Id, [p1, p2]);
    expect(assignResult.isSuccess).toBe(true);

    const products = await dbConn.all('SELECT * FROM productos');
    expect(products.find(p => p.id === p1)!.categoria_id).toBe(cat2Id);
    expect(products.find(p => p.id === p2)!.categoria_id).toBe(cat2Id);
  });
});
