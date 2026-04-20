import { IServiciosRepository, Servicio } from '../../../domain/repositories/interfaces/IServiciosRepository';
import { Result, ResultFactory } from '../../../domain/common/Result';
import { Database } from '../connection/Database';

export class SqliteServiciosRepository implements IServiciosRepository {
  private db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  async getAll(): Promise<Result<Servicio[]>> {
    try {
      const dbConn = this.db.getConnection();
      const rows = await dbConn.all(`
        SELECT s.*, i.nombre AS insumo_nombre FROM servicios s
        LEFT JOIN insumos i ON i.id = s.insumo_id
        ORDER BY s.nombre ASC
      `);
      return ResultFactory.ok(rows as Servicio[]);
    } catch (e) {
      return ResultFactory.fail(e instanceof Error ? e : String(e));
    }
  }

  async create(data: Omit<Servicio, 'id' | 'insumo_nombre'>): Promise<Result<{ id: number; }>> {
    try {
      const dbConn = this.db.getConnection();
      const info = await dbConn.run(`
        INSERT INTO servicios (nombre, precio_usd, precio_ves, moneda_precio, insumo_id)
        VALUES (?, ?, ?, ?, ?)
      `, [data.nombre, data.precio_usd || 0, data.precio_ves || 0, data.moneda_precio || 'usd', data.insumo_id || null]);
      
      if (!info.lastID) throw new Error('No lastID returned');
      return ResultFactory.ok({ id: info.lastID });
    } catch (e) {
      return ResultFactory.fail(e instanceof Error ? e : String(e));
    }
  }

  async update(id: number, data: Omit<Servicio, 'id' | 'insumo_nombre'>): Promise<Result<void>> {
    try {
      const dbConn = this.db.getConnection();
      await dbConn.run(`
        UPDATE servicios SET nombre=?, precio_usd=?, precio_ves=?, moneda_precio=?, insumo_id=?, activo=? WHERE id=?
      `, [data.nombre, data.precio_usd || 0, data.precio_ves || 0, data.moneda_precio || 'usd', data.insumo_id || null, data.activo !== undefined ? data.activo : 1, id]);
      return ResultFactory.ok(undefined);
    } catch (e) {
      return ResultFactory.fail(e instanceof Error ? e : String(e));
    }
  }

  async delete(id: number): Promise<Result<void>> {
    try {
      const dbConn = this.db.getConnection();
      await dbConn.run('DELETE FROM servicios WHERE id = ?', [id]);
      return ResultFactory.ok(undefined);
    } catch (e) {
      return ResultFactory.fail(e instanceof Error ? e : String(e));
    }
  }

  async search(query: string): Promise<Result<Servicio[]>> {
    try {
      const dbConn = this.db.getConnection();
      const term = query.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const like = `%${term}%`;
      const cleanCol = (c: string) => `REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(LOWER(${c}), 'á', 'a'), 'é', 'e'), 'í', 'i'), 'ó', 'o'), 'ú', 'u'), 'Á', 'a'), 'É', 'e'), 'Í', 'i'), 'Ó', 'o'), 'Ú', 'u')`;
      
      const rows = await dbConn.all(`
        SELECT s.*, i.nombre AS insumo_nombre FROM servicios s
        LEFT JOIN insumos i ON i.id = s.insumo_id
        WHERE ${cleanCol('s.nombre')} LIKE ? AND s.activo = 1
        ORDER BY s.nombre ASC LIMIT 20
      `, [like]);
      
      return ResultFactory.ok(rows as Servicio[]);
    } catch (e) {
      return ResultFactory.fail(e instanceof Error ? e : String(e));
    }
  }
}
