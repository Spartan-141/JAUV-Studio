import { jest, describe, it, expect, beforeEach, afterAll } from '@jest/globals';
import { open, Database as SqliteDb } from 'sqlite';
import sqlite3 from 'sqlite3';
import { SqliteMermasRepository } from './SqliteMermasRepository';

async function createTestDb(): Promise<SqliteDb> {
  const db = await open({
    filename: ':memory:',
    driver: sqlite3.Database
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS productos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS insumos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS mermas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      producto_id INTEGER REFERENCES productos(id) ON DELETE SET NULL,
      insumo_id INTEGER REFERENCES insumos(id) ON DELETE SET NULL,
      cantidad REAL NOT NULL,
      motivo TEXT NOT NULL,
      notas TEXT DEFAULT '',
      fecha TEXT DEFAULT (datetime('now','localtime'))
    );
  `);

  return db;
}

describe('SqliteMermasRepository Integration', () => {
  let dbConn: SqliteDb;
  let repo: SqliteMermasRepository;

  beforeEach(async () => {
    dbConn = await createTestDb();
    repo = new SqliteMermasRepository({ getConnection: () => dbConn } as any);
  });

  afterAll(async () => {
    if (dbConn) await dbConn.close();
  });

  it('should create and list a merma of a product', async () => {
    await dbConn.run('INSERT INTO productos (nombre) VALUES (?)', ['Cuaderno']);
    
    const res = await repo.create({
      producto_id: 1,
      insumo_id: null,
      cantidad: 2,
      motivo: 'Dañado',
      notas: 'Se mojó'
    });

    expect(res.isSuccess).toBe(true);
    const id = res.getValue()!.id;

    const listRes = await repo.list();
    expect(listRes.isSuccess).toBe(true);
    const mermas = listRes.getValue()!;
    expect(mermas.length).toBe(1);
    expect(mermas[0].id).toBe(id);
    expect(mermas[0].producto_nombre).toBe('Cuaderno');
    expect(mermas[0].insumo_nombre).toBeNull();
  });

  it('should create and list a merma of an insumo', async () => {
    await dbConn.run('INSERT INTO insumos (nombre) VALUES (?)', ['Tinta']);
    
    const res = await repo.create({
      producto_id: null,
      insumo_id: 1,
      cantidad: 10,
      motivo: 'Vencida',
      notas: ''
    });

    expect(res.isSuccess).toBe(true);

    const mermas = (await repo.list()).getValue()!;
    const mermaInsumo = mermas.find(m => m.insumo_id === 1)!;
    expect(mermaInsumo.insumo_nombre).toBe('Tinta');
    expect(mermaInsumo.cantidad).toBe(10);
  });
});
