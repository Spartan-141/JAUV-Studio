import { ICategoriasRepository, Categoria, ProductoSimple } from '../../../domain/repositories/interfaces/ICategoriasRepository';
import { Result, ResultFactory } from '../../../domain/common/Result';
import { Database } from '../connection/Database';

export class SqliteCategoriasRepository implements ICategoriasRepository {
  private db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  async getAll(): Promise<Result<Categoria[]>> {
    try {
      const dbConn = this.db.getConnection();
      const rows = await dbConn.all(`
        SELECT c.*, COUNT(p.id) AS total_productos
        FROM categorias c
        LEFT JOIN productos p ON p.categoria_id = c.id
        GROUP BY c.id
        ORDER BY c.nombre ASC
      `);
      return ResultFactory.ok(rows as Categoria[]);
    } catch (e) {
      return ResultFactory.fail(e instanceof Error ? e : String(e));
    }
  }

  async create(nombre: string): Promise<Result<{ id: number; nombre: string }>> {
    try {
      const dbConn = this.db.getConnection();
      const info = await dbConn.run('INSERT INTO categorias (nombre) VALUES (?)', [nombre.trim()]);
      if (!info.lastID) throw new Error('No lastID returned from insert');
      return ResultFactory.ok({ id: info.lastID, nombre: nombre.trim() });
    } catch (e) {
      return ResultFactory.fail(e instanceof Error ? e : String(e));
    }
  }

  async update(id: number, nombre: string): Promise<Result<void>> {
    try {
      const dbConn = this.db.getConnection();
      await dbConn.run('UPDATE categorias SET nombre = ? WHERE id = ?', [nombre.trim(), id]);
      return ResultFactory.ok(undefined);
    } catch (e) {
      return ResultFactory.fail(e instanceof Error ? e : String(e));
    }
  }

  async delete(id: number): Promise<Result<void>> {
    try {
      const dbConn = this.db.getConnection();
      // SQLite config uses PRAGMA foreign_keys = ON and ON DELETE SET NULL on productos.categoria_id
      // but we do it manually to match exactly the legacy behavior in one transaction
      await dbConn.exec('BEGIN TRANSACTION;');
      await dbConn.run('UPDATE productos SET categoria_id = NULL WHERE categoria_id = ?', [id]);
      await dbConn.run('DELETE FROM categorias WHERE id = ?', [id]);
      await dbConn.exec('COMMIT;');
      return ResultFactory.ok(undefined);
    } catch (e) {
      const dbConn = this.db.getConnection();
      await dbConn.exec('ROLLBACK;');
      return ResultFactory.fail(e instanceof Error ? e : String(e));
    }
  }

  async getAllProductos(): Promise<Result<ProductoSimple[]>> {
    try {
      const dbConn = this.db.getConnection();
      const rows = await dbConn.all(`
        SELECT p.id, p.nombre, p.marca, p.codigo, p.stock_actual, p.categoria_id,
               c.nombre AS categoria_nombre
        FROM productos p
        LEFT JOIN categorias c ON c.id = p.categoria_id
        ORDER BY p.nombre ASC
      `);
      return ResultFactory.ok(rows as ProductoSimple[]);
    } catch (e) {
      return ResultFactory.fail(e instanceof Error ? e : String(e));
    }
  }

  async bulkAssignProductos(categoria_id: number, producto_ids: number[]): Promise<Result<void>> {
    try {
      const dbConn = this.db.getConnection();
      await dbConn.exec('BEGIN TRANSACTION;');
      
      if (producto_ids.length > 0) {
        const placeholders = producto_ids.map(() => '?').join(',');
        await dbConn.run(
          `UPDATE productos SET categoria_id = NULL WHERE categoria_id = ? AND id NOT IN (${placeholders})`,
          [categoria_id, ...producto_ids]
        );
      } else {
        await dbConn.run('UPDATE productos SET categoria_id = NULL WHERE categoria_id = ?', [categoria_id]);
      }
      
      for (const pid of producto_ids) {
        await dbConn.run('UPDATE productos SET categoria_id = ? WHERE id = ?', [categoria_id, pid]);
      }
      
      await dbConn.exec('COMMIT;');
      return ResultFactory.ok(undefined);
    } catch (e) {
      const dbConn = this.db.getConnection();
      await dbConn.exec('ROLLBACK;');
      return ResultFactory.fail(e instanceof Error ? e : String(e));
    }
  }
}
