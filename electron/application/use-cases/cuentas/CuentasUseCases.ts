import { ICuentasRepository } from '../../../domain/repositories/interfaces/ICuentasRepository';
import { Venta } from '../../../domain/repositories/interfaces/IVentasRepository';
import { Result, ResultFactory } from '../../../domain/common/Result';
import { z } from 'zod';

export const AbonarSchema = z.object({
  venta_id: z.number().int().positive(),
  metodo: z.string().min(1),
  monto_usd: z.number().positive(),
  monto_ves: z.number().min(0).optional().default(0),
  tasa: z.number().positive().optional().default(1)
});

export const AjustarDeudaSchema = z.object({
  venta_id: z.number().int().positive(),
  nuevo_saldo_ves: z.number().min(0),
  nueva_tasa_cambio: z.number().positive()
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

  async registrarAbono(data: unknown): Promise<Result<{ saldo_pendiente_usd: number; estado: string }>> {
    const valid = AbonarSchema.safeParse(data);
    if (!valid.success) return ResultFactory.fail(new Error(valid.error.message));
    return this.repo.abonar(valid.data.venta_id, valid.data);
  }

  async ajustarDeuda(data: unknown): Promise<Result<{ saldo_pendiente_usd: number; tasa_cambio: number; estado: string }>> {
    const valid = AjustarDeudaSchema.safeParse(data);
    if (!valid.success) return ResultFactory.fail(new Error(valid.error.message));
    
    // Calcula el nuevo sueldo USD basado en VES y la nueva Tasa de Cambio
    const nuevo_saldo_usd = valid.data.nuevo_saldo_ves / valid.data.nueva_tasa_cambio;
    
    return this.repo.ajustarDeuda(valid.data.venta_id, nuevo_saldo_usd, valid.data.nueva_tasa_cambio);
  }
}
