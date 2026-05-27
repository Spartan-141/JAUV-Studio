import { jest, describe, it, expect, beforeEach, afterAll } from '@jest/globals';
import { open, Database as SqliteDb } from 'sqlite';
import sqlite3 from 'sqlite3';
import { SqliteConfigRepository } from './SqliteConfigRepository';

// Helper to create an in-memory DB with the schema
async function createTestDb(): Promise<SqliteDb> {
  const db = await open({
    filename: ':memory:',
    driver: sqlite3.Database
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS configuracion (
      clave TEXT PRIMARY KEY,
      valor TEXT NOT NULL
    );
  `);

  return db;
}

describe('SqliteConfigRepository Integration', () => {
  let dbConn: SqliteDb;
  let repo: SqliteConfigRepository;
  let mockDbInstance: any;

  beforeEach(async () => {
    dbConn = await createTestDb();
    
    // We need to mock the Database wrapper to return our in-memory connection
    mockDbInstance = {
      getConnection: () => dbConn
    };
    
    repo = new SqliteConfigRepository(mockDbInstance as any);
  });

  afterAll(async () => {
    if (dbConn) await dbConn.close();
  });

  it('should set and get a config value', async () => {
    const setResult = await repo.set('tasa_bcv', '36.5');
    expect(setResult.isSuccess).toBe(true);

    const getResult = await repo.get('tasa_bcv');
    expect(getResult.isSuccess).toBe(true);
    expect(getResult.getValue()).toBe('36.5');
  });

  it('should update an existing config value', async () => {
    await repo.set('tasa_bcv', '36.5');
    const updateResult = await repo.set('tasa_bcv', '40.2');
    expect(updateResult.isSuccess).toBe(true);

    const getResult = await repo.get('tasa_bcv');
    expect(getResult.isSuccess).toBe(true);
    expect(getResult.getValue()).toBe('40.2');
  });

  it('should return fail if key does not exist', async () => {
    const getResult = await repo.get('non_existent_key');
    expect(getResult.isSuccess).toBe(false);
    expect(getResult.getError()?.message).toContain('Config key not found');
  });

  it('should set and get multiple configs', async () => {
    const configs = {
      'tasa_bcv': '36.5',
      'nombre_tienda': 'JAUV Studio'
    };

    const setMultipleResult = await repo.setMultiple(configs);
    expect(setMultipleResult.isSuccess).toBe(true);

    const getAllResult = await repo.getAll();
    expect(getAllResult.isSuccess).toBe(true);
    const allConfigs = getAllResult.getValue()!;
    expect(allConfigs['tasa_bcv']).toBe('36.5');
    expect(allConfigs['nombre_tienda']).toBe('JAUV Studio');
  });
});
