import { ICuentasRepository } from '../../../domain/repositories/interfaces/ICuentasRepository';
import { Result, ResultFactory } from '../../../domain/common/Result';
import { Database } from '../connection/Database';
import { Venta } from '../../../domain/repositories/interfaces/IVentasRepository';

function mapVenta(r: any): Venta {
  return {
    id: r.id,
    fecha: r.fecha,
    subtotal: r.subtotal_usd,
    descuento_otorgado: r.descuento_otorgado_usd,
    total: r.total_usd,
    estado: r.estado,
    cliente_nombre: r.cliente_nombre,
    saldo_pendiente: r.saldo_pendiente_usd,
    notas: r.notas,
  };
}

export class SqliteCuentasRepository implements ICuentasRepository {
  private db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  async listCreditos(): Promise<Result<Venta[]>> {
    try {
      const dbConn = this.db.getConnection();
      const rows = await dbConn.all(`SELECT * FROM ventas WHERE estado = 'credito' ORDER BY fecha DESC`);
      
      const ventas = [];
      for (const r of rows) {
        const detalles = await dbConn.all('SELECT * FROM detalle_venta WHERE venta_id = ?', [r.id]);
        const pagos = await dbConn.all('SELECT * FROM pagos WHERE venta_id = ?', [r.id]);
        const abonos = await dbConn.all('SELECT * FROM abonos WHERE venta_id = ? ORDER BY fecha ASC', [r.id]);
        ventas.push({
          ...mapVenta(r),
          detalles: detalles.map((d: any) => ({
            id: d.id, venta_id: d.venta_id, tipo: d.tipo, ref_id: d.ref_id, nombre: d.nombre,
            cantidad: d.cantidad, cantidad_hojas_gastadas: d.cantidad_hojas_gastadas,
            precio_unitario: d.precio_unitario_usd, subtotal: d.subtotal_usd,
          })),
          pagos: pagos.map((p: any) => ({ id: p.id, venta_id: p.venta_id, metodo: p.metodo, monto: p.monto_ves, fecha: p.fecha })),
          abonos: abonos.map((a: any) => ({ id: a.id, venta_id: a.venta_id, metodo: a.metodo, monto: a.monto_ves, fecha: a.fecha })),
        });
      }
      return ResultFactory.ok(ventas as Venta[]);
    } catch (e) {
      return ResultFactory.fail(e instanceof Error ? e : String(e));
    }
  }

  async getCredito(ventaId: number): Promise<Result<Venta | null>> {
    try {
      const dbConn = this.db.getConnection();
      const venta = await dbConn.get('SELECT * FROM ventas WHERE id = ?', [ventaId]);
      if (!venta) return ResultFactory.ok(null);
      
      const detalles = await dbConn.all('SELECT * FROM detalle_venta WHERE venta_id = ?', [ventaId]);
      const pagos = await dbConn.all('SELECT * FROM pagos WHERE venta_id = ?', [ventaId]);
      const abonos = await dbConn.all('SELECT * FROM abonos WHERE venta_id = ? ORDER BY fecha ASC', [ventaId]);
      
      return ResultFactory.ok({
        ...mapVenta(venta),
        detalles: detalles.map((d: any) => ({
          id: d.id, venta_id: d.venta_id, tipo: d.tipo, ref_id: d.ref_id, nombre: d.nombre,
          cantidad: d.cantidad, cantidad_hojas_gastadas: d.cantidad_hojas_gastadas,
          precio_unitario: d.precio_unitario_usd, subtotal: d.subtotal_usd,
        })),
        pagos: pagos.map((p: any) => ({ id: p.id, venta_id: p.venta_id, metodo: p.metodo, monto: p.monto_ves, fecha: p.fecha })),
        abonos: abonos.map((a: any) => ({ id: a.id, venta_id: a.venta_id, metodo: a.metodo, monto: a.monto_ves, fecha: a.fecha })),
      } as Venta);
    } catch (e) {
      return ResultFactory.fail(e instanceof Error ? e : String(e));
    }
  }

