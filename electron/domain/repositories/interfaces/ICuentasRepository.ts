import { Result } from '../../common/Result';
import { Venta } from './IVentasRepository';

export interface CuentasPaginationParams {
  page?: number;
  perPage?: number;
}

export interface ICuentasRepository {
  listCreditos(): Promise<Result<Venta[]>>;
  getCredito(ventaId: number): Promise<Result<Venta | null>>;
  abonar(ventaId: number, abono: any): Promise<Result<{ saldo_pendiente_usd: number; estado: string }>>;
  ajustarDeuda(ventaId: number, nuevoSaldoUsd: number, nuevaTasa: number): Promise<Result<{ saldo_pendiente_usd: number; tasa_cambio: number; estado: string }>>;
}
