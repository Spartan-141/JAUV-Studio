import { ICuentasRepository } from '../../../domain/repositories/interfaces/ICuentasRepository';
import { Result, ResultFactory } from '../../../domain/common/Result';
import { Database } from '../connection/Database';
import { Venta } from '../../../domain/repositories/interfaces/IVentasRepository';

export class SqliteCuentasRepository implements ICuentasRepository {
  private db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  async listCreditos(): Promise<Result<Venta[]>> {
    try {
      const dbConn = this.db.getConnection();
      const rows = await dbConn.all(`SELECT * FROM ventas WHERE estado = 'credito' ORDER BY fecha DESC`);
      return ResultFactory.ok(rows as Venta[]);
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
      
      return ResultFactory.ok({ ...venta, detalles, pagos, abonos } as Venta);
    } catch (e) {
      return ResultFactory.fail(e instanceof Error ? e : String(e));
    }
  }

  // Se implementa con UnitOfWork en el controller o UseCase, pero para mantener 
  // compatibilidad lo envolvemos aquí si falla el UoW, aunque idealmente debe fallar
  // junto con el UoW pasándole la db. connection o usando transacción local
  async abonar(ventaId: number, abono: any): Promise<Result<{ saldo_pendiente_usd: number; estado: string }>> {
    const dbConn = this.db.getConnection();
    try {
      await dbConn.exec('BEGIN TRANSACTION;');
      
      await dbConn.run(`
        INSERT INTO abonos (venta_id, metodo, monto_usd, monto_ves)
        VALUES (?, ?, ?, ?)
      `, [ventaId, abono.metodo, abono.monto_usd, abono.monto_ves || (abono.monto_usd * (abono.tasa || 1))]);

      const venta = await dbConn.get('SELECT saldo_pendiente_usd, total_usd FROM ventas WHERE id = ?', [ventaId]);
      if (!venta) throw new Error('Venta no encontrada');

      const nuevoSaldo = Math.max(0, parseFloat((venta.saldo_pendiente_usd - abono.monto_usd).toFixed(8)));
      const nuevoEstado = nuevoSaldo <= 0.001 ? 'pagada' : 'credito';
      
      await dbConn.run('UPDATE ventas SET saldo_pendiente_usd = ?, estado = ? WHERE id = ?', [nuevoSaldo, nuevoEstado, ventaId]);

      await dbConn.exec('COMMIT;');
      return ResultFactory.ok({ saldo_pendiente_usd: nuevoSaldo, estado: nuevoEstado });
    } catch (err) {
      try { await dbConn.exec('ROLLBACK;'); } catch (_) {}
      return ResultFactory.fail(err instanceof Error ? err : String(err));
    }
  }

  async ajustarDeuda(ventaId: number, nuevoSaldoUsd: number, nuevaTasa: number): Promise<Result<{ saldo_pendiente_usd: number; tasa_cambio: number; estado: string }>> {
    try {
      const dbConn = this.db.getConnection();
      const nuevoEstado = nuevoSaldoUsd <= 0.001 ? 'pagada' : 'credito';
      
      await dbConn.run(
        'UPDATE ventas SET saldo_pendiente_usd = ?, tasa_cambio = ?, estado = ? WHERE id = ?',
        [nuevoSaldoUsd, nuevaTasa, nuevoEstado, ventaId]
      );
      
      return ResultFactory.ok({ saldo_pendiente_usd: nuevoSaldoUsd, tasa_cambio: nuevaTasa, estado: nuevoEstado });
    } catch (e) {
      return ResultFactory.fail(e instanceof Error ? e : String(e));
    }
  }
}
