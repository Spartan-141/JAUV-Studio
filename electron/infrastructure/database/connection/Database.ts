import { Database as SqliteDb } from 'sqlite';
import { IUnitOfWork } from '../../../application/interfaces/IUnitOfWork';

// We import the existing db.js methods using require to bridge JS and TS
const legacyDb = require('../../../database/db.js');

export class Database {
  private static instance: Database;
  
  private constructor() {}

  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  public getConnection(): SqliteDb {
    return legacyDb.getDb();
  }
}

export class SqliteUnitOfWork implements IUnitOfWork {
  private db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  async start(): Promise<void> {
    const conn = this.db.getConnection();
    await conn.exec('BEGIN TRANSACTION;');
  }

  async commit(): Promise<void> {
    const conn = this.db.getConnection();
    await conn.exec('COMMIT;');
  }

  async rollback(): Promise<void> {
    const conn = this.db.getConnection();
    // Use rollback safely
    try {
      await conn.exec('ROLLBACK;');
    } catch (e) {
      console.warn('Rollback failed:', e);
    }
  }
}
