import { IProductosRepository, Producto, ProductoFilters } from '../../../domain/repositories/interfaces/IProductosRepository';
import { Result, ResultFactory } from '../../../domain/common/Result';
import { Database } from '../connection/Database';

function mapProducto(r: any): Producto {
  return {
    id: r.id,
    codigo: r.codigo,
    nombre: r.nombre,
    marca: r.marca,
    precio_compra: r.precio_compra_ves,
    precio_venta: r.precio_venta_ves,
    stock_actual: r.stock_actual,
    stock_minimo: r.stock_minimo,
    categoria_id: r.categoria_id,
    descripcion: r.descripcion,
    created_at: r.created_at,
    categoria_nombre: r.categoria_nombre,
  };
}

export class SqliteProductosRepository implements IProductosRepository {
  private db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  private cleanCol(c: string) {
    return `REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(LOWER(${c}), 'á', 'a'), 'é', 'e'), 'í', 'i'), 'ó', 'o'), 'ú', 'u'), 'Á', 'a'), 'É', 'e'), 'Í', 'i'), 'Ó', 'o'), 'Ú', 'u')`;
  }

  async list(filters: ProductoFilters): Promise<Result<Producto[]>> {
    try {
      const dbConn = this.db.getConnection();
      let sql = `SELECT p.*, c.nombre AS categoria_nombre
                 FROM productos p
                 LEFT JOIN categorias c ON c.id = p.categoria_id`;
      const params: any[] = [];
      const where: string[] = [];

      if (filters.search) {
        const term = filters.search.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        where.push(`(${this.cleanCol('p.nombre')} LIKE ? OR ${this.cleanCol('p.codigo')} LIKE ? OR ${this.cleanCol('p.marca')} LIKE ?)`);
        const like = `%${term}%`;
        params.push(like, like, like);
      }
      if (filters.categoria_id) {
        where.push('p.categoria_id = ?');
        params.push(filters.categoria_id);
      }
      if (filters.bajo_stock) {
        where.push('p.stock_actual <= p.stock_minimo');
      }

      if (where.length) sql += ' WHERE ' + where.join(' AND ');
      sql += ' ORDER BY p.nombre ASC';

      const rows = await dbConn.all(sql, params);
      return ResultFactory.ok(rows.map(mapProducto));
    } catch (e) {
      return ResultFactory.fail(e instanceof Error ? e : String(e));
    }
  }

  async getById(id: number): Promise<Result<Producto>> {
    try {
      const dbConn = this.db.getConnection();
      const row = await dbConn.get('SELECT * FROM productos WHERE id = ?', [id]);
      if (!row) return ResultFactory.fail(new Error('Producto no encontrado'));
      return ResultFactory.ok(mapProducto(row));
    } catch (e) {
      return ResultFactory.fail(e instanceof Error ? e : String(e));
    }
  }

  async create(data: Omit<Producto, 'id' | 'created_at' | 'categoria_nombre'>): Promise<Result<{ id: number; codigo: string }>> {
    try {
      const dbConn = this.db.getConnection();
      const info = await dbConn.run(`
        INSERT INTO productos (
          codigo, nombre, marca,
          precio_compra_usd, precio_venta_usd,
          precio_compra_ves, precio_venta_ves,
          moneda_precio,
          stock_actual, stock_minimo, categoria_id, descripcion
        )
        VALUES (?, ?, ?, 0, 0, ?, ?, 'ves', ?, ?, ?, ?)
      `, [
        data.codigo, data.nombre, data.marca,
        data.precio_compra, data.precio_venta,
        data.stock_actual, data.stock_minimo, data.categoria_id, data.descripcion
      ]);
      if (!info.lastID) throw new Error('No lastID returned');
      return ResultFactory.ok({ id: info.lastID, codigo: data.codigo });
    } catch (e) {
      return ResultFactory.fail(e instanceof Error ? e : String(e));
    }
  }

  async update(id: number, data: Omit<Producto, 'id' | 'created_at' | 'categoria_nombre'>): Promise<Result<void>> {
    try {
      const dbConn = this.db.getConnection();
      await dbConn.run(`
        UPDATE productos SET
          codigo = ?, nombre = ?, marca = ?,
          precio_compra_usd = 0, precio_venta_usd = 0,
          precio_compra_ves = ?, precio_venta_ves = ?,
          moneda_precio = 'ves',
          stock_actual = ?, stock_minimo = ?,
          categoria_id = ?, descripcion = ?
        WHERE id = ?
      `, [
        data.codigo, data.nombre, data.marca,
        data.precio_compra, data.precio_venta,
        data.stock_actual, data.stock_minimo,
        data.categoria_id, data.descripcion,
        id
      ]);
      return ResultFactory.ok(undefined);
    } catch (e) {
      return ResultFactory.fail(e instanceof Error ? e : String(e));
    }
  }

  async delete(id: number): Promise<Result<void>> {
    try {
      const dbConn = this.db.getConnection();
      await dbConn.run('DELETE FROM productos WHERE id = ?', [id]);
      return ResultFactory.ok(undefined);
    } catch (e) {
      return ResultFactory.fail(e instanceof Error ? e : String(e));
    }
  }

  async search(query: string): Promise<Result<Producto[]>> {
    try {
      const dbConn = this.db.getConnection();
      const term = query.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const like = `%${term}%`;
      const rows = await dbConn.all(`
        SELECT p.*, c.nombre AS categoria_nombre FROM productos p
        LEFT JOIN categorias c ON c.id = p.categoria_id
        WHERE ${this.cleanCol('p.nombre')} LIKE ? OR ${this.cleanCol('p.codigo')} LIKE ? OR ${this.cleanCol('p.marca')} LIKE ?
        ORDER BY p.nombre ASC LIMIT 20
      `, [like, like, like]);
      return ResultFactory.ok(rows.map(mapProducto));
    } catch (e) {
      return ResultFactory.fail(e instanceof Error ? e : String(e));
    }
  }

  async codeExists(code: string): Promise<Result<boolean>> {
    try {
      const dbConn = this.db.getConnection();
      const row = await dbConn.get('SELECT id FROM productos WHERE codigo = ?', [code]);
      return ResultFactory.ok(!!row);
    } catch (e) {
      return ResultFactory.fail(e instanceof Error ? e : String(e));
    }
  }
}
