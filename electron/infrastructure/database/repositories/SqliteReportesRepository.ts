import { IReportesRepository, ReporteDiaBasico, InventarioStats } from '../../../domain/repositories/interfaces/IReportesRepository';
import { Result, ResultFactory } from '../../../domain/common/Result';
import { Database } from '../connection/Database';

export class SqliteReportesRepository implements IReportesRepository {
  private db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  private todayStr(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }

  async getHoy(fecha: string): Promise<Result<ReporteDiaBasico>> {
    try {
      const dbConn = this.db.getConnection();
      const desde = fecha + ' 00:00:00';
      const hasta  = fecha + ' 23:59:59';

      // Note: _usd columns store VES values for records created after migration
      const ventasRow = await dbConn.get(`
        SELECT
          COUNT(*) AS total_ventas,
          SUM(total_usd) AS ingresos,
          SUM(descuento_otorgado_usd) AS descuentos,
          SUM(CASE WHEN estado='credito' THEN saldo_pendiente_usd ELSE 0 END) AS pendiente_cobrar
        FROM ventas WHERE fecha BETWEEN ? AND ?
      `, [desde, hasta]);

      const pagos = await dbConn.all(`
        SELECT p.metodo, SUM(p.monto_ves) AS total_ves
        FROM pagos p JOIN ventas v ON v.id = p.venta_id
        WHERE v.fecha BETWEEN ? AND ? GROUP BY p.metodo
      `, [desde, hasta]);

      const abonos = await dbConn.all(`
        SELECT a.metodo, SUM(a.monto_ves) AS total_ves
        FROM abonos a WHERE a.fecha BETWEEN ? AND ? GROUP BY a.metodo
      `, [desde, hasta]);

      const listaVentas = await dbConn.all(`SELECT * FROM ventas WHERE fecha BETWEEN ? AND ? ORDER BY fecha DESC`, [desde, hasta]);
      for (const v of listaVentas) {
        v.detalles = await dbConn.all(`SELECT * FROM detalle_venta WHERE venta_id = ? ORDER BY id ASC`, [v.id]);
        v.pagos = await dbConn.all(`SELECT * FROM pagos WHERE venta_id = ? ORDER BY id ASC`, [v.id]);
        v.abonos = await dbConn.all(`SELECT * FROM abonos WHERE venta_id = ? ORDER BY fecha ASC`, [v.id]);
      }

      const gananciaRow = await dbConn.get(`
        SELECT SUM((dv.precio_unitario_usd - COALESCE(p.precio_compra_ves, 0)) * dv.cantidad) AS ganancia_bruta
        FROM detalle_venta dv
        JOIN ventas v ON v.id = dv.venta_id
        LEFT JOIN productos p ON p.id = dv.ref_id AND dv.tipo = 'producto'
        WHERE v.fecha BETWEEN ? AND ?
      `, [desde, hasta]);
      const ganancia_neta = Math.max(0, (gananciaRow?.ganancia_bruta || 0) - (ventasRow?.descuentos || 0));

      return ResultFactory.ok({
        total_ventas: ventasRow?.total_ventas || 0,
        ingresos: ventasRow?.ingresos || 0,
        descuentos: ventasRow?.descuentos || 0,
        pendiente_cobrar: ventasRow?.pendiente_cobrar || 0,
        ganancia_neta: parseFloat(ganancia_neta.toFixed(2)),
        pagos,
        abonos,
        ventas: listaVentas,
      });
    } catch (e) {
      return ResultFactory.fail(e instanceof Error ? e : String(e));
    }
  }



  async getInventario(): Promise<Result<{ stats: InventarioStats; bajo_stock: any[] }>> {
    try {
      const dbConn = this.db.getConnection();
      const stats = await dbConn.get(`
        SELECT
          COUNT(id) AS total_productos,
          SUM(stock_actual) AS total_articulos,
          SUM(precio_compra_ves * stock_actual) AS inversion,
          SUM((precio_venta_ves - precio_compra_ves) * stock_actual) AS ganancia_potencial
        FROM productos
      `);

      const bajo_stock = await dbConn.all(`
        SELECT id, codigo, nombre, marca, stock_actual, stock_minimo
        FROM productos
        WHERE stock_actual <= stock_minimo
        ORDER BY stock_actual ASC, nombre ASC
      `);

      return ResultFactory.ok({
        stats: {
          total_productos: stats?.total_productos || 0,
          total_articulos: stats?.total_articulos || 0,
          inversion: stats?.inversion || 0,
          ganancia_potencial: stats?.ganancia_potencial || 0,
        },
        bajo_stock
      });
    } catch (e) {
      return ResultFactory.fail(e instanceof Error ? e : String(e));
    }
  }

  async getDashboardMetrics(): Promise<Result<{ trend: any[]; top_productos: any[]; top_deudores: any[] }>> {
    try {
      const dbConn = this.db.getConnection();
      
      const d = new Date();
      d.setDate(d.getDate() - 6);
      const sevenDaysAgo = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} 00:00:00`;
      
      const ventas_semana = await dbConn.all(`
        SELECT date(fecha) as fecha, SUM(total_usd) as total
        FROM ventas
        WHERE fecha >= ?
        GROUP BY date(fecha)
        ORDER BY fecha ASC
      `, [sevenDaysAgo]);

      const trend = [];
      const current = new Date(d);
      current.setHours(0,0,0,0);
      const end = new Date();
      while (current <= end) {
        const curStr = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}-${String(current.getDate()).padStart(2, '0')}`;
        const found = ventas_semana.find((v: any) => v.fecha === curStr);
        trend.push({ fecha: curStr, total: found ? found.total : 0 });
        current.setDate(current.getDate() + 1);
      }

      const monthAgoD = new Date();
      monthAgoD.setDate(monthAgoD.getDate() - 30);
      const thirtyDaysAgo = `${monthAgoD.getFullYear()}-${String(monthAgoD.getMonth() + 1).padStart(2, '0')}-${String(monthAgoD.getDate()).padStart(2, '0')} 00:00:00`;

      const top_productos = await dbConn.all(`
        SELECT dv.ref_id, dv.nombre, SUM(dv.cantidad) as total_vendido, SUM(dv.subtotal_usd) as ingresos
        FROM detalle_venta dv
        JOIN ventas v ON v.id = dv.venta_id
        WHERE dv.tipo = 'producto' AND v.fecha >= ?
        GROUP BY dv.ref_id, dv.nombre
        ORDER BY total_vendido DESC
        LIMIT 5
      `, [thirtyDaysAgo]);

      const top_deudores = await dbConn.all(`
        SELECT cliente_nombre as nombre, SUM(saldo_pendiente_usd) as deuda
        FROM ventas
        WHERE estado = 'credito' AND saldo_pendiente_usd > 0 AND cliente_nombre != ''
        GROUP BY cliente_nombre
        ORDER BY deuda DESC
        LIMIT 5
      `);

      return ResultFactory.ok({ trend, top_productos, top_deudores });
    } catch (e) {
      return ResultFactory.fail(e instanceof Error ? e : String(e));
    }
  }


}