  async abonar(ventaId: number, abono: any): Promise<Result<{ saldo_pendiente: number; estado: string }>> {
    const dbConn = this.db.getConnection();
    try {
      await dbConn.exec('BEGIN TRANSACTION;');
      
      // Store VES in monto_ves; monto_usd = 0
      await dbConn.run(`
        INSERT INTO abonos (venta_id, metodo, monto_usd, monto_ves)
        VALUES (?, ?, 0, ?)
      `, [ventaId, abono.metodo, abono.monto]);

      const venta = await dbConn.get('SELECT saldo_pendiente_usd FROM ventas WHERE id = ?', [ventaId]);
      if (!venta) throw new Error('Venta no encontrada');

      const nuevoSaldo = Math.max(0, parseFloat((venta.saldo_pendiente_usd - abono.monto).toFixed(2)));
      const nuevoEstado = nuevoSaldo <= 0.05 ? 'pagada' : 'credito';
      
      await dbConn.run('UPDATE ventas SET saldo_pendiente_usd = ?, estado = ? WHERE id = ?', [nuevoSaldo, nuevoEstado, ventaId]);

      await dbConn.exec('COMMIT;');
      return ResultFactory.ok({ saldo_pendiente: nuevoSaldo, estado: nuevoEstado });
    } catch (err) {
      try { await dbConn.exec('ROLLBACK;'); } catch (_) {}
      return ResultFactory.fail(err instanceof Error ? err : String(err));
    }
  }

  async ajustarDeuda(ventaId: number, nuevoSaldo: number): Promise<Result<{ saldo_pendiente: number; estado: string }>> {
    try {
      const dbConn = this.db.getConnection();
      await dbConn.exec('BEGIN TRANSACTION;');

      const venta = await dbConn.get('SELECT saldo_pendiente_usd, total_usd FROM ventas WHERE id = ?', [ventaId]);
      if (!venta) throw new Error('Venta no encontrada');

      const delta = nuevoSaldo - venta.saldo_pendiente_usd;
      const nuevoTotal = Math.max(0, parseFloat((venta.total_usd + delta).toFixed(2)));
      const nuevoEstado = nuevoSaldo <= 0.05 ? 'pagada' : 'credito';
      
      await dbConn.run(
        'UPDATE ventas SET saldo_pendiente_usd = ?, total_usd = ?, estado = ? WHERE id = ?',
        [nuevoSaldo, nuevoTotal, nuevoEstado, ventaId]
      );
      
      await dbConn.exec('COMMIT;');
      return ResultFactory.ok({ saldo_pendiente: nuevoSaldo, estado: nuevoEstado });
    } catch (err) {
      try { const dbConn = this.db.getConnection(); await dbConn.exec('ROLLBACK;'); } catch (_) {}
      return ResultFactory.fail(err instanceof Error ? err : String(err));
    }
  }

  async sincronizarPrecioArticulo(ventaId: number, detalleId: number, nuevoPrecio: number): Promise<Result<{ saldo_pendiente: number; total: number; estado: string }>> {
    try {
      const dbConn = this.db.getConnection();
      await dbConn.exec('BEGIN TRANSACTION;');

      const detalle = await dbConn.get('SELECT cantidad, precio_unitario_usd, subtotal_usd FROM detalle_venta WHERE id = ? AND venta_id = ?', [detalleId, ventaId]);
      if (!detalle) throw new Error('Detalle de venta no encontrado');

      const nuevoSubtotal = parseFloat((detalle.cantidad * nuevoPrecio).toFixed(2));
      const deltaSubtotal = nuevoSubtotal - detalle.subtotal_usd;

      if (deltaSubtotal === 0) throw new Error('El precio actual es idéntico al registrado');

      await dbConn.run(
        'UPDATE detalle_venta SET precio_unitario_usd = ?, subtotal_usd = ? WHERE id = ?',
        [nuevoPrecio, nuevoSubtotal, detalleId]
      );

      const venta = await dbConn.get('SELECT subtotal_usd, total_usd, saldo_pendiente_usd FROM ventas WHERE id = ?', [ventaId]);
      if (!venta) throw new Error('Venta no encontrada');

      const nuevoVentaSubtotal = Math.max(0, parseFloat((venta.subtotal_usd + deltaSubtotal).toFixed(2)));
      const nuevoVentaTotal = Math.max(0, parseFloat((venta.total_usd + deltaSubtotal).toFixed(2)));
      const nuevoSaldoPendiente = Math.max(0, parseFloat((venta.saldo_pendiente_usd + deltaSubtotal).toFixed(2)));
      const nuevoEstado = nuevoSaldoPendiente <= 0.05 ? 'pagada' : 'credito';

      await dbConn.run(
        'UPDATE ventas SET subtotal_usd = ?, total_usd = ?, saldo_pendiente_usd = ?, estado = ? WHERE id = ?',
        [nuevoVentaSubtotal, nuevoVentaTotal, nuevoSaldoPendiente, nuevoEstado, ventaId]
      );

      await dbConn.exec('COMMIT;');
      return ResultFactory.ok({ saldo_pendiente: nuevoSaldoPendiente, total: nuevoVentaTotal, estado: nuevoEstado });
    } catch (err) {
      try { const dbConn = this.db.getConnection(); await dbConn.exec('ROLLBACK;'); } catch (_) {}
      return ResultFactory.fail(err instanceof Error ? err : String(err));
    }
  }
}
