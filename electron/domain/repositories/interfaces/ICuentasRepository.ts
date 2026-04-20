import { Result } from '../../common/Result';
import { Venta } from './IVentasRepository';

export interface CuentasPaginationParams {
  page?: number;
  perPage?: number;
}

export interface ICuentasRepository {
  listCreditos(): Promise<Result<Venta[]>>;
  getCredito(ventaId: number): Promise<Result<Venta | null>>;
  abonar(ventaId: number, abono: any): Promise<Result<{ saldo_pendiente: number; estado: string }>>;
  ajustarDeuda(ventaId: number, nuevoSaldo: number): Promise<Result<{ saldo_pendiente: number; estado: string }>>;
}
