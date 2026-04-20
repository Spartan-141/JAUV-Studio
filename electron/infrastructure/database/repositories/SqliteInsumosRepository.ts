import { IInsumosRepository, Insumo } from '../../../domain/repositories/interfaces/IInsumosRepository';
import { Result, ResultFactory } from '../../../domain/common/Result';
import { Database } from '../connection/Database';

export class SqliteInsumosRepository implements IInsumosRepository {
  private db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  async getAll(): Promise<Result<Insumo[]>> {
    try {
      const dbConn = this.db.getConnection();
      const rows = await dbConn.all('SELECT * FROM insumos ORDER BY nombre ASC');
      return ResultFactory.ok(rows as Insumo[]);
    } catch (e) {
      return ResultFactory.fail(e instanceof Error ? e : String(e));
    }
  }

  async create(data: Omit<Insumo, 'id'>): Promise<Result<{ id: number; }>> {
    try {
      const dbConn = this.db.getConnection();
      const info = await dbConn.run(`
        INSERT INTO insumos (nombre, tipo, stock_hojas, stock_minimo, costo_por_hoja_usd)
        VALUES (?, ?, ?, ?, ?)
      `, [data.nombre, data.tipo, data.stock_hojas, data.stock_minimo, data.costo_por_hoja_usd]);
      if (!info.lastID) throw new Error('No lastID returned');
      return ResultFactory.ok({ id: info.lastID });
    } catch (e) {
      return ResultFactory.fail(e instanceof Error ? e : String(e));
    }
  }

  async update(id: number, data: Omit<Insumo, 'id'>): Promise<Result<void>> {
    try {
      const dbConn = this.db.getConnection();
      await dbConn.run(`
        UPDATE insumos SET nombre=?, tipo=?, stock_hojas=?,
        stock_minimo=?, costo_por_hoja_usd=? WHERE id=?
      `, [data.nombre, data.tipo, data.stock_hojas, data.stock_minimo, data.costo_por_hoja_usd, id]);
      return ResultFactory.ok(undefined);
    } catch (e) {
      return ResultFactory.fail(e instanceof Error ? e : String(e));
    }
  }

  async delete(id: number): Promise<Result<void>> {
    try {
      const dbConn = this.db.getConnection();
      await dbConn.run('DELETE FROM insumos WHERE id = ?', [id]);
      return ResultFactory.ok(undefined);
    } catch (e) {
      return ResultFactory.fail(e instanceof Error ? e : String(e));
    }
  }

  async ajustarStock(id: number, cantidad: number, operacion: 'sumar' | 'restar'): Promise<Result<{ stock_hojas: number; }>> {
    try {
      const dbConn = this.db.getConnection();
      await dbConn.exec('BEGIN TRANSACTION;');
      const insumo = await dbConn.get('SELECT stock_hojas FROM insumos WHERE id=?', [id]);
      if (!insumo) {
        await dbConn.exec('ROLLBACK;');
        return ResultFactory.fail(new Error('Insumo no encontrado'));
      }
      
      const nuevo = operacion === 'sumar'
        ? insumo.stock_hojas + cantidad
        : Math.max(0, insumo.stock_hojas - cantidad);
        
      await dbConn.run('UPDATE insumos SET stock_hojas=? WHERE id=?', [nuevo, id]);
      await dbConn.exec('COMMIT;');
      
      return ResultFactory.ok({ stock_hojas: nuevo });
    } catch (e) {
      const dbConn = this.db.getConnection();
      await dbConn.exec('ROLLBACK;');
      return ResultFactory.fail(e instanceof Error ? e : String(e));
    }
  }
}
