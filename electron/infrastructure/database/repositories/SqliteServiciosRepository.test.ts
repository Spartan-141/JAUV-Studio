import { jest, describe, it, expect, beforeEach, afterAll } from '@jest/globals';
import { open, Database as SqliteDb } from 'sqlite';
import sqlite3 from 'sqlite3';
import { SqliteServiciosRepository } from './SqliteServiciosRepository';

async function createTestDb(): Promise<SqliteDb> {
  const db = await open({
    filename: ':memory:',
    driver: sqlite3.Database
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS insumos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS servicios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      precio_usd REAL NOT NULL DEFAULT 0,
      precio_ves REAL NOT NULL DEFAULT 0,
      moneda_precio TEXT NOT NULL DEFAULT 'ves',
      insumo_id INTEGER REFERENCES insumos(id) ON DELETE SET NULL,
      activo INTEGER DEFAULT 1
    );
  `);

  return db;
}

describe('SqliteServiciosRepository Integration', () => {
  let dbConn: SqliteDb;
  let repo: SqliteServiciosRepository;

  beforeEach(async () => {
    dbConn = await createTestDb();
    repo = new SqliteServiciosRepository({ getConnection: () => dbConn } as any);
  });

  afterAll(async () => {
    if (dbConn) await dbConn.close();
  });

  it('should create and retrieve a service', async () => {
    const res = await repo.create({ nombre: 'Fotocopia', precio: 5, insumo_id: null, activo: 1 });
    expect(res.isSuccess).toBe(true);
    const id = res.getValue()!.id;

    const listRes = await repo.getAll();
    expect(listRes.isSuccess).toBe(true);
    const s = listRes.getValue()!.find(x => x.id === id);
    expect(s).toBeDefined();
    expect(s!.nombre).toBe('Fotocopia');
    expect(s!.precio).toBe(5);
  });

  it('should update a service', async () => {
    const createRes = await repo.create({ nombre: 'Old', precio: 1, insumo_id: null, activo: 1 });
    const id = createRes.getValue()!.id;

    const updateRes = await repo.update(id, { nombre: 'New', precio: 2, insumo_id: null, activo: 0 });
    expect(updateRes.isSuccess).toBe(true);

    const list = (await repo.getAll()).getValue()!;
    expect(list[0].nombre).toBe('New');
    expect(list[0].activo).toBe(0);
  });

  it('should delete a service', async () => {
    const createRes = await repo.create({ nombre: 'DelMe', precio: 1, insumo_id: null, activo: 1 });
    const id = createRes.getValue()!.id;

    await repo.delete(id);

    const list = (await repo.getAll()).getValue()!;
    expect(list.length).toBe(0);
  });

  it('should search for services (active only)', async () => {
    await repo.create({ nombre: 'Impresion Color', precio: 10, insumo_id: null, activo: 1 });
    const res2 = await repo.create({ nombre: 'Impresion ByN', precio: 5, insumo_id: null, activo: 0 });
    await repo.update(res2.getValue()!.id, { nombre: 'Impresion ByN', precio: 5, insumo_id: null, activo: 0 }); // update sets activo

    const searchRes = await repo.search('impr');
    expect(searchRes.isSuccess).toBe(true);
    const results = searchRes.getValue()!;
    expect(results.length).toBe(1);
    expect(results[0].nombre).toBe('Impresion Color');
  });

  it('should get service with insumo info', async () => {
    await dbConn.run('INSERT INTO insumos (nombre) VALUES (?)', ['Tinta']);
    const insumoId = (await dbConn.get('SELECT id FROM insumos'))?.id;

    await repo.create({ nombre: 'Servicio con Insumo', precio: 10, insumo_id: insumoId, activo: 1 });

    const list = (await repo.getAll()).getValue()!;
    expect(list[0].insumo_nombre).toBe('Tinta');
  });
});
