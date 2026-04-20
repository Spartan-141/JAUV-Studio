import { IReportesRepository, ReporteDiaBasico, CierreDia, CierreDiaHistorico, InventarioStats } from '../../../domain/repositories/interfaces/IReportesRepository';
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

  async buildDayData(fecha: string): Promise<Result<ReporteDiaBasico>> {
    try {
      const dbConn = this.db.getConnection();
      const desde = fecha + ' 00:00:00';
      const hasta  = fecha + ' 23:59:59';

      const ventas = await dbConn.get(`
        SELECT
          COUNT(*) AS total_ventas,
          SUM(total_usd) AS ingresos_usd,
          SUM(descuento_otorgado_usd) AS descuentos_usd,
          SUM(CASE WHEN estado='credito' THEN saldo_pendiente_usd ELSE 0 END) AS pendiente_cobrar_usd
        FROM ventas WHERE fecha BETWEEN ? AND ?
      `, [desde, hasta]);

      const pagos = await dbConn.all(`
        SELECT p.metodo, SUM(p.monto_usd) AS total_usd, SUM(p.monto_ves) AS total_ves
        FROM pagos p JOIN ventas v ON v.id = p.venta_id
        WHERE v.fecha BETWEEN ? AND ? GROUP BY p.metodo
      `, [desde, hasta]);

      const abonos = await dbConn.all(`
        SELECT a.metodo, SUM(a.monto_usd) AS total_usd, SUM(a.monto_ves) AS total_ves
        FROM abonos a WHERE a.fecha BETWEEN ? AND ? GROUP BY a.metodo
      `, [desde, hasta]);

      const listaVentas = await dbConn.all(`SELECT * FROM ventas WHERE fecha BETWEEN ? AND ? ORDER BY fecha DESC`, [desde, hasta]);
      for (const v of listaVentas) {
        v.detalles = await dbConn.all(`SELECT * FROM detalle_venta WHERE venta_id = ? ORDER BY id ASC`, [v.id]);
        v.pagos = await dbConn.all(`SELECT * FROM pagos WHERE venta_id = ? ORDER BY id ASC`, [v.id]);
        v.abonos = await dbConn.all(`SELECT * FROM abonos WHERE venta_id = ? ORDER BY fecha ASC`, [v.id]);
      }

      const ingresos_ves = [...pagos, ...abonos].reduce((s, x) => s + (x.total_ves || 0), 0);

      const gananciaRow = await dbConn.get(`
        SELECT SUM((dv.precio_unitario_usd - COALESCE(p.precio_compra_usd, 0)) * dv.cantidad) AS ganancia_bruta_usd
        FROM detalle_venta dv
        JOIN ventas v ON v.id = dv.venta_id
        LEFT JOIN productos p ON p.id = dv.ref_id AND dv.tipo = 'producto'
        WHERE v.fecha BETWEEN ? AND ?
      `, [desde, hasta]);
      const ganancia_neta_usd = Math.max(0, (gananciaRow?.ganancia_bruta_usd || 0) - (ventas?.descuentos_usd || 0));

      return ResultFactory.ok({
        total_ventas: ventas?.total_ventas || 0,
        ingresos_usd: ventas?.ingresos_usd || 0,
        ingresos_ves,
        descuentos_usd: ventas?.descuentos_usd || 0,
        pendiente_cobrar_usd: ventas?.pendiente_cobrar_usd || 0,
        ganancia_neta_usd: parseFloat(ganancia_neta_usd.toFixed(2)),
        pagos,
        abonos,
        ventas: listaVentas,
      });
    } catch (e) {
      return ResultFactory.fail(e instanceof Error ? e : String(e));
    }
  }

  async upsertCierre(fecha: string, tasa: number): Promise<Result<ReporteDiaBasico>> {
    try {
      const dbConn = this.db.getConnection();
      const dataResult = await this.buildDayData(fecha);
      if (!dataResult.isSuccess) return dataResult;
      
      const data = dataResult.getValue()!;
      const now = new Date().toLocaleString('sv-SE').replace('T', ' ').slice(0, 19);
      
      const params = [
        tasa,
        data.total_ventas, data.ingresos_usd, data.ingresos_ves,
        data.descuentos_usd, data.pendiente_cobrar_usd, data.ganancia_neta_usd,
        JSON.stringify(data.pagos), JSON.stringify(data.abonos), JSON.stringify(data.ventas),
        now,
      ];

      await dbConn.run(`INSERT OR IGNORE INTO cierres_dia (fecha) VALUES (?)`, [fecha]);
      await dbConn.run(`
        UPDATE cierres_dia SET
          tasa_cierre = ?, total_ventas = ?, ingresos_usd = ?, ingresos_ves = ?,
          descuentos_usd = ?, pendiente_cobrar_usd = ?, ganancia_neta_usd = ?,
          pagos_json = ?, abonos_json = ?, ventas_json = ?, cerrado_en = ?
        WHERE fecha = ?
      `, [...params, fecha]);

      return ResultFactory.ok(data);
    } catch (e) {
      return ResultFactory.fail(e instanceof Error ? e : String(e));
    }
  }

  async getHoy(fecha: string): Promise<Result<CierreDia>> {
    try {
      const dbConn = this.db.getConnection();
      const snapshotRow = await dbConn.get('SELECT cerrado_en, tasa_cierre FROM cierres_dia WHERE fecha = ?', [fecha]);
      
      const dataResult = await this.buildDayData(fecha);
      if (!dataResult.isSuccess) return ResultFactory.fail(dataResult.getError()!);
      const data = dataResult.getValue()!;

      return ResultFactory.ok({
        cerrado: !!snapshotRow,
        cerrado_en: snapshotRow?.cerrado_en || null,
        tasa_cierre: snapshotRow?.tasa_cierre || null,
        fecha,
        ...data,
      });
    } catch (e) {
      return ResultFactory.fail(e instanceof Error ? e : String(e));
    }
  }

  async getHistorial(): Promise<Result<CierreDiaHistorico[]>> {
    try {
      const dbConn = this.db.getConnection();
      const rows = await dbConn.all(`
        SELECT id, fecha, tasa_cierre, total_ventas, ingresos_usd, ingresos_ves, cerrado_en
        FROM cierres_dia ORDER BY fecha DESC
      `);
      return ResultFactory.ok(rows as CierreDiaHistorico[]);
    } catch (e) {
      return ResultFactory.fail(e instanceof Error ? e : String(e));
    }
  }

  async getCierreDetalle(fecha: string): Promise<Result<any>> {
    try {
      const dbConn = this.db.getConnection();
      const row = await dbConn.get('SELECT * FROM cierres_dia WHERE fecha = ?', [fecha]);
      if (!row) return ResultFactory.ok(null);

      return ResultFactory.ok({
        ...row,
        pagos: JSON.parse(row.pagos_json || '[]'),
        abonos: JSON.parse(row.abonos_json || '[]'),
        ventas: JSON.parse(row.ventas_json || '[]'),
      });
    } catch (e) {
      return ResultFactory.fail(e instanceof Error ? e : String(e));
    }
  }

  async getInventario(tasa: number): Promise<Result<{ stats: InventarioStats; bajo_stock: any[] }>> {
    try {
      const dbConn = this.db.getConnection();
      const t = parseFloat(tasa as any) || 1;
      const stats = await dbConn.get(`
        SELECT
          COUNT(id) AS total_productos,
          SUM(stock_actual) AS total_articulos,
          SUM(
            CASE WHEN moneda_precio = 'ves'
              THEN (precio_compra_ves / ?) * stock_actual
              ELSE precio_compra_usd * stock_actual
            END
          ) AS inversion_usd,
          SUM(
            CASE WHEN moneda_precio = 'ves'
              THEN ((precio_venta_ves - precio_compra_ves) / ?) * stock_actual
              ELSE (precio_venta_usd - precio_compra_usd) * stock_actual
            END
          ) AS ganancia_potencial_usd
        FROM productos
      `, [t, t]);

      const bajo_stock = await dbConn.all(`
        SELECT id, codigo, nombre, marca, stock_actual, stock_minimo
        FROM productos
        WHERE stock_actual <= stock_minimo
        ORDER BY stock_actual ASC, nombre ASC
      `);

      return ResultFactory.ok({ stats: stats as InventarioStats, bajo_stock });
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

  async autoClosePreviousDays(): Promise<void> {
    try {
      const dbConn = this.db.getConnection();
      const today = this.todayStr();

      const cfg = await dbConn.get(`SELECT valor FROM configuracion WHERE clave = 'tasa_del_dia'`);
      const tasa = parseFloat(cfg?.valor || '1');

      const pendientes = await dbConn.all(`
        SELECT DISTINCT date(fecha) AS fecha
        FROM ventas
        WHERE date(fecha) < ?
        ORDER BY fecha ASC
      `, [today]);

      for (const row of pendientes) {
        try {
          await this.upsertCierre((row as any).fecha, tasa);
          console.log(`[Reportes] Auto-closed day: ${(row as any).fecha}`);
        } catch (e) {
          console.error(`[Reportes] Failed to auto-close day ${(row as any).fecha}:`, e);
        }
      }
    } catch (e) {
      console.error(`[Reportes] Auto-close generic failure:`, e);
    }
  }
}
