import { IVentasRepository, Venta, DetalleVenta, Pago, VentasFilters, VentasPaginationParams, PaginatedVentas } from '../../../domain/repositories/interfaces/IVentasRepository';
import { Result, ResultFactory } from '../../../domain/common/Result';
import { Database } from '../connection/Database';

export class SqliteVentasRepository implements IVentasRepository {
  private db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  async create(venta: Omit<Venta, 'id' | 'fecha' | 'detalles' | 'pagos' | 'abonos'>): Promise<Result<number>> {
    try {
      const dbConn = this.db.getConnection();
      const info = await dbConn.run(`
        INSERT INTO ventas (subtotal_usd, descuento_otorgado_usd, total_usd, tasa_cambio, estado, cliente_nombre, saldo_pendiente_usd, notas)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        venta.subtotal_usd, venta.descuento_otorgado_usd, venta.total_usd,
        venta.tasa_cambio, venta.estado, venta.cliente_nombre || '',
        venta.saldo_pendiente_usd, venta.notas || ''
      ]);
      
      if (!info.lastID) throw new Error('No lastID returned upon venta creation');
      return ResultFactory.ok(info.lastID);
    } catch (e) {
      return ResultFactory.fail(e instanceof Error ? e : String(e));
    }
  }

  async addDetalle(ventaId: number, item: DetalleVenta): Promise<Result<void>> {
    try {
      const dbConn = this.db.getConnection();
      await dbConn.run(`
        INSERT INTO detalle_venta (venta_id, tipo, ref_id, nombre, cantidad, cantidad_hojas_gastadas, precio_unitario_usd, subtotal_usd)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        ventaId, item.tipo, item.ref_id, item.nombre, item.cantidad,
        item.cantidad_hojas_gastadas || 0, item.precio_unitario_usd, item.subtotal_usd
      ]);
      return ResultFactory.ok(undefined);
    } catch (e) {
      return ResultFactory.fail(e instanceof Error ? e : String(e));
    }
  }

  async addPago(ventaId: number, pago: Pago): Promise<Result<void>> {
    try {
      const dbConn = this.db.getConnection();
      await dbConn.run(`
        INSERT INTO pagos (venta_id, metodo, monto_usd, monto_ves)
        VALUES (?, ?, ?, ?)
      `, [ventaId, pago.metodo, pago.monto_usd, pago.monto_ves || 0]);
      return ResultFactory.ok(undefined);
    } catch (e) {
      return ResultFactory.fail(e instanceof Error ? e : String(e));
    }
  }

  async list(filters: VentasFilters): Promise<Result<Venta[]>> {
    try {
      const dbConn = this.db.getConnection();
      let sql = `SELECT * FROM ventas`;
      const where: string[] = [];
      const params: any[] = [];

      if (filters.estado) { where.push('estado = ?'); params.push(filters.estado); }
      if (filters.fecha_desde) { where.push('fecha >= ?'); params.push(filters.fecha_desde); }
      if (filters.fecha_hasta) { where.push('fecha <= ?'); params.push(filters.fecha_hasta + ' 23:59:59'); }

      if (where.length) sql += ' WHERE ' + where.join(' AND ');
      sql += ' ORDER BY fecha DESC';
      if (filters.limit) { sql += ' LIMIT ?'; params.push(filters.limit); }

      const rows = await dbConn.all(sql, params);
      return ResultFactory.ok(rows as Venta[]);
    } catch (e) {
      return ResultFactory.fail(e instanceof Error ? e : String(e));
    }
  }

  async getById(id: number): Promise<Result<Venta | null>> {
    try {
      const dbConn = this.db.getConnection();
      const venta = await dbConn.get('SELECT * FROM ventas WHERE id = ?', [id]);
      if (!venta) return ResultFactory.ok(null);

      const detalles = await dbConn.all('SELECT * FROM detalle_venta WHERE venta_id = ? ORDER BY id ASC', [id]);
      const pagos = await dbConn.all('SELECT * FROM pagos WHERE venta_id = ? ORDER BY id ASC', [id]);
      const abonos = await dbConn.all('SELECT * FROM abonos WHERE venta_id = ? ORDER BY fecha ASC', [id]);

      return ResultFactory.ok({ ...venta, detalles, pagos, abonos } as Venta);
    } catch (e) {
      return ResultFactory.fail(e instanceof Error ? e : String(e));
    }
  }

  async ultimas(limit: number): Promise<Result<Venta[]>> {
    try {
      const dbConn = this.db.getConnection();
      const rows = await dbConn.all('SELECT * FROM ventas ORDER BY fecha DESC LIMIT ?', [limit]);
      return ResultFactory.ok(rows as Venta[]);
    } catch (e) {
      return ResultFactory.fail(e instanceof Error ? e : String(e));
    }
  }

  async paginate(params: VentasPaginationParams): Promise<Result<PaginatedVentas>> {
    try {
      const dbConn = this.db.getConnection();
      const { page, perPage, fechaDesde, fechaHasta, estado } = params;
      const offset = (page - 1) * perPage;

      const where: string[] = [];
      const sqlParams: any[] = [];

      if (fechaDesde) { where.push("date(fecha) >= ?"); sqlParams.push(fechaDesde); }
      if (fechaHasta) { where.push("date(fecha) <= ?"); sqlParams.push(fechaHasta); }
      if (estado) { where.push("estado = ?"); sqlParams.push(estado); }

      const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';

      const countRow = await dbConn.get(`SELECT COUNT(*) AS total FROM ventas ${whereClause}`, sqlParams);
      const total = countRow?.total || 0;

      const ventas = await dbConn.all(
        `SELECT * FROM ventas ${whereClause} ORDER BY fecha DESC LIMIT ? OFFSET ?`,
        [...sqlParams, perPage, offset]
      );

      for (const v of ventas) {
        v.detalles = await dbConn.all('SELECT * FROM detalle_venta WHERE venta_id = ? ORDER BY id ASC', [v.id]);
        v.pagos = await dbConn.all('SELECT * FROM pagos WHERE venta_id = ? ORDER BY id ASC', [v.id]);
        v.abonos = await dbConn.all('SELECT * FROM abonos WHERE venta_id = ? ORDER BY fecha ASC', [v.id]);
      }

      return ResultFactory.ok({
        ventas: ventas as Venta[],
        total,
        page,
        perPage,
        pages: Math.ceil(total / perPage)
      });
    } catch (e) {
      return ResultFactory.fail(e instanceof Error ? e : String(e));
    }
  }
}
