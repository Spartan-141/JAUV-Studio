import { IConfigRepository } from '../../../domain/repositories/interfaces/IConfigRepository';
import { Result, ResultFactory } from '../../../domain/common/Result';
import { Database } from '../connection/Database';

export class SqliteConfigRepository implements IConfigRepository {
  private db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  async get(key: string): Promise<Result<string>> {
    try {
      const db = this.db.getConnection();
      const row = await db.get('SELECT valor FROM configuracion WHERE clave = ?', [key]);
      if (!row) {
        return ResultFactory.fail(new Error(`Config key not found: ${key}`));
      }
      return ResultFactory.ok(row.valor);
    } catch (e) {
      return ResultFactory.fail(e instanceof Error ? e : String(e));
    }
  }

  async getAll(): Promise<Result<Record<string, string>>> {
    try {
      const db = this.db.getConnection();
      const rows = await db.all('SELECT clave, valor FROM configuracion');
      const record: Record<string, string> = {};
      rows.forEach((row: { clave: string; valor: string }) => {
        record[row.clave] = row.valor;
      });
      return ResultFactory.ok(record);
    } catch (e) {
      return ResultFactory.fail(e instanceof Error ? e : String(e));
    }
  }

  async set(key: string, value: string): Promise<Result<void>> {
    try {
      const db = this.db.getConnection();
      await db.run(
        'INSERT INTO configuracion (clave, valor) VALUES (?, ?) ON CONFLICT(clave) DO UPDATE SET valor=excluded.valor',
        [key, value]
      );
      return ResultFactory.ok(undefined);
    } catch (e) {
      return ResultFactory.fail(e instanceof Error ? e : String(e));
    }
  }

  async setMultiple(configs: Record<string, string>): Promise<Result<void>> {
    try {
      const db = this.db.getConnection();
      await db.exec('BEGIN TRANSACTION;');
      for (const [key, value] of Object.entries(configs)) {
        await db.run(
          'INSERT INTO configuracion (clave, valor) VALUES (?, ?) ON CONFLICT(clave) DO UPDATE SET valor=excluded.valor',
          [key, value]
        );
      }
      await db.exec('COMMIT;');
      return ResultFactory.ok(undefined);
    } catch (e) {
      const db = this.db.getConnection();
      await db.exec('ROLLBACK;');
      return ResultFactory.fail(e instanceof Error ? e : String(e));
    }
  }
}
