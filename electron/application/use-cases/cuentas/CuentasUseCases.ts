import { ICuentasRepository } from '../../../domain/repositories/interfaces/ICuentasRepository';
import { Venta } from '../../../domain/repositories/interfaces/IVentasRepository';
import { Result, ResultFactory } from '../../../domain/common/Result';
import { z } from 'zod';

export const AbonarSchema = z.object({
  venta_id: z.number().int().positive(),
  metodo: z.string().min(1),
  monto: z.number().positive(),
});

export const AjustarDeudaSchema = z.object({
  venta_id: z.number().int().positive(),
  nuevo_saldo: z.number().min(0),
});

export const SincronizarPrecioSchema = z.object({
  venta_id: z.number().int().positive(),
  detalle_id: z.number().int().positive(),
  nuevo_precio: z.number().min(0),
});

export class CuentasUseCases {
  constructor(private repo: ICuentasRepository) {}

  async getCuentas(): Promise<Result<Venta[]>> {
    return this.repo.listCreditos();
  }

  async getCuentaDetalle(ventaId: number): Promise<Result<Venta | null>> {
    if (!ventaId || ventaId <= 0) return ResultFactory.fail(new Error('ID de venta inválido'));
    return this.repo.getCredito(ventaId);
  }

  async registrarAbono(data: unknown): Promise<Result<{ saldo_pendiente: number; estado: string }>> {
    const valid = AbonarSchema.safeParse(data);
    if (!valid.success) return ResultFactory.fail(new Error(valid.error.message));
    return this.repo.abonar(valid.data.venta_id, valid.data);
  }

  async ajustarDeuda(data: unknown): Promise<Result<{ saldo_pendiente: number; estado: string }>> {
    const valid = AjustarDeudaSchema.safeParse(data);
    if (!valid.success) return ResultFactory.fail(new Error(valid.error.message));
    return this.repo.ajustarDeuda(valid.data.venta_id, valid.data.nuevo_saldo);
  }

  async sincronizarPrecioArticulo(data: unknown): Promise<Result<{ saldo_pendiente: number; total: number; estado: string }>> {
    const valid = SincronizarPrecioSchema.safeParse(data);
    if (!valid.success) return ResultFactory.fail(new Error(valid.error.message));
    return this.repo.sincronizarPrecioArticulo(valid.data.venta_id, valid.data.detalle_id, valid.data.nuevo_precio);
  }
}
